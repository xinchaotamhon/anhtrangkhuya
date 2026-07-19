(function startApp(global) {
  "use strict";

  document.documentElement.dataset.appScriptLoaded = "true";
  global.addEventListener("error", (event) => {
    document.documentElement.dataset.appError = String(event.message || "unknown-error").slice(0, 180);
  });
  global.addEventListener("unhandledrejection", (event) => {
    document.documentElement.dataset.appError = String(event.reason?.message || event.reason || "unhandled-rejection").slice(0, 180);
  });

  const Defaults = global.ATKDefaults;
  const Model = global.ATKModel;
  const Storage = global.ATKStorage;

  const VIEW_META = {
    today: ["NHẬT KÝ BUỔI TỐI", "Tối nay"],
    history: ["NHÌN LẠI CHẶNG ĐƯỜNG", "Tiến độ"],
    questions: ["CẤU TRÚC PHẢN TƯ", "Bộ câu hỏi"],
    library: ["TỪ VỰNG NỘI TÂM", "Thư viện gợi ý"],
    data: ["QUYỀN SỞ HỮU DỮ LIỆU", "Dữ liệu & chia sẻ"]
  };

  const state = {
    questions: [],
    libraryItems: [],
    entries: [],
    settings: {},
    draft: null,
    activeView: "today",
    libraryKind: "emotion",
    editor: null,
    installPrompt: null,
    draftTimer: null
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function sortByOrder(items) {
    return [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }

  function formatDate(dateKey, options) {
    const date = new Date(`${dateKey}T12:00:00`);
    return new Intl.DateTimeFormat("vi-VN", options || { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function emptyDraft(date) {
    return {
      date,
      answers: {},
      emotions: "",
      desiredOutcomes: [{ id: Model.generateId("outcome"), text: "", expectation: "best" }],
      worstCaseReflection: "",
      projectImagery: ""
    };
  }

  function entryToDraft(entry) {
    if (!entry) return emptyDraft(Model.todayKey());
    return {
      date: entry.date,
      answers: Model.deepClone(entry.answers || {}),
      emotions: entry.emotions || "",
      desiredOutcomes: entry.desiredOutcomes && entry.desiredOutcomes.length
        ? Model.deepClone(entry.desiredOutcomes)
        : [{ id: Model.generateId("outcome"), text: "", expectation: "best" }],
      worstCaseReflection: entry.worstCaseReflection || "",
      projectImagery: entry.projectImagery || ""
    };
  }

  function toast(message, type) {
    const region = $("#toast-region");
    const element = document.createElement("div");
    element.className = `toast${type === "error" ? " is-error" : ""}`;
    element.textContent = message;
    region.appendChild(element);
    global.setTimeout(() => element.remove(), 4200);
  }

  function setView(view) {
    if (!VIEW_META[view]) return;
    state.activeView = view;
    document.body.classList.remove("menu-open");
    $("#mobile-menu").setAttribute("aria-expanded", "false");
    $$("[data-view-panel]").forEach((panel) => {
      const active = panel.dataset.viewPanel === view;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    $$("[data-view]").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    $("#view-eyebrow").textContent = VIEW_META[view][0];
    $("#view-title").textContent = VIEW_META[view][1];
    renderView(view);
    global.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderView(view) {
    if (view === "today") renderToday();
    if (view === "history") renderHistory();
    if (view === "questions") renderQuestions();
    if (view === "library") renderLibrary();
    if (view === "data") renderData();
  }

  function currentDraftSummary() {
    const snapshots = sortByOrder(state.questions.filter((question) => question.active !== false)).map(Model.snapshotQuestion);
    return Model.computeEntrySummary({ questionSnapshots: snapshots, answers: state.draft.answers });
  }

  function choiceMarkup(name, value, selected, attributes) {
    const attr = attributes || "";
    return `<label><input type="radio" name="${escapeHTML(name)}" value="${value}" ${selected === value ? "checked" : ""} ${attr}><span>${value === "yes" ? "Có" : "Không"}</span></label>`;
  }

  function followUpMarkup(question, followUp, answer) {
    const mainToken = Model.toAnswerToken(answer && answer.value);
    const visible = followUp.condition === "always" || followUp.condition === mainToken;
    const nested = answer && answer.followUps ? answer.followUps[followUp.id] : "";
    const common = `data-followup-input data-followup-id="${escapeHTML(followUp.id)}"`;
    const field = followUp.type === "boolean"
      ? `<div class="choice-group" role="group" aria-label="${escapeHTML(followUp.prompt)}">
          ${choiceMarkup(`follow-${question.id}-${followUp.id}`, "yes", Model.toAnswerToken(nested), common)}
          ${choiceMarkup(`follow-${question.id}-${followUp.id}`, "no", Model.toAnswerToken(nested), common)}
        </div>`
      : `<textarea rows="3" ${common} placeholder="Ghi điều đang hiện lên trong đầu…">${escapeHTML(nested || "")}</textarea>`;
    return `<div class="follow-up" data-followup condition="${escapeHTML(followUp.condition)}" ${visible ? "" : "hidden"}>
      <label>${escapeHTML(followUp.prompt)}</label>${field}
    </div>`;
  }

  function questionMarkup(question, index) {
    const answer = state.draft.answers[question.id] || { value: null, followUps: {} };
    const selected = Model.toAnswerToken(answer.value);
    return `<article class="question-card" data-question-id="${escapeHTML(question.id)}">
      <div class="question-row">
        <span class="question-number" aria-hidden="true">${index + 1}</span>
        <p class="question-prompt">${escapeHTML(question.prompt)}</p>
        <div class="choice-group" role="group" aria-label="Trả lời câu ${index + 1}">
          ${choiceMarkup(`answer-${question.id}`, "yes", selected, "data-main-answer")}
          ${choiceMarkup(`answer-${question.id}`, "no", selected, "data-main-answer")}
        </div>
      </div>
      ${(question.followUps || []).map((followUp) => followUpMarkup(question, followUp, answer)).join("")}
    </article>`;
  }

  function suggestionMarkup(item, target) {
    return `<article class="suggestion-card">
      <strong>${escapeHTML(item.label)}</strong>
      <p>${escapeHTML(item.definition)}</p>
      <button type="button" data-insert-suggestion="${escapeHTML(item.id)}" data-target="${target}">Thêm vào ghi chép</button>
    </article>`;
  }

  function outcomeMarkup(outcome) {
    return `<div class="outcome-row" data-outcome-id="${escapeHTML(outcome.id)}">
      <input type="text" data-outcome-text value="${escapeHTML(outcome.text || "")}" placeholder="Một sự việc ta muốn có kết quả tốt…" aria-label="Sự việc mong muốn">
      <select data-outcome-expectation aria-label="Mức kết quả mong muốn">
        <option value="best" ${outcome.expectation !== "good_enough" ? "selected" : ""}>Tốt đẹp nhất</option>
        <option value="good_enough" ${outcome.expectation === "good_enough" ? "selected" : ""}>Hoàn thành là được</option>
      </select>
      <button class="icon-button" type="button" data-remove-outcome="${escapeHTML(outcome.id)}" aria-label="Xóa sự việc">×</button>
    </div>`;
  }

  function renderToday() {
    if (!state.draft) state.draft = emptyDraft(Model.todayKey());
    const panel = $("#view-today");
    const activeQuestions = sortByOrder(state.questions.filter((question) => question.active !== false));
    const categories = [...new Set(activeQuestions.map((question) => question.category || "Chưa phân loại"))];
    const summary = currentDraftSummary();
    const emotions = sortByOrder(state.libraryItems.filter((item) => item.kind === "emotion"));
    const imagery = sortByOrder(state.libraryItems.filter((item) => item.kind === "imagery"));

    panel.innerHTML = `<div class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">CHẬM LẠI · THÀNH THẬT · KHÔNG PHÁN XÉT</p>
        <h2>Hôm nay, ta đã sống và nghĩ như thế nào?</h2>
        <p>Không cần câu trả lời hoàn hảo. Chỉ cần đủ thật để ngày mai nhìn thấy một bước rõ hơn.</p>
      </div>
      <div class="date-field"><label for="reflection-date">NGÀY PHẢN TƯ</label><input type="date" id="reflection-date" value="${escapeHTML(state.draft.date)}"></div>
    </div>

    <div class="summary-strip" aria-label="Tóm tắt câu trả lời hiện tại">
      <div class="summary-card"><span>Hoàn thành</span><strong data-live-completion>${summary.answered}/${summary.total}</strong><progress data-live-progress max="100" value="${summary.completionPercent}">${summary.completionPercent}%</progress></div>
      <div class="summary-card is-positive"><span>Tín hiệu tích cực</span><strong data-live-positive>${summary.positive}</strong></div>
      <div class="summary-card is-improve"><span>Cần nhìn lại</span><strong data-live-improve>${summary.needsImprovement}</strong></div>
      <div class="summary-card"><span>Chưa kết luận</span><strong data-live-neutral>${summary.neutral}</strong></div>
    </div>

    ${categories.map((category) => {
      const questions = activeQuestions.filter((question) => (question.category || "Chưa phân loại") === category);
      return `<section>
        <div class="section-heading"><div><h2>${escapeHTML(category)}</h2><p>${category === "Thực hành điều tốt" ? "Những điều đang làm được cũng cần được nhìn thấy để tiếp tục nuôi dưỡng." : "Quan sát suy nghĩ và hành động trong đúng bối cảnh của ngày hôm nay."}</p></div><span class="section-count">${questions.length} câu</span></div>
        <div class="question-list">${questions.map((question) => questionMarkup(question, activeQuestions.indexOf(question))).join("")}</div>
      </section>`;
    }).join("")}

    <section class="reflection-card is-warm">
      <div class="card-header"><div><span class="card-kicker">CẢM XÚC</span><h2>Hôm nay có những cảm xúc gì?</h2><p>Viết theo cách của ta. Gợi ý chỉ giúp gọi tên, không phải một chiếc hộp để tự nhốt mình.</p></div></div>
      <label class="field-label" for="emotions-note">Ghi lại cảm xúc, tình huống và tín hiệu trong cơ thể nếu có</label>
      <textarea id="emotions-note" placeholder="Ta đang cảm thấy… vì…">${escapeHTML(state.draft.emotions)}</textarea>
      <details class="suggestion-panel"><summary>Gợi ý gọi tên cảm xúc</summary><div class="suggestion-grid">${emotions.map((item) => suggestionMarkup(item, "emotions-note")).join("") || "<p>Chưa có gợi ý. Có thể thêm trong Thư viện gợi ý.</p>"}</div></details>
    </section>

    <section class="reflection-card is-coral">
      <div class="card-header"><div><span class="card-kicker">KỲ VỌNG & KHẢ NĂNG CHẤP NHẬN</span><h2>Bây giờ có điều gì ta muốn có kết quả tốt?</h2><p>Gọi tên kỳ vọng, rồi nhìn cả khả năng ngược lại để phản ứng của ta bớt bị bất ngờ dẫn dắt.</p></div><button class="button button-secondary" type="button" id="add-outcome">+ Thêm sự việc</button></div>
      <div class="outcomes-list">${state.draft.desiredOutcomes.map(outcomeMarkup).join("")}</div>
      <div class="adverse-box"><strong>Hãy tưởng tượng điều ngược lại</strong><p>Điều tệ nhất có thể xảy ra như thế nào? Hãy hình dung đủ chân thực: nhìn thấy, nghe thấy, chạm vào hoàn cảnh và nhận ra cảm xúc xuất hiện — rồi ghi điều ta vẫn có thể lựa chọn làm.</p><textarea id="worst-case-note" placeholder="Nếu điều tệ nhất xảy ra… ta sẽ nhìn thấy… nghe thấy… cảm thấy… và vẫn có thể…">${escapeHTML(state.draft.worstCaseReflection)}</textarea></div>
    </section>

    <section class="reflection-card">
      <div class="card-header"><div><span class="card-kicker">HÌNH TƯỢNG DẪN ĐƯỜNG</span><h2>Các mục tiêu, dự án của ta mang hình tượng gì?</h2><p>Chọn từ diễn tả cách ta muốn hiện diện trong hành trình, không chỉ kết quả muốn sở hữu.</p></div></div>
      <label class="field-label" for="imagery-note">Hình tượng và điều nó có nghĩa trong hành động</label>
      <textarea id="imagery-note" placeholder="Ví dụ: Dũng cảm — ngày mai vẫn gọi cuộc điện thoại khó…">${escapeHTML(state.draft.projectImagery)}</textarea>
      <details class="suggestion-panel"><summary>Gợi ý hình tượng</summary><div class="suggestion-grid">${imagery.map((item) => suggestionMarkup(item, "imagery-note")).join("") || "<p>Chưa có gợi ý. Có thể thêm trong Thư viện gợi ý.</p>"}</div></details>
    </section>

    <div class="save-bar"><p><strong>Bản nháp được giữ trên thiết bị khi bạn đang viết.</strong>Lưu nhật ký để đưa ngày này vào phần Tiến độ.</p><button class="button button-primary" type="button" id="save-reflection">Lưu nhật ký đêm nay</button></div>`;
  }

  function collectTodayDraft() {
    const panel = $("#view-today");
    if (!panel || panel.hidden) return state.draft;
    const answers = {};
    $$("[data-question-id]", panel).forEach((card) => {
      const selected = $("input[data-main-answer]:checked", card);
      const followUps = {};
      $$("[data-followup]", card).forEach((container) => {
        const input = $("textarea[data-followup-input]", container);
        const radio = $("input[data-followup-input]:checked", container);
        const idSource = input || radio;
        if (idSource) followUps[idSource.dataset.followupId] = input ? input.value : radio.value;
      });
      answers[card.dataset.questionId] = { value: selected ? selected.value : null, followUps };
    });
    const outcomes = $$("[data-outcome-id]", panel).map((row) => ({
      id: row.dataset.outcomeId,
      text: $("[data-outcome-text]", row).value,
      expectation: $("[data-outcome-expectation]", row).value
    }));
    state.draft = {
      date: $("#reflection-date", panel).value,
      answers,
      emotions: $("#emotions-note", panel).value,
      desiredOutcomes: outcomes,
      worstCaseReflection: $("#worst-case-note", panel).value,
      projectImagery: $("#imagery-note", panel).value
    };
    return state.draft;
  }

  function queueDraftSave() {
    global.clearTimeout(state.draftTimer);
    state.draftTimer = global.setTimeout(async () => {
      try { await Storage.saveMeta(`draft:${state.draft.date}`, state.draft); }
      catch (error) { toast(`Không thể giữ bản nháp: ${error.message}`, "error"); }
    }, 350);
  }

  function updateLiveSummary() {
    const summary = currentDraftSummary();
    const panel = $("#view-today");
    const completion = $("[data-live-completion]", panel);
    if (!completion) return;
    completion.textContent = `${summary.answered}/${summary.total}`;
    $("[data-live-progress]", panel).value = summary.completionPercent;
    $("[data-live-positive]", panel).textContent = summary.positive;
    $("[data-live-improve]", panel).textContent = summary.needsImprovement;
    $("[data-live-neutral]", panel).textContent = summary.neutral;
  }

  function updateFollowUpVisibility(card) {
    const token = Model.toAnswerToken($("input[data-main-answer]:checked", card)?.value);
    $$("[data-followup]", card).forEach((container) => {
      const condition = container.getAttribute("condition");
      container.hidden = !(condition === "always" || condition === token);
    });
  }

  async function loadDate(date) {
    const previousDate = state.draft.date;
    const dateField = $("#reflection-date");
    if (dateField) dateField.value = previousDate;
    collectTodayDraft();
    state.draft.date = previousDate;
    await Storage.saveMeta(`draft:${previousDate}`, state.draft);
    const entry = state.entries.find((item) => item.date === date);
    const savedDraft = await Storage.getMeta(`draft:${date}`, null);
    state.draft = savedDraft || (entry ? entryToDraft(entry) : emptyDraft(date));
    state.draft.date = date;
    renderToday();
    toast(entry ? "Đã mở nhật ký của ngày đã chọn." : "Đã mở một ngày phản tư mới.");
  }

  async function saveReflection() {
    try {
      const draft = collectTodayDraft();
      const previous = state.entries.find((item) => item.date === draft.date);
      const entry = Model.createEntry(draft, state.questions, previous);
      await Storage.put("entries", entry);
      await Storage.remove("meta", `draft:${draft.date}`);
      state.entries = state.entries.filter((item) => item.date !== entry.date).concat(entry);
      state.draft = entryToDraft(entry);
      renderToday();
      toast(previous ? "Đã cập nhật nhật ký của ngày này." : "Đã lưu nhật ký. Một dấu mốc mới đã được giữ lại.");
    } catch (error) {
      toast(error.message, "error");
    }
  }

  function trendSVG(entries) {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    if (!sorted.length) return "";
    const width = 760, height = 220, top = 18, bottom = 34, chartHeight = height - top - bottom;
    const slot = width / sorted.length;
    const barWidth = Math.min(34, slot * 0.55);
    const grid = [0, 25, 50, 75, 100].map((tick) => {
      const y = top + chartHeight - (tick / 100) * chartHeight;
      return `<line class="trend-grid" x1="0" y1="${y}" x2="${width}" y2="${y}"></line><text class="trend-label" x="2" y="${y - 4}">${tick}%</text>`;
    }).join("");
    const bars = sorted.map((entry, index) => {
      const summary = Model.computeEntrySummary(entry);
      const x = index * slot + slot / 2 - barWidth / 2;
      const assessed = summary.positive + summary.needsImprovement;
      const positiveHeight = assessed ? chartHeight * summary.positivePercent / 100 : 0;
      const improveHeight = chartHeight - positiveHeight;
      const yPositive = top + chartHeight - positiveHeight;
      const label = entry.date.slice(5).split("-").reverse().join("/");
      return `<g><title>${escapeHTML(formatDate(entry.date))}: ${assessed ? `${summary.positivePercent}% tín hiệu tích cực` : "chưa có câu được đánh giá"}</title>
        <rect class="${assessed ? "trend-improve" : "trend-empty"}" x="${x}" y="${top}" width="${barWidth}" height="${improveHeight}" rx="5"></rect>
        <rect class="trend-positive" x="${x}" y="${yPositive}" width="${barWidth}" height="${positiveHeight}" rx="5"></rect>
        <text class="trend-label" text-anchor="middle" x="${x + barWidth / 2}" y="${height - 10}">${label}</text>
      </g>`;
    }).join("");
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Tỷ lệ tín hiệu tích cực và cần cải thiện theo ngày">${grid}${bars}</svg>`;
  }

  function renderHistory() {
    const panel = $("#view-history");
    const entries = [...state.entries].sort((a, b) => b.date.localeCompare(a.date));
    if (!entries.length) {
      panel.innerHTML = `<div class="empty-state"><div class="empty-symbol">☾</div><h2>Chặng đường bắt đầu từ một đêm</h2><p>Sau khi lưu nhật ký đầu tiên, nơi đây sẽ cho ta nhìn lại độ đều đặn, tín hiệu tích cực và những điều cần cải thiện.</p><button class="button button-primary" type="button" data-go-today>Bắt đầu phản tư</button></div>`;
      return;
    }
    const summaries = entries.map(Model.computeEntrySummary);
    const averageCompletion = Math.round(summaries.reduce((sum, item) => sum + item.completionPercent, 0) / summaries.length);
    const averagePositive = Math.round(summaries.reduce((sum, item) => sum + item.positivePercent, 0) / summaries.length);
    panel.innerHTML = `<div class="summary-strip">
      <div class="summary-card"><span>Số đêm đã lưu</span><strong>${entries.length}</strong></div>
      <div class="summary-card"><span>Hoàn thành trung bình</span><strong>${averageCompletion}%</strong></div>
      <div class="summary-card is-positive"><span>Tích cực trung bình</span><strong>${averagePositive}%</strong></div>
      <div class="summary-card"><span>Dấu mốc gần nhất</span><strong>${escapeHTML(entries[0].date.slice(5).split("-").reverse().join("/"))}</strong></div>
    </div>
    <div class="trend-card"><div class="card-header"><div><span class="card-kicker">14 DẤU MỐC GẦN NHẤT</span><h2>Xu hướng phản tư</h2><p>Điểm số chỉ giúp định hướng câu hỏi tiếp theo; hãy đọc lại ghi chú để hiểu đúng bối cảnh.</p></div></div><div class="trend-chart">${trendSVG(entries)}</div><div class="legend"><span><i></i>Tín hiệu tích cực</span><span><i class="improve"></i>Cần cải thiện</span></div></div>
    <div class="section-heading"><div><h2>Lịch sử theo ngày</h2><p>Mỗi ngày giữ nguyên câu chữ và quy tắc đánh giá tại thời điểm đã lưu.</p></div></div>
    <div class="history-list">${entries.map((entry) => {
      const summary = Model.computeEntrySummary(entry);
      return `<article class="history-item"><div class="history-date"><strong>${escapeHTML(entry.date.slice(5).split("-").reverse().join("/"))}</strong><span>${escapeHTML(formatDate(entry.date, { weekday: "long", year: "numeric" }))}</span></div><div class="history-metrics"><span class="metric-pill">${summary.completionPercent}% hoàn thành</span><span class="metric-pill positive">${summary.positive} tích cực</span><span class="metric-pill improve">${summary.needsImprovement} cần nhìn lại</span>${entry.emotions ? `<span class="metric-pill">${escapeHTML(entry.emotions.slice(0, 42))}${entry.emotions.length > 42 ? "…" : ""}</span>` : ""}</div><div class="history-actions"><button class="button button-link" type="button" data-edit-entry="${entry.date}">Mở</button><button class="button button-link" type="button" data-delete-entry="${entry.date}">Xóa</button></div></article>`;
    }).join("")}</div>`;
  }

  function scoringLabel(value) {
    if (value === "yes") return ["Có = tích cực", "good"];
    if (value === "no") return ["Không = tích cực", "improve"];
    return ["Quan sát, chưa chấm", "neutral"];
  }

  function renderQuestions() {
    const panel = $("#view-questions");
    const questions = sortByOrder(state.questions);
    panel.innerHTML = `<div class="toolbar"><div class="toolbar-copy"><h2>Những câu hỏi dẫn đường</h2><p>CRUD ở đây tác động tới các đêm sau. Nhật ký cũ vẫn giữ bản chụp câu hỏi riêng.</p></div><div class="toolbar-actions"><button class="button button-primary" type="button" data-add-question>+ Thêm câu hỏi</button></div></div>
      <div class="definition-list">${questions.map((question, index) => {
        const score = scoringLabel(question.positiveAnswer);
        return `<article class="definition-item"><div class="definition-order">${index + 1}</div><div><h3>${escapeHTML(question.prompt)}</h3><p>${escapeHTML(question.category)} · ${(question.followUps || []).length} câu hỏi phụ/vùng note</p><div class="definition-meta"><span class="tag ${score[1]}">${score[0]}</span>${question.active === false ? '<span class="tag neutral">Đang ẩn</span>' : '<span class="tag good">Đang dùng</span>'}</div></div><div class="definition-actions"><button class="button button-link" type="button" data-edit-question="${escapeHTML(question.id)}">Sửa</button><button class="button button-link" type="button" data-delete-question="${escapeHTML(question.id)}">Xóa</button></div></article>`;
      }).join("") || '<div class="empty-state"><h2>Chưa có câu hỏi</h2><p>Thêm câu hỏi đầu tiên để bắt đầu.</p></div>'}</div>`;
  }

  function renderLibrary() {
    const panel = $("#view-library");
    const items = sortByOrder(state.libraryItems.filter((item) => item.kind === state.libraryKind));
    const label = state.libraryKind === "emotion" ? "cảm xúc" : "hình tượng";
    panel.innerHTML = `<div class="toolbar"><div class="toolbar-copy"><h2>Thư viện có thể tự nuôi lớn</h2><p>Định nghĩa là gợi ý để gọi tên trải nghiệm, không phải kết luận thay cho ta.</p></div><div class="toolbar-actions"><div class="filter-tabs" role="tablist" aria-label="Loại thư viện"><button type="button" data-library-kind="emotion" class="${state.libraryKind === "emotion" ? "is-active" : ""}">Cảm xúc</button><button type="button" data-library-kind="imagery" class="${state.libraryKind === "imagery" ? "is-active" : ""}">Hình tượng</button></div><button class="button button-primary" type="button" data-add-library>+ Thêm ${label}</button></div></div>
      <div class="library-grid">${items.map((item) => `<article class="library-card"><h3>${escapeHTML(item.label)}</h3><p>${escapeHTML(item.definition)}</p>${item.prompt ? `<blockquote>${escapeHTML(item.prompt)}</blockquote>` : ""}<footer><button class="button button-link" type="button" data-edit-library="${escapeHTML(item.id)}">Sửa</button><button class="button button-link" type="button" data-delete-library="${escapeHTML(item.id)}">Xóa</button></footer></article>`).join("") || `<div class="empty-state"><h2>Chưa có ${label}</h2><p>Hãy thêm một định nghĩa theo cách hiểu của riêng ta.</p></div>`}</div>`;
  }

  function renderData() {
    const panel = $("#view-data");
    panel.innerHTML = `<div class="data-grid">
      <article class="data-card"><div class="data-icon">↓</div><h2>Sao lưu toàn bộ</h2><p>Tệp <strong>.atk-backup.json</strong> chứa câu hỏi, thư viện và toàn bộ nhật ký. Hãy giữ nó ở một nơi riêng tư ngoài trình duyệt.</p><button class="button button-primary" type="button" data-export-backup>Xuất bản sao lưu</button><button class="button button-quiet" type="button" data-import-backup>Khôi phục</button></article>
      <article class="data-card"><div class="data-icon">⇄</div><h2>Chia sẻ các khối</h2><p>Tệp <strong>.atk-share.json</strong> chỉ chứa định nghĩa được chọn; không chứa câu trả lời, cảm xúc hay ghi chú theo ngày.</p><div class="check-list"><label><input type="checkbox" id="share-questions" checked> Bộ câu hỏi</label><label><input type="checkbox" id="share-emotions" checked> Gợi ý cảm xúc</label><label><input type="checkbox" id="share-imagery" checked> Gợi ý hình tượng</label></div><button class="button button-primary" type="button" data-export-share>Chia sẻ / tải tệp</button><button class="button button-quiet" type="button" data-import-share>Nhập gói</button></article>
      <article class="data-card"><div class="data-icon">⌁</div><h2>Giữ dữ liệu bền hơn</h2><p>Yêu cầu trình duyệt hạn chế tự dọn dữ liệu ứng dụng khi thiết bị thiếu dung lượng. Đây vẫn không thay thế một tệp sao lưu độc lập.</p><button class="button button-secondary" type="button" data-request-persistence>Yêu cầu lưu bền vững</button></article>
      <article class="data-card"><div class="data-icon">⌂</div><h2>Dùng trên thiết bị khác</h2><p>Ở pha đầu, hãy mở cùng trang web trên thiết bị kia rồi nhập tệp sao lưu. Đồng bộ tài khoản tự động chỉ nên thêm sau khi có quyết định riêng về bảo mật và quyền riêng tư.</p><button class="button button-quiet" type="button" data-show-install>Hướng dẫn cài như app</button></article>
      <article class="data-card is-wide"><div class="privacy-boundary"><div class="data-icon">✓</div><div><strong>Ranh giới riêng tư của phiên bản này</strong><p>Không analytics, không tài khoản, không API và không tự gửi dữ liệu ra mạng. Chỉ chính thao tác xuất/chia sẻ của bạn mới tạo ra một tệp bên ngoài trình duyệt.</p></div></div></article>
    </div>`;
  }

  function readFollowUpsFromEditor() {
    return $$("[data-followup-editor]", $("#editor-body")).map((row) => ({
      id: row.dataset.followupId,
      prompt: $("[data-followup-prompt]", row).value.trim(),
      type: $("[data-followup-type]", row).value,
      condition: $("[data-followup-condition]", row).value,
      positiveAnswer: $("[data-followup-positive]", row)?.value || "neutral"
    })).filter((item) => item.prompt);
  }

  function followUpEditorMarkup(followUp) {
    return `<div class="followup-editor" data-followup-editor data-followup-id="${escapeHTML(followUp.id)}"><label class="field-label">Nội dung câu phụ / vùng note</label><input type="text" data-followup-prompt value="${escapeHTML(followUp.prompt || "")}" placeholder="Câu hỏi hiện ra khi điều kiện đúng"><div class="followup-editor-grid"><div><label class="field-label">Loại trả lời</label><select data-followup-type><option value="note" ${followUp.type !== "boolean" ? "selected" : ""}>Vùng note</option><option value="boolean" ${followUp.type === "boolean" ? "selected" : ""}>Có / Không</option></select></div><div><label class="field-label">Hiện khi</label><select data-followup-condition><option value="yes" ${followUp.condition === "yes" ? "selected" : ""}>Trả lời Có</option><option value="no" ${followUp.condition === "no" ? "selected" : ""}>Trả lời Không</option><option value="always" ${followUp.condition === "always" ? "selected" : ""}>Luôn hiện</option></select></div><div hidden><select data-followup-positive><option value="neutral" selected>Không chấm</option><option value="yes">Có tích cực</option><option value="no">Không tích cực</option></select></div><button class="icon-button" type="button" data-remove-followup aria-label="Xóa câu hỏi phụ">×</button></div></div>`;
  }

  function openQuestionEditor(id) {
    const existing = state.questions.find((item) => item.id === id);
    state.editor = { type: "question", id: id || null, followUps: Model.deepClone(existing?.followUps || []) };
    $("#editor-eyebrow").textContent = existing ? "CHỈNH SỬA CÂU HỎI" : "CÂU HỎI MỚI";
    $("#editor-title").textContent = existing ? "Giữ đúng điều muốn soi lại" : "Thêm một điểm soi chiếu";
    $("#editor-body").innerHTML = `<div class="field"><label class="field-label" for="question-prompt">Câu hỏi chính</label><textarea id="question-prompt" required placeholder="Hôm nay ta có…?">${escapeHTML(existing?.prompt || "")}</textarea></div><div class="field-grid"><div class="field"><label class="field-label" for="question-category">Nhóm</label><input id="question-category" type="text" required value="${escapeHTML(existing?.category || "Soi lại nhận thức")}"></div><div class="field"><label class="field-label" for="question-order">Thứ tự</label><input id="question-order" type="number" min="0" step="1" value="${Number(existing?.order ?? (state.questions.length + 1) * 10)}"></div></div><div class="field-grid"><div class="field"><label class="field-label" for="question-positive">Cách đánh giá</label><select id="question-positive"><option value="no" ${existing?.positiveAnswer === "no" ? "selected" : ""}>Không = tích cực</option><option value="yes" ${existing?.positiveAnswer === "yes" ? "selected" : ""}>Có = tích cực</option><option value="neutral" ${!existing || existing?.positiveAnswer === "neutral" ? "selected" : ""}>Không tự chấm</option></select></div><div class="field"><label class="field-label" for="question-active">Trạng thái</label><select id="question-active"><option value="true" ${existing?.active !== false ? "selected" : ""}>Đang dùng</option><option value="false" ${existing?.active === false ? "selected" : ""}>Tạm ẩn</option></select></div></div><div class="card-header"><div><h3>Câu hỏi phụ & vùng note</h3><p>Thêm nhiều lớp nếu một câu trả lời cần được đào sâu.</p></div><button class="button button-secondary" type="button" data-add-followup>+ Thêm</button></div><div id="followup-editors">${state.editor.followUps.map(followUpEditorMarkup).join("")}</div>`;
    $("#editor-dialog").showModal();
  }

  function openLibraryEditor(id) {
    const existing = state.libraryItems.find((item) => item.id === id);
    state.editor = { type: "library", id: id || null };
    const kind = existing?.kind || state.libraryKind;
    $("#editor-eyebrow").textContent = existing ? "CHỈNH SỬA GỢI Ý" : "GỢI Ý MỚI";
    $("#editor-title").textContent = kind === "emotion" ? "Một từ cho cảm xúc" : "Một hình tượng dẫn đường";
    $("#editor-body").innerHTML = `<div class="field-grid"><div class="field"><label class="field-label" for="library-label">Tên gọi</label><input id="library-label" type="text" required value="${escapeHTML(existing?.label || "")}" placeholder="Ví dụ: Can đảm"></div><div class="field"><label class="field-label" for="library-kind">Loại</label><select id="library-kind"><option value="emotion" ${kind === "emotion" ? "selected" : ""}>Cảm xúc</option><option value="imagery" ${kind === "imagery" ? "selected" : ""}>Hình tượng</option></select></div></div><div class="field"><label class="field-label" for="library-definition">Định nghĩa theo cách ta muốn dùng</label><textarea id="library-definition" required>${escapeHTML(existing?.definition || "")}</textarea></div><div class="field"><label class="field-label" for="library-prompt">Câu gợi mở</label><textarea id="library-prompt" rows="2" placeholder="Điều gì giúp ta nhìn sâu thêm?">${escapeHTML(existing?.prompt || "")}</textarea></div><div class="field"><label class="field-label" for="library-order">Thứ tự</label><input id="library-order" type="number" min="0" step="1" value="${Number(existing?.order ?? (state.libraryItems.length + 1) * 10)}"></div>`;
    $("#editor-dialog").showModal();
  }

  async function saveEditor() {
    if (!state.editor) return;
    if (state.editor.type === "question") {
      const prompt = $("#question-prompt").value.trim();
      const category = $("#question-category").value.trim();
      if (!prompt || !category) return toast("Cần có câu hỏi và tên nhóm.", "error");
      const existing = state.questions.find((item) => item.id === state.editor.id);
      const item = {
        id: existing?.id || Model.generateId("question"),
        order: Number($("#question-order").value) || 0,
        category,
        prompt,
        answerType: "boolean",
        positiveAnswer: $("#question-positive").value,
        active: $("#question-active").value === "true",
        followUps: readFollowUpsFromEditor()
      };
      await Storage.put("questions", item);
      state.questions = state.questions.filter((question) => question.id !== item.id).concat(item);
      toast(existing ? "Đã cập nhật câu hỏi." : "Đã thêm câu hỏi mới.");
      renderQuestions();
    } else {
      const label = $("#library-label").value.trim();
      const definition = $("#library-definition").value.trim();
      if (!label || !definition) return toast("Cần có tên gọi và định nghĩa.", "error");
      const existing = state.libraryItems.find((item) => item.id === state.editor.id);
      const item = {
        id: existing?.id || Model.generateId($("#library-kind").value),
        kind: $("#library-kind").value,
        order: Number($("#library-order").value) || 0,
        label,
        definition,
        prompt: $("#library-prompt").value.trim()
      };
      await Storage.put("library", item);
      state.libraryItems = state.libraryItems.filter((libraryItem) => libraryItem.id !== item.id).concat(item);
      state.libraryKind = item.kind;
      toast(existing ? "Đã cập nhật gợi ý." : "Đã thêm gợi ý mới.");
      renderLibrary();
    }
    $("#editor-dialog").close();
    state.editor = null;
  }

  function confirmAction(title, message, actionLabel) {
    return new Promise((resolve) => {
      const dialog = $("#confirm-dialog");
      $("#confirm-title").textContent = title;
      $("#confirm-message").textContent = message;
      $("#confirm-action").textContent = actionLabel || "Xác nhận";
      const onClose = () => { dialog.removeEventListener("close", onClose); resolve(dialog.returnValue === "confirm"); };
      dialog.addEventListener("close", onClose);
      dialog.showModal();
    });
  }

  function downloadJSON(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function backupPayload() {
    return Model.createBackup({ questions: state.questions, libraryItems: state.libraryItems, entries: state.entries, settings: state.settings });
  }

  function exportBackup(prefix) {
    const payload = backupPayload();
    downloadJSON(payload, `${prefix || "anh-trang-khuya"}-${Model.todayKey()}.atk-backup.json`);
    return payload;
  }

  async function readJSONFile(file) {
    if (!file) throw new Error("Chưa chọn tệp.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Tệp lớn hơn giới hạn an toàn 10 MB.");
    try { return JSON.parse(await file.text()); }
    catch (_) { throw new Error("Không thể đọc JSON trong tệp này."); }
  }

  async function importBackup(file) {
    const payload = await readJSONFile(file);
    const check = Model.validateBackup(payload);
    if (!check.valid) throw new Error(check.errors.join(" "));
    const accepted = await confirmAction("Khôi phục toàn bộ dữ liệu?", `Tệp có ${payload.data.entries.length} nhật ký và ${payload.data.questions.length} câu hỏi. Ứng dụng sẽ tải một bản sao lưu hiện tại trước khi thay thế dữ liệu.`, "Sao lưu rồi khôi phục");
    if (!accepted) return;
    exportBackup("truoc-khi-khoi-phuc");
    await Storage.replaceAllData(payload.data);
    const loaded = await Storage.loadAll();
    Object.assign(state, loaded);
    const date = Model.todayKey();
    state.draft = entryToDraft(state.entries.find((entry) => entry.date === date));
    renderData();
    await updateStorageStatus();
    toast("Đã khôi phục dữ liệu. Bản trước đó đã được tải xuống để có thể quay lại.");
  }

  async function exportShare() {
    const include = {
      questions: $("#share-questions").checked,
      emotions: $("#share-emotions").checked,
      imagery: $("#share-imagery").checked
    };
    if (!Object.values(include).some(Boolean)) return toast("Hãy chọn ít nhất một khối để chia sẻ.", "error");
    const payload = Model.createSharePackage(state, { include });
    const filename = `anh-trang-khuya-${Model.todayKey()}.atk-share.json`;
    const file = typeof File === "function" ? new File([JSON.stringify(payload, null, 2)], filename, { type: "application/json" }) : null;
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ title: payload.title, text: "Gói câu hỏi và gợi ý Ánh Trăng Khuya", files: [file] }); return; }
      catch (error) { if (error.name === "AbortError") return; }
    }
    downloadJSON(payload, filename);
    toast("Đã tạo gói chia sẻ không chứa nhật ký cá nhân.");
  }

  async function importShare(file) {
    const payload = await readJSONFile(file);
    const check = Model.validateSharePackage(payload);
    if (!check.valid) throw new Error(check.errors.join(" "));
    const mergedQuestions = Model.mergeByIdSafely(state.questions, payload.modules.questions, "question-shared");
    const incomingLibrary = payload.modules.emotions.concat(payload.modules.imagery);
    const mergedLibrary = Model.mergeByIdSafely(state.libraryItems, incomingLibrary, "library-shared");
    for (const question of mergedQuestions.items) await Storage.put("questions", question);
    for (const item of mergedLibrary.items) await Storage.put("library", item);
    state.questions = mergedQuestions.items;
    state.libraryItems = mergedLibrary.items;
    const added = mergedQuestions.report.added + mergedLibrary.report.added;
    const cloned = mergedQuestions.report.clonedConflicts + mergedLibrary.report.clonedConflicts;
    toast(`Đã nhập an toàn: ${added} khối mới, ${cloned} xung đột được giữ thành bản riêng.`);
    renderData();
  }

  async function updateStorageStatus() {
    const status = $("#storage-status");
    if (!navigator.storage || !navigator.storage.persisted) {
      status.className = "storage-status is-warning";
      status.querySelector("span").textContent = "Nên sao lưu định kỳ";
      return;
    }
    const persistent = await navigator.storage.persisted();
    status.className = `storage-status ${persistent ? "is-safe" : "is-warning"}`;
    status.querySelector("span").textContent = persistent ? "Đã bật lưu bền vững" : "Nên sao lưu định kỳ";
  }

  async function requestPersistence() {
    if (!navigator.storage || !navigator.storage.persist) return toast("Trình duyệt này chưa hỗ trợ yêu cầu lưu bền vững.", "error");
    const granted = await navigator.storage.persist();
    await updateStorageStatus();
    toast(granted ? "Trình duyệt đã đồng ý giữ dữ liệu bền vững hơn." : "Trình duyệt chưa cấp quyền. Hãy tiếp tục xuất sao lưu định kỳ.");
  }

  async function deleteQuestion(id) {
    const question = state.questions.find((item) => item.id === id);
    if (!question) return;
    const accepted = await confirmAction("Xóa câu hỏi?", "Câu hỏi sẽ biến mất khỏi các đêm sau. Nhật ký cũ vẫn giữ bản chụp của nó.", "Xóa câu hỏi");
    if (!accepted) return;
    await Storage.remove("questions", id);
    state.questions = state.questions.filter((item) => item.id !== id);
    renderQuestions();
    toast("Đã xóa câu hỏi khỏi bộ đang dùng.");
  }

  async function deleteLibraryItem(id) {
    const accepted = await confirmAction("Xóa gợi ý?", "Gợi ý sẽ không còn xuất hiện trong danh sách thả xuống.", "Xóa gợi ý");
    if (!accepted) return;
    await Storage.remove("library", id);
    state.libraryItems = state.libraryItems.filter((item) => item.id !== id);
    renderLibrary();
    toast("Đã xóa gợi ý.");
  }

  async function deleteEntry(date) {
    const accepted = await confirmAction("Xóa nhật ký ngày này?", "Thao tác không thể hoàn tác trong trình duyệt. Hãy xuất sao lưu trước nếu còn phân vân.", "Xóa nhật ký");
    if (!accepted) return;
    await Storage.remove("entries", date);
    state.entries = state.entries.filter((entry) => entry.date !== date);
    renderHistory();
    toast("Đã xóa nhật ký đã chọn.");
  }

  async function handleClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    try {
      if (button.hasAttribute("data-editor-cancel")) return $("#editor-dialog").close("cancel");
      if (button.dataset.view) return setView(button.dataset.view);
      if (button.hasAttribute("data-go-today")) return setView("today");
      if (button.hasAttribute("data-reload-app")) return location.reload();
      if (button.id === "mobile-menu") {
        const open = document.body.classList.toggle("menu-open");
        button.setAttribute("aria-expanded", String(open));
        return;
      }
      if (button.id === "save-reflection") return saveReflection();
      if (button.id === "add-outcome") {
        collectTodayDraft();
        state.draft.desiredOutcomes.push({ id: Model.generateId("outcome"), text: "", expectation: "best" });
        renderToday();
        queueDraftSave();
        return;
      }
      if (button.dataset.removeOutcome) {
        collectTodayDraft();
        state.draft.desiredOutcomes = state.draft.desiredOutcomes.filter((item) => item.id !== button.dataset.removeOutcome);
        if (!state.draft.desiredOutcomes.length) state.draft.desiredOutcomes.push({ id: Model.generateId("outcome"), text: "", expectation: "best" });
        renderToday();
        queueDraftSave();
        return;
      }
      if (button.dataset.insertSuggestion) {
        const item = state.libraryItems.find((candidate) => candidate.id === button.dataset.insertSuggestion);
        const target = document.getElementById(button.dataset.target);
        if (item && target) {
          const line = `${item.label}: ${item.definition}${item.prompt ? `\n${item.prompt}` : ""}`;
          target.value = `${target.value}${target.value.trim() ? "\n\n" : ""}${line}`;
          target.dispatchEvent(new Event("input", { bubbles: true }));
          target.focus();
        }
        return;
      }
      if (button.dataset.editEntry) {
        const entry = state.entries.find((item) => item.date === button.dataset.editEntry);
        state.draft = entryToDraft(entry);
        await Storage.saveMeta(`draft:${state.draft.date}`, state.draft);
        return setView("today");
      }
      if (button.dataset.deleteEntry) return deleteEntry(button.dataset.deleteEntry);
      if (button.hasAttribute("data-add-question")) return openQuestionEditor();
      if (button.dataset.editQuestion) return openQuestionEditor(button.dataset.editQuestion);
      if (button.dataset.deleteQuestion) return deleteQuestion(button.dataset.deleteQuestion);
      if (button.dataset.libraryKind) { state.libraryKind = button.dataset.libraryKind; return renderLibrary(); }
      if (button.hasAttribute("data-add-library")) return openLibraryEditor();
      if (button.dataset.editLibrary) return openLibraryEditor(button.dataset.editLibrary);
      if (button.dataset.deleteLibrary) return deleteLibraryItem(button.dataset.deleteLibrary);
      if (button.hasAttribute("data-add-followup")) {
        state.editor.followUps = readFollowUpsFromEditor();
        state.editor.followUps.push({ id: Model.generateId("followup"), condition: "yes", type: "note", positiveAnswer: "neutral", prompt: "" });
        $("#followup-editors").innerHTML = state.editor.followUps.map(followUpEditorMarkup).join("");
        return;
      }
      if (button.hasAttribute("data-remove-followup")) {
        const row = button.closest("[data-followup-editor]");
        row.remove();
        return;
      }
      if (button.hasAttribute("data-export-backup")) { exportBackup(); return toast("Đã tải bản sao lưu toàn bộ."); }
      if (button.hasAttribute("data-import-backup")) return $("#backup-file").click();
      if (button.hasAttribute("data-export-share")) return exportShare();
      if (button.hasAttribute("data-import-share")) return $("#share-file").click();
      if (button.hasAttribute("data-request-persistence")) return requestPersistence();
      if (button.hasAttribute("data-show-install")) return toast("Khi dùng HTTPS, chọn ‘Cài ứng dụng’ trên thanh trên cùng hoặc ‘Thêm vào màn hình chính’ trong menu trình duyệt.");
      if (button.id === "install-app" && state.installPrompt) {
        state.installPrompt.prompt();
        await state.installPrompt.userChoice;
        state.installPrompt = null;
        button.hidden = true;
      }
    } catch (error) {
      toast(error.message || "Thao tác chưa thể hoàn thành.", "error");
    }
  }

  function handleTodayInput(event) {
    if (state.activeView !== "today") return;
    if (event.target.id === "reflection-date") return;
    const card = event.target.closest("[data-question-id]");
    if (card && event.target.matches("input[data-main-answer]")) updateFollowUpVisibility(card);
    collectTodayDraft();
    updateLiveSummary();
    queueDraftSave();
  }

  async function initialize() {
    document.documentElement.dataset.appState = "initializing";
    try {
      if (!Defaults || !Model || !Storage) throw new Error("Thiếu một thành phần ứng dụng.");
      await Storage.seedDefaults(Model.deepClone(Defaults.DEFAULT_QUESTIONS), Model.deepClone(Defaults.DEFAULT_LIBRARY_ITEMS));
      document.documentElement.dataset.appState = "seeded";
      const loaded = await Storage.loadAll();
      document.documentElement.dataset.appState = "loaded";
      state.questions = loaded.questions;
      state.libraryItems = loaded.libraryItems;
      state.entries = loaded.entries;
      state.settings = loaded.settings;
      const today = Model.todayKey();
      const draft = await Storage.getMeta(`draft:${today}`, null);
      state.draft = draft || entryToDraft(state.entries.find((entry) => entry.date === today));
      state.draft.date = today;
      renderToday();
      await updateStorageStatus();
      if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
        navigator.serviceWorker.register("sw.js").catch(() => toast("Chế độ offline chưa được bật ở lần mở này.", "error"));
      }
    } catch (error) {
      $("#view-today").innerHTML = `<div class="empty-state"><h2>Chưa thể mở dữ liệu</h2><p>${escapeHTML(error.message)}</p><button class="button button-primary" type="button" data-reload-app>Thử lại</button></div>`;
    } finally {
      $("#loading-screen").classList.add("is-hidden");
      document.documentElement.dataset.appState = "ready";
    }
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleTodayInput);
  document.addEventListener("change", async (event) => {
    if (event.target.id === "reflection-date") return loadDate(event.target.value);
    if (event.target.id === "backup-file" && event.target.files[0]) {
      try { await importBackup(event.target.files[0]); } catch (error) { toast(error.message, "error"); }
      event.target.value = "";
    }
    if (event.target.id === "share-file" && event.target.files[0]) {
      try { await importShare(event.target.files[0]); } catch (error) { toast(error.message, "error"); }
      event.target.value = "";
    }
  });
  $("#editor-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try { await saveEditor(); } catch (error) { toast(error.message, "error"); }
  });
  $("#editor-dialog").addEventListener("close", () => { state.editor = null; });
  global.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    $("#install-app").hidden = false;
  });
  global.addEventListener("appinstalled", () => { $("#install-app").hidden = true; toast("Ánh Trăng Khuya đã được cài trên thiết bị."); });
  document.documentElement.dataset.appWired = "true";
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})(typeof globalThis !== "undefined" ? globalThis : window);

(function attachModel(global) {
  "use strict";

  const FILE_SCHEMA_VERSION = 1;
  const BACKUP_FILE_TYPE = "anh-trang-khuya.backup";
  const SHARE_FILE_TYPE = "anh-trang-khuya.share-package";

  function deepClone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function generateId(prefix) {
    const safePrefix = String(prefix || "item").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const uuid = global.crypto && typeof global.crypto.randomUUID === "function"
      ? global.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${safePrefix}-${uuid}`;
  }

  function toAnswerToken(value) {
    if (value === true || value === "yes") return "yes";
    if (value === false || value === "no") return "no";
    return null;
  }

  function evaluateBoolean(value, positiveAnswer) {
    const token = toAnswerToken(value);
    if (!token) return "unanswered";
    if (positiveAnswer === "neutral" || !["yes", "no"].includes(positiveAnswer)) return "neutral";
    return token === positiveAnswer ? "positive" : "needs_improvement";
  }

  function followUpIsVisible(followUp, mainToken) {
    return followUp.condition === "always" || followUp.condition === mainToken;
  }

  function evaluateQuestionAnswer(question, answer) {
    if (!answer || question.answerType !== "boolean") return "unanswered";
    const mainToken = toAnswerToken(answer.value);
    if (!mainToken) return "unanswered";

    let status = evaluateBoolean(mainToken, question.positiveAnswer);
    if (status !== "neutral") return status;

    const followUps = Array.isArray(question.followUps) ? question.followUps : [];
    const nested = isPlainObject(answer.followUps) ? answer.followUps : {};
    for (const followUp of followUps) {
      if (
        followUp.type === "boolean" &&
        ["yes", "no"].includes(followUp.positiveAnswer) &&
        followUpIsVisible(followUp, mainToken)
      ) {
        const nestedStatus = evaluateBoolean(nested[followUp.id], followUp.positiveAnswer);
        if (nestedStatus !== "unanswered") return nestedStatus;
      }
    }
    return status;
  }

  function snapshotQuestion(question) {
    return {
      id: question.id,
      order: Number(question.order) || 0,
      category: String(question.category || "Chưa phân loại"),
      prompt: String(question.prompt || ""),
      answerType: question.answerType === "text" ? "text" : "boolean",
      positiveAnswer: ["yes", "no", "neutral"].includes(question.positiveAnswer)
        ? question.positiveAnswer
        : "neutral",
      followUps: (Array.isArray(question.followUps) ? question.followUps : []).map((followUp) => ({
        id: String(followUp.id),
        condition: ["yes", "no", "always"].includes(followUp.condition) ? followUp.condition : "always",
        type: followUp.type === "boolean" ? "boolean" : "note",
        prompt: String(followUp.prompt || ""),
        positiveAnswer: ["yes", "no", "neutral"].includes(followUp.positiveAnswer)
          ? followUp.positiveAnswer
          : "neutral"
      }))
    };
  }

  function createEntry(payload, questions, previous) {
    const now = new Date().toISOString();
    const date = String(payload.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ngày phản tư không hợp lệ.");

    return {
      id: previous && previous.id ? previous.id : `reflection-${date}`,
      date,
      schemaVersion: 1,
      createdAt: previous && previous.createdAt ? previous.createdAt : now,
      updatedAt: now,
      questionSnapshots: questions
        .filter((question) => question.active !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .map(snapshotQuestion),
      answers: deepClone(isPlainObject(payload.answers) ? payload.answers : {}),
      emotions: String(payload.emotions || ""),
      desiredOutcomes: (Array.isArray(payload.desiredOutcomes) ? payload.desiredOutcomes : [])
        .map((outcome) => ({
          id: String(outcome.id || generateId("outcome")),
          text: String(outcome.text || "").trim(),
          expectation: outcome.expectation === "good_enough" ? "good_enough" : "best"
        }))
        .filter((outcome) => outcome.text),
      worstCaseReflection: String(payload.worstCaseReflection || ""),
      projectImagery: String(payload.projectImagery || "")
    };
  }

  function computeEntrySummary(entry) {
    const snapshots = Array.isArray(entry && entry.questionSnapshots) ? entry.questionSnapshots : [];
    const answers = isPlainObject(entry && entry.answers) ? entry.answers : {};
    const result = { total: snapshots.length, answered: 0, positive: 0, needsImprovement: 0, neutral: 0, completionPercent: 0, positivePercent: 0 };

    for (const question of snapshots) {
      const status = evaluateQuestionAnswer(question, answers[question.id]);
      if (status === "unanswered") continue;
      result.answered += 1;
      if (status === "positive") result.positive += 1;
      if (status === "needs_improvement") result.needsImprovement += 1;
      if (status === "neutral") result.neutral += 1;
    }

    result.completionPercent = result.total ? Math.round((result.answered / result.total) * 100) : 0;
    const assessed = result.positive + result.needsImprovement;
    result.positivePercent = assessed ? Math.round((result.positive / assessed) * 100) : 0;
    return result;
  }

  function createBackup(data) {
    return {
      fileType: BACKUP_FILE_TYPE,
      schemaVersion: FILE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      app: "Ánh Trăng Khuya",
      data: {
        questions: deepClone(Array.isArray(data.questions) ? data.questions : []),
        libraryItems: deepClone(Array.isArray(data.libraryItems) ? data.libraryItems : []),
        entries: deepClone(Array.isArray(data.entries) ? data.entries : []),
        settings: deepClone(isPlainObject(data.settings) ? data.settings : {})
      }
    };
  }

  function validateBackup(payload) {
    const errors = [];
    if (!isPlainObject(payload)) errors.push("Tệp không phải một đối tượng JSON.");
    if (payload && payload.fileType !== BACKUP_FILE_TYPE) errors.push("Sai loại tệp sao lưu.");
    if (payload && payload.schemaVersion !== FILE_SCHEMA_VERSION) errors.push("Phiên bản tệp sao lưu chưa được hỗ trợ.");
    if (!payload || !isPlainObject(payload.data)) errors.push("Thiếu vùng dữ liệu sao lưu.");
    for (const key of ["questions", "libraryItems", "entries"]) {
      if (!payload || !payload.data || !Array.isArray(payload.data[key])) errors.push(`Trường ${key} phải là một danh sách.`);
    }
    if (payload && payload.data && !isPlainObject(payload.data.settings)) errors.push("Trường settings không hợp lệ.");
    return { valid: errors.length === 0, errors };
  }

  function createSharePackage(data, options) {
    const include = Object.assign({ questions: true, emotions: true, imagery: true }, options && options.include);
    const libraries = Array.isArray(data.libraryItems) ? data.libraryItems : [];
    return {
      fileType: SHARE_FILE_TYPE,
      schemaVersion: FILE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      title: String((options && options.title) || "Khối phản tư Ánh Trăng Khuya"),
      modules: {
        questions: include.questions ? deepClone(Array.isArray(data.questions) ? data.questions : []) : [],
        emotions: include.emotions ? deepClone(libraries.filter((item) => item.kind === "emotion")) : [],
        imagery: include.imagery ? deepClone(libraries.filter((item) => item.kind === "imagery")) : []
      }
    };
  }

  function validateSharePackage(payload) {
    const errors = [];
    if (!isPlainObject(payload)) errors.push("Tệp không phải một đối tượng JSON.");
    if (payload && payload.fileType !== SHARE_FILE_TYPE) errors.push("Sai loại gói chia sẻ.");
    if (payload && payload.schemaVersion !== FILE_SCHEMA_VERSION) errors.push("Phiên bản gói chia sẻ chưa được hỗ trợ.");
    if (!payload || !isPlainObject(payload.modules)) errors.push("Thiếu các khối chia sẻ.");
    for (const key of ["questions", "emotions", "imagery"]) {
      if (!payload || !payload.modules || !Array.isArray(payload.modules[key])) errors.push(`Khối ${key} phải là một danh sách.`);
    }
    if (payload && Object.prototype.hasOwnProperty.call(payload, "entries")) errors.push("Gói chia sẻ không được chứa lịch sử phản tư.");
    if (payload && payload.data && Object.prototype.hasOwnProperty.call(payload.data, "entries")) errors.push("Gói chia sẻ không được chứa dữ liệu cá nhân.");
    return { valid: errors.length === 0, errors };
  }

  function equivalent(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function mergeByIdSafely(currentItems, incomingItems, prefix) {
    const items = deepClone(Array.isArray(currentItems) ? currentItems : []);
    const byId = new Map(items.map((item) => [item.id, item]));
    const report = { added: 0, skipped: 0, clonedConflicts: 0 };

    for (const rawItem of Array.isArray(incomingItems) ? incomingItems : []) {
      if (!isPlainObject(rawItem) || typeof rawItem.id !== "string" || !rawItem.id.trim()) continue;
      const item = deepClone(rawItem);
      const existing = byId.get(item.id);
      if (!existing) {
        items.push(item);
        byId.set(item.id, item);
        report.added += 1;
      } else if (equivalent(existing, item)) {
        report.skipped += 1;
      } else {
        item.id = generateId(prefix || "shared");
        if (typeof item.label === "string") item.label = `${item.label} · bản chia sẻ`;
        if (typeof item.prompt === "string") item.prompt = `${item.prompt} (bản chia sẻ)`;
        items.push(item);
        byId.set(item.id, item);
        report.clonedConflicts += 1;
      }
    }
    return { items, report };
  }

  function todayKey(date) {
    const value = date instanceof Date ? date : new Date();
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  const api = {
    FILE_SCHEMA_VERSION,
    BACKUP_FILE_TYPE,
    SHARE_FILE_TYPE,
    deepClone,
    generateId,
    toAnswerToken,
    evaluateBoolean,
    evaluateQuestionAnswer,
    snapshotQuestion,
    createEntry,
    computeEntrySummary,
    createBackup,
    validateBackup,
    createSharePackage,
    validateSharePackage,
    mergeByIdSafely,
    todayKey
  };

  global.ATKModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

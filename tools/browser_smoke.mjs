import { writeFile } from "node:fs/promises";

const endpoint = process.argv[2] || "http://127.0.0.1:9225";
const evidencePath = process.argv[3] || "50-Evidence/browser-smoke.json";
const deadline = Date.now() + 10000;
let page;

while (!page && Date.now() < deadline) {
  try {
    const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
    page = targets.find((target) => target.type === "page" && target.url.startsWith("http://127.0.0.1:4173"));
  } catch (_) {}
  if (!page) await new Promise((resolve) => setTimeout(resolve, 150));
}
if (!page) throw new Error("Chrome DevTools target did not become ready.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", () => reject(new Error("Cannot connect to Chrome DevTools.")), { once: true });
});
function call(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await call("Runtime.enable");
await new Promise((resolve) => setTimeout(resolve, 2500));
const evaluated = await call("Runtime.evaluate", {
  expression: `(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const result = { ready: document.documentElement.dataset.appState === 'ready' };

    const card = document.querySelector('[data-question-id="q-arrogance"]');
    const yes = card?.querySelector('input[data-main-answer][value="yes"]');
    yes?.click();
    await sleep(100);
    const followUp = card?.querySelector('[data-followup]');
    result.conditionalFollowUp = Boolean(followUp && !followUp.hidden);
    const note = followUp?.querySelector('textarea');
    if (note) {
      note.value = 'browser-smoke-private-note';
      note.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const emotions = document.querySelector('#emotions-note');
    emotions.value = 'browser-smoke-private-emotion';
    emotions.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#save-reflection').click();
    await sleep(700);
    const entries = await ATKStorage.getAll('entries');
    result.entrySaved = entries.some((entry) => entry.emotions === 'browser-smoke-private-emotion' && entry.answers['q-arrogance']?.followUps?.['f-thought'] === 'browser-smoke-private-note');

    document.querySelector('[data-view="history"]').click();
    await sleep(100);
    result.historyVisible = !document.querySelector('#view-history').hidden && Boolean(document.querySelector('[data-edit-entry]'));

    document.querySelector('[data-view="questions"]').click();
    document.querySelector('[data-add-question]').click();
    document.querySelector('#question-prompt').value = 'Browser smoke question?';
    document.querySelector('#question-category').value = 'Browser smoke';
    document.querySelector('#editor-form').requestSubmit(document.querySelector('#editor-save'));
    await sleep(500);
    const questions = await ATKStorage.getAll('questions');
    result.questionCrud = questions.some((question) => question.prompt === 'Browser smoke question?');

    document.querySelector('[data-view="library"]').click();
    document.querySelector('[data-add-library]').click();
    document.querySelector('#library-label').value = 'Browser smoke emotion';
    document.querySelector('#library-definition').value = 'A temporary browser smoke definition.';
    document.querySelector('#editor-form').requestSubmit(document.querySelector('#editor-save'));
    await sleep(500);
    const library = await ATKStorage.getAll('library');
    result.libraryCrud = library.some((item) => item.label === 'Browser smoke emotion');

    const share = ATKModel.createSharePackage({ questions, libraryItems: library, entries }, {});
    const serializedShare = JSON.stringify(share);
    result.shareExcludesPrivateEntries = !serializedShare.includes('browser-smoke-private');
    result.passed = Object.values(result).every(Boolean);
    return result;
  })()`,
  awaitPromise: true,
  returnByValue: true
});

const observed = evaluated.result.value;
if (!observed || !observed.passed) throw new Error(`Browser smoke failed: ${JSON.stringify(observed)}`);
const evidence = {
  observed_at: new Date().toISOString(),
  environment: "Headless Chrome, isolated temporary profile, local static server",
  expected: "App ready; conditional follow-up, save/history, question CRUD, library CRUD and private-data share boundary work",
  observed,
  verdict: "pass"
};
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
socket.close();
process.stdout.write(`Browser smoke passed: ${evidencePath}\n`);

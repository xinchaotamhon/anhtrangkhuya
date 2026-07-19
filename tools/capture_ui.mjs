import { writeFile } from "node:fs/promises";

const outputPath = process.argv[2] || "50-Evidence/ui-home-real-time.png";
const endpoint = process.argv[3] || "http://127.0.0.1:9222";
const viewportWidth = Number(process.argv[4] || 0);
const viewportHeight = Number(process.argv[5] || 0);
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
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", () => reject(new Error("Cannot connect to Chrome DevTools.")), { once: true });
});

function call(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chrome DevTools timed out: ${method}`));
    }, 10000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); }
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await call("Page.enable");
await call("Runtime.enable");
if (viewportWidth && viewportHeight) {
  await call("Emulation.setDeviceMetricsOverride", {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: viewportWidth <= 720
  });
}
await new Promise((resolve) => setTimeout(resolve, 3000));
const observed = await call("Runtime.evaluate", {
  expression: "({ state: document.documentElement.dataset.appState, error: document.documentElement.dataset.appError || null, hero: Boolean(document.querySelector('.hero-card')), loadingHidden: document.querySelector('#loading-screen')?.classList.contains('is-hidden') })",
  returnByValue: true
});
const state = observed.result.value;
if (!state || state.state !== "ready" || !state.hero || !state.loadingHidden) {
  throw new Error(`App did not become ready: ${JSON.stringify(state)}`);
}
const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
socket.close();
process.stdout.write(`UI ready and captured: ${outputPath}\n`);

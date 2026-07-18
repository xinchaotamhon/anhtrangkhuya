import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const defaults = require("../src/defaults.js");
const model = require("../src/model.js");

const [html, manifestText, worker, headers, styles, appSource, storageSource, defaultsSource, modelSource] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("manifest.webmanifest", "utf8"),
  readFile("sw.js", "utf8"),
  readFile("_headers", "utf8"),
  readFile("styles.css", "utf8"),
  readFile("src/app.js", "utf8"),
  readFile("src/storage.js", "utf8"),
  readFile("src/defaults.js", "utf8"),
  readFile("src/model.js", "utf8")
]);
const manifest = JSON.parse(manifestText);

assert.equal(manifest.display, "standalone", "PWA must be installable in standalone mode");
assert.equal(manifest.start_url, "./", "PWA start URL must remain portable across static-host subpaths");
assert.match(html, /src\/storage\.js/, "IndexedDB adapter must be loaded");
assert.match(html, /data-view-panel="history"/, "History/progress view must exist");
assert.match(html, /data-view-panel="questions"/, "Question CRUD view must exist");
assert.match(html, /data-view-panel="library"/, "Suggestion CRUD view must exist");
assert.match(html, /Dữ liệu &amp; chia sẻ|Dữ liệu & chia sẻ/, "Data/share view must exist");
assert.match(worker, /src\/app\.js/, "Offline shell must cache application code");
assert.match(headers, /Content-Security-Policy/, "Static deployment must declare a CSP");
assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.save-bar \{ position: static;/, "Mobile save action must not overlay reflection questions");
for (const [name, source] of [["app", appSource], ["storage", storageSource], ["defaults", defaultsSource], ["model", modelSource], ["service worker", worker]]) {
  assert.doesNotThrow(() => new Function(source), `${name} source must parse as JavaScript`);
}
assert.equal(defaults.DEFAULT_QUESTIONS.length, 18, "All 18 owner-supplied main questions must be present");
assert.ok(defaults.DEFAULT_QUESTIONS.some((question) => question.positiveAnswer === "yes"), "Positive-practice questions must score Yes positively");
assert.ok(defaults.DEFAULT_QUESTIONS.some((question) => question.positiveAnswer === "no"), "Risk-reflection questions must score No positively");
assert.ok(defaults.DEFAULT_QUESTIONS.some((question) => question.followUps.some((followUp) => followUp.type === "boolean")), "Nested yes/no follow-up must be supported by defaults");
const share = model.createSharePackage({ questions: defaults.DEFAULT_QUESTIONS, libraryItems: defaults.DEFAULT_LIBRARY_ITEMS, entries: [{ private: true }] }, {});
assert.equal("entries" in share, false, "Share package must exclude private entries");

process.stdout.write(`Static contract passed: ${defaults.DEFAULT_QUESTIONS.length} questions, ${defaults.DEFAULT_LIBRARY_ITEMS.length} suggestions.\n`);

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const app = readFileSync("src/app.js", "utf8");
const editorForm = html.match(/<form method="dialog" id="editor-form">([\s\S]*?)<\/form>/)?.[1] || "";
const cancelButtons = [...editorForm.matchAll(/<button\b[^>]*data-editor-cancel[^>]*>/g)].map((match) => match[0]);

assert.equal(cancelButtons.length, 2, "the editor must provide both close and cancel controls");
for (const button of cancelButtons) {
  assert.match(button, /type="button"/, "editor cancel controls must not submit the required form");
}
assert.ok(
  !/<button\b[^>]*value="cancel"[^>]*type="submit"/i.test(editorForm),
  "editor cancel controls must never trigger native required-field validation"
);
assert.match(
  app,
  /button\.hasAttribute\("data-editor-cancel"\)[\s\S]{0,160}editor-dialog"\)\.close\("cancel"\)/,
  "the click handler must close the editor explicitly when a cancel control is used"
);

console.log("Editor cancel contract passed: close controls bypass required-field validation.");

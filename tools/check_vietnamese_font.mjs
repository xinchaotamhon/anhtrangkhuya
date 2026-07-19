import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("styles.css", "utf8");
const userFacingFiles = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "src/defaults.js",
  "src/app.js"
];

assert.ok(
  css.includes("--font-serif-vietnamese:"),
  "styles.css must define one Vietnamese-capable serif stack"
);
assert.ok(
  !/\bGeorgia\b/i.test(css),
  "Georgia does not cover Windows Vietnamese code page 1258; do not use it for Vietnamese UI text"
);
assert.match(
  css,
  /--font-serif-vietnamese:[^;]*[\"']Times New Roman[\"'][^;]*serif;/,
  "the serif stack must prefer Times New Roman and retain a generic serif fallback"
);

for (const path of userFacingFiles) {
  const content = readFileSync(path, "utf8");
  assert.equal(content, content.normalize("NFC"), `${path} must use NFC-normalized Unicode text`);
}

console.log("Vietnamese font contract passed: supported serif stack and NFC text are present.");

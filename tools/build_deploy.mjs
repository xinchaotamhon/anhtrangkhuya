import assert from "node:assert/strict";
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const publicAssets = [
  "_headers",
  "assets/icon.svg",
  "index.html",
  "manifest.webmanifest",
  "src/app.js",
  "src/defaults.js",
  "src/model.js",
  "src/storage.js",
  "styles.css",
  "sw.js"
];

const projectRoot = process.cwd();
const outputRoot = path.resolve(projectRoot, "dist");
assert.equal(path.dirname(outputRoot), projectRoot, "dist must stay directly inside the project root");
assert.equal(path.basename(outputRoot), "dist", "refusing to clean an unexpected output directory");

await rm(outputRoot, { recursive: true, force: true });

for (const relative of publicAssets) {
  const source = path.resolve(projectRoot, relative);
  const destination = path.resolve(outputRoot, relative);
  assert.ok(source.startsWith(`${projectRoot}${path.sep}`), `source escaped project root: ${relative}`);
  assert.ok(destination.startsWith(`${outputRoot}${path.sep}`), `destination escaped dist: ${relative}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

console.log(`Built dist with ${publicAssets.length} reviewed public assets.`);

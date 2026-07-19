import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const expectedAssets = [
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

assert.ok(existsSync("wrangler.jsonc"), "wrangler.jsonc must pin the Worker deployment boundary");
const wrangler = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
assert.equal(wrangler.name, "anhtrangkhuya", "Wrangler must target the existing production Worker");
assert.equal(wrangler.assets?.directory, "./dist", "Only the generated dist directory may be deployed");

const build = spawnSync(process.execPath, ["tools/build_deploy.mjs"], { encoding: "utf8" });
assert.equal(build.status, 0, build.stderr || build.stdout || "deployment bundle build failed");

function listFiles(directory, prefix = "") {
  return readdirSync(directory).flatMap((name) => {
    const absolute = path.join(directory, name);
    const relative = path.posix.join(prefix, name);
    return statSync(absolute).isDirectory() ? listFiles(absolute, relative) : [relative];
  });
}

const actualAssets = listFiles("dist").sort();
assert.deepEqual(actualAssets, expectedAssets, "dist must contain only the public runtime allowlist");

for (const relative of expectedAssets) {
  assert.deepEqual(
    readFileSync(path.join("dist", relative)),
    readFileSync(relative),
    `${relative} in dist must be byte-identical to its reviewed source`
  );
}

console.log(`Deployment boundary passed: ${actualAssets.length} allowlisted runtime assets only.`);

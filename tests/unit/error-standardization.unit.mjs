import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  ERROR_DEFINITIONS,
  createError,
  normalizeError,
  toErrorRecord,
} from "../../scripts/modules/app-errors.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const created = createError("WORMHOLES_FOLDER_READ", "Native read failed", {
  cause: new Error("NotAllowedError"),
});
assert.equal(created.code, "WORMHOLES_FOLDER_READ");
assert.equal(created.userMessage, "Couldn’t read the folder. Reconnect it and try again.");
assert.match(created.action, /Reconnect/i);
assert.equal(created.recoverable, true);
assert.equal(created.cause.message, "NotAllowedError");

const native = Object.assign(new Error("QuotaExceededError"), {
  code: "WORMHOLES_STORAGE_CAPACITY",
});
const normalized = normalizeError(native);
assert.equal(normalized, native, "native Error identity should be preserved");
assert.equal(normalized.userMessage, "Storage is full. Free space, then try again.");
assert.match(normalized.action, /storage|backup/i);

const fallback = normalizeError(new TypeError("Unexpected technical detail"));
assert.equal(fallback.code, "WORMHOLES_ERROR");
assert.equal(fallback.userMessage, "Something went wrong. Try again.");

const record = toErrorRecord(created);
assert.deepEqual(Object.keys(record), [
  "name",
  "code",
  "message",
  "userMessage",
  "action",
  "recoverable",
]);
assert.equal(record.message, "Native read failed");

const bannedUserTerms = /localStorage|IndexedDB|DOMException|stack trace|internal ID|nesting depth|URL scheme|quota|schema|JSON/i;
for (const [code, definition] of Object.entries(ERROR_DEFINITIONS)) {
  const words = definition.userMessage.match(/[\p{L}\p{N}’'-]+/gu) || [];
  assert.ok(words.length <= 16, `${code} user message should stay concise (${words.length} words)`);
  assert.ok(definition.userMessage.length <= 100, `${code} user message should stay under 100 characters`);
  assert.ok(!bannedUserTerms.test(definition.userMessage), `${code} should avoid technical UI wording`);
  assert.ok(definition.action.length <= 130, `${code} action should stay concise`);
}

for (const file of fs.readdirSync(path.join(root, "scripts/modules")).filter((name) => name.endsWith(".mjs"))) {
  const source = read(`scripts/modules/${file}`);
  const pattern = /userMessage\s*:\s*(["'])(.*?)\1/gs;
  for (const match of source.matchAll(pattern)) {
    const message = match[2];
    const words = message.match(/[\p{L}\p{N}’'-]+/gu) || [];
    assert.ok(words.length <= 18, `${file} has a wordy userMessage: ${message}`);
    assert.ok(message.length <= 120, `${file} has an overly long userMessage: ${message}`);
    assert.ok(!bannedUserTerms.test(message), `${file} exposes technical wording in userMessage: ${message}`);
  }
}

const reporter = read("scripts/modules/error-reporting.mjs");
assert.match(reporter, /normalizeError\(error/);
assert.match(reporter, /row\.textContent = String\(text\)/, "Needs Attention list should render recovery copy, not raw errors");
assert.match(reporter, /technical:\s*\{[\s\S]*Code:[\s\S]*Context:[\s\S]*Message:/, "technical detail should remain available in More information");

for (const modulePath of [
  "scripts/modules/app-data-validation.mjs",
  "scripts/modules/file-limits.mjs",
  "scripts/modules/media-limits.mjs",
  "scripts/modules/content-limits.mjs",
  "scripts/modules/entity-limits.mjs",
  "scripts/modules/id-integrity.mjs",
  "scripts/modules/reference-integrity.mjs",
  "scripts/modules/url-safety.mjs",
  "scripts/modules/persisted-schema.mjs",
]) {
  assert.match(read(modulePath), /app-errors\.mjs/, `${modulePath} should use the shared error standard`);
  assert.match(read(modulePath), /createError/, `${modulePath} should create standardized coded errors`);
}

const build = read("tools/build-shared-modules.mjs");
assert.match(build, /app-errors\.mjs'\s*,\s*'scripts\/wormholes-app-errors\.js'/);
const manifest = read("scripts/modules/runtime-manifest.mjs");
assert.match(manifest, /moduleStep\("\.\/app-errors\.mjs"\)/);

const directName = fs.readdirSync(root).find((name) => /^Wormholes_Beta_\d+\.html$/.test(name));
assert.ok(directName, "direct-file runtime shell should exist");
const direct = read(directName);
const appErrorsIndex = direct.indexOf('src="scripts/wormholes-app-errors.js"');
const reporterIndex = direct.indexOf('src="scripts/wormholes-error-reporting.js"');
assert.ok(appErrorsIndex >= 0, "direct-file runtime should load the generated app-error standard");
assert.ok(appErrorsIndex < reporterIndex, "app-error standard should load before the reporter");

console.log("Error standardization tests passed.");

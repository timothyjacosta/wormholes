import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const lineCount = (relativePath) => read(relativePath).split(/\r?\n/).length;

const controllers = [
  "scripts/modules/literature-controller.mjs",
  "scripts/modules/data-portability-controller.mjs",
  "scripts/modules/archive-controller.mjs",
  "scripts/modules/vision-board-controller.mjs",
];
for (const file of controllers) {
  assert.ok(lineCount(file) <= 2800, `${file} should stay within the 2,800-line controller guardrail`);
}

const helpers = [
  ["scripts/modules/archive-view-helpers.mjs", "scripts/modules/archive-controller.mjs", "scripts/archive.js"],
  ["scripts/modules/archive-integrity-helpers.mjs", "scripts/modules/archive-controller.mjs", "scripts/archive.js"],
  ["scripts/modules/literature-view-helpers.mjs", "scripts/modules/literature-controller.mjs", "scripts/literature.js"],
  ["scripts/modules/literature-group-helpers.mjs", "scripts/modules/literature-controller.mjs", "scripts/literature.js"],
  ["scripts/modules/literature-content-helpers.mjs", "scripts/modules/literature-controller.mjs", "scripts/literature.js"],
  ["scripts/modules/literature-persistence-helpers.mjs", "scripts/modules/literature-controller.mjs", "scripts/literature.js"],
  ["scripts/modules/vision-board-view-helpers.mjs", "scripts/modules/vision-board-controller.mjs", "scripts/vision-board.js"],
  ["scripts/modules/vision-image-helpers.mjs", "scripts/modules/vision-board-controller.mjs", "scripts/vision-board.js"],
  ["scripts/modules/data-portability-backup-helpers.mjs", "scripts/modules/data-portability-controller.mjs", "scripts/export-import.js"],
  ["scripts/modules/data-portability-transaction-helpers.mjs", "scripts/modules/data-portability-controller.mjs", "scripts/export-import.js"],
  ["scripts/modules/theme-deck-portability.mjs", "scripts/modules/data-portability-controller.mjs", "scripts/export-import.js"],
  ["scripts/modules/data-portability-storage-helpers.mjs", "scripts/modules/data-portability-controller.mjs", "scripts/export-import.js"],
];

const buildTool = read("tools/build-shared-modules.mjs");
for (const [modulePath, ownerModulePath, ownerLegacyPath] of helpers) {
  assert.ok(lineCount(modulePath) <= 1100, `${modulePath} should remain a focused subsystem module`);
  assert.ok(read(ownerModulePath).includes(`./${path.basename(modulePath)}`), `${ownerModulePath} should import ${modulePath}`);
  assert.ok(buildTool.includes(modulePath), `${modulePath} should be embedded from its canonical source for direct-file compatibility`);
  assert.ok(read(ownerLegacyPath).includes(`EMBEDDED from ${modulePath} for direct-file compatibility`), `${ownerLegacyPath} should embed ${modulePath} in the generated direct-file adapter`);
}

console.log("controller-decomposition.unit.mjs passed");

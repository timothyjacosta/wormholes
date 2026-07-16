#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const testsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(testsDir, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(testsDir, "package.json"), "utf8"));
const runnerPath = path.join(root, "tools", "run-coverage.mjs");
const runner = fs.readFileSync(runnerPath, "utf8");

assert.equal(packageJson.scripts.coverage, "node ../tools/run-coverage.mjs", "Coverage command must use the project-local reporter.");
assert.match(runner, /NODE_V8_COVERAGE/, "Coverage runner must collect Node V8 coverage data.");
assert.match(runner, /test:unit:core/, "Coverage must run the non-timing unit suite rather than distort the performance benchmark.");
assert.match(runner, /scripts["'],\s*["']modules/, "Coverage runner must target canonical scripts/modules source.");
assert.match(runner, /coverage-summary\.json/, "Coverage runner must emit a machine-readable JSON summary.");
assert.match(runner, /index\.html/, "Coverage runner must emit a browsable HTML report.");
assert.match(runner, /thresholdsEnforced:false/, "Coverage must remain diagnostic rather than enforce an arbitrary percentage threshold.");
assert.doesNotMatch(runner, /scripts\/\*\.js/, "Generated classic compatibility files must not be included in the coverage scope.");

console.log("Coverage reporting configuration unit checks passed.");

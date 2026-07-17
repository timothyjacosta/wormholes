const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const baselinePath = path.join(root, ".github", "workflows", "baseline-ci.yml");
const releasePath = path.join(root, ".github", "workflows", "release-artifact.yml");
const packagePath = path.join(root, "tests", "package.json");
const documentationPath = path.join(root, "docs", "quality", "BASELINE_CI.md");

assert.ok(fs.existsSync(baselinePath), "one clearly named baseline CI workflow should exist");
assert.ok(fs.existsSync(documentationPath), "baseline CI required-check instructions should exist");

const workflow = fs.readFileSync(baselinePath, "utf8");
const releaseWorkflow = fs.readFileSync(releasePath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const documentation = fs.readFileSync(documentationPath, "utf8");

assert.match(workflow, /^name: Baseline CI$/m, "the workflow should have a stable, recognizable name");
assert.match(workflow, /^  push:$/m, "baseline CI should run for pushes");
assert.match(workflow, /^  pull_request:$/m, "baseline CI should run for pull requests");
assert.match(workflow, /^  merge_group:$/m, "baseline CI should support GitHub merge queues");
assert.match(workflow, /^  workflow_call:$/m, "release workflows should be able to require baseline CI");
assert.match(workflow, /^    name: Required baseline$/m, "the required check name should stay stable");
assert.match(workflow, /working-directory: tests\n        run: npm ci/, "locked dependencies must be installed");
assert.match(workflow, /run: npm run quality/, "the aggregate quality command must run");
assert.match(workflow, /run: npm run test:unit:core/, "the full core unit suite must run");
assert.match(workflow, /build-release-artifact\.mjs/, "baseline CI must build a real release-shaped ZIP");
assert.strictEqual(
  (workflow.match(/build-release-artifact\.mjs/g) || []).length,
  1,
  "the baseline artifact should be assembled exactly once",
);
assert.match(workflow, /verify-release-artifact\.mjs/, "the artifact checksum and shape must be verified");
assert.match(workflow, /npm run ci:baseline:artifact-smoke/, "the extracted artifact must run a browser smoke test");
assert.doesNotMatch(workflow, /continue-on-error\s*:\s*true/, "baseline failures must never be ignored");

assert.strictEqual(
  packageJson.scripts["ci:baseline:artifact-smoke"],
  "playwright test -c playwright.config.js e2e/smoke.spec.js --project=chromium-desktop --workers=1",
  "the baseline browser command should run the complete desktop smoke suite",
);

assert.match(releaseWorkflow, /baseline-ci:\n\s+name: Required baseline before release\n\s+uses: \.\/\.github\/workflows\/baseline-ci\.yml/, "release must call the reusable baseline workflow");
assert.match(releaseWorkflow, /release-artifact:\n\s+name:[^\n]+\n\s+needs: \[baseline-ci, security-ci\]/, "release publication must wait for baseline CI");
assert.doesNotMatch(releaseWorkflow, /continue-on-error\s*:\s*true/, "release must not bypass baseline failure");

assert.match(documentation, /Required baseline/, "documentation should name the exact required check");
assert.match(documentation, /branch protection|ruleset/i, "documentation should explain the repository merge setting");
assert.match(documentation, /release-artifact[\s\S]*needs: baseline-ci/, "documentation should explain release enforcement");

console.log("baseline-ci.unit.js passed");

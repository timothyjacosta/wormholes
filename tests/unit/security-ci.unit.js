const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const workflowPath = path.join(root, ".github", "workflows", "security.yml");
const releasePath = path.join(root, ".github", "workflows", "release-artifact.yml");
const packagePath = path.join(root, "tests", "package.json");
const documentationPath = path.join(root, "docs", "security", "SECURITY_CI.md");

for (const required of [workflowPath, releasePath, packagePath, documentationPath]) {
  assert.ok(fs.existsSync(required), `required Security CI file should exist: ${path.relative(root, required)}`);
}

const workflow = fs.readFileSync(workflowPath, "utf8");
const release = fs.readFileSync(releasePath, "utf8");
const scripts = JSON.parse(fs.readFileSync(packagePath, "utf8")).scripts;
const docs = fs.readFileSync(documentationPath, "utf8");

assert.match(workflow, /^name: Security CI$/m);
assert.match(workflow, /^  push:$/m);
assert.match(workflow, /^  pull_request:$/m);
assert.match(workflow, /^  merge_group:$/m);
assert.match(workflow, /^  workflow_call:$/m);
assert.match(workflow, /^    name: Required security$/m);
assert.match(workflow, /working-directory: tests\n        run: npm ci/);
assert.match(workflow, /playwright install --with-deps chromium/);
assert.match(workflow, /name: Check served Content Security Policy/);
assert.match(workflow, /name: Check XSS protections/);
assert.match(workflow, /name: Check every declared input path/);
assert.match(workflow, /name: Check rich-text sanitization/);
assert.match(workflow, /name: Check URL hardening/);
assert.match(workflow, /name: Check import validation/);
for (const command of [
  "ci:security:csp",
  "ci:security:xss",
  "ci:security:inputs",
  "ci:security:sanitization",
  "ci:security:urls",
  "ci:security:imports",
]) {
  assert.match(workflow, new RegExp(`run: npm run ${command.replaceAll(":", "\\:")}`));
  assert.ok(scripts[command], `${command} should be defined`);
  assert.match(scripts["ci:security"], new RegExp(command.replaceAll(":", "\\:")));
}
assert.match(workflow, /WORMHOLES_CSP_NAVIGATION: served/);
assert.doesNotMatch(workflow, /continue-on-error\s*:\s*true/);

for (const unitFile of [
  "trust-boundaries.unit.js",
  "content-security-policy.unit.js",
  "xss-regression-payloads.unit.js",
  "malicious-input-paths.unit.js",
  "safe-render-helpers.unit.js",
  "import-rich-text-sanitization.unit.js",
  "url-link-hardening.unit.js",
  "malformed-import-regressions.unit.js",
]) {
  assert.match(scripts["test:security:unit"], new RegExp(unitFile.replaceAll(".", "\\.")));
}
for (const browserFile of [
  "literature-xss-browser.js",
  "content-security-policy.spec.js",
  "xss-regression.spec.js",
  "malicious-input-paths.spec.js",
  "url-link-hardening.spec.js",
  "malformed-import.spec.js",
]) {
  assert.match(scripts["test:security:browser"], new RegExp(browserFile.replaceAll(".", "\\.")));
}
assert.match(scripts["test:security:browser"], /playwright.security.config.js/);
const securityConfig = fs.readFileSync(path.join(root, "tests", "playwright.security.config.js"), "utf8");
assert.match(securityConfig, /workers:\s*1/);
assert.match(securityConfig, /retries:\s*0/);


assert.match(release, /security-ci:\n\s+name: Required security before release\n\s+uses: \.\/\.github\/workflows\/security\.yml/);
assert.match(release, /needs: \[baseline-ci, security-ci\]/);
assert.match(release, /Run security gates against the packaged artifact[\s\S]*npm run ci:security/);
assert.match(release, /Run security gates against the packaged artifact[\s\S]*WORMHOLES_CSP_NAVIGATION: served/);
assert.doesNotMatch(release, /continue-on-error\s*:\s*true/);

assert.match(docs, /Required security/);
assert.match(docs, /served Content Security Policy/i);
assert.match(docs, /XSS/i);
assert.match(docs, /malicious input/i);
assert.match(docs, /sanitization/i);
assert.match(docs, /URL hardening/i);
assert.match(docs, /import validation/i);

console.log("security-ci.unit.js passed");

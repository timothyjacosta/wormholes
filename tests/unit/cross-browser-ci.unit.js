const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const workflowPath = path.join(root, ".github", "workflows", "cross-browser.yml");
const packagePath = path.join(root, "tests", "package.json");
const specPath = path.join(root, "tests", "e2e", "cross-browser.spec.js");
const configPath = path.join(root, "tests", "playwright.cross-browser.config.js");
const docsPath = path.join(root, "docs", "quality", "CROSS_BROWSER_VALIDATION.md");
const releaseWorkflowPath = path.join(root, ".github", "workflows", "release-artifact.yml");

for (const requiredPath of [workflowPath, specPath, configPath, docsPath, releaseWorkflowPath]) {
  assert.ok(fs.existsSync(requiredPath), `Missing cross-browser validation asset: ${requiredPath}`);
}

const workflow = fs.readFileSync(workflowPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const spec = fs.readFileSync(specPath, "utf8");
const config = fs.readFileSync(configPath, "utf8");
const docs = fs.readFileSync(docsPath, "utf8");
const releaseWorkflow = fs.readFileSync(releaseWorkflowPath, "utf8");

for (const trigger of ["push:", "pull_request:", "workflow_dispatch:"]) {
  assert.ok(
    workflow.includes(trigger),
    `Cross-browser CI must run on ${trigger.replace(":", "")}.`,
  );
}
assert.match(
  workflow,
  /permissions:\s*[\s\S]*contents:\s*read/,
  "Cross-browser CI should use read-only repository permissions.",
);
assert.match(
  workflow,
  /node-version:\s*22/,
  "Cross-browser CI must use the supported Node.js major version.",
);
assert.match(workflow, /run:\s*npm ci/, "Cross-browser CI must use the locked dependency graph.");
assert.match(
  workflow,
  /playwright install --with-deps chromium firefox webkit/,
  "Cross-browser CI must install all three browser engines and their system dependencies.",
);
assert.match(
  workflow,
  /run:\s*npm run ci:cross-browser/,
  "Cross-browser CI must invoke the repository cross-browser gate.",
);
assert.match(
  workflow,
  /if:\s*always\(\)/,
  "Cross-browser reports must be retained even when the gate fails.",
);
assert.match(
  workflow,
  /actions\/upload-artifact@v4/,
  "Cross-browser CI must upload its Playwright report.",
);

const scripts = packageJson.scripts || {};
assert.match(
  scripts["test:cross-browser"] || "",
  /playwright\.cross-browser\.config\.js/,
  "The cross-browser command must use its dedicated config.",
);
assert.match(
  scripts["ci:cross-browser"] || "",
  /unit\/cross-browser-ci\.unit\.js/,
  "The cross-browser gate must validate its own wiring.",
);
assert.match(
  scripts["ci:cross-browser"] || "",
  /npm run test:cross-browser/,
  "The cross-browser gate must execute the browser matrix.",
);
assert.match(
  scripts["test:release:cross-browser"] || "",
  /uploads Literature and Vision Board files through browser storage/,
  "The release cross-browser command must hard-gate the existing upload scenario.",
);
assert.match(
  scripts["test:release:cross-browser"] || "",
  /playwright\.cross-browser\.config\.js/,
  "The release cross-browser command must use the four-project cross-browser config.",
);
assert.match(
  scripts["ci:release:cross-browser"] || "",
  /npm run test:release:cross-browser/,
  "The release cross-browser gate must execute the critical upload scenario.",
);
assert.match(
  releaseWorkflow,
  /playwright install --with-deps chromium firefox webkit/,
  "The release workflow must install Chromium, Firefox, and WebKit.",
);
assert.match(
  releaseWorkflow,
  /npm run ci:release:cross-browser/,
  "The exact packaged artifact must run the required cross-browser release gate.",
);
const releaseGateStep = /- name: Run required cross-browser release gate against the packaged artifact[\s\S]*?(?=\n      - name:|$)/.exec(
  releaseWorkflow,
)?.[0] || "";
assert.ok(releaseGateStep, "The release workflow must contain the packaged-artifact cross-browser step.");
assert.doesNotMatch(
  releaseGateStep,
  /continue-on-error:\s*true/,
  "A failed cross-browser retry must still block the release.",
);
assert.match(
  config,
  /retries:\s*process\.env\.CI \? 1 : 0/,
  "CI should allow one diagnostic retry while preserving final failure status.",
);

for (const project of ["chromium-desktop", "firefox-desktop", "webkit-desktop"]) {
  assert.ok(
    config.includes(`name: "${project}"`) || config.includes(`name: '${project}'`),
    `Cross-browser config must retain the ${project} profile.`,
  );
}
for (const browser of ["Desktop Chrome", "Desktop Firefox", "Desktop Safari"]) {
  assert.ok(
    config.includes(`devices["${browser}"]`) || config.includes(`devices['${browser}']`),
    `Cross-browser config must retain the ${browser} device profile.`,
  );
}
assert.ok(
  /testMatch:\s*[\"']cross-browser\.spec\.js[\"']/.test(config),
  "Cross-browser runs must stay isolated to the dedicated smoke suite.",
);
assert.ok(
  config.includes("forbidOnly: !!process.env.CI"),
  "CI must reject accidentally committed focused tests.",
);
assert.ok(
  /trace:\s*[\"']on-first-retry[\"']/.test(config),
  "Cross-browser failures should retain a diagnostic trace on retry.",
);

for (const capability of [
  "boots cleanly",
  "creates, archives, reloads",
  "global search",
  "uploads Literature",
  "creates a connection",
]) {
  assert.ok(spec.includes(capability), `Cross-browser smoke coverage must retain: ${capability}.`);
}
assert.match(docs, /Chromium/i, "Cross-browser documentation must describe Chromium coverage.");
assert.match(docs, /Firefox/i, "Cross-browser documentation must describe Firefox coverage.");
assert.match(docs, /WebKit/i, "Cross-browser documentation must describe WebKit coverage.");

console.log("Cross-browser CI wiring regression tests passed.");

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const workflowPath = path.join(root, ".github", "workflows", "private-browser-storage.yml");
const packagePath = path.join(root, "tests", "package.json");
const specPath = path.join(root, "tests", "e2e", "private-browser-and-clearing.spec.js");
const fixturePath = path.join(root, "tests", "fixtures", "storage-origin.html");
const docsPath = path.join(root, "docs", "quality", "PRIVATE_BROWSER_AND_CLEARING_VALIDATION.md");
const storageHeavyPath = path.join(root, "tests", "support", "storage-heavy-specs.js");

for (const requiredPath of [workflowPath, specPath, fixturePath, docsPath, storageHeavyPath]) {
  assert.ok(fs.existsSync(requiredPath), `Missing private-browser storage asset: ${requiredPath}`);
}

const workflow = fs.readFileSync(workflowPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const spec = fs.readFileSync(specPath, "utf8");
const docs = fs.readFileSync(docsPath, "utf8");
const storageHeavy = fs.readFileSync(storageHeavyPath, "utf8");

for (const trigger of ["push:", "pull_request:", "workflow_dispatch:"]) {
  assert.ok(
    workflow.includes(trigger),
    `Private-browser storage CI must run on ${trigger.replace(":", "")}.`,
  );
}
assert.match(
  workflow,
  /permissions:\s*[\s\S]*contents:\s*read/,
  "Private-browser storage CI should use read-only repository permissions.",
);
assert.match(
  workflow,
  /node-version:\s*22/,
  "Private-browser storage CI must use the supported Node.js major version.",
);
assert.match(
  workflow,
  /run:\s*npm ci/,
  "Private-browser storage CI must use the locked dependency graph.",
);
assert.match(
  workflow,
  /playwright install --with-deps chromium/,
  "Private-browser storage CI must install Chromium and its system dependencies.",
);
assert.match(
  workflow,
  /run:\s*npm run ci:private-browser-storage/,
  "Private-browser storage CI must invoke the repository gate.",
);
assert.match(
  workflow,
  /if:\s*always\(\)/,
  "Private-browser storage reports must be retained even when the gate fails.",
);
assert.match(
  workflow,
  /actions\/upload-artifact@v4/,
  "Private-browser storage CI must upload its Playwright report.",
);

const scripts = packageJson.scripts || {};
assert.match(
  scripts["test:private-browser-storage"] || "",
  /playwright\.storage\.config\.js/,
  "The private-browser storage command must use the serialized storage configuration.",
);
assert.match(
  scripts["test:private-browser-storage"] || "",
  /private-browser-and-clearing\.spec\.js/,
  "The private-browser storage command must target the dedicated suite.",
);
assert.match(
  scripts["test:private-browser-storage"] || "",
  /--project=chromium-desktop/,
  "The dedicated gate must use the Chromium desktop profile.",
);
assert.match(
  scripts["ci:private-browser-storage"] || "",
  /unit\/private-browser-storage-ci\.unit\.js/,
  "The CI gate must validate its own wiring.",
);
assert.match(
  scripts["ci:private-browser-storage"] || "",
  /npm run test:private-browser-storage/,
  "The CI gate must execute the browser suite.",
);
assert.ok(
  storageHeavy.includes("private-browser-and-clearing.spec.js"),
  "Storage-clearing browser tests must remain in the serialized storage-heavy group.",
);

for (const capability of [
  "cannot see regular-context data",
  "clearing all browser site data",
  "clearing local storage",
  "clearing IndexedDB",
]) {
  assert.ok(
    spec.includes(capability),
    `Private-browser storage coverage must retain: ${capability}.`,
  );
}
assert.match(docs, /private\/incognito/i, "Documentation must explain private/incognito coverage.");
assert.match(docs, /IndexedDB/i, "Documentation must describe IndexedDB clearing coverage.");
assert.match(
  docs,
  /local storage/i,
  "Documentation must describe local-storage clearing coverage.",
);

console.log("Private-browser storage CI wiring regression tests passed.");

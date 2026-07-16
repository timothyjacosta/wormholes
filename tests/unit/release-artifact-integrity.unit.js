const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {spawnSync} = require("child_process");

const root = path.resolve(__dirname, "..", "..");
const workflowPath = path.join(root, ".github", "workflows", "release-artifact.yml");
const buildToolPath = path.join(root, "tools", "build-release-artifact.mjs");
const verifyToolPath = path.join(root, "tools", "verify-release-artifact.mjs");

assert.ok(fs.existsSync(workflowPath), "release artifact workflow should exist");
assert.ok(fs.existsSync(buildToolPath), "release artifact build tool should exist");
assert.ok(fs.existsSync(verifyToolPath), "release artifact verification tool should exist");

const workflow = fs.readFileSync(workflowPath, "utf8");
const stepOrder = [
  "Install locked dependencies",
  "Run required quality checks before packaging",
  "Run required unit tests before packaging",
  "Assemble immutable release artifact exactly once",
  "Verify recorded checksum before release-candidate testing",
  "Extract the exact packaged artifact",
  "Run critical browser tests against the packaged artifact",
  "Run required cross-browser release gate against the packaged artifact",
  "Run accessibility gates against the packaged artifact",
  "Run performance gates against the packaged artifact",
  "Run security gates against the packaged artifact",
  "Prove the tested artifact was not changed",
  "Publish the exact tested files as a workflow artifact",
];
let previous = -1;
for (const label of stepOrder) {
  const index = workflow.indexOf(label);
  assert.ok(index > previous, `release workflow step should appear in order: ${label}`);
  previous = index;
}

assert.strictEqual(
  (workflow.match(/build-release-artifact\.mjs/g) || []).length,
  1,
  "release workflow must assemble the release artifact exactly once",
);
assert.match(workflow, /--commit "\$GITHUB_SHA"/, "release build must be tied to the exact workflow commit");
assert.match(workflow, /npm ci/, "release workflow must install locked dependencies");
assert.match(workflow, /npm run quality/, "quality must run before packaging");
assert.match(workflow, /npm run test:unit:core/, "unit tests must run before packaging");
assert.match(workflow, /npm run ci:release:critical/, "packaged artifact must run critical browser tests");
assert.match(
  workflow,
  /playwright install --with-deps chromium firefox webkit/,
  "release workflow must install all required browser engines",
);
assert.match(
  workflow,
  /npm run ci:release:cross-browser/,
  "packaged artifact must pass the required cross-browser release gate",
);
assert.match(workflow, /npm run ci:accessibility/, "packaged artifact must run accessibility gates");
assert.match(workflow, /npm run ci:performance/, "packaged artifact must run performance gates");
assert.match(workflow, /npm run ci:security/, "packaged artifact must run security gates");
assert.match(workflow, /actions\/upload-artifact@v4/, "tested artifact must be published unchanged");
assert.match(workflow, /gh release upload/, "tagged releases must upload the same tested artifact");
assert.doesNotMatch(workflow, /--clobber/, "published release assets must not overwrite an earlier artifact");

const buildTool = fs.readFileSync(buildToolPath, "utf8");
assert.match(buildTool, /spawnSync\(\s*"git",\s*\[\s*"archive"/s, "release tool must build from git archive");
assert.match(buildTool, /rev-parse["'], ["']HEAD/, "release tool must resolve the exact HEAD commit");
assert.match(buildTool, /refusing to overwrite or repackage/, "release tool must refuse artifact overwrite");
assert.match(buildTool, /chmodSync\(artifactPath, 0o444\)/, "built artifact should be made read-only");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "wormholes-release-integrity-"));
const toolsDir = path.join(temp, "tools");
fs.mkdirSync(toolsDir, {recursive: true});
fs.copyFileSync(buildToolPath, path.join(toolsDir, "build-release-artifact.mjs"));
fs.copyFileSync(verifyToolPath, path.join(toolsDir, "verify-release-artifact.mjs"));
fs.writeFileSync(path.join(temp, "Wormholes_Beta_999.html"), "<title>Beta 999</title>\n");
fs.writeFileSync(path.join(temp, "Wormholes_Beta_999.served.html"), "<title>Beta 999 served</title>\n");
fs.writeFileSync(path.join(temp, "app.txt"), "immutable source\n");

function run(command, args, options = {}) {
  return spawnSync(command, args, {cwd: temp, encoding: "utf8", ...options});
}

assert.strictEqual(run("git", ["init", "-q"]).status, 0, "temporary release repository should initialize");
assert.strictEqual(run("git", ["config", "user.email", "release-test@example.invalid"]).status, 0);
assert.strictEqual(run("git", ["config", "user.name", "Release Test"]).status, 0);
assert.strictEqual(run("git", ["add", "."]).status, 0);
assert.strictEqual(run("git", ["commit", "-qm", "release source"]).status, 0);
const head = run("git", ["rev-parse", "HEAD"]).stdout.trim();

const build = run(process.execPath, [
  path.join(toolsDir, "build-release-artifact.mjs"),
  "--commit",
  head,
  "--output-dir",
  "dist",
]);
assert.strictEqual(build.status, 0, build.stderr || build.stdout);

const artifact = path.join(temp, "dist", "Wormholes_Beta_999.zip");
const checksum = path.join(temp, "dist", "Wormholes_Beta_999.sha256");
assert.ok(fs.existsSync(artifact), "build tool should create one release ZIP");
assert.ok(fs.existsSync(checksum), "build tool should create a SHA-256 file");

const verify = run(process.execPath, [
  path.join(toolsDir, "verify-release-artifact.mjs"),
  "--artifact",
  artifact,
  "--checksum",
  checksum,
]);
assert.strictEqual(verify.status, 0, verify.stderr || verify.stdout);

const secondBuild = run(process.execPath, [
  path.join(toolsDir, "build-release-artifact.mjs"),
  "--commit",
  head,
  "--output-dir",
  "dist",
]);
assert.notStrictEqual(secondBuild.status, 0, "build tool must refuse to overwrite the tested artifact");

fs.writeFileSync(path.join(temp, "app.txt"), "changed after commit\n");
const dirtyBuild = run(process.execPath, [
  path.join(toolsDir, "build-release-artifact.mjs"),
  "--commit",
  head,
  "--output-dir",
  "other-dist",
]);
assert.notStrictEqual(dirtyBuild.status, 0, "build tool must refuse tracked source changes after the release commit");

fs.rmSync(temp, {recursive: true, force: true});
console.log("release-artifact-integrity.unit.js passed");

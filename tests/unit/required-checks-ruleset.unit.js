const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");

const root = path.resolve(__dirname, "..", "..");
const workflowPath = path.join(root, ".github", "workflows", "configure-required-checks.yml");
const toolPath = path.join(root, "tools", "configure-required-checks.mjs");
const docsPath = path.join(root, "docs", "quality", "BASELINE_CI.md");
for (const file of [workflowPath, toolPath, docsPath]) assert.ok(fs.existsSync(file));

const workflow = fs.readFileSync(workflowPath, "utf8");
assert.match(workflow, /^name: Configure required repository checks$/m);
assert.match(workflow, /^  workflow_dispatch:$/m);
assert.match(workflow, /WORMHOLES_REPOSITORY_ADMIN_TOKEN/);
assert.match(workflow, /configure-required-checks\.mjs/);
assert.match(workflow, /--repository "\$GITHUB_REPOSITORY"/);

const run = spawnSync(process.execPath, [toolPath, "--print-payload"], {encoding: "utf8"});
assert.strictEqual(run.status, 0, run.stderr || run.stdout);
const payload = JSON.parse(run.stdout);
assert.strictEqual(payload.name, "Wormholes required checks");
assert.strictEqual(payload.enforcement, "active");
assert.deepStrictEqual(payload.conditions.ref_name.include, ["~DEFAULT_BRANCH"]);
const rule = payload.rules.find((item) => item.type === "required_status_checks");
assert.ok(rule, "ruleset should require status checks");
assert.strictEqual(rule.parameters.strict_required_status_checks_policy, true);
assert.deepStrictEqual(rule.parameters.required_status_checks.map((item) => item.context), [
  "Required baseline",
  "Required security",
]);

const docs = fs.readFileSync(docsPath, "utf8");
assert.match(docs, /Configure required repository checks/);
assert.match(docs, /WORMHOLES_REPOSITORY_ADMIN_TOKEN/);
assert.match(docs, /Administration.*write/i);

console.log("required-checks-ruleset.unit.js passed");

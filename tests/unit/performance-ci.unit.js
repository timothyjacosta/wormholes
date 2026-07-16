'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const workflowPath = path.join(root, '.github', 'workflows', 'performance.yml');
const packagePath = path.join(root, 'tests', 'package.json');
const specPath = path.join(root, 'tests', 'e2e', 'performance-budgets.spec.js');
const runnerPath = path.join(root, 'tests', 'performance', 'run-browser-performance.js');
const configPath = path.join(root, 'tests', 'playwright.config.js');

assert.ok(fs.existsSync(workflowPath), 'A dedicated performance CI workflow must exist.');

const workflow = fs.readFileSync(workflowPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const spec = fs.readFileSync(specPath, 'utf8');
const runner = fs.readFileSync(runnerPath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8');

for (const trigger of ['push:', 'pull_request:', 'workflow_dispatch:']) {
  assert.ok(workflow.includes(trigger), `Performance CI must run on ${trigger.replace(':', '')}.`);
}
assert.match(workflow, /permissions:\s*[\s\S]*contents:\s*read/, 'Performance CI should use read-only repository permissions.');
assert.match(workflow, /actions\/setup-node@v4/, 'Performance CI must install a pinned major Node setup action.');
assert.match(workflow, /node-version:\s*22/, 'Performance CI must use the supported Node.js major version.');
assert.match(workflow, /cache-dependency-path:\s*tests\/package-lock\.json/, 'Performance CI must key its npm cache from the lockfile.');
assert.match(workflow, /run:\s*npm ci/, 'Performance CI must use the locked dependency graph.');
assert.match(workflow, /run:\s*node unit\/performance-ci\.unit\.js/, 'Performance CI must validate its own wiring before benchmarking.');
assert.match(workflow, /run:\s*npm run perf:ci:node/, 'Performance CI must run portable Node budgets.');
assert.match(workflow, /playwright install --with-deps chromium/, 'Performance CI must install Chromium and its system dependencies.');
assert.match(workflow, /run:\s*npm run perf:ci:browser/, 'Performance CI must run Chromium interaction budgets.');
assert.match(workflow, /if:\s*always\(\)/, 'Performance reports must be retained even when a budget fails.');
assert.match(workflow, /actions\/upload-artifact@v4/, 'Performance CI must upload its reports.');
assert.match(workflow, /tests\/performance\/results\//, 'Performance CI must retain JSON timing reports.');
assert.match(workflow, /retention-days:\s*30/, 'Performance timing reports should remain available for comparison.');

const scripts = packageJson.scripts || {};
assert.match(scripts['perf:ci:node'] || '', /--all --check --iterations 3/, 'The CI Node benchmark must use every deterministic scenario and median multiple samples.');
assert.match(scripts['perf:ci:node'] || '', /--output performance\/results\/node-performance\.json/, 'The CI Node benchmark must write a durable JSON report.');
assert.match(scripts['perf:ci:browser'] || '', /run-browser-performance\.js --ci/, 'The CI browser command must use the controlled performance runner.');
assert.match(scripts['ci:performance'] || '', /unit\/performance-ci\.unit\.js/, 'The local CI gate must validate its own wiring.');
assert.match(scripts['ci:performance'] || '', /perf:ci:node/, 'The local CI gate must run Node budgets.');
assert.match(scripts['ci:performance'] || '', /perf:ci:browser/, 'The local CI gate must run browser budgets.');

assert.match(runner, /--workers=1/, 'Browser performance checks must use one worker to reduce timing contention.');
assert.match(runner, /--retries=0/, 'Browser performance checks must not hide slow runs behind retries.');
assert.match(runner, /WORMHOLES_RUN_BROWSER_PERF:'1'/, 'The runner must explicitly enable opt-in browser performance tests.');
assert.match(runner, /WORMHOLES_BROWSER_PERF_REPORT/, 'The runner must select a durable browser report path.');
assert.match(runner, /WORMHOLES_BROWSER_PERF_SCENARIOS:'small,medium'/, 'CI browser performance checks must use the stable small and medium interaction profiles.');
assert.match(runner, /browser-performance\.json/, 'The runner must preserve a stable browser report filename.');

for (const scenario of ['small', 'medium', 'large-single', 'dense-map']) {
  assert.ok(spec.includes(`'${scenario}'`), `Browser performance CI must retain the ${scenario} scenario.`);
}
for (const metric of ['importMs', 'archiveTabMs', 'literatureTabMs', 'visionTabMs', 'globalSearchOpenMs', 'globalSearchQueryMs', 'connectionsMapMs']) {
  assert.ok(spec.includes(`'${metric}'`), `Browser performance CI must retain the ${metric} interaction budget.`);
}
assert.match(spec, /WORMHOLES_BROWSER_PERF_REPORT/, 'Browser performance tests must write to the configured timing report.');
assert.match(spec, /fs\.writeFileSync/, 'Browser performance tests must persist their measurements even outside the HTML report.');
assert.ok(config.includes("name: 'chromium-desktop'"), 'Playwright must retain the calibrated desktop Chromium profile.');
assert.ok(config.includes('forbidOnly: !!process.env.CI'), 'CI must reject accidentally committed focused tests.');

console.log('Performance CI wiring regression tests passed.');

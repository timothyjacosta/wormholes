const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const workflowPath = path.join(root, '.github', 'workflows', 'accessibility.yml');
const packagePath = path.join(root, 'tests', 'package.json');
const specPath = path.join(root, 'tests', 'e2e', 'accessibility.spec.js');
const configPath = path.join(root, 'tests', 'playwright.config.js');

assert.ok(fs.existsSync(workflowPath), 'A dedicated accessibility CI workflow must exist.');

const workflow = fs.readFileSync(workflowPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const spec = fs.readFileSync(specPath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8');

for (const trigger of ['push:', 'pull_request:', 'workflow_dispatch:']) {
  assert.ok(workflow.includes(trigger), `Accessibility CI must run on ${trigger.replace(':', '')}.`);
}
assert.match(workflow, /permissions:\s*[\s\S]*contents:\s*read/, 'Accessibility CI should use read-only repository permissions.');
assert.match(workflow, /actions\/setup-node@v4/, 'Accessibility CI must install a pinned major Node setup action.');
assert.match(workflow, /node-version:\s*22/, 'Accessibility CI must use the supported Node.js major version.');
assert.match(workflow, /cache-dependency-path:\s*tests\/package-lock\.json/, 'Accessibility CI must key its npm cache from the lockfile.');
assert.match(workflow, /run:\s*npm ci/, 'Accessibility CI must use the locked dependency graph.');
assert.match(workflow, /playwright install --with-deps chromium/, 'Accessibility CI must install Chromium and its system dependencies.');
assert.match(workflow, /run:\s*npm run ci:accessibility/, 'Accessibility CI must invoke the repository accessibility gate.');
assert.match(workflow, /if:\s*always\(\)/, 'Accessibility reports must be retained even when the gate fails.');
assert.match(workflow, /actions\/upload-artifact@v4/, 'Accessibility CI must upload its Playwright report.');

const scripts = packageJson.scripts || {};
assert.strictEqual(
  scripts['test:a11y'],
  'npm run test:a11y:desktop',
  'The default accessibility command must run the desktop scan.'
);
assert.match(scripts['ci:accessibility'] || '', /unit\/accessibility-ci\.unit\.js/, 'The CI gate must validate its own wiring.');
assert.match(scripts['ci:accessibility'] || '', /npm run test:a11y/, 'The CI gate must execute Axe browser scans.');
assert.match(scripts['test:a11y:desktop'] || '', /--project=chromium-desktop/, 'The desktop accessibility command must target the desktop profile.');

for (const project of ['chromium-desktop']) {
  assert.ok(config.includes(`name: '${project}'`), `Playwright must retain the ${project} accessibility profile.`);
}
assert.ok(config.includes('forbidOnly: !!process.env.CI'), 'CI must reject accidentally committed focused tests.');
assert.ok(config.includes("trace: 'on-first-retry'"), 'CI accessibility failures should retain a diagnostic trace on retry.');

assert.ok(spec.includes("@axe-core/playwright"), 'Accessibility scans must use Axe through Playwright.');
for (const tag of ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) {
  assert.ok(spec.includes(`'${tag}'`), `Accessibility scans must retain the ${tag} ruleset.`);
}
for (const surface of ['Home', 'Create tab', 'Archive', 'Literature', 'Vision Board', 'Global Search', 'Settings', 'Connections map', 'Manage Bridges']) {
  assert.ok(spec.includes(`'${surface}'`), `Accessibility scans must retain coverage for ${surface}.`);
}
assert.match(spec, /expect\(violations[\s\S]*toEqual\(\[\]\)/, 'Any Axe violation must fail the accessibility gate.');

console.log('Accessibility CI wiring regression tests passed.');

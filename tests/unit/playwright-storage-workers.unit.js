'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const tests = path.join(root, 'tests');
const packageJson = JSON.parse(fs.readFileSync(path.join(tests, 'package.json'), 'utf8'));
const mainConfig = fs.readFileSync(path.join(tests, 'playwright.config.js'), 'utf8');
const storageConfig = fs.readFileSync(path.join(tests, 'playwright.storage.config.js'), 'utf8');
const manifestPath = path.join(tests, 'support', 'storage-heavy-specs.js');
const manifestSource = fs.readFileSync(manifestPath, 'utf8');
const { STORAGE_HEAVY_SPEC_NAMES, STORAGE_HEAVY_TEST_MATCH } = require(manifestPath);
const scripts = packageJson.scripts || {};

assert.ok(STORAGE_HEAVY_SPEC_NAMES.length >= 12, 'The storage-heavy suite should retain a meaningful persistence-focused manifest.');
assert.strictEqual(STORAGE_HEAVY_SPEC_NAMES.length, new Set(STORAGE_HEAVY_SPEC_NAMES).size, 'The storage-heavy manifest must not contain duplicate specs.');
assert.strictEqual(STORAGE_HEAVY_TEST_MATCH.length, STORAGE_HEAVY_SPEC_NAMES.length, 'Every storage-heavy spec should have one matching pattern.');

for(const name of STORAGE_HEAVY_SPEC_NAMES){
  const specPath = path.join(tests, 'e2e', name);
  assert.ok(fs.existsSync(specPath), `Storage-heavy spec must exist: ${name}`);
  assert.ok(STORAGE_HEAVY_TEST_MATCH.some(pattern => pattern.test(specPath)), `Storage-heavy matchers must include ${name}`);
}

for(const required of [
  'corrupted-storage-startup.spec.js',
  'folder-sync.spec.js',
  'literature-lifecycle.spec.js',
  'malformed-import.spec.js',
  'schema-version-migrations.spec.js',
  'vision-board-lifecycle.spec.js',
  'write-ahead-journal.spec.js'
]){
  assert.ok(STORAGE_HEAVY_SPEC_NAMES.includes(required), `Storage-heavy manifest must retain ${required}`);
}

assert.match(mainConfig, /fullyParallel:\s*true/, 'Ordinary browser tests should remain parallel.');
assert.match(mainConfig, /testIgnore:\s*STORAGE_HEAVY_TEST_MATCH/, 'The ordinary Playwright config must exclude the capped storage-heavy manifest.');
assert.match(storageConfig, /testMatch:\s*STORAGE_HEAVY_TEST_MATCH/, 'The storage-heavy config must run only the storage-heavy manifest.');
assert.match(storageConfig, /testIgnore:\s*\[\]/, 'The storage-heavy config must override the main config exclusion.');
assert.match(storageConfig, /fullyParallel:\s*false/, 'Storage-heavy tests must not opt into full parallelism.');
assert.match(storageConfig, /workers:\s*1/, 'Storage-heavy Playwright tests must be capped at one worker.');
assert.match(storageConfig, /playwright-report-storage-heavy/, 'Storage-heavy tests should write a separate HTML report.');
assert.match(manifestSource, /STORAGE_HEAVY_SPEC_NAMES/, 'The storage-heavy suite should remain explicitly documented as a manifest.');

assert.strictEqual(scripts.test, 'npm run test:parallel && npm run test:storage-heavy', 'The default browser suite must run both the parallel and capped groups.');
assert.match(scripts['test:parallel'] || '', /playwright\.config\.js/, 'The ordinary browser command must use the parallel config.');
assert.match(scripts['test:storage-heavy'] || '', /playwright\.storage\.config\.js/, 'The storage-heavy browser command must use the capped config.');
assert.match(scripts['test:desktop'] || '', /test:parallel:desktop.*test:storage-heavy:desktop/, 'Desktop coverage must run both browser groups.');

for(const scriptName of [
  'test:xss:app',
  'test:malformed-imports',
  'test:universe-lifecycle',
  'test:group-bulk',
  'test:literature-lifecycle',
  'test:vision-lifecycle',
  'test:malicious-inputs',
  'test:xss:inputs'
]){
  assert.match(scripts[scriptName] || '', /playwright\.storage\.config\.js/, `${scriptName} must use the capped config for its storage-heavy browser spec.`);
}

const soakConfig = fs.readFileSync(path.join(tests, 'playwright.soak.config.js'), 'utf8');
const perfRunner = fs.readFileSync(path.join(tests, 'performance', 'run-browser-performance.js'), 'utf8');
assert.match(soakConfig, /workers:\s*1/, 'Soak testing must retain its one-worker cap.');
assert.match(perfRunner, /--workers=1/, 'Browser performance testing must retain its one-worker cap.');

console.log(`Playwright storage-heavy worker cap checks passed for ${STORAGE_HEAVY_SPEC_NAMES.length} specs.`);

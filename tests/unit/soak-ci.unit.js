'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const tests = path.join(root, 'tests');
const pkg = JSON.parse(fs.readFileSync(path.join(tests, 'package.json'), 'utf8'));
const spec = fs.readFileSync(path.join(tests, 'e2e', 'long-session-soak-self-contained.spec.js'), 'utf8');
const config = fs.readFileSync(path.join(tests, 'playwright.soak.config.js'), 'utf8');
const runner = fs.readFileSync(path.join(tests, 'soak', 'run-soak.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'soak.yml'), 'utf8');

assert.match(pkg.scripts['test:soak:quick'] || '', /run-soak\.js --quick/, 'quick soak command should remain available');
assert.match(pkg.scripts['test:soak'] || '', /run-soak\.js/, 'standard soak command should remain available');
assert.match(pkg.scripts['ci:soak'] || '', /soak-ci\.unit\.js.*run-soak\.js --ci/, 'CI soak command should validate its wiring before running');
assert.match(spec, /WORMHOLES_SOAK_CYCLES/, 'soak cycles should be configurable');
assert.match(spec, /WORMHOLES_SOAK_DURATION_MS/, 'soak duration should be configurable');
assert.match(spec, /HeapProfiler\.collectGarbage/, 'soak test should collect comparable heap measurements');
assert.match(spec, /buildWormholesAppDataExport/, 'soak test should periodically validate portable export state');
assert.match(spec, /WormholesUndo\.undoActive/, 'soak test should repeatedly validate Undo');
assert.match(spec, /renderConnectionsMap/, 'soak test should exercise the Connections map');
assert.match(spec, /renderWormholesMap/, 'soak test should exercise Manage Bridges');
assert.match(config, /workers:1/, 'soak testing should run serially');
assert.match(config, /enable-precise-memory-info/, 'soak browser should expose precise memory metrics');
assert.match(runner, /WORMHOLES_RUN_SOAK:'1'/, 'runner should explicitly enable the opt-in soak spec');
assert.match(workflow, /schedule:/, 'soak CI should run on a schedule');
assert.match(workflow, /workflow_dispatch:/, 'soak CI should support manual runs');
assert.match(workflow, /npm run ci:soak/, 'soak workflow should run the dedicated CI command');
assert.match(workflow, /soak-report\.json/, 'soak workflow should preserve the JSON report');

console.log('Long-session soak CI wiring checks passed.');

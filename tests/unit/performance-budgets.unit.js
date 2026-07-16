'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  NODE_BUDGETS_MS,
  BROWSER_BUDGETS_MS,
  compareMeasurements
} = require('../performance/performance-budgets');
const {
  SCENARIOS
} = require('../performance/representative-datasets');
const {
  median,
  benchmarkScenario
} = require('../performance/benchmark-performance');

const root = path.resolve(__dirname, '..', '..');
const scenarioNames = Object.keys(SCENARIOS);
assert.deepStrictEqual(Object.keys(NODE_BUDGETS_MS), scenarioNames, 'every representative dataset should have a portable performance budget');
assert.deepStrictEqual(Object.keys(BROWSER_BUDGETS_MS), ['small', 'medium', 'large-single', 'dense-map'], 'browser budgets should cover the primary rendering profiles');

for(const [scenario, metrics] of Object.entries(NODE_BUDGETS_MS)){
  for(const [metric, budget] of Object.entries(metrics)){
    assert.ok(Number.isFinite(budget) && budget > 0, `${scenario} ${metric} should have a positive budget`);
  }
}

assert.strictEqual(median([9, 1, 5]), 5, 'odd medians should be stable');
assert.strictEqual(median([8, 2, 4, 6]), 5, 'even medians should average the middle pair');

const syntheticPass = Object.fromEntries(Object.entries(NODE_BUDGETS_MS.small).map(([metric, value]) => [metric, value]));
assert.ok(compareMeasurements('small', syntheticPass).every(result => result.passed), 'measurements at the budget boundary should pass');
const syntheticFail = {...syntheticPass, searchIndexMs:NODE_BUDGETS_MS.small.searchIndexMs + 1};
assert.ok(compareMeasurements('small', syntheticFail).some(result => result.metric === 'searchIndexMs' && !result.passed), 'a measurement above budget should fail');

// A real small-scenario run keeps the test fast while proving the benchmark
// executes actual generation, serialization, validation, search, and pagination.
const small = benchmarkScenario('small', {iterations:1});
assert.strictEqual(small.passed, true, `small representative dataset exceeded its initial performance budget: ${JSON.stringify(small.comparisons)}`);
assert.ok(small.jsonBytes > 0 && small.searchRows > 0, 'benchmark should report meaningful dataset and search-index sizes');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'package.json'), 'utf8'));
assert.ok(packageJson.scripts['perf:benchmark'], 'test package should expose performance measurement');
assert.ok(packageJson.scripts['perf:check'], 'test package should expose a budget-enforcing performance command');
assert.ok(packageJson.scripts['perf:browser'], 'test package should expose the opt-in browser performance suite');
assert.ok(fs.existsSync(path.join(root, 'tests', 'performance', 'performance-budgets.js')), 'central performance budgets should be included');
assert.ok(fs.existsSync(path.join(root, 'tests', 'performance', 'benchmark-performance.js')), 'portable benchmark runner should be included');

console.log('performance-budgets.unit.js passed');

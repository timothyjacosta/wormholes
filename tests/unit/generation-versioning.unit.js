const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const windowObject = {};
const context = {window:windowObject, globalThis:null, Object, Array, String, Number, Boolean, JSON, console};
context.globalThis = context;
windowObject.window = windowObject;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'scripts', 'wormholes-generation-versioning.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-generation-versioning.js'}
);

const api = windowObject.WormholesGenerationVersioning;
assert.ok(api, 'generation version registry should be available to diagnostics and tests');
assert.strictEqual(api.diagnosticVersion, 2);
assert.strictEqual(api.algorithm, 'xorshift32-v1');
assert.strictEqual(api.seedBehaviorVersion, 'xorshift32-inclusive-int-v1');
assert.strictEqual(api.generatorVersion, 'beta-297');
assert.strictEqual(api.tableVersion, 'theme-decks-v1');

const current = {
  version:2,
  seed:'deadbeef',
  algorithm:api.algorithm,
  seedBehaviorVersion:api.seedBehaviorVersion,
  generatorVersion:api.generatorVersion,
  tableVersion:api.tableVersion,
  tableFingerprint:'1a2b3c4d',
  draws:7,
  actions:[{kind:'quick-full', rolls:{what:2, attr1:3, attr2:4, story:5}}]
};
const normalized = api.normalizeDiagnostic(current);
assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized)), current, 'current version metadata should round-trip exactly');
assert.strictEqual(api.compatibility(current, {
  algorithm:api.algorithm,
  seedBehaviorVersion:api.seedBehaviorVersion,
  generatorVersion:api.generatorVersion,
  tableVersion:api.tableVersion,
  tableFingerprint:'1a2b3c4d'
}).reproducible, true);

const legacy = api.normalizeDiagnostic({
  version:1,
  seed:'cafebabe',
  algorithm:'xorshift32-v1',
  generatorVersion:'beta-238',
  tableVersion:'theme-decks-v1',
  draws:4,
  actions:[]
});
assert.ok(legacy, 'legacy diagnostic metadata should stay readable');
assert.strictEqual(legacy.seedBehaviorVersion, 'xorshift32-inclusive-int-v1', 'known legacy behavior should be identified explicitly');
assert.strictEqual(legacy.tableFingerprint, undefined, 'an unknown historical fingerprint must not be invented');

assert.strictEqual(api.normalizeDiagnostic({...current, tableFingerprint:''}), null, 'version 2 requires a table fingerprint');
assert.strictEqual(api.normalizeDiagnostic({...current, seedBehaviorVersion:''}), null, 'version 2 requires a seed behavior version');
assert.strictEqual(api.normalizeDiagnostic({...current, version:99}), null, 'unknown diagnostic schemas should be rejected');

const mismatch = api.compatibility(current, {
  algorithm:api.algorithm,
  seedBehaviorVersion:'future-seed-behavior-v2',
  generatorVersion:'beta-999',
  tableVersion:api.tableVersion,
  tableFingerprint:'ffffffff'
});
assert.strictEqual(mismatch.reproducible, false);
assert.deepStrictEqual(Array.from(mismatch.reasons), ['seed-behavior', 'generator-version', 'table-fingerprint']);

console.log('generation-versioning.unit.js passed');

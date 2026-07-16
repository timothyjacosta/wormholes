'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {execFileSync} = require('child_process');
const {
  SCENARIOS,
  generateDataset,
  plannedSummary,
  summarizeDataset,
  datasetHash,
  assertDatasetIntegrity,
  TINY_PNG_DATA_URL
} = require('../performance/representative-datasets');

const root = path.resolve(__dirname, '..', '..');
const expectedScenarios = ['small', 'medium', 'large-single', 'large-multi', 'dense-map', 'near-limit'];
assert.deepStrictEqual(Object.keys(SCENARIOS), expectedScenarios, 'the representative scenario catalog should remain stable and explicit');

const hardLimits = {
  universes:250,
  archive:5000,
  literature:5000,
  vision:2500,
  connectionsPerUniverse:50000,
  bridgesAcrossApp:50000
};
for(const [name, definition] of Object.entries(SCENARIOS)){
  assert.ok(definition.universes <= hardLimits.universes, `${name} should stay within the supported universe limit`);
  assert.ok(definition.archiveEntitiesPerUniverse <= hardLimits.archive, `${name} should stay within the Archive limit`);
  assert.ok(definition.literatureEntitiesPerUniverse <= hardLimits.literature, `${name} should stay within the Literature limit`);
  assert.ok(definition.visionItemsPerUniverse <= hardLimits.vision, `${name} should stay within the Vision Board limit`);
  assert.ok(definition.connectionsPerUniverse <= hardLimits.connectionsPerUniverse, `${name} should stay within the connection limit`);
  assert.ok(definition.bridgesAcrossApp <= hardLimits.bridgesAcrossApp, `${name} should stay within the bridge limit`);
}

function assertMatchesPlan(dataset, name){
  const actual = summarizeDataset(dataset);
  const plan = plannedSummary(name);
  for(const key of ['universes','archiveEntries','groups','literatureDocuments','literatureGroups','visionItems','connections','bridges']){
    assert.strictEqual(actual[key], plan[key], `${name} should generate its planned ${key} count`);
  }
  assert.deepStrictEqual(actual, dataset.exportSummary, `${name} should carry an exact export summary`);
}

const smallA = generateDataset('small');
const smallB = generateDataset('small');
assert.strictEqual(datasetHash(smallA), datasetHash(smallB), 'the same scenario and seed should produce byte-stable data');
assert.notStrictEqual(datasetHash(smallA), datasetHash(generateDataset('small', {seed:12345})), 'a different seed should change representative content');
assertMatchesPlan(smallA, 'small');
assert.strictEqual(assertDatasetIntegrity(smallA), true);

const firstSmallDetails = smallA.universeData[smallA.universes[0].id];
const presentTypes = new Set(firstSmallDetails.archive.filter(entry => entry.kind !== 'group').map(entry => String(entry.what?.val || '').split('—')[0].trim()));
assert.deepStrictEqual(Array.from(presentTypes).sort(), ['Character','Creature','Event','Knowledge','Organization','Place','Relationship','Society','Technology'].sort(), 'fixtures should represent all authored creation types');
assert.ok(firstSmallDetails.archive.some(entry => entry.kind === 'group' && entry.groupIds.length), 'fixtures should include populated Archive groups');
assert.ok(firstSmallDetails.literature.some(doc => doc.kind === 'literatureGroup' && doc.groupIds.length), 'fixtures should include populated Literature groups');
assert.ok(firstSmallDetails.literature.some(doc => doc.tags?.entries?.length), 'fixtures should include Literature tags');
assert.ok(firstSmallDetails.vision.some(item => item.tags?.entries?.length), 'fixtures should include Vision Board tags');
assert.ok(Object.keys(firstSmallDetails.connectionNotes).length, 'fixtures should include connection notes');
assert.ok(Object.keys(smallA.bridgeNotes).length, 'multi-universe fixtures should include bridge notes');

const mediaFixture = generateDataset('small', {includeMediaPayloads:true});
assert.ok(mediaFixture.universeData[mediaFixture.universes[0].id].vision.some(item => item.thumbnailDataUrl === TINY_PNG_DATA_URL), 'media mode should embed tiny valid image placeholders');
assert.ok(JSON.stringify(mediaFixture).length < 300000, 'tiny media placeholders should not bloat the baseline fixture');

const largeMulti = generateDataset('large-multi');
assertMatchesPlan(largeMulti, 'large-multi');
assert.strictEqual(largeMulti.universes.length, 10, 'the multi-universe fixture should model ten books');
assert.strictEqual(largeMulti.exportSummary.archiveEntries + largeMulti.exportSummary.groups, 5000, 'the ten-book fixture should include 500 Archive items per universe');
assert.strictEqual(largeMulti.exportSummary.visionItems, 5000, 'the ten-book fixture should include 500 images per universe');
assert.ok(JSON.stringify(largeMulti).length < 15 * 1024 * 1024, 'the generated ten-book fixture should remain practical to create during benchmarks');

const denseMap = generateDataset('dense-map');
assertMatchesPlan(denseMap, 'dense-map');
assert.strictEqual(denseMap.exportSummary.connections, 48000, 'the dense-map fixture should exercise a relationship-heavy graph');
assert.strictEqual(denseMap.exportSummary.bridges, 4000, 'the dense-map fixture should exercise a bridge-heavy graph');

const nearLimitPlan = plannedSummary('near-limit');
assert.strictEqual(nearLimitPlan.archiveEntries + nearLimitPlan.groups, 9600, 'near-limit should approach 5,000 Archive entities in each of two universes');
assert.strictEqual(nearLimitPlan.literatureDocuments + nearLimitPlan.literatureGroups, 9600, 'near-limit should approach 5,000 Literature entities in each universe');
assert.strictEqual(nearLimitPlan.visionItems, 4800, 'near-limit should approach 2,500 Vision Board items in each universe');
assert.strictEqual(nearLimitPlan.connections, 96000, 'near-limit should approach 50,000 connections in each universe');
assert.strictEqual(nearLimitPlan.bridges, 20000, 'near-limit should contain a substantial cross-universe bridge network');

// Run representative fixtures through the same validators used by app-data import.
const validationContext = {
  console,
  Date,
  JSON,
  Object,
  Number,
  String,
  Math,
  Map,
  Set,
  Array,
  Promise,
  Blob,
  TextEncoder,
  atob:global.atob,
  btoa:global.btoa,
  setTimeout(fn){ fn(); return 1; },
  clearTimeout(){},
  document:{getElementById(){ return null; }},
  localStorage:{getItem(){ return null; }},
  currentUniverseId:'',
  universes:[],
  archiveEntries:[],
  literatureEntries:[],
  visionEntries:[],
  window:null
};
validationContext.window = validationContext;
validationContext.globalThis = validationContext;
vm.createContext(validationContext);
for(const scriptName of [
  'wormholes-id-integrity.js',
  'wormholes-reference-integrity.js',
  'wormholes-entity-limits.js',
  'wormholes-content-limits.js',
  'wormholes-media-limits.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts', scriptName), 'utf8'), validationContext, {filename:`scripts/${scriptName}`});
}
for(const dataset of [smallA, mediaFixture, largeMulti, denseMap]){
  assert.strictEqual(validationContext.WormholesIdIntegrity.validateAppData(dataset), true);
  assert.strictEqual(validationContext.WormholesReferenceIntegrity.validateAppData(dataset), true);
  assert.strictEqual(validationContext.WormholesEntityLimits.validateAppData(dataset), true);
  assert.strictEqual(validationContext.WormholesContentLimits.validateAppData(dataset), true);
  assert.strictEqual(validationContext.WormholesMediaLimits.validateAppData(dataset), true);
}

const listOutput = execFileSync(process.execPath, [path.join(root, 'tests', 'performance', 'generate-datasets.js'), '--list'], {encoding:'utf8'});
assert.match(listOutput, /large-multi[\s\S]*Ten-book multi-universe project/, 'the CLI should expose the ten-book scenario');
assert.match(listOutput, /near-limit[\s\S]*Near supported limits/, 'the CLI should expose the near-limit scenario');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'package.json'), 'utf8'));
assert.ok(packageJson.scripts['perf:generate'], 'the test package should provide an on-demand dataset generator command');
assert.ok(packageJson.scripts['perf:summary'], 'the test package should provide a lightweight scenario-summary command');
assert.ok(fs.existsSync(path.join(root, 'tests', 'performance', 'README.md')), 'performance fixture instructions should be included');

console.log('representative-performance-datasets.unit.js passed');

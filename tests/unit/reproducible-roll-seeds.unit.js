const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const context = {
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
  Uint32Array,
  window:{
    matchMedia(){ return {matches:false}; },
    addEventListener(){}
  },
  document:{
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  },
  localStorage:{ getItem(){ return null; }, setItem(){} },
  requestAnimationFrame(fn){ fn(Date.now()); },
  ResizeObserver:undefined,
  renderCurrent(){},
  updateButtons(){},
  setAppButtonDisabled(){},
  syncAllAppButtonStates(){},
  currentUniverseId:'u1',
  archiveEntries:[]
};
context.globalThis = context;
context.window.window = context.window;

vm.createContext(context);
const versioningSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-generation-versioning.js'), 'utf8');
vm.runInContext(versioningSource, context, {filename:'scripts/wormholes-generation-versioning.js'});
const generationSource = fs.readFileSync(path.join(root, 'scripts', 'generation.js'), 'utf8');
vm.runInContext(generationSource, context, {filename:'scripts/generation.js'});

const diagnostics = context.window.WormholesGenerationDiagnostics;
assert.ok(diagnostics, 'background generation diagnostics should be available for tests and support');
assert.strictEqual(diagnostics.algorithm, 'xorshift32-v1');
assert.strictEqual(typeof diagnostics.useSeedForNextSession, 'function');
assert.strictEqual(typeof diagnostics.current, 'function');
assert.strictEqual(diagnostics.current(), null, 'a blank creation should not create diagnostic metadata');

function quickRollWith(seed){
  context.newCreation();
  diagnostics.useSeedForNextSession(seed);
  vm.runInContext('skipRollAnimation = true;', context);
  context.quickFullRoll();
  return {
    creation:vm.runInContext('JSON.parse(JSON.stringify(current))', context),
    metadata:JSON.parse(JSON.stringify(diagnostics.current()))
  };
}

const first = quickRollWith('deadbeef');
const second = quickRollWith('deadbeef');
assert.deepStrictEqual(second.creation, first.creation, 'the same hidden seed should reproduce the same complete roll');
assert.deepStrictEqual(second.metadata, first.metadata, 'the same hidden seed and roll path should reproduce the same diagnostics');
assert.strictEqual(first.metadata.seed, 'deadbeef');
assert.strictEqual(first.metadata.version, 2);
assert.strictEqual(first.metadata.seedBehaviorVersion, 'xorshift32-inclusive-int-v1');
assert.strictEqual(first.metadata.generatorVersion, 'beta-297');
assert.strictEqual(first.metadata.tableVersion, 'theme-decks-v1');
assert.match(first.metadata.tableFingerprint, /^[0-9a-f]{8}$/);
assert.ok(first.metadata.draws >= 6, 'quick generation should record its deterministic result draws');
assert.deepStrictEqual(first.metadata.actions.map(action => action.kind), ['quick-full']);

const different = quickRollWith('12345678');
assert.notDeepStrictEqual(different.creation, first.creation, 'a different hidden seed should ordinarily produce a different roll');

const sessionA = diagnostics.createSession('support-case');
const sessionB = diagnostics.createSession('support-case');
const sequenceA = Array.from({length:12}, () => sessionA.int(40));
const sequenceB = Array.from({length:12}, () => sessionB.int(40));
assert.deepStrictEqual(sequenceB, sequenceA, 'the diagnostic PRNG should be reproducible independently of the UI');
assert.throws(
  () => diagnostics.createSession('support-case', {seedBehaviorVersion:'future-behavior-v2'}),
  /Unsupported generation seed behavior/,
  'unknown seed behavior versions should never silently change a reproduced roll'
);
assert.strictEqual(diagnostics.compatibility(first.metadata).reproducible, true);
assert.strictEqual(
  diagnostics.compatibility({...first.metadata, tableFingerprint:'00000000'}).reproducible,
  false,
  'table fingerprints should expose a generation-table mismatch to support tools'
);

context.newCreation();
assert.strictEqual(diagnostics.current(), null, 'starting a new creation should clear the previous diagnostic session');

const archiveSource = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
assert.match(archiveSource, /source:\s*"generated"[\s\S]*_generation:\s*generationMetadata/, 'archived generated creations should retain hidden diagnostic metadata');
assert.match(generationSource, /source:\s*"manual"/, 'manual creations should remain identified as manual and should not receive roll metadata');

const appWorkflowSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-app-workflow.js'), 'utf8');
assert.match(appWorkflowSource, /generatedFieldsChanged[\s\S]*authoredChanges:\s*true/, 'editing generated descriptors should mark the diagnostic origin as authored-over');

const htmlName = fs.readdirSync(root)
  .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}))
  .pop();
assert.ok(htmlName, 'release HTML should exist');
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const visibleMarkup = html.split(/<script\b/i)[0];
assert.doesNotMatch(visibleMarkup, /<(?:button|label|input|select|textarea)[^>]*(?:\bseed\b|reproducible)/i, 'no seed-related user control should be added');
assert.doesNotMatch(visibleMarkup, />\s*(?:seed|reproducible seed)\b/i, 'no seed-related visible wording should be added');

console.log('reproducible-roll-seeds.unit.js passed');

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = Object.create(null);
const mutations = [];
const context = {
  console,
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  Set,
  Map,
  localStorage:{
    getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value){ store[key] = String(value); mutations.push(['set', key]); },
    removeItem(key){ delete store[key]; mutations.push(['remove', key]); }
  },
  reportAppError(){ context.__reported = true; }
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-manual-drafts.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/wormholes-manual-drafts.js'});

const drafts = context.WormholesManualDrafts;
assert.ok(drafts, 'manual draft API should be exposed');
assert.strictEqual(drafts.storageKey, 'wormholesManualCreationDrafts');
assert.strictEqual(drafts.getDraft('u1'), null, 'missing drafts should return null');

const first = drafts.saveDraft('u1', {
  manualTitle:'The Brass Hollows',
  manualWhat:'__custom__',
  manualWhatCustom:'Clockwork Orchard',
  manualAttr1:'Ancient',
  manualAttr2:'Living',
  manualStory:'',
  ignored:'do not persist'
});
assert.strictEqual(first.ok, true, 'draft save should succeed');
assert.ok(store.wormholesManualCreationDrafts, 'draft store should be written');

const restored = drafts.getDraft('u1');
assert.strictEqual(restored.fields.manualTitle, 'The Brass Hollows');
assert.strictEqual(restored.fields.manualWhatCustom, 'Clockwork Orchard');
assert.strictEqual(Object.prototype.hasOwnProperty.call(restored.fields, 'ignored'), false, 'unknown fields should be discarded');
assert.ok(restored.updatedAt, 'draft should include an update timestamp');

drafts.saveDraft('u2', {manualTitle:'Second Universe Draft'});
assert.strictEqual(drafts.getDraft('u2').fields.manualTitle, 'Second Universe Draft', 'drafts should be separate by universe');
assert.strictEqual(drafts.getDraft('u1').fields.manualTitle, 'The Brass Hollows', 'saving another universe should not replace the first draft');

const longTitle = 'x'.repeat(700);
drafts.saveDraft('u3', {manualTitle:longTitle});
assert.strictEqual(drafts.getDraft('u3').fields.manualTitle.length, 500, 'draft fields should respect form length limits');

const emptyResult = drafts.saveDraft('u3', {});
assert.strictEqual(emptyResult.ok, true, 'saving an empty form should remove its draft');
assert.strictEqual(drafts.getDraft('u3'), null);

assert.strictEqual(drafts.prune(['u2']), true, 'prune should succeed');
assert.strictEqual(drafts.getDraft('u1'), null, 'prune should remove drafts for deleted universes');
assert.strictEqual(drafts.getDraft('u2').fields.manualTitle, 'Second Universe Draft');

assert.strictEqual(drafts.removeUniverseDrafts('u2'), true);
assert.strictEqual(drafts.getDraft('u2'), null);
assert.strictEqual(store.wormholesManualCreationDrafts, undefined, 'empty draft storage should remove the storage key');

store.wormholesManualCreationDrafts = '{not json';
assert.strictEqual(drafts.getDraft('broken'), null, 'corrupt draft storage should fail closed');
assert.strictEqual(store.wormholesManualCreationDrafts, undefined, 'corrupt draft storage should be removed');
assert.strictEqual(context.__reported, true, 'corrupt draft storage should be reported');
assert.ok(mutations.length > 0, 'draft operations should mutate storage');

console.log('manual-creation-drafts.unit.js passed');

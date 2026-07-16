const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const storage = new Map();
const logItems = [];
const updatedLogItems = [];
const windowObject = {
  localStorage:{
    getItem(key){ return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value){ storage.set(key, String(value)); },
    removeItem(key){ storage.delete(key); }
  },
  WormholesActivityLog:{
    add(item){
      const saved = {...item, id:`log-${logItems.length + 1}`};
      logItems.push(saved);
      return saved;
    },
    update(id, changes){
      updatedLogItems.push({id, changes});
      const item = logItems.find(entry => entry.id === id);
      if(item) Object.assign(item, changes);
      return item || null;
    }
  }
};
const context = {
  console,
  Date,
  JSON,
  Object,
  Array,
  Math,
  String,
  Number,
  Boolean,
  Map,
  Set,
  window:windowObject
};
context.globalThis = context;
windowObject.window = windowObject;
vm.createContext(context);
const root = path.resolve(__dirname, '..', '..');
const versioningSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-generation-versioning.js'), 'utf8');
vm.runInContext(versioningSource, context, {filename:'scripts/wormholes-generation-versioning.js'});
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-recent-roll-history.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-recent-roll-history.js'});

const api = windowObject.WormholesRecentRollHistory;
assert.ok(api, 'recent roll history API should be available for tests and support');
assert.strictEqual(api.storageKey, 'wormholes_recent_roll_history_v1');
assert.strictEqual(api.maxItems, 50);

const diagnostic = {
  version:2,
  seed:'deadbeef',
  algorithm:'xorshift32-v1',
  seedBehaviorVersion:'xorshift32-inclusive-int-v1',
  generatorVersion:'beta-248',
  tableVersion:'classic-authored-v1',
  tableFingerprint:'1a2b3c4d',
  draws:7,
  actions:[{kind:'quick-full', rolls:{what:2, attr1:3, attr2:4, story:5}}]
};
const result = {
  what:'Character — Protagonist, explorer, mercenary, or chosen figure',
  attr1:'Ancient but still active',
  attr2:'Always moving, migrating, drifting, growing, or changing',
  pressure:'It is searching for a missing counterpart.'
};

const recorded = api.recordCompleted({
  universeId:'u1',
  universeTitle:'Test Universe',
  result,
  diagnostic
});
assert.ok(recorded?.id, 'a completed roll should receive a hidden history id');
assert.strictEqual(api.state.items.length, 1);
assert.strictEqual(api.state.items[0].diagnostic.seed, 'deadbeef', 'hidden diagnostics should retain the reproducible value');
assert.strictEqual(api.state.items[0].diagnostic.seedBehaviorVersion, 'xorshift32-inclusive-int-v1');
assert.strictEqual(api.state.items[0].diagnostic.tableFingerprint, '1a2b3c4d');
assert.strictEqual(logItems.length, 1, 'a completed roll should create one Activity Log entry');
assert.strictEqual(logItems[0].message, 'Rolled Character');
assert.match(logItems[0].detail.summary, /Ancient but still active/);
assert.match(logItems[0].detail.summary, /Not archived/);
assert.doesNotMatch(JSON.stringify(logItems[0]), /deadbeef|seed|xorshift32/i, 'user-facing log details must not expose hidden diagnostics');

const archived = api.markArchived(recorded.id, {entryId:'entry-1', title:'The Ashen Cartographer'});
assert.strictEqual(archived.archived, true);
assert.strictEqual(archived.archiveTitle, 'The Ashen Cartographer');
assert.ok(updatedLogItems.length >= 1, 'archiving should refresh the existing log detail');
assert.match(logItems[0].detail.summary, /Archived as “The Ashen Cartographer”/);

api.syncArchiveEntry('entry-1', {title:'The Ember Cartographer', generatedFieldsChanged:true});
assert.strictEqual(api.state.items[0].archiveTitle, 'The Ember Cartographer');
assert.strictEqual(api.state.items[0].edited, true);
assert.match(logItems[0].detail.summary, /later edited/);
assert.doesNotMatch(JSON.stringify(logItems[0]), /deadbeef|seed|xorshift32/i);

const legacyRecorded = api.recordCompleted({
  universeId:'u1',
  universeTitle:'Test Universe',
  result:{...result, what:'Place — Legacy diagnostic test'},
  diagnostic:{
    version:1,
    seed:'cafebabe',
    algorithm:'xorshift32-v1',
    generatorVersion:'beta-238',
    tableVersion:'classic-authored-v1',
    draws:4,
    actions:[{kind:'quick-full', rolls:{what:1, attr1:2, attr2:3, story:4}}]
  }
});
assert.ok(legacyRecorded, 'legacy version-1 roll diagnostics should remain readable');
assert.strictEqual(legacyRecorded.diagnostic.seedBehaviorVersion, 'xorshift32-inclusive-int-v1');

for(let index = 0; index < 60; index += 1){
  api.recordCompleted({
    universeId:'u1',
    universeTitle:'Test Universe',
    result:{...result, what:`Creature — Test ${index}`},
    diagnostic:{...diagnostic, seed:index.toString(16).padStart(8, '0') || '00000001'}
  });
}
assert.strictEqual(api.state.items.length, 50, 'hidden roll history should remain bounded');
assert.strictEqual(api.latest(5).length, 5);
assert.ok(storage.get(api.storageKey), 'hidden roll history should persist locally');

api.clear();
assert.strictEqual(api.state.items.length, 0);
assert.strictEqual(storage.has(api.storageKey), false);

console.log('recent-roll-history.unit.js passed');

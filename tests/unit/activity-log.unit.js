const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const storage = new Map();
const documentListeners = {};
const document = {
  readyState:'loading',
  activeElement:null,
  addEventListener(type, handler){ documentListeners[type] = handler; },
  getElementById(){ return null; }
};
const windowObject = {
  localStorage:{
    getItem(key){ return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value){ storage.set(key, String(value)); },
    removeItem(key){ storage.delete(key); }
  },
  WormholesUndo:{activeTransaction:null}
};
const context = {
  console,
  Date,
  Intl,
  JSON,
  Object,
  Array,
  Math,
  String,
  Number,
  Boolean,
  Map,
  Set,
  Promise,
  setTimeout,
  clearTimeout,
  document,
  window:windowObject
};
context.globalThis = context;
windowObject.window = windowObject;
windowObject.document = document;
vm.createContext(context);
const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-activity-log.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-activity-log.js'});

const api = windowObject.WormholesActivityLog;
assert.ok(api, 'activity log API should be exposed');
assert.strictEqual(api.storageKey, 'wormholes_activity_log_v1');
assert.strictEqual(api.maxItems, 200);

const first = api.recordToast('Import failed — existing data unchanged', {
  logType:'error',
  moreInfo:{
    title:'Import report',
    summary:'The import failed.',
    cause:'Invalid JSON.',
    steps:['Export again.', 'Retry.'],
    technical:{Code:'WORMHOLES_INVALID_JSON'}
  }
});
assert.strictEqual(first.type, 'error');
assert.strictEqual(first.detail.title, 'Import report');
assert.deepStrictEqual(Array.from(first.detail.steps), ['Export again.', 'Retry.']);
assert.ok(storage.get(api.storageKey).includes('Import report'), 'items should persist locally');

const updated = api.update(first.id, {message:'Import failed with details', detail:{summary:'Updated report.'}});
assert.strictEqual(updated.message, 'Import failed with details', 'existing log items should be updateable in place');
assert.strictEqual(updated.detail.summary, 'Updated report.');

const undo = api.recordUndoOffer({id:'tx-1', message:'Creation deleted'});
assert.strictEqual(undo.action.kind, 'undo');
windowObject.WormholesUndo.activeTransaction = {id:'tx-1'};
assert.strictEqual(api.actionAvailable(undo), true, 'matching active Undo should remain actionable');
api.markUndo('tx-1', 'expired');
assert.strictEqual(api.actionAvailable(undo), false, 'expired Undo should no longer be actionable');

for(let index = 0; index < 220; index += 1){
  api.recordAction(`Save item ${index}`, {dedupeWindowMs:0});
}
assert.strictEqual(api.state.items.length, 200, 'the persistent log should remain bounded');
assert.ok(!api.state.items.some(item => item.message === 'Import failed — existing data unchanged'), 'oldest items should be pruned first');

const oversized = api.add({
  type:'error',
  message:'x'.repeat(900),
  detail:{summary:'y'.repeat(9000), steps:Array.from({length:20}, (_, i) => `Step ${i}`)}
});
assert.ok(oversized.message.length <= 500, 'messages should be length-limited');
assert.ok(oversized.detail.summary.length <= 1800, 'detail text should be length-limited');
assert.ok(oversized.detail.steps.length <= 8, 'detail steps should be bounded');

console.log('activity-log.unit.js passed');

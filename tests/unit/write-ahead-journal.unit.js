const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const records = new Map();
const snapshots = new Map();
const writes = [];
const folderRestores = [];
let runtimeApplications = 0;
let nextId = 0;

const rollbackData = {
  format:'Wormholes App Data Export',
  schemaVersion:4,
  appVersion:'Beta 248',
  exportedAt:'2026-07-12T22:00:00.000Z',
  currentUniverseId:'u1',
  universes:[{id:'u1', title:'Before'}],
  bridgeNotes:{},
  universeData:{u1:{archive:[], connectionNotes:{}, literature:[], vision:[]}}
};
snapshots.set('snapshot-1', {id:'snapshot-1', schemaVersion:4, signature:'sig-1', data:rollbackData});

const adapter = {
  async put(record){ records.set(record.id, structuredClone(record)); return true; },
  async get(id){ return records.has(id) ? structuredClone(records.get(id)) : null; },
  async list(){ return Array.from(records.values()).map(record => structuredClone(record)); },
  async del(id){ records.delete(id); return true; }
};

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
  structuredClone,
  WORMHOLES_APP_VERSION:'Beta 248',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  crypto:{randomUUID(){ nextId += 1; return `operation-${nextId}`; }},
  WormholesWriteAheadJournalStorageAdapter:adapter,
  WormholesSingleTab:{canWrite(){ return true; }},
  WormholesSnapshots:{
    async getSnapshot(id){ return snapshots.has(id) ? structuredClone(snapshots.get(id)) : null; },
    async listSnapshots(){ return Array.from(snapshots.values()).map(snapshot => structuredClone(snapshot)); }
  },
  prepareWormholesAppDataImport(data){
    return {
      importData:structuredClone(data),
      universes:structuredClone(data.universes),
      currentUniverseId:data.currentUniverseId,
      bridgeNotes:structuredClone(data.bridgeNotes)
    };
  },
  async writePreparedWormholesAppDataImport(prepared, options){
    writes.push({prepared:structuredClone(prepared), options:structuredClone(options)});
  },
  async restoreLocalFolderStateAfterFailedBackupRestore(state){
    folderRestores.push(structuredClone(state));
  },
  applyPreparedWormholesAppDataToRuntime(){ runtimeApplications += 1; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-write-ahead-journal.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-write-ahead-journal.js'});

(async () => {
  const journal = context.WormholesWriteAheadJournal;
  assert.ok(journal, 'write-ahead journal API should be exposed');

  await assert.rejects(
    () => journal.begin({rollbackSnapshotId:'missing'}),
    /verified restore point/i,
    'operations should fail closed without a verified rollback snapshot'
  );

  const transaction = await journal.begin({
    operation:'app-data-import',
    label:'App data import',
    rollbackSnapshotId:'snapshot-1',
    additionalUniverses:[{id:'u2', title:'Imported'}],
    folderState:{localFoldersEnabled:true, localFolderStorageMode:'native'}
  });
  assert.strictEqual(records.size, 1, 'begin should persist one pending journal entry before writes');
  assert.strictEqual((await journal.pendingRecords())[0].phase, 'prepared');

  await journal.markPhase(transaction, 'writing-browser-stores', {store:'large-data'});
  assert.strictEqual((await journal.pendingRecords())[0].phase, 'writing-browser-stores');

  const recovery = await journal.recoverPendingOperations();
  assert.strictEqual(recovery.recovered, 1, 'startup recovery should roll back an unfinished operation');
  assert.strictEqual(records.size, 0, 'recovered journal entries should be removed after verified rollback');
  assert.strictEqual(writes.length, 1, 'recovery should rewrite the pre-operation app state once');
  assert.deepStrictEqual(writes[0].options.additionalUniverses, [{id:'u2', title:'Imported'}], 'recovery should clear target-only universe stores');
  assert.strictEqual(writes[0].options.journal, false, 'journal recovery must not recursively create another journal');
  assert.strictEqual(folderRestores.length, 1, 'backup-folder state should be restored when recorded');
  assert.match(journal.consumeRecoveryNotice(), /recovered an operation/i);
  assert.strictEqual(journal.consumeRecoveryNotice(), '', 'recovery notice should be consumable once');

  const committed = await journal.begin({
    operation:'backup-folder-restore',
    rollbackSnapshotId:'snapshot-1'
  });
  await journal.commit(committed);
  assert.strictEqual(records.size, 0, 'committed operations should leave no pending journal entry');
  assert.strictEqual(writes.length, 1, 'committing should not restore the rollback snapshot');

  const rolledBack = await journal.begin({
    operation:'universe-delete',
    rollbackSnapshotId:'snapshot-1',
    additionalUniverses:['u3']
  });
  await journal.rollback(rolledBack, {applyRuntime:true});
  assert.strictEqual(records.size, 0, 'explicit rollback should close the journal entry');
  assert.strictEqual(writes.length, 2, 'explicit rollback should restore app data');
  assert.strictEqual(runtimeApplications, 1, 'same-session rollback should refresh runtime state');

  console.log('write-ahead-journal.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

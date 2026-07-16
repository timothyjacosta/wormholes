const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const records = new Map();
const corruptedRecords = new Map();
let failNextSnapshotVerification = false;
const adapter = {
  async put(record){ records.set(record.id, structuredClone(record)); return true; },
  async get(id){
    if(failNextSnapshotVerification){
      failNextSnapshotVerification = false;
      return null;
    }
    return records.has(id) ? structuredClone(records.get(id)) : null;
  },
  async list(){ return Array.from(records.values()).map(record => structuredClone(record)); },
  async del(id){ records.delete(id); return true; }
};

let nextId = 0;
let currentValue = 0;
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
  setTimeout,
  clearTimeout,
  CustomEvent:function CustomEvent(type){ this.type = type; },
  WORMHOLES_APP_VERSION:'Beta 197',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  async buildWormholesAppDataExport(){
    return {
      format:'Wormholes App Data Export',
      schemaVersion:4,
      appVersion:'Beta 197',
      exportedAt:new Date().toISOString(),
      currentUniverseId:'u1',
      universes:[{id:'u1', title:`Universe ${currentValue}`}],
      bridgeNotes:{},
      universeData:{u1:{archive:[{id:`c${currentValue}`, title:`Creation ${currentValue}`}], connectionNotes:{}, literature:[], vision:[]}},
      exportSummary:{universes:1, archiveEntries:1, groups:0, literatureDocuments:0, literatureGroups:0, literatureDocumentsWithBody:0, visionItems:0, visionItemsWithImageData:0, connections:0, bridges:0}
    };
  },
  summarizeWormholesAppDataExport(data){ return data.exportSummary; },
  formatWormholesAppDataExportSummary(){ return '1 universe, 1 creation'; },
  document:{ getElementById(){ return null; } },
  confirm(){ return true; },
  dispatchEvent(){},
  crypto:{ randomUUID(){ nextId += 1; return `snapshot-${nextId}`; } },
  WormholesSnapshotStorageAdapter:adapter,
  WormholesCorruptionStorageAdapter:{
    async put(record){ corruptedRecords.set(record.id, structuredClone(record)); return true; },
    async get(id){ return corruptedRecords.has(id) ? structuredClone(corruptedRecords.get(id)) : null; },
    async list(){ return Array.from(corruptedRecords.values()).map(record => structuredClone(record)); },
    async del(id){ corruptedRecords.delete(id); return true; }
  },
  WormholesSingleTab:{ canWrite(){ return true; } }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-snapshots.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/wormholes-snapshots.js'});

(async () => {
  const snapshots = context.WormholesSnapshots;
  assert.ok(snapshots, 'snapshot API should be exposed');
  assert.strictEqual(snapshots.maxSnapshots, 5, 'rolling retention should be capped at five snapshots');
  assert.strictEqual(snapshots.maxCorruptedRecords, 20, 'preserved corrupted records should have bounded retention');
  assert.strictEqual(snapshots.automaticMinIntervalMs, 15 * 60 * 1000, 'automatic snapshots should be throttled to fifteen minutes');

  const quarantined = await snapshots.quarantineCorruptedRecord({
    storageKey:'wormholesUniverses',
    rawText:'{broken',
    datasetLabel:'Universe list',
    error:new Error('Unexpected end of JSON input')
  });
  const duplicateQuarantine = await snapshots.quarantineCorruptedRecord({
    storageKey:'wormholesUniverses',
    rawText:'{broken',
    datasetLabel:'Universe list',
    error:new Error('Unexpected end of JSON input')
  });
  assert.strictEqual(quarantined.id, duplicateQuarantine.id, 'identical corrupted raw records should not be preserved repeatedly');
  await snapshots.markCorruptedRecordRecovered(quarantined.id, {recoverySource:'snapshot', recoverySnapshotId:'snapshot-older'});
  const preserved = await snapshots.listCorruptedRecords();
  assert.strictEqual(preserved.length, 1, 'corrupted record should be preserved in the recovery database');
  assert.strictEqual(preserved[0].recovered, true, 'recovered quarantine record should be marked as recovered');

  const hashA = snapshots.hashSnapshotData(await context.buildWormholesAppDataExport());
  const exportWithDifferentTimestamp = await context.buildWormholesAppDataExport();
  exportWithDifferentTimestamp.exportedAt = '2099-01-01T00:00:00.000Z';
  const hashB = snapshots.hashSnapshotData(exportWithDifferentTimestamp);
  assert.strictEqual(hashA, hashB, 'export timestamps should not create false snapshot differences');

  for(let i = 1; i <= 6; i += 1){
    currentValue = i;
    await snapshots.createSnapshot({reason:'automatic', force:true});
    await new Promise(resolve => setTimeout(resolve, 2));
  }

  let list = await snapshots.listSnapshots();
  assert.strictEqual(list.length, 5, 'the oldest snapshot should roll off after the sixth distinct snapshot');
  assert.ok(!list.some(record => record.data.universes[0].title === 'Universe 1'), 'the oldest recovery point should be pruned');
  assert.ok(list.some(record => record.data.universes[0].title === 'Universe 6'), 'the newest recovery point should be retained');

  const countBeforeDuplicate = list.length;
  const duplicate = await snapshots.createSnapshot({reason:'before-import', force:true});
  list = await snapshots.listSnapshots();
  assert.strictEqual(list.length, countBeforeDuplicate, 'identical app state should not consume another rolling snapshot slot');
  assert.strictEqual(duplicate.signature, list[0].signature, 'duplicate capture should return the existing newest recovery point');

  await new Promise(resolve => setTimeout(resolve, 2));
  const emergency = await snapshots.preserveEmergencySnapshotBeforeClearData();
  list = await snapshots.listSnapshots();
  assert.strictEqual(emergency.reason, 'before-clear-data');
  assert.strictEqual(emergency.reasonLabel, 'Before Clear Data');
  assert.notStrictEqual(emergency.id, duplicate.id, 'Clear Data should receive a dedicated emergency snapshot even when the newest snapshot has identical data');
  assert.ok(list.some(record => record.id === emergency.id && record.reason === 'before-clear-data'), 'the verified emergency snapshot should remain in rolling recovery storage');
  assert.strictEqual(list.length, 5, 'emergency snapshots should still obey rolling retention');

  const preservedIdsBeforeFailure = new Set(list.map(record => record.id));
  currentValue = 7;
  failNextSnapshotVerification = true;
  await assert.rejects(
    () => snapshots.preserveEmergencySnapshotBeforeClearData(),
    /could not be verified/i,
    'Clear Data snapshot preservation should fail closed when the written record cannot be read back'
  );
  list = await snapshots.listSnapshots();
  assert.strictEqual(list.length, 5, 'a failed emergency snapshot verification should not prune an existing recovery point');
  assert.ok(list.every(record => preservedIdsBeforeFailure.has(record.id)), 'failed emergency snapshot verification should leave the previous rolling set intact');

  console.log('recovery-snapshots.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

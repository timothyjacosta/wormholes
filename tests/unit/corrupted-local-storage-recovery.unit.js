const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createLocalStorage(){
  const store = new Map();
  return {
    get length(){ return store.size; },
    key(index){ return Array.from(store.keys())[index] || null; },
    getItem(key){ return store.has(String(key)) ? store.get(String(key)) : null; },
    setItem(key, value){ store.set(String(key), String(value)); },
    removeItem(key){ store.delete(String(key)); },
    clear(){ store.clear(); },
    dump(){ return Object.fromEntries(store.entries()); }
  };
}

const localStorage = createLocalStorage();
const quarantined = new Map();
const reports = [];
let nextQuarantineId = 0;

const snapshots = [
  {
    id:'newest',
    createdAt:'2026-07-11T18:00:00.000Z',
    data:{
      universes:[{id:'u1', title:'Recovered Universe'}],
      bridgeNotes:{},
      universeData:{u1:{archive:'invalid snapshot archive', connectionNotes:{}, literature:[], vision:[]}}
    }
  },
  {
    id:'older-valid',
    createdAt:'2026-07-11T17:00:00.000Z',
    data:{
      universes:[{id:'u1', title:'Older Universe'}],
      bridgeNotes:{},
      universeData:{u1:{archive:[{id:'c1', title:'Recovered Creation'}], connectionNotes:{}, literature:[], vision:[]}}
    }
  }
];

const context = {
  console,
  localStorage,
  Blob,
  setTimeout,
  clearTimeout,
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
  navigator:{},
  document:{getElementById(){ return null; }},
  currentUniverseId:null,
  universes:[],
  archiveEntries:[],
  connectionNotes:{},
  bridgeNotes:{},
  localFoldersEnabled:false,
  localFolderRestoreInProgress:false,
  localFolderSwitchInProgress:false,
  localFolderStorageMode:'native',
  wormholesRootFolderHandle:null,
  wormholesParentFolderHandle:null,
  wormholesCreationsRootHandle:null,
  wormholesLiteratureRootHandle:null,
  wormholesImagesRootHandle:null,
  creationFolderHandle:null,
  literatureFolderHandle:null,
  visionFolderHandle:null,
  storageFootnoteTexts:{},
  recentStorageFailureMessage:'',
  recentStorageFailureAt:0,
  recentFolderSaveWarningMessage:'',
  recentFolderSaveWarningAt:0,
  PARTIAL_FOLDER_SAVE_MESSAGE:'Saved in app. Folder sync failed.',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  makeId(){ return 'generated-id'; },
  stableUniverseFolderName(universe){ return `Universe-${universe.id || universe.title}`; },
  normalizeBridges(bridges){ return Array.isArray(bridges) ? bridges : []; },
  normalizeArchiveGroups(){},
  largeDataStore(){ return null; },
  restoreFolderHandlesForCurrentUniverse(){ return Promise.resolve(false); },
  hasFolderPermission(){ return Promise.resolve(false); },
  shouldSkipFolderPruneEntry(){ return false; },
  getCurrentUniverse(){ return null; },
  localFolderApiSupported(){ return false; },
  localFolderUsesPrivateStorage(){ return false; },
  getExistingDirectory(){ return Promise.resolve(null); },
  universeFolderName(universe){ return universe.diskFolderName || universe.title; },
  async saveImportedLiteratureForUniverse(universeId, docs){
    return context.saveLocalStorageJson(context.literatureStorageKey(universeId), docs);
  },
  async saveImportedVisionForUniverse(universeId, items){
    return context.saveLocalStorageJson(context.visionStorageKey(universeId), items);
  },
  reportAppError(label, error, options = {}){
    reports.push({label, message:error?.message || String(error), userMessage:options.userMessage || ''});
  }
};
context.window = context;
context.globalThis = context;
context.WormholesSnapshots = {
  noteMeaningfulChange(){},
  async listSnapshots(){ return snapshots; },
  async quarantineCorruptedRecord(details){
    nextQuarantineId += 1;
    const record = {id:`q${nextQuarantineId}`, ...details, recovered:false};
    quarantined.set(record.id, record);
    return record;
  },
  async markCorruptedRecordRecovered(id, details){
    const record = quarantined.get(id);
    quarantined.set(id, {...record, ...details, recovered:true});
    return quarantined.get(id);
  }
};

vm.createContext(context);
const root = path.resolve(__dirname, '..', '..');
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-persisted-schema.js'), 'utf8'), context, {filename:'scripts/wormholes-persisted-schema.js'});
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'storage.js'), 'utf8'), context, {filename:'scripts/storage.js'});
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-storage-recovery.js'), 'utf8'), context, {filename:'scripts/wormholes-storage-recovery.js'});

const envelope = data => JSON.stringify({
  format:'Wormholes Persisted Dataset',
  revision:3,
  updatedAt:'2026-07-11T18:10:00.000Z',
  data
});

localStorage.setItem('wormholesUniverses', '{"format":"Wormholes Persisted Dataset","revision":3,"data":[');
localStorage.setItem('wormholesUniverseArchive:u1', envelope([{id:'broken', title:'Broken Creation', connections:'not an array'}]));
localStorage.setItem('wormholesUniverseConnectionNotes:u1', '{bad json');
localStorage.setItem('worldBuilderUniverseConnectionNotes:u1', JSON.stringify({'c1::c2':'legacy note'}));
localStorage.setItem('wormholesUniverseVisionBoard:u2', envelope({wrong:'shape'}));

(async () => {
  const result = await context.WormholesStorageRecovery.recoverCorruptedLocalStorageRecords();
  assert.strictEqual(result.recovered, 3, 'universe list, archive, and connection notes should recover');
  assert.strictEqual(result.blocked, 1, 'unrecoverable vision metadata should be blocked');

  const recoveredUniverses = context.readPersistedDatasetData('wormholesUniverses', null, []);
  assert.strictEqual(recoveredUniverses[0].title, 'Recovered Universe', 'newest valid universe list should be used');

  const recoveredArchive = context.readPersistedDatasetData('wormholesUniverseArchive:u1', null, []);
  assert.strictEqual(recoveredArchive[0].title, 'Recovered Creation', 'recovery should skip an invalid newer snapshot and use the newest valid one');

  const recoveredNotes = context.readPersistedDatasetData('wormholesUniverseConnectionNotes:u1', null, {});
  assert.strictEqual(recoveredNotes['c1::c2'], 'legacy note', 'a valid legacy record should be preferred when available');
  assert.strictEqual(localStorage.getItem('worldBuilderUniverseConnectionNotes:u1'), null, 'legacy source should be removed after successful recovery');

  assert.strictEqual(context.persistedDatasetWriteBlocked('wormholesUniverseVisionBoard:u2'), true, 'unrecoverable authored data should be write-blocked');
  const preservedRaw = localStorage.getItem('wormholesUniverseVisionBoard:u2');
  assert.strictEqual(context.saveLocalStorageJson('wormholesUniverseVisionBoard:u2', []), false, 'blocked data must not be silently overwritten');
  assert.strictEqual(localStorage.getItem('wormholesUniverseVisionBoard:u2'), preservedRaw, 'blocked save must leave damaged raw text untouched');

  assert.strictEqual(quarantined.size, 4, 'every damaged active record should be preserved');
  assert.strictEqual(Array.from(quarantined.values()).filter(record => record.recovered).length, 3, 'successfully repaired records should be marked recovered');
  assert.ok(reports.some(report => /damaged local data/i.test(report.userMessage)), 'startup should visibly report recovery and blocked records');

  console.log('corrupted-local-storage-recovery.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

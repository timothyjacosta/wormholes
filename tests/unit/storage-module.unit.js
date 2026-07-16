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
const reportedErrors = [];
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
  document:{
    getElementById(){ return null; }
  },
  window:{},
  reportAppError(label, error, options = {}){
    reportedErrors.push({label, message:error && error.message || String(error), userMessage:options.userMessage || ''});
  },
  __reportedErrors:reportedErrors,
  currentUniverseId:'u1',
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
  normalizeArchiveGroups(){ context.__normalizedArchiveGroups = true; },
  largeDataStore(){ return null; },
  restoreFolderHandlesForCurrentUniverse(){ return Promise.resolve(false); },
  hasFolderPermission(){ return Promise.resolve(false); },
  shouldSkipFolderPruneEntry(){ return false; },
  getCurrentUniverse(){ return context.universes.find(universe => universe.id === context.currentUniverseId) || null; },
  localFolderApiSupported(){ return false; },
  localFolderUsesPrivateStorage(){ return false; },
  getExistingDirectory(){ return Promise.resolve(null); },
  universeFolderName(universe){ return universe.diskFolderName || universe.title; }
};
context.globalThis = context;
context.window = context;
vm.createContext(context);
const storageScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'storage.js'), 'utf8');
vm.runInContext(storageScript, context, {filename:'scripts/storage.js'});

assert.strictEqual(typeof context.saveLocalStorageJson, 'function');
assert.strictEqual(typeof context.readMigratedLocalStorageValue, 'function');
assert.strictEqual(typeof context.readPersistedDataset, 'function');
assert.strictEqual(typeof context.readPersistedDatasetData, 'function');
assert.strictEqual(typeof context.saveUniversesToStorage, 'function');
assert.strictEqual(typeof context.loadArchiveFromStorage, 'function');
assert.strictEqual(typeof context.requestStorageFootnoteUpdate, 'function');

assert.strictEqual(context.saveLocalStorageJson('wormholesTest', {ok:true}), true);
let revisionedTest = JSON.parse(localStorage.getItem('wormholesTest'));
assert.strictEqual(revisionedTest.format, 'Wormholes Persisted Dataset');
assert.strictEqual(revisionedTest.revision, 1);
assert.strictEqual(typeof revisionedTest.updatedAt, 'string');
assert.deepStrictEqual(revisionedTest.data, {ok:true});
assert.strictEqual(context.saveLocalStorageJson('wormholesTest', {ok:false}), true);
revisionedTest = JSON.parse(localStorage.getItem('wormholesTest'));
assert.strictEqual(revisionedTest.revision, 2);
assert.deepStrictEqual(revisionedTest.data, {ok:false});
assert.deepStrictEqual(context.readPersistedDatasetData('wormholesTest', null, {}), {ok:false});
assert.throws(
  () => context.parsePersistedDatasetText(JSON.stringify({format:'Wormholes Persisted Dataset', revision:'bad', data:[]})),
  /revision metadata is invalid/,
  'malformed revision envelopes should be treated as corruption instead of legacy objects'
);
context.blockPersistedDatasetWrites('wormholesBlocked', 'Damaged record');
localStorage.setItem('wormholesBlocked', '{broken');
assert.strictEqual(context.saveLocalStorageJson('wormholesBlocked', []), false, 'write blocking should protect unresolved corrupted records');
assert.strictEqual(localStorage.getItem('wormholesBlocked'), '{broken');
context.unblockPersistedDatasetWrites('wormholesBlocked');
assert.strictEqual(context.saveLocalStorageJson('wormholesBlocked', []), true, 'recovery should be able to unblock a repaired key');

localStorage.setItem('worldBuilderUniverseArchive:u1', '[{"title":"Legacy Creation"}]');
assert.strictEqual(context.readMigratedLocalStorageValue('wormholesUniverseArchive:u1', 'worldBuilderUniverseArchive:u1'), '[{"title":"Legacy Creation"}]');
assert.strictEqual(localStorage.getItem('worldBuilderUniverseArchive:u1'), null);
assert.strictEqual(localStorage.getItem('wormholesUniverseArchive:u1'), '[{"title":"Legacy Creation"}]');

context.universes = [{title:'No ID Universe', createdAt:'2026-01-01T00:00:00.000Z'}];
assert.strictEqual(context.saveUniversesToStorage(), true);
assert.strictEqual(JSON.parse(localStorage.getItem('wormholesUniverses')).revision, 1);
context.universes = [];
context.loadUniversesFromStorage();
assert.strictEqual(context.universes.length, 1);
assert.strictEqual(context.universes[0].id, 'generated-id');
assert.strictEqual(context.universes[0].diskFolderName, 'Universe-generated-id');

context.currentUniverseId = context.universes[0].id;
context.archiveEntries = [{title:'Stored Creation', connections:null, bridges:null}];
assert.strictEqual(context.saveArchiveToStorage(), true);
assert.strictEqual(JSON.parse(localStorage.getItem(`wormholesUniverseArchive:${context.currentUniverseId}`)).revision, 1);
context.archiveEntries = [];
context.loadArchiveFromStorage();
assert.strictEqual(context.archiveEntries.length, 1);
assert.strictEqual(context.archiveEntries[0].title, 'Stored Creation');
assert.strictEqual(JSON.stringify(context.archiveEntries[0].connections), '[]');
assert.strictEqual(JSON.stringify(context.archiveEntries[0].bridges), '[]');
assert.strictEqual(context.__normalizedArchiveGroups, true);

context.connectionNotes = {'a::b':'connected'};
assert.strictEqual(context.saveConnectionNotesToStorage(), true);
context.connectionNotes = {};
context.loadConnectionNotesFromStorage();
assert.strictEqual(JSON.stringify(context.connectionNotes), JSON.stringify({'a::b':'connected'}));

context.bridgeNotes = {'u1::u2':'bridge'};
assert.strictEqual(context.saveBridgeNotesToStorage(), true);
context.bridgeNotes = {};
context.loadBridgeNotesFromStorage();
assert.strictEqual(JSON.stringify(context.bridgeNotes), JSON.stringify({'u1::u2':'bridge'}));

context.saveMapFilters('connections', {bridges:false, images:true});
assert.strictEqual(JSON.stringify(context.loadMapFilters('connections')), JSON.stringify({bridges:false, connections:true, literature:true, images:true, relationships:true}));

console.log('storage-module.unit.js passed');

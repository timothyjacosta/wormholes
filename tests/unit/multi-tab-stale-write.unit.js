const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const storageScript = fs.readFileSync(
  path.resolve(__dirname, '..', '..', 'scripts', 'storage.js'),
  'utf8'
);

function createSharedLocalStorage(){
  const store = new Map();
  return {
    get length(){ return store.size; },
    key(index){ return Array.from(store.keys())[index] || null; },
    getItem(key){ return store.has(String(key)) ? store.get(String(key)) : null; },
    setItem(key, value){ store.set(String(key), String(value)); },
    removeItem(key){ store.delete(String(key)); },
    clear(){ store.clear(); },
  };
}

function makeStorageContext(sharedLocalStorage, canWrite){
  const context = {
    console,
    localStorage:sharedLocalStorage,
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
    document:{ getElementById(){ return null; } },
    window:{ WormholesSingleTab:{ canWrite:() => canWrite } },
    reportAppError(){},
    recentStorageFailureMessage:'',
    recentStorageFailureAt:0,
    recentFolderSaveWarningMessage:'',
    recentFolderSaveWarningAt:0,
    PARTIAL_FOLDER_SAVE_MESSAGE:'Saved in app. Folder sync failed.',
    WORMHOLES_APP_SCHEMA_VERSION:4,
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
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(storageScript, context, {filename:'scripts/storage.js'});
  return context;
}

const sharedLocalStorage = createSharedLocalStorage();
const activeTab = makeStorageContext(sharedLocalStorage, true);
const duplicateTab = makeStorageContext(sharedLocalStorage, false);
const key = 'wormholesMultiTabStaleWriteRegression';
const originalValue = JSON.stringify({revision:1, title:'Original data'});
const newerValue = JSON.stringify({revision:2, title:'Newer active-tab data'});

assert.strictEqual(activeTab.saveLocalStorageText(key, originalValue), true, 'active tab should save the original value');
const staleValue = sharedLocalStorage.getItem(key);
assert.strictEqual(staleValue, originalValue, 'the duplicate tab should hold the older value');

assert.strictEqual(activeTab.saveLocalStorageText(key, newerValue), true, 'active tab should save the newer value');
assert.strictEqual(sharedLocalStorage.getItem(key), newerValue, 'newer data should be persisted before the stale attempt');

assert.strictEqual(duplicateTab.saveLocalStorageText(key, staleValue), false, 'duplicate tab stale write should be rejected');
assert.strictEqual(sharedLocalStorage.getItem(key), newerValue, 'rejected stale write must not overwrite newer active-tab data');

console.log('multi-tab-stale-write.unit.js passed');

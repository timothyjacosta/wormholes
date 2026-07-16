const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeStorage(initial){
  const map = new Map(Object.entries(initial || {}));
  return {
    get length(){ return map.size; },
    key(index){ return Array.from(map.keys())[index] || null; },
    setItem(key, value){ map.set(String(key), String(value)); },
    removeItem(key){ map.delete(key); },
    has(key){ return map.has(key); },
    getItem(key){ return map.has(key) ? map.get(key) : null; }
  };
}

function makeFolderHandle(name, entries){
  const map = new Map();
  const removed = [];
  const handle = {
    name,
    kind:'directory',
    removed,
    async *entries(){
      for(const item of Array.from(map.entries())) yield item;
    },
    async getDirectoryHandle(entryName){
      const entry = map.get(entryName);
      if(entry?.kind === 'directory') return entry;
      const error = new Error('Not found');
      error.name = 'NotFoundError';
      throw error;
    },
    async removeEntry(entryName, options){
      removed.push({name:entryName, recursive:!!options?.recursive});
      map.delete(entryName);
    }
  };
  for(const [entryName, value] of entries){
    if(value && typeof value === 'object'){
      map.set(entryName, value);
    } else {
      map.set(entryName, {kind:value});
    }
  }
  return handle;
}

const creationUniverseFolder = makeFolderHandle('Universe One', [['creation-a.docx', 'file'], ['creation-b.docx', 'file'], ['.wormholes-managed.json', 'file']]);
const literatureUniverseFolder = makeFolderHandle('Universe One', [['lore-a.docx', 'file'], ['lore-orphan.docx', 'file'], ['.wormholes-managed.json', 'file']]);
const imageUniverseFolder = makeFolderHandle('Universe One', [['image-a.png', 'file'], ['image-orphan.png', 'file'], ['.wormholes-managed.json', 'file']]);

const creationsFolder = makeFolderHandle('Creations', [
  ['Universe One', creationUniverseFolder]
]);
const literatureFolder = makeFolderHandle('Literature', [
  ['Universe One', literatureUniverseFolder]
]);
const imagesFolder = makeFolderHandle('Images', [
  ['Universe One', imageUniverseFolder]
]);

const wormholesRoot = makeFolderHandle('Wormholes', [
  ['Creations', creationsFolder],
  ['Literature', literatureFolder],
  ['Images', imagesFolder],
  ['.wormholes-managed.json', 'file']
]);

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
  Blob,
  WORMHOLES_APP_VERSION:'Beta 125',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  window:{
    WormholesLargeDataStore:{
      async clearAll(){ context.__largeDataCleared = true; return true; }
    }
  },
  navigator:{storage:{}},
  localStorage:makeStorage({
    wormholesUniverses:'[]',
    worldBuilderUniverses:'[]',
    WormholesLargeThing:'legacy',
    wormholesLocalFoldersEnabled:'true',
    wormholesLocalFolderMode:'native',
    unrelated:'keep'
  }),
  sessionStorage:makeStorage({
    wormholesLastAppError:'old error',
    unrelatedSession:'keep'
  }),
  FOLDER_HANDLE_DATABASES:[],
  FOLDER_HANDLES_STORE:'handles',
  WORMHOLES_LOCAL_ENABLED_KEY:'wormholesLocalFoldersEnabled',
  OLD_WORMHOLES_LOCAL_ENABLED_KEY:'worldBuilderWormholesLocalFoldersEnabled',
  WORMHOLES_LOCAL_MODE_KEY:'wormholesLocalFolderMode',
  OLD_WORMHOLES_LOCAL_MODE_KEY:'worldBuilderWormholesLocalFolderMode',
  localFoldersEnabled:true,
  localFolderPendingSync:true,
  localFolderRestoreInProgress:true,
  localFolderSwitchInProgress:true,
  localFolderStorageMode:'native',
  universes:[{id:'u1', title:'Universe One', diskFolderName:'Universe One'}],
  readArchiveForUniverse(universeId){
    return universeId === 'u1' ? [{id:'c1', title:'Creation A', storage:'folder', folderFileName:'creation-a.docx'}] : [];
  },
  readLiteratureForUniverse(universeId){
    return universeId === 'u1' ? [{id:'l1', title:'Lore A', storage:'folder', folderFileName:'lore-a.docx'}] : [];
  },
  readVisionBoardForUniverse(universeId){
    return universeId === 'u1' ? [{id:'i1', title:'Image A', storage:'folder', folderFileName:'image-a.png'}] : [];
  },
  localFolderNativeApiSupported(){ return true; },
  localFolderPrivateStorageSupported(){ return false; },
  loadLocalFolderStorageMode(){ return 'native'; },
  normalizeLocalFolderStorageMode(mode){ return mode === 'opfs' ? 'opfs' : 'native'; },
  saveLocalStorageText(key, value){ context.localStorage.setItem(key, value); return true; },
  removeLocalStorageKey(key){ context.localStorage.removeItem(key); return true; },
  async loadWormholesParentFolderHandle(){ return wormholesRoot; },
  async requestFolderPermission(){ return true; },
  async folderHasCategoryDirectories(handle){ return handle === wormholesRoot; },
  async folderHasManagedMarker(){ return true; },
  clearWormholesFolderHandles(){ context.__folderHandlesCleared = true; },
  reportAppError(message, error, options){ context.__reported = {message, error, options}; }
};
context.globalThis = context;
context.window.window = context.window;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app-data-validation.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-app-data-validation.js'}
);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'export-import.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/export-import.js'});

(async () => {
  await context.clearAllWormholesAppData();

  assert.strictEqual(context.__largeDataCleared, true, 'large IndexedDB app data should be cleared');
  assert.strictEqual(context.__folderHandlesCleared, undefined, 'saved folder handles should be preserved when local folder mode is active');
  assert.strictEqual(context.localStorage.has('wormholesUniverses'), false, 'wormholes localStorage keys should be removed');
  assert.strictEqual(context.localStorage.has('worldBuilderUniverses'), false, 'legacy worldBuilder localStorage keys should be removed');
  assert.strictEqual(context.localStorage.has('WormholesLargeThing'), false, 'case-insensitive Wormholes localStorage keys should be removed');
  assert.strictEqual(context.localStorage.getItem('wormholesLocalFoldersEnabled'), 'true', 'local folder enabled setting should be preserved');
  assert.strictEqual(context.localStorage.getItem('wormholesLocalFolderMode'), 'native', 'local folder mode should be preserved');
  assert.strictEqual(context.localFoldersEnabled, true, 'local folder mode should remain enabled after clearing content');
  assert.strictEqual(context.localStorage.has('unrelated'), true, 'unrelated origin storage should not be removed');
  assert.strictEqual(context.sessionStorage.has('wormholesLastAppError'), false, 'wormholes sessionStorage keys should be removed');
  assert.strictEqual(context.sessionStorage.has('unrelatedSession'), true, 'unrelated session storage should not be removed');
  const rootRemovedNames = new Set(wormholesRoot.removed.map(item => item.name));
  ['.wormholes-managed.json', 'Creations', 'Images', 'Literature', 'wormholes-app-data-backup.json'].forEach(name => {
    assert.ok(rootRemovedNames.has(name), `${name} should be removed from the connected Wormholes local folder`);
  });
  assert.ok(creationUniverseFolder.removed.some(item => item.name === 'creation-a.docx'), 'known creation file should be deleted by exact record filename');
  assert.ok(literatureUniverseFolder.removed.some(item => item.name === 'lore-a.docx'), 'known literature file should be deleted by exact record filename');
  assert.ok(imageUniverseFolder.removed.some(item => item.name === 'image-a.png'), 'known image file should be deleted by exact record filename');
  assert.ok(creationUniverseFolder.removed.some(item => item.name === 'creation-b.docx'), 'orphan creation file should be swept after known record files');
  assert.ok(literatureUniverseFolder.removed.some(item => item.name === 'lore-orphan.docx'), 'orphan literature file should be swept after known record files');
  assert.ok(imageUniverseFolder.removed.some(item => item.name === 'image-orphan.png'), 'orphan image file should be swept after known record files');
  assert.ok(creationsFolder.removed.some(item => item.name === 'Universe One'), 'creation universe folder should be removed after its files are cleared');
  assert.ok(literatureFolder.removed.some(item => item.name === 'Universe One'), 'literature universe folder should be removed after its files are cleared');
  assert.ok(imagesFolder.removed.some(item => item.name === 'Universe One'), 'image universe folder should be removed after its files are cleared');
  assert.ok(creationsFolder.removed.every(item => item.recursive === false), 'known category folders should be removed only after contents are cleared, not by broad recursive delete first');
  assert.strictEqual(context.__reported, undefined, 'clear app data should not raise a Needs Attention panel on success');
  assert.strictEqual(context.window.__wormholesClearingAppData, true, 'clear flag should stay active until reload on success');

  const blockedRoot = makeFolderHandle('Wormholes', [
    ['Creations', 'directory'],
    ['Literature', 'directory'],
    ['Images', 'directory']
  ]);
  blockedRoot.removeEntry = async function(entryName, options){
    this.removed.push({name:entryName, recursive:!!options?.recursive});
    const error = new Error('It was determined that certain files are unsafe for access within a Web application, or that too many calls are being made on file resources.');
    error.name = 'SecurityError';
    throw error;
  };
  context.__reported = undefined;
  context.__largeDataCleared = false;
  context.__folderHandlesCleared = undefined;
  context.localStorage = makeStorage({wormholesUniverses:'[]', wormholesLocalFoldersEnabled:'true', wormholesLocalFolderMode:'native', unrelated:'keep'});
  context.sessionStorage = makeStorage({wormholesLastAppError:'old error'});
  context.loadWormholesParentFolderHandle = async () => blockedRoot;
  context.window.__wormholesClearingAppData = false;

  const blockedSummary = await context.clearAllWormholesAppData();
  assert.ok(blockedSummary.warnings.length >= 1, 'browser-blocked local folder deletes should be recorded as warnings');
  assert.strictEqual(context.localStorage.has('wormholesUniverses'), false, 'browser app data should still clear when folder deletes are blocked');
  assert.strictEqual(context.__largeDataCleared, true, 'large data should still clear when folder deletes are blocked');
  assert.strictEqual(context.__folderHandlesCleared, undefined, 'folder handles should still be preserved when folder deletes are blocked');
  assert.strictEqual(context.localStorage.getItem('wormholesLocalFoldersEnabled'), 'true', 'local folder enabled setting should remain after blocked folder deletes');
  assert.strictEqual(context.__reported, undefined, 'blocked folder deletes during app clear should not raise a Needs Attention panel');

  console.log('clear-app-data.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

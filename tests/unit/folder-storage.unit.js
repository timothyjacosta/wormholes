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
    clear(){ store.clear(); }
  };
}

function notFoundError(message = 'Not found'){
  const error = new Error(message);
  error.name = 'NotFoundError';
  return error;
}

class FakeFileHandle{
  constructor(name, blob = new Blob([''])){
    this.kind = 'file';
    this.name = name;
    this.blob = blob;
  }
  async getFile(){
    return this.blob;
  }
  async createWritable(){
    const handle = this;
    return {
      async write(blob){ handle.blob = blob; },
      async close(){},
      async abort(){}
    };
  }
}

class FakeFolderHandle{
  constructor(name){
    this.kind = 'directory';
    this.name = name;
    this.children = new Map();
    this.permission = 'granted';
  }
  async queryPermission(){ return this.permission; }
  async requestPermission(){ this.permission = 'granted'; return 'granted'; }
  async getFileHandle(name, options = {}){
    const existing = this.children.get(name);
    if(existing){
      if(existing.kind !== 'file') throw new Error(`${name} is not a file`);
      return existing;
    }
    if(options.create){
      const file = new FakeFileHandle(name);
      this.children.set(name, file);
      return file;
    }
    throw notFoundError(`${name} not found`);
  }
  async getDirectoryHandle(name, options = {}){
    const existing = this.children.get(name);
    if(existing){
      if(existing.kind !== 'directory') throw new Error(`${name} is not a directory`);
      return existing;
    }
    if(options.create){
      const folder = new FakeFolderHandle(name);
      this.children.set(name, folder);
      return folder;
    }
    throw notFoundError(`${name} not found`);
  }
  async removeEntry(name){
    if(!this.children.has(name)) throw notFoundError(`${name} not found`);
    this.children.delete(name);
  }
  async *entries(){
    for(const item of this.children.entries()) yield item;
  }
  async isSameEntry(other){
    return this === other;
  }
}

const localStorage = createLocalStorage();
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
  Uint8Array,
  Error,
  atob(value){ return Buffer.from(value, 'base64').toString('binary'); },
  navigator:{},
  document:{ getElementById(){ return null; } },
  window:{ showDirectoryPicker(){}, indexedDB:{} },
  indexedDB:{},
  URL:{ createObjectURL(){ return 'blob:test'; }, revokeObjectURL(){} },
  Image:function(){},
  fetch(){ return Promise.reject(new Error('fetch not available in unit test')); },
  reportAppError(contextLabel, error, options = {}){
    context.__reportedErrors.push({contextLabel, message:error && error.message || String(error), userMessage:options.userMessage || ''});
  },
  __reportedErrors:[],
  currentUniverseId:'u1',
  universes:[],
  archiveEntries:[],
  literatureEntries:[],
  visionEntries:[],
  connectionNotes:{},
  bridgeNotes:{},
  localFoldersEnabled:false,
  localFolderRestoreInProgress:false,
  localFolderSwitchInProgress:false,
  localFolderStorageMode:'native',
  previousWormholesSourceFolderHandle:null,
  wormholesRootFolderHandle:null,
  wormholesParentFolderHandle:null,
  wormholesCreationsRootHandle:null,
  wormholesLiteratureRootHandle:null,
  wormholesImagesRootHandle:null,
  creationFolderHandle:null,
  literatureFolderHandle:null,
  visionFolderHandle:null,
  visionObjectUrls:[],
  storageFootnoteTexts:{},
  recentStorageFailureMessage:'',
  recentStorageFailureAt:0,
  recentFolderSaveWarningMessage:'',
  recentFolderSaveWarningAt:0,
  PARTIAL_FOLDER_SAVE_MESSAGE:'Saved in app. Folder sync failed.',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  WORMHOLES_APP_VERSION:'Beta test',
  WORMHOLES_MANAGED_MARKER:'.wormholes-managed.json',
  WORMHOLES_CATEGORY_NAMES:new Set(['Creations','Literature','Images']),
  makeId(){ return 'generated-id'; },
  largeDataStore(){ return null; },
  stableUniverseFolderName(universe){ return `Universe-${universe.id || universe.title}`; },
  legacyUniverseFolderName(universe){ return universe.title || 'Untitled Universe'; },
  universeFolderName(universe){ return universe.diskFolderName || universe.title; },
  normalizeBridges(bridges){ return Array.isArray(bridges) ? bridges : []; },
  normalizeArchiveGroups(){},
  requestStorageFootnoteUpdate(){ context.__storageFootnoteRequested = true; },
  restoreFolderHandlesForCurrentUniverse(){ return Promise.resolve(false); },
  readArchiveForUniverse(){ return []; },
  readLiteratureForUniverse(){ return []; },
  readVisionBoardForUniverse(){ return []; },
  saveArchiveToStorage(){ context.__savedArchive = true; return true; },
  saveArchiveForUniverse(){ context.__savedArchiveForUniverse = true; return true; },
  saveLiteratureToStorage(){ context.__savedLiterature = true; return true; },
  saveLiteratureForUniverse(){ context.__savedLiteratureForUniverse = true; return true; },
  saveVisionBoardToStorage(){ context.__savedVision = true; return true; },
  saveVisionBoardForUniverse(){ context.__savedVisionForUniverse = true; return true; },
  materializeVisionItemLargeData(){ return Promise.resolve(); },
  visionItemDisplaySrc(){ return Promise.resolve(''); },
  visionItemsForEntryTag(){ return []; },
  visionItemsForGroupChildrenTag(){ return []; },
  isGroupEntry(){ return false; },
  getUniverseTitle(){ return 'Universe'; },
  imageBlobToThumbnailBlob(blob){ return Promise.resolve(blob); },
  ensureUniverseFolders(){ return Promise.resolve(null); },
  folderHasManagedMarker(){ return Promise.resolve(true); },
  writeManagedFolderMarker(){ return Promise.resolve(true); },
  prepareWormholesFolderHandles(){ return Promise.resolve(true); },
  delay(){ return Promise.resolve(); }
};
context.globalThis = context;
context.window = context.window;
vm.createContext(context);
const storageScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'storage.js'), 'utf8');
const folderStorageScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'folder-storage.js'), 'utf8');
vm.runInContext(storageScript, context, {filename:'scripts/storage.js'});
vm.runInContext(folderStorageScript, context, {filename:'scripts/folder-storage.js'});

(async () => {
  assert.strictEqual(typeof context.localFolderApiSupported, 'function');
  assert.strictEqual(typeof context.uniqueFolderFileName, 'function');
  assert.strictEqual(typeof context.folderMigrationFileName, 'function');
  assert.strictEqual(typeof context.writeBlobToFolder, 'function');

  assert.strictEqual(context.localFolderNativeApiSupported(), true);
  assert.strictEqual(context.localFolderApiSupported(), true);
  assert.strictEqual(context.normalizeLocalFolderStorageMode('opfs'), 'opfs');
  assert.strictEqual(context.normalizeLocalFolderStorageMode('anything-else'), 'native');

  localStorage.setItem('wormholesLocalFolderMode', 'opfs');
  context.navigator.storage = {getDirectory(){ return Promise.resolve(new FakeFolderHandle('opfs-root')); }};
  assert.strictEqual(context.loadLocalFolderStorageMode(), 'opfs');
  assert.strictEqual(context.localFolderUsesPrivateStorage(), true);

  context.navigator.storage = {};
  assert.strictEqual(context.loadLocalFolderStorageMode(), 'native');
  assert.strictEqual(context.localFolderUsesPrivateStorage(), false);

  assert.strictEqual(context.sanitizeFileNamePart('  bad:/name?  ', 'file'), 'bad-name-');
  assert.strictEqual(context.folderBaseNameFromTitle('My Image.jpg', '.jpg'), 'My Image');

  const folder = new FakeFolderHandle('Images');
  await context.writeBlobToFolder(folder, 'My Image.jpg', new Blob(['hello'], {type:'text/plain'}));
  assert.strictEqual(await context.readTextFromFolderFile(folder, 'My Image.jpg'), 'hello');
  assert.strictEqual(await context.fileExistsInFolder(folder, 'My Image.jpg'), true);
  assert.strictEqual(await context.uniqueFolderFileName(folder, 'My Image', '.jpg'), 'My Image-2.jpg');
  assert.strictEqual(await context.titleBasedFolderFileName(folder, 'My Image', '.jpg', 'My Image.jpg'), 'My Image.jpg');

  const record = {folderFileName:'My Image.jpg'};
  const preserved = await context.folderMigrationFileName(record, folder, 'My Image', '.jpg', {force:true, preserveExistingFolderFileNames:true});
  assert.strictEqual(preserved, 'My Image.jpg');
  const fresh = await context.folderMigrationFileName(record, folder, 'My Image', '.jpg', {force:true, preserveExistingFolderFileNames:false});
  assert.strictEqual(fresh, 'My Image-2.jpg');

  assert.strictEqual(await context.removeFileFromFolder(folder, 'My Image.jpg'), true);
  assert.strictEqual(await context.fileExistsInFolder(folder, 'My Image.jpg'), false);
  assert.strictEqual(context.fileTitleFromName('Title-2.jpg'), 'Title-2');
  assert.strictEqual(context.stripGeneratedFolderCollisionSuffixes('Title-3'), 'Title');

  const child = await context.getOrCreateDirectory(folder, 'Sub Folder');
  assert.strictEqual(child.name, 'Sub Folder');
  assert.strictEqual(await context.folderHandlesReferToSameEntry(child, child), true);
  assert.strictEqual(await context.currentTargetMatchesPreviousWormholesFolder(), false);

  context.localFoldersEnabled = true;
  context.saveLocalFolderEnabled();
  assert.strictEqual(localStorage.getItem('wormholesLocalFoldersEnabled'), 'true');

  context.wormholesParentFolderHandle = folder;
  context.wormholesRootFolderHandle = child;
  context.wormholesLiteratureRootHandle = child;
  context.wormholesImagesRootHandle = child;
  context.wormholesCreationsRootHandle = child;
  context.literatureFolderHandle = child;
  context.visionFolderHandle = child;
  context.creationFolderHandle = child;
  context.clearWormholesFolderHandles();
  assert.strictEqual(context.wormholesParentFolderHandle, null);
  assert.strictEqual(context.wormholesRootFolderHandle, null);
  assert.strictEqual(context.literatureFolderHandle, null);

  console.log('folder-storage.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

const initialSnapshot = {
  format:'Wormholes App Data Export',
  schemaVersion:4,
  appVersion:'Beta 197',
  currentUniverseId:'old-u',
  universes:[{id:'old-u', title:'Existing Universe', summary:'Keep me', bridges:[], createdAt:'2026-01-01T00:00:00.000Z', diskFolderName:'Existing Universe -- old-u'}],
  bridgeNotes:{existingBridge:'existing note'},
  universeData:{
    'old-u':{
      archive:[{id:'old-a', title:'Existing Creation'}],
      connectionNotes:{'old-a::old-b':'existing connection note'},
      literature:[{id:'old-l', title:'Existing Literature', content:'Existing text'}],
      vision:[{id:'old-v', title:'Existing Image', dataUrl:'data:image/png;base64,old'}]
    }
  }
};

const incoming = {
  format:'Wormholes App Data Export',
  schemaVersion:4,
  appVersion:'Beta 197',
  currentUniverseId:'new-u',
  universes:[{id:'new-u', title:'Backup Universe', bridges:[], createdAt:'2026-02-01T00:00:00.000Z'}],
  bridgeNotes:{newBridge:'new note'},
  universeData:{
    'new-u':{
      archive:[{id:'new-a', title:'Backup Creation'}],
      connectionNotes:{'new-a::new-b':'backup note'},
      literature:[{id:'new-l', title:'Backup Literature', content:'Backup text'}],
      vision:[{id:'new-v', title:'Backup Image', dataUrl:'data:image/png;base64,new'}]
    }
  }
};

const persisted = {
  universes:clone(initialSnapshot.universes),
  bridgeNotes:clone(initialSnapshot.bridgeNotes),
  schemaVersion:4,
  archive:{'old-u':clone(initialSnapshot.universeData['old-u'].archive)},
  connectionNotes:{'old-u':clone(initialSnapshot.universeData['old-u'].connectionNotes)},
  literature:{'old-u':clone(initialSnapshot.universeData['old-u'].literature)},
  vision:{'old-u':clone(initialSnapshot.universeData['old-u'].vision)}
};

let failIncomingArchiveOnce = true;

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
  SyntaxError,
  WORMHOLES_APP_VERSION:'Beta 197',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  WORMHOLES_MANAGED_MARKER:'.wormholes-managed.json',
  UNIVERSES_KEY:'wormholes_universes',
  OLD_UNIVERSES_KEY:'old_universes',
  WORMHOLE_BRIDGE_NOTES_KEY:'wormholes_bridge_notes',
  OLD_WORMHOLE_BRIDGE_NOTES_KEY:'old_bridge_notes',
  WORMHOLES_SCHEMA_KEY:'wormholes_schema_version',
  makeId(){ return 'unit-id'; },
  normalizeBridgeListForImport(value){ return Array.isArray(value) ? value : []; },
  normalizeSchemaUniverse(universe){ return {...universe, id:universe?.id || 'unit-id'}; },
  normalizeSchemaArchiveEntry(entry){ return {...entry, id:entry?.id || 'unit-entry'}; },
  normalizeImportedLiteratureDoc(doc, universeId){ return {...doc, universeId, id:doc?.id || 'unit-lit'}; },
  normalizeImportedVisionItem(item, universeId){ return {...item, universeId, id:item?.id || 'unit-vision'}; },
  stableUniverseFolderName(universe){ return `${universe.title || 'Untitled Universe'} -- ${universe.id || 'unit-id'}`; },
  isGroupEntry(){ return false; },
  isLiteratureGroup(){ return false; },
  literaturePlainPreview(value){ return String(value || ''); },
  sanitizeLiteratureHtml(value){ return String(value || ''); },
  makeConnectionKeyFromIds(a, b){ return [a, b].sort().join('::'); },
  archiveStorageKey(id){ return `archive:${id}`; },
  oldArchiveStorageKey(id){ return `old-archive:${id}`; },
  connectionNotesStorageKey(id){ return `notes:${id}`; },
  oldConnectionNotesStorageKey(id){ return `old-notes:${id}`; },
  literatureStorageKey(id){ return `lit:${id}`; },
  oldLiteratureStorageKey(id){ return `old-lit:${id}`; },
  visionStorageKey(id){ return `vision:${id}`; },
  oldVisionStorageKey(id){ return `old-vision:${id}`; },
  localStorage:{removeItem(){}, getItem(){ return null; }, length:0, key(){ return null; }},
  deleteUniverseLargeData(){ return Promise.resolve(); },
  navigator:{storage:{}},
  document:{getElementById(){ return null; }},
  universes:clone(initialSnapshot.universes),
  bridgeNotes:clone(initialSnapshot.bridgeNotes),
  currentUniverseId:'old-u',
  activeLiteratureId:null,
  previousWormholesSourceFolderHandle:{name:'Old Folder'},
  wormholesParentFolderHandle:{name:'Old Folder'},
  wormholesRootFolderHandle:{name:'Wormholes'},
  wormholesLiteratureRootHandle:{name:'Literature'},
  wormholesImagesRootHandle:{name:'Images'},
  wormholesCreationsRootHandle:{name:'Creations'},
  localFoldersEnabled:true,
  localFolderPendingSync:false,
  localFolderSwitchInProgress:false,
  localFolderStorageMode:'native',
  setSettingsStatus(message){ context.__status = message; },
  showSavedToast(message){ context.__toast = message; },
  toggleSettingsMenu(){},
  showHomeScreen(){},
  showAppScreen(){},
  switchTab(){},
  showConnectionsScreen(){},
  getLiteratureDoc(){ return null; },
  async showLiteratureEditorScreen(){},
  requestStorageFootnoteUpdate(){},
  loadArchiveFromStorage(){},
  loadConnectionNotesFromStorage(){},
  loadLiteratureFromStorage(){},
  loadVisionBoardFromStorage(){},
  renderCurrent(){},
  renderArchive(){},
  renderLiteratureList(){},
  async renderVisionBoard(){},
  renderUniverseArchiveList(){},
  renderWormholesUniverseList(){},
  getCurrentUniverse(){ return context.universes.find(universe => universe.id === context.currentUniverseId) || null; },
  restoreFolderHandlesForCurrentUniverse(){},
  updateLocalFolderCheckboxes(){},
  reportAppError(contextMessage, error, options){ context.__reportedError = {contextMessage, error, options}; },
  clearWormholesFolderHandles(){
    context.wormholesParentFolderHandle = null;
    context.wormholesRootFolderHandle = null;
    context.wormholesLiteratureRootHandle = null;
    context.wormholesImagesRootHandle = null;
    context.wormholesCreationsRootHandle = null;
  },
  saveLocalFolderStorageMode(mode){ context.localFolderStorageMode = mode; return mode; },
  async saveWormholesParentFolderHandle(handle){ context.__savedFolderHandle = handle; return true; },
  async removeWormholesParentFolderHandle(){ context.__savedFolderHandle = null; return true; },
  saveLocalFolderEnabled(){ return true; },
  async prepareWormholesFolderHandles(){ return true; },
  FOLDER_HANDLE_DATABASES:[],
  FOLDER_HANDLES_STORE:'handles'
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app-data-validation.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-app-data-validation.js'}
);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'export-import.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/export-import.js'});

context.confirmAppDataImportOverwrite = async () => true;

context.pickNativeDirectory = async () => ({name:'Backup Folder'});
context.buildWormholesAppDataExport = async () => clone(initialSnapshot);
context.prepareAppStateFromLocalBackupFolder = async () => {
  const prepared = context.prepareWormholesAppDataImport(clone(incoming));
  return {
    rootHandle:{name:'Wormholes'},
    prepared,
    universes:prepared.universes,
    currentUniverseId:prepared.currentUniverseId,
    bridgeNotes:prepared.bridgeNotes,
    summary:{universes:1, creations:1, literature:1, literatureWithText:1, images:1},
    source:'manifest'
  };
};
context.clearExistingAppDataBeforeImport = async (importData, options = {}) => {
  const ids = new Set([
    ...context.universes.map(universe => universe.id),
    ...(importData.universes || []).map(universe => universe.id),
    ...(options.additionalUniverses || []).map(universe => universe.id)
  ]);
  persisted.universes = [];
  persisted.bridgeNotes = {};
  for(const id of ids){
    delete persisted.archive[id];
    delete persisted.connectionNotes[id];
    delete persisted.literature[id];
    delete persisted.vision[id];
  }
};
context.saveLocalStorageJson = (key, value) => {
  if(key === context.UNIVERSES_KEY) persisted.universes = clone(value);
  if(key === context.WORMHOLE_BRIDGE_NOTES_KEY) persisted.bridgeNotes = clone(value);
  return true;
};
context.saveLocalStorageText = (key, value) => {
  if(key === context.WORMHOLES_SCHEMA_KEY) persisted.schemaVersion = Number(value);
  return true;
};
context.saveArchiveForUniverse = (universeId, entries) => {
  if(universeId === 'new-u' && failIncomingArchiveOnce){
    failIncomingArchiveOnce = false;
    const error = new Error('Browser storage quota exceeded while saving the incoming Archive.');
    error.name = 'QuotaExceededError';
    throw error;
  }
  persisted.archive[universeId] = clone(entries);
  return true;
};
context.saveConnectionNotesForUniverse = (universeId, notes) => {
  persisted.connectionNotes[universeId] = clone(notes);
  return true;
};
context.saveImportedLiteratureForUniverse = async (universeId, docs) => {
  persisted.literature[universeId] = clone(docs);
  return true;
};
context.saveImportedVisionForUniverse = async (universeId, items) => {
  persisted.vision[universeId] = clone(items);
  return true;
};

(async () => {
  await context.restoreBackupFromSettings();

  assert.deepStrictEqual(persisted.universes, initialSnapshot.universes, 'original universe list should be restored after a failed backup-folder restore');
  assert.deepStrictEqual(persisted.bridgeNotes, initialSnapshot.bridgeNotes, 'original bridge notes should be restored');
  assert.deepStrictEqual(persisted.archive['old-u'], initialSnapshot.universeData['old-u'].archive, 'original archive should be restored');
  assert.deepStrictEqual(persisted.connectionNotes['old-u'], initialSnapshot.universeData['old-u'].connectionNotes, 'original connection notes should be restored');
  assert.deepStrictEqual(persisted.literature['old-u'].map(({universeId, ...doc}) => doc), initialSnapshot.universeData['old-u'].literature, 'original literature should be restored');
  assert.deepStrictEqual(persisted.vision['old-u'].map(({universeId, ...item}) => item), initialSnapshot.universeData['old-u'].vision, 'original vision data should be restored');
  assert.strictEqual(persisted.archive['new-u'], undefined, 'partial restored archive should be removed');
  assert.strictEqual(persisted.literature['new-u'], undefined, 'partial restored literature should be removed');
  assert.strictEqual(persisted.vision['new-u'], undefined, 'partial restored vision data should be removed');
  assert.match(context.__status, /previous data was restored/i, 'the in-app status should explain that previous data was restored');
  assert.match(context.__toast, /previous data restored/i, 'the in-app toast should explain that previous data was restored');
  assert.strictEqual(context.window.alert, undefined, 'restore failure handling should not use browser alert dialogs');
  assert.strictEqual(context.window.confirm, undefined, 'restore failure handling should not use browser confirm dialogs');
  assert.strictEqual(context.window.prompt, undefined, 'restore failure handling should not use browser prompt dialogs');

  // A failure after the replacement data is written must also roll back the data and folder connection.
  persisted.universes = clone(initialSnapshot.universes);
  persisted.bridgeNotes = clone(initialSnapshot.bridgeNotes);
  persisted.archive = {'old-u':clone(initialSnapshot.universeData['old-u'].archive)};
  persisted.connectionNotes = {'old-u':clone(initialSnapshot.universeData['old-u'].connectionNotes)};
  persisted.literature = {'old-u':clone(initialSnapshot.universeData['old-u'].literature)};
  persisted.vision = {'old-u':clone(initialSnapshot.universeData['old-u'].vision)};
  context.universes = clone(initialSnapshot.universes);
  context.bridgeNotes = clone(initialSnapshot.bridgeNotes);
  context.currentUniverseId = 'old-u';
  context.previousWormholesSourceFolderHandle = {name:'Old Folder'};
  context.wormholesParentFolderHandle = {name:'Old Folder'};
  context.wormholesRootFolderHandle = {name:'Wormholes'};
  context.wormholesLiteratureRootHandle = {name:'Literature'};
  context.wormholesImagesRootHandle = {name:'Images'};
  context.wormholesCreationsRootHandle = {name:'Creations'};
  failIncomingArchiveOnce = false;
  context.prepareWormholesFolderHandles = async () => false;

  await context.restoreBackupFromSettings();

  assert.deepStrictEqual(persisted.universes, initialSnapshot.universes, 'a folder-activation failure should restore the original universe list');
  assert.deepStrictEqual(persisted.archive['old-u'], initialSnapshot.universeData['old-u'].archive, 'a folder-activation failure should restore the original archive');
  assert.strictEqual(persisted.archive['new-u'], undefined, 'a folder-activation failure should remove the replacement archive');
  assert.strictEqual(context.wormholesParentFolderHandle?.name, 'Old Folder', 'the previous folder connection should be restored after activation failure');
  assert.match(context.__status, /previous data was restored/i, 'activation failure should use the same simple in-app rollback message');

  const exportImportSource = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'export-import.js'), 'utf8');
  const prepareStart = exportImportSource.indexOf('async function prepareAppStateFromLocalBackupFolder');
  const prepareEnd = exportImportSource.indexOf('async function rebuildAppStateFromLocalBackupFolder', prepareStart);
  const prepareSource = exportImportSource.slice(prepareStart, prepareEnd);
  assert.ok(prepareSource.includes('Read and stage the entire backup before changing any live app data'), 'folder restore should explicitly stage backup data before committing');
  assert.ok(!prepareSource.includes('writePreparedWormholesAppDataImport('), 'the read-and-prepare phase should not write live app data');

  console.log('backup-folder-restore-failure-atomic.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

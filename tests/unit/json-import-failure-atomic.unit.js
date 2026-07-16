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
  universes:[{id:'new-u', title:'Incoming Universe', bridges:[], createdAt:'2026-02-01T00:00:00.000Z'}],
  bridgeNotes:{newBridge:'new note'},
  universeData:{
    'new-u':{
      archive:[{id:'new-a', title:'Incoming Creation'}],
      connectionNotes:{'new-a::new-b':'incoming note'},
      literature:[{id:'new-l', title:'Incoming Literature', content:'Incoming text'}],
      vision:[{id:'new-v', title:'Incoming Image', dataUrl:'data:image/png;base64,new'}]
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
  window:{},
  navigator:{storage:{}},
  document:{getElementById(){ return null; }},
  universes:clone(initialSnapshot.universes),
  bridgeNotes:clone(initialSnapshot.bridgeNotes),
  currentUniverseId:'old-u',
  setSettingsStatus(message){ context.__status = message; },
  showSavedToast(message){ context.__toast = message; },
  toggleSettingsMenu(){},
  showHomeScreen(){},
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
  reportAppError(){},
  clearWormholesFolderHandles(){},
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
context.buildWormholesAppDataExport = async () => clone(initialSnapshot);
context.restoreImportedAppDataToLocalFolderIfPossible = async () => '';
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
  const result = await context.applyWormholesAppDataImport(clone(incoming));
  assert.strictEqual(result, false, 'a failed import should report failure');
  assert.deepStrictEqual(persisted.universes, initialSnapshot.universes, 'original universe list should be restored');
  assert.deepStrictEqual(persisted.bridgeNotes, initialSnapshot.bridgeNotes, 'original bridge notes should be restored');
  assert.deepStrictEqual(persisted.archive['old-u'], initialSnapshot.universeData['old-u'].archive, 'original archive should be restored');
  assert.deepStrictEqual(persisted.connectionNotes['old-u'], initialSnapshot.universeData['old-u'].connectionNotes, 'original connection notes should be restored');
  assert.deepStrictEqual(persisted.literature['old-u'].map(({universeId, ...doc}) => doc), initialSnapshot.universeData['old-u'].literature, 'original literature should be restored');
  assert.deepStrictEqual(persisted.vision['old-u'].map(({universeId, ...item}) => item), initialSnapshot.universeData['old-u'].vision, 'original vision data should be restored');
  assert.strictEqual(persisted.archive['new-u'], undefined, 'partial incoming archive should be removed');
  assert.strictEqual(persisted.literature['new-u'], undefined, 'partial incoming literature should be removed');
  assert.strictEqual(persisted.vision['new-u'], undefined, 'partial incoming vision data should be removed');
  assert.match(context.__status, /existing Wormholes data was restored/i, 'the in-app status should explain that existing data was restored');
  assert.match(context.__toast, /existing data restored/i, 'the in-app toast should explain that existing data was restored');
  console.log('json-import-failure-atomic.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const archiveSource = fs.readFileSync(path.join(root, 'scripts/archive.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(root, 'scripts/wormholes-persisted-schema.js'), 'utf8');

const context = {
  console,
  window:{},
  document:{getElementById(){ return null; }},
  archiveEntries:[
    {id:'existing', title:'Existing', connections:[], bridges:[]},
    {id:'copied', title:'Copied', connections:[], bridges:[], copiedFromUniverseId:'u1'}
  ],
  universes:[{id:'u2', title:'Target', summary:'', bridges:[]}],
  currentUniverseId:'u2',
  connectionNotes:{},
  bridgeNotes:{},
  literatureEntries:[],
  visionEntries:[],
  connectSourceId:null,
  selectedMapNodeId:null,
  selectedWormholeCreation:null,
  creationFolderHandle:null,
  localFoldersEnabled:false,
  makeId(){ return 'generated'; },
  displayValue(value){ return value?.val || ''; },
  normalizeBridges(value){ return Array.isArray(value) ? value : []; },
  normalizeBridge(value){ return value; },
  normalizeUniverseBridge(value){ return value; },
  normalizeUniverseBridges(universe){ return Array.isArray(universe?.bridges) ? universe.bridges : []; },
  uniqueList(value){ return Array.from(new Set(Array.isArray(value) ? value : [])); },
  getCurrentUniverse(){ return context.universes[0]; },
  readArchiveForUniverse(){ return context.archiveEntries; },
  readConnectionNotesForUniverse(){ return {}; },
  saveConnectionNotesForUniverse(){ return true; },
  readLiteratureForUniverse(){ return []; },
  readVisionBoardForUniverse(){ return []; },
  linkBridgeTargetStillExists(){ return true; },
  cleanupConnectionNotesForArchive(){},
  cleanupBridgeNotes(){},
  saveConnectionNotesToStorage(){ return true; },
  saveUniversesToStorage(){ return true; },
  saveBridgeNotesToStorage(){ return true; },
  cleanupLinksToDeletedEntity(){},
  renderArchive(){},
  showSavedToast(){},
  pruneWormholesFolderToAppState:async()=>{},
  ensureWormholesFolderReadyForDestructiveSync:async()=>{},
  deleteFolderBackedRecordFile:async()=>{},
  ensureUniverseFolders:async()=>null,
  writeArchiveEntryToFolder:async()=>{},
  closeMenus(){},
  reportAppError(message, error){ throw error || new Error(message); }
};
context.window = context;
context.WormholesUndo = {
  captureState(){ return {ok:true}; },
  async offer(){ return true; }
};

vm.createContext(context);
vm.runInContext(schemaSource, context, {filename:'wormholes-persisted-schema.js'});
vm.runInContext(archiveSource, context, {filename:'archive.js'});

// Keep the test focused on the mutation produced by deleteEntry.
context.cleanupLinksToDeletedEntity = function(){};
context.normalizeArchiveGroups = function(){};
context.renderArchive = function(){};
let saved = null;
context.saveArchiveToStorage = function(){
  const result = context.WormholesPersistedSchema.validate('archive', context.archiveEntries, {mode:'write'});
  assert.strictEqual(result.ok, true, context.WormholesPersistedSchema.summary(result));
  saved = JSON.parse(JSON.stringify(context.archiveEntries));
  return true;
};

(async()=>{
  await context.deleteEntry('copied');
  assert.ok(saved, 'deleting the copied creation should save the target Archive');
  assert.deepStrictEqual(saved.map(item => item.id), ['existing']);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(saved[0], 'groupIds'), false,
    'deleting a creation must not add groupIds: undefined to remaining normal creations');
  console.log('copied-creation-delete-regression.unit.js passed');
})().catch(error => { console.error(error); process.exit(1); });

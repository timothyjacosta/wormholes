const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let idCounter = 0;
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
  document:{getElementById(){ return null; }, querySelectorAll(){ return []; }},
  window:{},
  currentUniverseId:'u1',
  universes:[{id:'u1', title:'Alpha'}, {id:'u2', title:'Beta'}],
  archiveEntries:[],
  connectionNotes:{},
  bridgeNotes:{},
  connectSourceId:null,
  selectedMapNodeId:null,
  selectedWormholeCreation:null,
  localFoldersEnabled:false,
  creationFolderHandle:null,
  wormholesCreationsRootHandle:null,
  archiveVisionObjectUrls:[],
  makeId(){ idCounter += 1; return `new-${idCounter}`; },
  displayValue(item){ return item ? String(item.val) : '—'; },
  readArchiveForUniverse(universeId){ return context.__archivesByUniverse[universeId] || []; },
  saveArchiveToStorage(){ context.__savedArchive = true; return true; },
  saveArchiveForUniverse(universeId, archive){ context.__archivesByUniverse[universeId] = archive; context.__savedArchiveForUniverse = universeId; return true; },
  saveConnectionNotesToStorage(){ context.__savedConnectionNotes = true; return true; },
  readConnectionNotesForUniverse(universeId){ return context.__connectionNotesByUniverse[universeId] || {}; },
  saveConnectionNotesForUniverse(universeId, notes){ context.__connectionNotesByUniverse[universeId] = notes; context.__savedConnectionNotesForUniverse = universeId; return true; },
  saveBridgeNotesToStorage(){ context.__savedBridgeNotes = true; return true; },
  saveUniversesToStorage(){ context.__savedUniverses = true; return true; },
  normalizeBridges(bridges){ return Array.isArray(bridges) ? bridges : []; },
  normalizeUniverseBridges(universe){ return Array.isArray(universe?.bridges) ? universe.bridges : []; },
  normalizeUniverseBridge(bridge){ return bridge; },
  normalizeBridgeListForImport(bridges){ return Array.isArray(bridges) ? bridges : []; },
  makeConnectionKeyFromIds(a,b){ return [a,b].sort().join('::'); },
  normalizeBridge(bridge){ return bridge; },
  bridgeNoteKeyForNodes(a,b){ return [a,b].sort().join('||'); },
  getUniverseTitle(id){ return context.universes.find(u => u.id === id)?.title || 'Missing universe'; },
  getCreationTitleFromUniverse(universeId, creationId){
    const entry = (context.__archivesByUniverse[universeId] || []).find(item => item.id === creationId);
    return entry ? entry.title : 'Missing creation';
  },
  removeExternalReferencesToGroup(){},
  removeGroupRelationshipNotes(){},
  renderArchive(){},
  renderConnectionsMap(){},
  renderWormholesMap(){},
  pruneWormholesFolderToAppState(){ return Promise.resolve(); },
  ensureWormholesFolderReadyForDestructiveSync(){ return Promise.resolve(); },
  ensureUniverseFolders(){ return Promise.resolve(null); },
  deleteFolderBackedRecordFile(){ return Promise.resolve(); },
  rememberFolderSaveFailure(){},
  requestFolderPermission(){ return Promise.resolve(false); },
  createDocxBlobFromTextAndImages(){ return Promise.resolve(new Blob(['doc'])); },
  linkedVisionRowsForCreationDocx(){ return []; },
  docxImagesFromVisionRows(){ return Promise.resolve({images:[], unavailable:[]}); },
  htmlToPlainText(html){ return String(html || '').replace(/<[^>]+>/g, ''); },
  writeBlobToFolder(){ return Promise.resolve(); },
  folderMigrationFileName(){ return Promise.resolve('creation.docx'); },
  getCurrentUniverse(){ return context.universes.find(u => u.id === context.currentUniverseId) || null; },
  showSavedToast(message){ context.__lastToast = message || 'Saved'; },
  closeMigrateModal(){},
  closeMenus(){},
  closeTitleModal(){},
  renderCurrent(){},
  getVisionItemFromUniverse(){ return null; },
  visionItemDisplaySrc(){ return Promise.resolve(''); },
  URL:{revokeObjectURL(){}},
  __archivesByUniverse:{},
  __connectionNotesByUniverse:{}
};
context.globalThis = context;
context.window = context;
vm.createContext(context);
const archiveScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'archive.js'), 'utf8');
vm.runInContext(archiveScript, context, {filename:'scripts/archive.js'});

assert.strictEqual(typeof context.topLevelArchiveEntries, 'function');
assert.strictEqual(typeof context.normalizeSchemaArchiveEntry, 'function');
assert.strictEqual(typeof context.cloneMigratedArchiveEntries, 'function');
assert.strictEqual(typeof context.entryHasArchivableCreationData, 'function');

context.archiveEntries = [
  {id:'a', title:'A', what:{val:'One'}, connections:['b']},
  {id:'b', title:'B', what:{val:'Two'}, connections:['a']},
  {id:'g', title:'Group', kind:'group', groupIds:['a','b']}
];

assert.strictEqual(context.getEntry('a').title, 'A');
assert.strictEqual(context.getTitle('missing'), 'Missing creation');
assert.strictEqual(context.isGroupEntry(context.archiveEntries[2]), true);
assert.deepStrictEqual(context.groupChildIds(context.archiveEntries[2]), ['a','b']);
assert.deepStrictEqual(context.topLevelArchiveEntries().map(entry => entry.id), ['g']);
assert.strictEqual(context.mapEntryForIdInEntries('a').id, 'g');
assert.strictEqual(context.visibleEntryIdForUniverseEntry('u1', 'a'), 'g');
assert.strictEqual(context.visibleEntryTitleForUniverseEntry('u1', 'a'), 'Group');
assert.strictEqual(context.entryHasArchivableCreationData({what:null, attr1:{val:'Odd'}, attr2:null, pressure:null}), true);
assert.strictEqual(context.entryHasArchivableCreationData({what:null, attr1:null, attr2:null, pressure:null}), false);

const normalized = context.normalizeSchemaArchiveEntry({title:'Imported', notes:['  • First ', '', '- Second'], children:['a','b']});
assert.strictEqual(normalized.kind, 'group');
assert.deepStrictEqual(normalized.groupIds, ['a','b']);
assert.deepStrictEqual(normalized.notes, ['First', 'Second']);
assert.ok(normalized.id.startsWith('new-'));


const generatedNormalized = context.normalizeSchemaArchiveEntry({
  id:'generated-1',
  title:'Generated',
  connections:[],
  bridges:[],
  _generation:{
    version:2,
    seed:'deadbeef',
    algorithm:'xorshift32-v1',
    seedBehaviorVersion:'xorshift32-inclusive-int-v1',
    generatorVersion:'beta-248',
    tableVersion:'classic-authored-v1',
    tableFingerprint:'1a2b3c4d',
    draws:6,
    actions:[{kind:'quick-full', rolls:{what:4, attr1:21, attr2:33, story:10}}]
  }
});
assert.strictEqual(generatedNormalized._generation.seed, 'deadbeef', 'valid hidden generation diagnostics should survive normalization');
assert.strictEqual(generatedNormalized._generation.actions[0].kind, 'quick-full');
assert.strictEqual(generatedNormalized._generation.seedBehaviorVersion, 'xorshift32-inclusive-int-v1');
assert.strictEqual(generatedNormalized._generation.tableFingerprint, '1a2b3c4d');

const legacyGeneratedNormalized = context.normalizeSchemaArchiveEntry({
  id:'generated-legacy',
  title:'Legacy generated',
  connections:[],
  bridges:[],
  _generation:{
    version:1,
    seed:'cafebabe',
    algorithm:'xorshift32-v1',
    generatorVersion:'beta-238',
    tableVersion:'classic-authored-v1',
    draws:4,
    actions:[{kind:'quick-full', rolls:{what:1, attr1:2, attr2:3, story:4}}]
  }
});
assert.strictEqual(legacyGeneratedNormalized._generation.version, 1, 'legacy diagnostic records should remain importable');
assert.strictEqual(legacyGeneratedNormalized._generation.seedBehaviorVersion, 'xorshift32-inclusive-int-v1');

const invalidGeneratedNormalized = context.normalizeSchemaArchiveEntry({
  id:'generated-2',
  title:'Invalid diagnostics',
  connections:[],
  bridges:[],
  _generation:{seed:'not-valid', algorithm:'unknown', actions:[{kind:'script', rolls:{roll:999}}]}
});
assert.strictEqual(invalidGeneratedNormalized._generation, undefined, 'malformed hidden diagnostics should be discarded during normalization');

const {idMap, migratedEntries} = context.cloneMigratedArchiveEntries(
  [
    {id:'a', title:'A', connections:['b', 'external'], bridges:[{universeId:'u1'}, {universeId:'u2', creationId:'z'}]},
    {id:'b', title:'B', connections:['a']},
    {id:'g', title:'Group', kind:'group', groupIds:['a','b'], connections:[]}
  ],
  new Set(['a','b','g']),
  {id:'u1', title:'Alpha'},
  'u2'
);
assert.deepStrictEqual(Object.keys(idMap).sort(), ['a','b','g']);
assert.strictEqual(migratedEntries.length, 3);
assert.deepStrictEqual(migratedEntries.find(entry => entry.title === 'A').connections, [idMap.b]);
assert.deepStrictEqual(migratedEntries.find(entry => entry.title === 'Group').groupIds, [idMap.a, idMap.b]);
assert.deepStrictEqual(migratedEntries.find(entry => entry.title === 'A').bridges, [{universeId:'u2', creationId:'z'}]);
assert.strictEqual(migratedEntries.every(entry => entry.storage === '' && entry.folderFileName === ''), true);

context.cleanupConnectionsForRemovedEntries(['a']);
assert.strictEqual(context.archiveEntries.some(entry => entry.id === 'a'), false);
assert.strictEqual(context.archiveEntries.some(entry => entry.id === 'g'), false);

console.log('archive-module.unit.js passed');

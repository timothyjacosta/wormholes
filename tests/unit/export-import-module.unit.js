const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  WORMHOLES_MANAGED_MARKER:'.wormholes-managed.json',
  UNIVERSES_KEY:'wormholes_universes',
  OLD_UNIVERSES_KEY:'old_universes',
  WORMHOLE_BRIDGE_NOTES_KEY:'wormholes_bridge_notes',
  OLD_WORMHOLE_BRIDGE_NOTES_KEY:'old_bridge_notes',
  WORMHOLES_SCHEMA_KEY:'wormholes_schema_version',
  makeId(){ return 'unit-id-' + (++context.__ids); },
  __ids:0,
  normalizeBridgeListForImport(value){ return Array.isArray(value) ? value : []; },
  isGroupEntry(entry){ return !!entry?.isGroup || entry?.type === 'group'; },
  isLiteratureGroup(doc){ return !!doc?.isGroup || doc?.fileType === 'group'; },
  literaturePlainPreview(content){ return String(content || '').replace(/<[^>]+>/g, '').trim(); },
  makeConnectionKeyFromIds(a, b){ return [a, b].sort().join('::'); },
  normalizeSchemaUniverse(universe){ return {...universe, id:universe?.id || 'normalized-universe'}; },
  normalizeSchemaArchiveEntry(entry){ return {...entry, id:entry?.id || 'normalized-entry'}; },
  normalizeImportedLiteratureDoc(doc, universeId){ return {...doc, universeId, id:doc?.id || 'lit'}; },
  normalizeImportedVisionItem(item, universeId){ return {...item, universeId, id:item?.id || 'vision'}; },
  archiveStorageKey(id){ return `archive:${id}`; },
  oldArchiveStorageKey(id){ return `old-archive:${id}`; },
  connectionNotesStorageKey(id){ return `notes:${id}`; },
  oldConnectionNotesStorageKey(id){ return `old-notes:${id}`; },
  literatureStorageKey(id){ return `lit:${id}`; },
  oldLiteratureStorageKey(id){ return `old-lit:${id}`; },
  visionStorageKey(id){ return `vision:${id}`; },
  oldVisionStorageKey(id){ return `old-vision:${id}`; },
  localStorage:{
    length:0,
    key(){ return null; },
    removeItem(key){ context.__removed.push(key); }
  },
  deleteUniverseLargeData(id){ context.__deletedLargeData.push(id); return Promise.resolve(); },
  __removed:[],
  __deletedLargeData:[],
  window:{ confirm(){ context.__confirmCalled = true; return true; }, location:{reload(){ context.__reloaded = true; }} },
  navigator:{storage:{}},
  showSavedToast(message, options){ context.__toast = message; context.__toastOptions = options; },
  reportAppError(contextMessage, error, options){ context.__reportedError = {contextMessage, error, options}; },
  clearWormholesFolderHandles(){ context.__clearedFolderHandles = true; },
  FOLDER_HANDLE_DATABASES:[],
  FOLDER_HANDLES_STORE:'handles',
  openFolderHandlesDb(){ throw new Error('not used in this unit test'); },
  document:{ getElementById(){ return null; } }
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app-data-validation.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-app-data-validation.js'}
);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'export-import.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/export-import.js'});

[
  'migrateWormholesAppDataImport',
  'validateWormholesAppDataImport',
  'buildWormholesAppDataExport',
  'exportAppDataFromSettings',
  'importAppDataFromSettings',
  'handleAppDataImportFile',
  'appDataImportFailureReport',
  'showActionableAppDataImportFailure',
  'createBackupFromSettings',
  'restoreBackupFromSettings',
  'summarizeWormholesAppDataExport',
  'formatWormholesAppDataExportSummary',
  'clearExistingAppDataBeforeImport',
  'openClearAppDataConfirmModal',
  'closeClearAppDataConfirmModal',
  'proceedClearAppDataConfirm',
  'clearAllWormholesAppData'
].forEach(name => {
  assert.strictEqual(typeof context[name], 'function', `${name} should be globally callable from export-import.js`);
});

const validExport = {
  format:'Wormholes App Data Export',
  schemaVersion:4,
  universes:[{id:'u1', title:'One', bridges:[{universeId:'u2'}]}],
  bridgeNotes:{bridgeA:'note'},
  universeData:{
    u1:{
      archive:[{id:'a1', title:'A', bridges:[{universeId:'u3'}], connections:['a2']}],
      connectionNotes:{c1:'note'},
      literature:[{id:'l1', title:'Doc', content:'Text'}, {id:'l2', title:'File'}],
      vision:[{id:'v1', title:'Image', dataUrl:'data:image/png;base64,a'}, {id:'v2', title:'No data'}]
    }
  }
};

assert.strictEqual(context.validateWormholesAppDataImport(validExport), true, 'valid export should pass validation');
assert.throws(() => context.validateWormholesAppDataImport({format:'Other'}), /Download Backup/, 'non-Wormholes JSON should fail validation');
assert.throws(() => context.validateWormholesAppDataImport({...validExport, schemaVersion:999}), /newer Wormholes/, 'newer schema should fail validation');

const migrated = context.migrateWormholesAppDataImport(validExport);
assert.strictEqual(migrated.schemaVersion, 4, 'import migration should stamp current schema version');
assert.strictEqual(migrated.universeData.u1.archive[0].id, 'a1', 'migration should normalize archive entries without losing ids');

const summary = context.summarizeWormholesAppDataExport(validExport);
assert.deepStrictEqual(JSON.parse(JSON.stringify(summary)), {
  universes:1,
  archiveEntries:1,
  groups:0,
  literatureDocuments:2,
  literatureGroups:0,
  literatureDocumentsWithBody:1,
  visionItems:2,
  visionItemsWithImageData:1,
  connections:1,
  bridges:2
}, 'export summary should count major data categories');
assert.ok(context.formatWormholesAppDataExportSummary(summary).includes('1 creation'), 'summary formatter should mention creations');

const clone = context.cloneForAppDataExport({nested:{value:1}});
clone.nested.value = 2;
assert.strictEqual(context.cloneForAppDataExport({nested:{value:1}}).nested.value, 1, 'clone helper should deep clone JSON-safe values');
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.normalizeImportedTags({universes:['u1'], entries:['e1']}))), {universes:['u1'], entries:['e1']}, 'imported cross-link tags should preserve universe and entry arrays');
assert.match(context.wormholesExportFileName(), /^Wormholes_App_Data_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.json$/, 'export filename should be timestamped');

const invalidJsonError = new SyntaxError('Unexpected end of JSON input');
const importReport = context.appDataImportFailureReport(invalidJsonError, {sourceName:'damaged.json', phase:'file validation'});
assert.strictEqual(importReport.title, 'Import report');
assert.match(importReport.cause, /damaged|incomplete|unreadable/i, 'invalid JSON should have a plain-language cause');
assert.ok(importReport.steps.some(step => /export App Data again/i.test(step)), 'report should include a corrective action');
assert.strictEqual(importReport.technical.File, 'damaged.json');
context.showActionableAppDataImportFailure(invalidJsonError, {sourceName:'damaged.json'});
assert.strictEqual(context.__toast, 'Import failed. Your data was not changed.');
assert.strictEqual(context.__toastOptions.durationMs, 12000, 'actionable import toast should linger');
assert.strictEqual(context.__toastOptions.moreInfo.title, 'Import report', 'toast should carry the full report');

assert.deepStrictEqual(JSON.parse(JSON.stringify(context.appDataKeysForUniverse('u1'))), [
  'archive:u1', 'old-archive:u1',
  'notes:u1', 'old-notes:u1',
  'lit:u1', 'old-lit:u1',
  'vision:u1', 'old-vision:u1'
], 'import cleanup should know all per-universe storage keys');

context.universes = [{id:'old'}];
context.clearExistingAppDataBeforeImport({universes:[{id:'new'}]}).then(() => {
  assert.ok(context.__removed.includes('wormholes_universes'), 'import cleanup should remove universe list');
  assert.ok(context.__removed.includes('archive:old'), 'import cleanup should remove old universe archive');
  assert.ok(context.__removed.includes('archive:new'), 'import cleanup should remove incoming universe archive before restore');
  assert.deepStrictEqual(context.__deletedLargeData.sort(), ['new', 'old'], 'import cleanup should clear large data for old and incoming universes');

  const root = path.resolve(__dirname, '..', '..');
  const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
  assert.ok(htmlName, 'Wormholes beta html file should exist');
  const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
  assert.ok(/id=\"clearAppDataBtn\"/.test(html), 'clear app data button should be present in settings menu');
  assert.ok(/id=\"clearAppDataConfirmModal\"/.test(html), 'clear app data double-confirm modal should be present');
  assert.ok(html.indexOf('id=\"importAppDataBtn\"') < html.indexOf('id=\"clearAppDataBtn\"'), 'clear app data button should sit below import app data');
  const order = [
    'scripts/modals-settings.js',
    'scripts/export-import.js',
    'scripts/wormholes-app.js'
  ].map(src => html.indexOf(src));
  assert.ok(order.every(index => index !== -1), 'export-import script tag should be present');
  assert.ok(order[0] < order[1] && order[1] < order[2], 'export-import.js should load after modals-settings.js and before wormholes-app.js');

  const appScript = fs.readFileSync(path.resolve(root, 'scripts', 'wormholes-app.js'), 'utf8');
  assert.ok(!/function\s+exportAppDataFromSettings\s*\(/.test(appScript), 'export function should be cordoned off from wormholes-app.js');
  assert.ok(!/function\s+applyWormholesAppDataImport\s*\(/.test(appScript), 'import apply function should be cordoned off from wormholes-app.js');
  assert.ok(!/async\s+function\s+createBackupFromSettings\s*\(/.test(appScript), 'backup creation function should be cordoned off from wormholes-app.js');
  assert.ok(/function\s+openClearAppDataConfirmModal\s*\(/.test(script), 'clear app data confirmation should live in export-import.js');

  console.log('export-import-module.unit.js passed');
}).catch(error => {
  console.error(error);
  process.exit(1);
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

function node(tag = 'div'){
  return {
    tag,
    textContent:'',
    hidden:false,
    className:'',
    children:[],
    classList:{
      values:new Set(),
      add(value){ this.values.add(value); },
      remove(value){ this.values.delete(value); },
      contains(value){ return this.values.has(value); }
    },
    appendChild(child){ this.children.push(child); return child; },
    append(...children){ this.children.push(...children); },
    focus(){ this.focused = true; }
  };
}

const elements = {
  appDataImportConfirmModal:node(),
  appDataImportConfirmTitle:node('h2'),
  appDataImportConfirmIntro:node('p'),
  appDataImportSourceName:node('p'),
  appDataImportComparison:node(),
  appDataImportConfirmDetail:node('p'),
  appDataImportConfirmWarning:node('p'),
  confirmAppDataImportBtn:node('button'),
  cancelAppDataImportBtn:node('button')
};

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
  setTimeout(fn){ fn(); return 1; },
  WORMHOLES_APP_VERSION:'Beta 197',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  WORMHOLES_MANAGED_MARKER:'.wormholes-managed.json',
  UNIVERSES_KEY:'universes',
  OLD_UNIVERSES_KEY:'old-universes',
  WORMHOLE_BRIDGE_NOTES_KEY:'bridge-notes',
  OLD_WORMHOLE_BRIDGE_NOTES_KEY:'old-bridge-notes',
  WORMHOLES_SCHEMA_KEY:'schema',
  makeId(){ return 'id'; },
  normalizeBridgeListForImport(value){ return Array.isArray(value) ? value : []; },
  isGroupEntry(entry){ return !!entry?.isGroup; },
  isLiteratureGroup(doc){ return !!doc?.isGroup; },
  literaturePlainPreview(value){ return String(value || '').replace(/<[^>]*>/g, '').trim(); },
  makeConnectionKeyFromIds(a, b){ return [a, b].sort().join('::'); },
  normalizeSchemaUniverse(value){ return value; },
  normalizeSchemaArchiveEntry(value){ return value; },
  normalizeImportedLiteratureDoc(value){ return value; },
  normalizeImportedVisionItem(value){ return value; },
  archiveStorageKey(id){ return `archive:${id}`; },
  oldArchiveStorageKey(id){ return `old-archive:${id}`; },
  connectionNotesStorageKey(id){ return `notes:${id}`; },
  oldConnectionNotesStorageKey(id){ return `old-notes:${id}`; },
  literatureStorageKey(id){ return `literature:${id}`; },
  oldLiteratureStorageKey(id){ return `old-literature:${id}`; },
  visionStorageKey(id){ return `vision:${id}`; },
  oldVisionStorageKey(id){ return `old-vision:${id}`; },
  localStorage:{length:0, key(){ return null; }, removeItem(){}},
  navigator:{storage:{}},
  setSettingsStatus(message){ context.status = message; },
  showSavedToast(message){ context.toast = message; },
  toggleSettingsMenu(){ context.menuClosed = true; },
  document:{
    getElementById(id){ return elements[id] || null; },
    createElement(tag){ return node(tag); }
  },
  window:null
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app-data-validation.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-app-data-validation.js'}
);
const root = path.resolve(__dirname, '..', '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/export-import.js'});

const current = {
  universes:6,
  archiveEntries:100,
  groups:5,
  literatureDocuments:20,
  literatureGroups:2,
  visionItems:30,
  connections:40,
  bridges:3
};
const backup = {
  universes:10,
  archiveEntries:500,
  groups:10,
  literatureDocuments:100,
  literatureGroups:4,
  literatureDocumentsWithBody:98,
  visionItems:50,
  visionItemsWithImageData:49,
  connections:120,
  bridges:12
};

const rows = JSON.parse(JSON.stringify(context.appDataReviewRows(current, backup)));
assert.deepStrictEqual(rows, [
  {label:'Universes', current:6, backup:10},
  {label:'Archive items', current:105, backup:510},
  {label:'Literature', current:22, backup:104},
  {label:'Images', current:30, backup:50},
  {label:'Connections', current:40, backup:120},
  {label:'Bridges', current:3, backup:12}
], 'review rows should compare concise current and backup counts');

const importData = {exportSummary:backup};
const decision = context.confirmAppDataImportOverwrite(importData, {
  operation:'import',
  sourceName:'Wormholes_App_Data.json',
  currentSummary:current,
  showPortableWarnings:true
});

assert.ok(elements.appDataImportConfirmModal.classList.contains('open'), 'review modal should open');
assert.strictEqual(elements.appDataImportConfirmTitle.textContent, 'Replace all current data?');
assert.strictEqual(elements.appDataImportSourceName.textContent, 'Selected: Wormholes_App_Data.json');
assert.strictEqual(elements.confirmAppDataImportBtn.textContent, 'Replace All Data');
assert.strictEqual(elements.appDataImportComparison.children.length, 7, 'comparison should contain a header and six concise rows');
assert.match(elements.appDataImportConfirmDetail.textContent, /restore point.*not be merged/i);
assert.match(elements.appDataImportConfirmWarning.textContent, /Literature text and image data/i);

context.closeAppDataImportConfirmModal(true);
decision.then(result => {
  assert.strictEqual(result, true, 'review decision should resolve after confirmation');
  assert.ok(!elements.appDataImportConfirmModal.classList.contains('open'), 'review modal should close');

  assert.match(script, /confirmAppDataImportOverwrite\(restorePlan\.prepared\.importData/, 'folder restore should use the same review step');
  assert.match(script, /reviewSourceName:\s*file\.name/, 'JSON import should show the selected filename');

  const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
  assert.ok(html.includes('id="appDataImportComparison"'), 'review comparison should be present in the interface');
  assert.ok(html.includes('A restore point will be saved first. The data will not be merged.'), 'review should state replacement and recovery impact plainly');

  console.log('import-dry-run-summary.unit.js passed');
}).catch(error => {
  console.error(error);
  process.exit(1);
});

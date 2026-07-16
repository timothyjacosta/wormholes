const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
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
  setTimeout(){ return 1; },
  clearTimeout(){},
  document:{
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  },
  window:null,
  currentUniverseId:'u1',
  universes:[{id:'u1', title:'Alpha'}],
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
  displayValue(item){ return item ? String(item.val || item) : '—'; },
  readArchiveForUniverse(){ return context.archiveEntries; },
  normalizeBridges(value){ return Array.isArray(value) ? value : []; },
  normalizeUniverseBridges(){ return []; },
  normalizeUniverseBridge(value){ return value; },
  saveArchiveToStorage(){ return true; },
  saveArchiveForUniverse(){ return true; },
  saveConnectionNotesToStorage(){ return true; },
  saveBridgeNotesToStorage(){ return true; },
  saveUniversesToStorage(){ return true; },
  makeId(){ return 'generated-id'; },
  showSavedToast(){},
  URL:{revokeObjectURL(){}},
  escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/archive.js'});

context.archiveEntries = [
  {id:'c1', title:'Zeta', what:{val:'Character — Lead'}, createdAt:'2026-01-02T00:00:00.000Z'},
  {id:'c2', title:'Alpha', what:{val:'Place — City'}, createdAt:'2026-01-03T00:00:00.000Z'},
  {id:'c3', title:'Beta', what:{val:'Character — Ally'}, createdAt:'2026-01-01T00:00:00.000Z'},
  {id:'g1', title:'Cast', kind:'group', groupIds:['c2','c3'], createdAt:'2026-01-04T00:00:00.000Z'}
];

let plan = context.buildArchiveFilterPlan(context.archiveEntries, context.defaultArchiveFilterState());
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['c1','g1'], 'archive order should preserve saved top-level order');

let sorted = context.sortArchiveFilterPlan(plan, 'title-asc', context.archiveEntries);
assert.deepStrictEqual(Array.from(sorted, row => row.entry.id), ['g1','c1']);
assert.deepStrictEqual(Array.from(sorted[0].childEntries, row => row.id), ['c2','c3'], 'group children should sort by title');

sorted = context.sortArchiveFilterPlan(plan, 'title-desc', context.archiveEntries);
assert.deepStrictEqual(Array.from(sorted, row => row.entry.id), ['c1','g1']);
assert.deepStrictEqual(Array.from(sorted[1].childEntries, row => row.id), ['c3','c2']);

sorted = context.sortArchiveFilterPlan(plan, 'type-asc', context.archiveEntries);
assert.deepStrictEqual(Array.from(sorted, row => row.entry.id), ['c1','g1'], 'type sorting should place Character before Group');
assert.deepStrictEqual(Array.from(sorted[1].childEntries, row => row.id), ['c3','c2'], 'type sorting should order child types and then titles');

sorted = context.sortArchiveFilterPlan(plan, 'newest', context.archiveEntries);
assert.deepStrictEqual(Array.from(sorted, row => row.entry.id), ['g1','c1']);
assert.deepStrictEqual(Array.from(sorted[0].childEntries, row => row.id), ['c2','c3']);

sorted = context.sortArchiveFilterPlan(plan, 'oldest', context.archiveEntries);
assert.deepStrictEqual(Array.from(sorted, row => row.entry.id), ['c1','g1']);
assert.deepStrictEqual(Array.from(sorted[1].childEntries, row => row.id), ['c3','c2']);

context.setArchiveSortMode('title-asc');
assert.strictEqual(context.getArchiveSortMode(), 'title-asc');
assert.strictEqual(context.archiveSortModeLabel(), 'A–Z');
context.setArchiveSortMode('not-valid');
assert.strictEqual(context.getArchiveSortMode(), 'archive', 'unknown modes should fall back to Custom Order');

const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts', 'bootstrap.js'), 'utf8');
assert.ok(html.includes('id="archiveSortBtn"'));
assert.ok(html.includes('id="archiveSortPanel"'));
assert.ok(html.includes('id="archiveSortOrder"'));
assert.match(css, /\.archive-sort-panel\s*\{/);
assert.match(css, /#archiveSortBtn\.sort-active/);
assert.match(bootstrap, /toggleArchiveSortPanel/);
assert.match(bootstrap, /applyArchiveSortFromControl/);

console.log('archive-sort.unit.js passed');

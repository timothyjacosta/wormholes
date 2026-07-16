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
  {
    id:'c1', title:'Ari', what:{val:'Character — Protagonist'},
    connections:['c4'], notes:['Lead character'], summary:'The central explorer.'
  },
  {id:'c2', title:'Glass City', what:{val:'Place — City'}, connections:[]},
  {id:'c3', title:'Mira', what:{val:'Character — Ally'}, connections:[]},
  {id:'g1', title:'Northern Cast', kind:'group', groupIds:['c2','c3'], connections:[]},
  {id:'c4', title:'Sky Engine', what:{val:'Technology — Machine'}, connections:['c1']}
];

assert.strictEqual(context.archiveEntryTypeLabel(context.archiveEntries[0]), 'Character');
assert.strictEqual(context.archiveEntryTypeLabel(context.archiveEntries[1]), 'Place');
assert.strictEqual(context.archiveEntryTypeLabel(context.archiveEntries[3]), 'Group');
assert.strictEqual(context.archiveFilterActiveCount(context.defaultArchiveFilterState()), 0);

let state = {...context.defaultArchiveFilterState(), type:'Character'};
let plan = context.buildArchiveFilterPlan(context.archiveEntries, state);
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['c1','g1'], 'type filtering should preserve group context');
assert.deepStrictEqual(Array.from(plan.find(row => row.entry.id === 'g1').childEntries, row => row.id), ['c3'], 'only matching grouped children should be shown');

state = {...context.defaultArchiveFilterState(), group:'group:g1'};
plan = context.buildArchiveFilterPlan(context.archiveEntries, state);
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['g1']);
assert.deepStrictEqual(Array.from(plan[0].childEntries, row => row.id), ['c2','c3']);

state = {...context.defaultArchiveFilterState(), group:'ungrouped'};
plan = context.buildArchiveFilterPlan(context.archiveEntries, state);
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['c1','c4']);

state = {...context.defaultArchiveFilterState(), hasNotes:true};
plan = context.buildArchiveFilterPlan(context.archiveEntries, state);
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['c1']);

state = {...context.defaultArchiveFilterState(), hasConnections:true, hasSummary:true};
plan = context.buildArchiveFilterPlan(context.archiveEntries, state);
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['c1']);

state = {...context.defaultArchiveFilterState(), type:'__groups__'};
plan = context.buildArchiveFilterPlan(context.archiveEntries, state);
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['g1']);
assert.deepStrictEqual(Array.from(plan[0].childEntries, row => row.id), ['c2','c3'], 'groups-only filtering should retain group contents');

const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts', 'bootstrap.js'), 'utf8');
assert.ok(html.includes('id="archiveFilterBtn"'));
assert.ok(html.includes('id="archiveFilterPanel"'));
assert.ok(html.includes('id="archiveFilterType"'));
assert.ok(html.includes('id="archiveFilterGroup"'));
assert.match(css, /\.archive-filter-panel\s*\{/);
assert.match(css, /\.archive-filter-grid\s*\{/);
assert.match(bootstrap, /toggleArchiveFilterPanel/);
assert.match(bootstrap, /applyArchiveFiltersFromControls/);

console.log('archive-filter.unit.js passed');

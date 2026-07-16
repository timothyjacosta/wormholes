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
  currentUniverseId:'u1',
  literatureEntries:[],
  document:{
    getElementById(){ return null; },
    querySelectorAll(){ return []; },
    createElement(){
      return {
        _html:'',
        set innerHTML(value){ this._html = String(value || ''); this.textContent = this._html.replace(/<[^>]*>/g, ' '); this.innerText = this.textContent; },
        get innerHTML(){ return this._html; },
        textContent:'',
        innerText:''
      };
    }
  },
  window:null,
  uniqueList(list){ return Array.from(new Set((list || []).filter(Boolean))); },
  tagEntryKey(universeId, entryId){ return `${universeId}::${entryId}`; },
  escapeHtml(text){ return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); },
  saveLiteratureToStorage(){ return true; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8'), context, {filename:'scripts/literature.js'});

context.literatureEntries = [
  {id:'d1', title:'Zeta Notes', fileType:'text', content:'<p>World notes</p>', tags:{universes:['u1'], entries:[]}, createdAt:'2026-01-01T00:00:00.000Z', updatedAt:'2026-01-05T00:00:00.000Z'},
  {id:'d2', title:'Omega Draft', fileType:'text', content:'<p></p>', tags:{universes:[], entries:[]}, createdAt:'2026-01-02T00:00:00.000Z', updatedAt:'2026-01-02T00:00:00.000Z'},
  {id:'d3', title:'Beta Lore', fileType:'html', content:'<p>Ancient lore</p>', tags:{universes:[], entries:[{universeId:'u1', entryId:'c1'}]}, createdAt:'2026-01-03T00:00:00.000Z', updatedAt:'2026-01-04T00:00:00.000Z'},
  {id:'g1', title:'Alpha Group', kind:'literatureGroup', fileType:'group', groupIds:['d2','d3'], tags:{universes:[], entries:[{universeId:'u1', entryId:'c1'}]}, createdAt:'2026-01-04T00:00:00.000Z', updatedAt:'2026-01-04T00:00:00.000Z'}
];

let plan = context.buildLiteratureViewPlan(context.literatureEntries, context.defaultLiteratureFilterState());
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['d1','g1']);
assert.deepStrictEqual(Array.from(plan[1].childEntries, child => child.id), ['d2','d3']);

plan = context.buildLiteratureViewPlan(context.literatureEntries, {...context.defaultLiteratureFilterState(), type:'groups'});
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['g1']);

plan = context.buildLiteratureViewPlan(context.literatureEntries, {...context.defaultLiteratureFilterState(), group:'ungrouped'});
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['d1']);

plan = context.buildLiteratureViewPlan(context.literatureEntries, {...context.defaultLiteratureFilterState(), group:'group:g1'});
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['g1']);
assert.deepStrictEqual(Array.from(plan[0].childEntries, child => child.id), ['d2','d3']);

plan = context.buildLiteratureViewPlan(context.literatureEntries, {...context.defaultLiteratureFilterState(), hasTags:true});
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['d1','g1']);
assert.deepStrictEqual(Array.from(plan[1].childEntries, child => child.id), ['d3']);

plan = context.buildLiteratureViewPlan(context.literatureEntries, {...context.defaultLiteratureFilterState(), hasContent:true});
assert.deepStrictEqual(Array.from(plan, row => row.entry.id), ['d1','g1']);
assert.deepStrictEqual(Array.from(plan[1].childEntries, child => child.id), ['d3']);

const defaultPlan = context.buildLiteratureViewPlan(context.literatureEntries, context.defaultLiteratureFilterState());
let sorted = context.sortLiteratureViewPlan(defaultPlan, 'title-asc');
assert.deepStrictEqual(Array.from(sorted, row => row.entry.id), ['g1','d1']);
assert.deepStrictEqual(Array.from(sorted[0].childEntries, child => child.id), ['d3','d2']);

sorted = context.sortLiteratureViewPlan(defaultPlan, 'updated-newest');
assert.deepStrictEqual(Array.from(sorted, row => row.entry.id), ['d1','g1']);
assert.deepStrictEqual(Array.from(sorted[1].childEntries, child => child.id), ['d3','d2']);

context.setLiteratureSortMode('title-desc');
assert.strictEqual(context.getLiteratureSortMode(), 'title-desc');
context.setLiteratureSortMode('invalid');
assert.strictEqual(context.getLiteratureSortMode(), 'literature');

const legacyDocumentsState = context.sanitizeLiteratureFilterState({...context.defaultLiteratureFilterState(), type:'documents'}, context.literatureEntries);
assert.strictEqual(legacyDocumentsState.type, 'all');

const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts', 'bootstrap.js'), 'utf8');
assert.ok(html.includes('id="literatureFilterBtn"'));
assert.ok(html.includes('id="literatureSortBtn"'));
assert.ok(html.includes('id="literatureFilterPanel"'));
assert.ok(html.includes('id="literatureSortPanel"'));
assert.ok(!html.includes('value="documents">Documents</option>'));
assert.ok(html.includes('value="all">All items</option>'));
assert.ok(html.includes('value="groups">Groups</option>'));
assert.match(css, /\.collection-utility-button\s*\{/);
assert.match(bootstrap, /toggleLiteratureFilterPanel/);
assert.match(bootstrap, /applyLiteratureSortFromControl/);

console.log('literature-filter-sort.unit.js passed');

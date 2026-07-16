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
  Blob,
  setTimeout(){ return 1; },
  clearTimeout(){},
  currentUniverseId:'u1',
  universes:[{id:'u1', title:'Alpha'}],
  archiveEntries:[],
  visionEntries:[],
  document:{
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    createElement(){ return {style:{}, classList:{add(){}, remove(){}}, setAttribute(){}, appendChild(){}, remove(){}, dataset:{}}; }
  },
  window:null,
  URL:{createObjectURL(){ return 'blob:test'; }, revokeObjectURL(){}},
  CSS:{escape(value){ return String(value); }},
  navigator:{},
  localFoldersEnabled:false,
  visionFolderHandle:null,
  visionObjectUrls:[],
  visionLinksObjectUrls:[],
  visionImageViewerObjectUrl:'',
  visionMoveMode:false,
  activeVisionDragId:null,
  makeId(){ return 'made-id'; },
  escapeHtml(value){ return String(value ?? ''); },
  compactText(value){ return String(value ?? '').trim(); },
  setContextualAriaLabel(){},
  normalizeLiteratureTags(tags){ return tags || {universes:[], entries:[]}; },
  normalizeImportedTags(tags){ return tags || {universes:[], entries:[]}; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8'), context, {filename:'scripts/vision-board.js'});

context.visionEntries = [
  {id:'i1', title:'Alpha Map', sourceName:'alpha.png', mimeType:'image/png', storage:'folder', tags:{universes:['u1'], entries:[]}, createdAt:'2026-01-01T00:00:00.000Z'},
  {id:'i2', title:'Zeta Portrait', sourceName:'zeta.jpg', mimeType:'image/jpeg', storage:'', tags:{universes:[], entries:[]}, createdAt:'2026-01-03T00:00:00.000Z'},
  {id:'i3', title:'Beta Device', sourceName:'beta.jpeg', mimeType:'image/jpeg', storage:'', tags:{universes:[], entries:[{universeId:'u1', entryId:'c1'}]}, createdAt:'2026-01-02T00:00:00.000Z'}
];

function ids(rows){ return Array.from(rows, row => row.item.id); }
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, context.defaultVisionFilterState(), 'board')), ['i1','i2','i3']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'tagged', storage:'all', format:'all'}, 'board')), ['i1','i3']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'untagged', storage:'all', format:'all'}, 'board')), ['i2']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'universe', storage:'all', format:'all'}, 'board')), ['i1']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'creation', storage:'all', format:'all'}, 'board')), ['i3']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'all', storage:'folder', format:'all'}, 'board')), ['i1']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'all', storage:'app', format:'all'}, 'board')), ['i2','i3']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'all', storage:'all', format:'png'}, 'board')), ['i1']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, {tags:'all', storage:'all', format:'jpeg'}, 'board')), ['i2','i3']);

assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, context.defaultVisionFilterState(), 'title-asc')), ['i1','i3','i2']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, context.defaultVisionFilterState(), 'newest')), ['i2','i3','i1']);
assert.deepStrictEqual(ids(context.buildVisionViewRows(context.visionEntries, context.defaultVisionFilterState(), 'filename')), ['i1','i3','i2']);

context.getVisionFilterState().tags = 'tagged';
context.setVisionSortMode('title-asc');
assert.strictEqual(context.resetVisionViewForMoving(), true);
assert.strictEqual(context.getVisionFilterState().tags, 'all');
assert.strictEqual(context.getVisionSortMode(), 'board');
assert.strictEqual(context.resetVisionViewForMoving(), false);

const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts', 'bootstrap.js'), 'utf8');
assert.ok(html.includes('id="visionFilterBtn"'));
assert.ok(html.includes('id="visionSortBtn"'));
assert.ok(html.includes('id="visionFilterPanel"'));
assert.ok(html.includes('id="visionSortPanel"'));
assert.match(css, /#visionFilterBtn\.filter-active/);
assert.match(bootstrap, /toggleVisionFilterPanel/);
assert.match(bootstrap, /applyVisionSortFromControl/);

console.log('vision-filter-sort.unit.js passed');

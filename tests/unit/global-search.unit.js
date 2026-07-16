const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const listeners = {};
const elements = new Map();
function element(id){
  if(!elements.has(id)){
    elements.set(id, {
      id,
      value:'',
      innerHTML:'',
      textContent:'',
      disabled:false,
      dataset:{},
      classList:{ values:new Set(), add(v){this.values.add(v);}, remove(v){this.values.delete(v);}, contains(v){return this.values.has(v);} },
      addEventListener(type, fn){ this.listeners = this.listeners || {}; this.listeners[type] = fn; },
      querySelector(){ return null; },
      querySelectorAll(){ return []; },
      focus(){ this.focused = true; }
    });
  }
  return elements.get(id);
}

const archives = {
  u1:[
    {id:'a1', title:'Glass City', what:'City', attr1:'Ancient', attr2:'Floating', pressure:'The western gate is sealed', summary:'A city above the clouds.', notes:['The bell tower is cracked.'], connections:['a2'], bridges:[{universeId:'u2', creationId:'a3'}]},
    {id:'a2', title:'Western Gate', what:'Gate', attr1:'Sealed', attr2:'Bronze', pressure:'It remembers every visitor', connections:['a1'], bridges:[]}
  ],
  u2:[{id:'a3', title:'Moon Archive', what:'Library', attr1:'Luminous', attr2:'Hidden', pressure:'Its catalog changes nightly', connections:[], bridges:[]}]
};
const literature = {
  u1:[{id:'l1', title:'History of the Glass City', content:'<p>Beyond the western gate, the city learned to fly.</p>', tags:{universes:['u1'], entries:[{universeId:'u1', entryId:'a1'}]}}],
  u2:[]
};
const vision = {
  u1:[{id:'v1', title:'Glass City Skyline', sourceName:'skyline.png', tags:{universes:['u1'], entries:[{universeId:'u1', entryId:'a1'}]}}],
  u2:[]
};

const context = {
  console,
  Object,
  Array,
  Map,
  Set,
  Math,
  Number,
  String,
  Promise,
  Date,
  setTimeout(fn){ fn(); return 1; },
  clearTimeout(){},
  universes:[
    {id:'u1', title:'Northern Kingdom', summary:'Home of the Glass City.'},
    {id:'u2', title:'Lunar Expanse', summary:'A silent moon realm.'}
  ],
  currentUniverseId:'u1',
  archiveEntries:archives.u1,
  literatureEntries:literature.u1,
  visionEntries:vision.u1,
  connectionNotes:{'a1::a2':'The gate opens only at dawn.'},
  bridgeNotes:{'C:u1:a1||C:u2:a3':'A silver road crosses the void.'},
  readArchiveForUniverse(id){ return archives[id] || []; },
  readLiteratureForUniverse(id){ return literature[id] || []; },
  readVisionBoardForUniverse(id){ return vision[id] || []; },
  readConnectionNotesForUniverse(){ return {}; },
  normalizeBridges(value){ return Array.isArray(value) ? value : []; },
  isGroupEntry(entry){ return entry?.kind === 'group'; },
  isLiteratureGroup(doc){ return doc?.kind === 'literatureGroup'; },
  literaturePlainPreview(value){ return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); },
  closeMenus(){},
  literatureEditorIsOpen(){ return false; },
  showAppScreen(){ context.appShown = true; },
  enterUniverse(id){ context.entered = id; context.currentUniverseId = id; },
  switchTab(name){ context.tab = name; },
  revealArchiveEntryForTag(id){ context.revealed = id; },
  openLiteratureViewer(id, universeId){ context.viewer = [id, universeId]; },
  openVisionImageViewer(universeId, id){ context.imageViewer = [universeId, id]; },
  document:{
    readyState:'loading',
    addEventListener(type, fn){ listeners[type] = fn; },
    getElementById(id){ return element(id); }
  },
  window:null
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
const root = path.resolve(__dirname, '..', '..');
const indexScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-search-index.js'), 'utf8');
vm.runInContext(indexScript, context, {filename:'scripts/wormholes-search-index.js'});
const script = fs.readFileSync(path.join(root, 'scripts', 'global-search.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/global-search.js'});

const api = context.WormholesGlobalSearch;
assert.ok(api, 'global search API should be exposed');
const index = api.buildGlobalSearchIndex();
assert.strictEqual(index.length, 7, 'index should include universes, archive, literature, and vision items');

const glassResults = api.globalSearchResults('glass city', 'all', index);
assert.ok(glassResults.some(row => row.id === 'a1' && row.type === 'archive'), 'creation title should be searchable');
assert.ok(glassResults.some(row => row.id === 'l1' && row.type === 'literature'), 'literature tags and title should be searchable');
assert.ok(glassResults.some(row => row.id === 'v1' && row.type === 'vision'), 'vision tags and title should be searchable');

const bodyResults = api.globalSearchResults('learned to fly', 'all', index);
assert.strictEqual(bodyResults[0].id, 'l1', 'literature body text should be searchable');

const noteResults = api.globalSearchResults('opens only at dawn', 'all', index);
assert.ok(noteResults.some(row => row.id === 'a1'), 'connection notes should lead back to linked creations');

const bridgeResults = api.globalSearchResults('silver road', 'all', index);
assert.ok(bridgeResults.some(row => row.id === 'a1'), 'bridge notes should be searchable from their creation');

context.currentUniverseId = 'u2';
const scopedResults = api.globalSearchResults('glass', 'current', index);
assert.strictEqual(scopedResults.length, 0, 'current-universe scope should exclude other universes');
context.currentUniverseId = 'u1';

Promise.resolve(api.navigate(index.find(row => row.id === 'a1'))).then(() => {
  assert.strictEqual(context.tab, 'archive', 'archive results should open the Archive tab');
  assert.strictEqual(context.revealed, 'a1', 'archive results should reveal the matching entry');

  const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
  assert.ok(html.includes('id="globalSearchBtn"'), 'global Search button should be present');
  assert.ok(html.includes('id="globalSearchModal"'), 'global Search modal should be present');
  assert.ok(html.includes('scripts/wormholes-search-index.js'), 'dedicated search-index module should be loaded');
  assert.ok(html.indexOf('scripts/wormholes-search-index.js') < html.indexOf('scripts/global-search.js'), 'search index should load before the Global Search interface');
  assert.ok(html.includes('scripts/global-search.js'), 'global Search module should be loaded');
  assert.match(css, /\.search-dock\s*\{/);
  assert.match(css, /\.global-search-result\s*\{/);
  assert.match(script, /Ctrl\+K|metaKey|ctrlKey/, 'keyboard shortcut should be implemented');

  console.log('global-search.unit.js passed');
}).catch(error => {
  console.error(error);
  process.exit(1);
});

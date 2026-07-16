'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const eventListeners = new Map();
const timers = [];
let nextTimer = 1;

const archives = {
  u1:[
    {id:'a1', title:'Glass City', what:'Place', summary:'A floating city.', notes:['Cracked bell tower'], connections:['a2'], bridges:[]},
    {id:'a2', title:'Western Gate', what:'Technology', summary:'A sealed bronze gate.', connections:['a1'], bridges:[]},
    {id:'a4', title:'River Hamlet', what:'Place', summary:'An unrelated settlement.', connections:[], bridges:[]}
  ],
  u2:[{id:'a3', title:'Moon Archive', what:'Knowledge', summary:'A changing catalog.', connections:[], bridges:[]}]
};
const literature = {
  u1:[{id:'l1', title:'History of Glass', content:'<p>Beyond the western gate, the city learned to fly.</p>', tags:{universes:['u1'], entries:[]}}],
  u2:[]
};
const vision = {u1:[], u2:[]};

class CustomEvent {
  constructor(type, init = {}){ this.type = type; this.detail = init.detail; }
}

const context = {
  console,
  Object, Array, Map, Set, Math, Number, String, Promise, Date, RegExp,
  CustomEvent,
  setTimeout(fn){ const id = nextTimer++; timers.push({id, fn}); return id; },
  clearTimeout(id){ const item = timers.find(timer => timer.id === id); if(item) item.cancelled = true; },
  requestIdleCallback(fn){ fn(); return 1; },
  cancelIdleCallback(){},
  universes:[
    {id:'u1', title:'Northern Kingdom', summary:'Home of the Glass City.'},
    {id:'u2', title:'Lunar Expanse', summary:'A quiet moon realm.'}
  ],
  currentUniverseId:'u1',
  archiveEntries:archives.u1,
  literatureEntries:literature.u1,
  visionEntries:vision.u1,
  connectionNotes:{'a1::a2':'The gate opens at dawn.'},
  bridgeNotes:{},
  readArchiveForUniverse(id){ return archives[id] || []; },
  readLiteratureForUniverse(id){ return literature[id] || []; },
  readVisionBoardForUniverse(id){ return vision[id] || []; },
  readConnectionNotesForUniverse(id){ return id === 'u1' ? context.connectionNotes : {}; },
  normalizeBridges(value){ return Array.isArray(value) ? value : []; },
  isGroupEntry(entry){ return entry?.kind === 'group'; },
  isLiteratureGroup(entry){ return entry?.kind === 'literatureGroup'; },
  literaturePlainPreview(value){ return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); },
  window:null,
  globalThis:null
};
context.window = context;
context.globalThis = context;
context.addEventListener = function(type, fn){
  const listeners = eventListeners.get(type) || [];
  listeners.push(fn);
  eventListeners.set(type, listeners);
};
context.dispatchEvent = function(event){
  (eventListeners.get(event.type) || []).forEach(fn => fn(event));
  return true;
};

function flushTimers(){
  while(timers.length){
    const timer = timers.shift();
    if(!timer.cancelled) timer.fn();
  }
}

vm.createContext(context);
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-search-index.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-search-index.js'});

const api = context.WormholesSearchIndex;
assert.ok(api, 'dedicated search-index API should be exposed');
const index = api.ensureFresh();
assert.strictEqual(index.records.length, 7, 'index should contain universes, Archive, and Literature records');
assert.ok(index.trigrams.get('gla')?.size < index.records.length, 'trigram postings should narrow likely matches');

const initialBuildCount = api.stats().buildCount;
assert.strictEqual(api.search('glass city')[0].id, 'a1', 'title matches should rank first');
assert.strictEqual(api.search('learned to fly')[0].id, 'l1', 'Literature body text should be indexed');
assert.ok(api.search('lass').some(record => record.id === 'a1'), 'substring queries should remain supported through trigrams');
assert.strictEqual(api.stats().buildCount, initialBuildCount, 'repeated queries should reuse the existing index');

context.currentUniverseId = 'u2';
assert.strictEqual(api.search('glass', 'current').length, 0, 'current-universe scope should use the active universe');
context.currentUniverseId = 'u1';

archives.u1.push({id:'a5', title:'Obsidian Observatory', what:'Place', summary:'A newly saved observatory.', connections:[], bridges:[]});
context.archiveEntries = archives.u1;
context.dispatchEvent(new CustomEvent('wormholes-dataset-saved', {detail:{key:'wormholesUniverseArchive:u1', revision:2}}));
assert.strictEqual(api.stats().dirty, true, 'a relevant persisted save should invalidate the index');
flushTimers();
assert.ok(api.search('obsidian observatory').some(record => record.id === 'a5'), 'background rebuild should include newly saved content');
assert.ok(api.stats().buildCount > initialBuildCount, 'a relevant save should rebuild the index');

const buildCountAfterSave = api.stats().buildCount;
context.dispatchEvent(new CustomEvent('wormholes-dataset-saved', {detail:{key:'wormholesMapFilterPreferences', revision:1}}));
flushTimers();
assert.strictEqual(api.stats().buildCount, buildCountAfterSave, 'unrelated preference saves should not rebuild the search index');

assert.strictEqual(api.relevantStorageKey('wormholesUniverseLiterature:u1'), true);
assert.strictEqual(api.relevantStorageKey('wormholesUniverseVisionBoard:u1'), true);
assert.strictEqual(api.relevantStorageKey('wormholesMapFilterPreferences'), false);


const storageSource = fs.readFileSync(path.join(root, 'scripts', 'storage.js'), 'utf8');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
assert.match(storageSource, /wormholes-dataset-saved/, 'successful persisted saves should notify the search index');
assert.match(storageSource, /wormholes-dataset-removed/, 'persisted removals should notify the search index');
assert.ok(html.includes('scripts/wormholes-search-index.js'), 'the search-index module should be included in the app');
assert.ok(html.indexOf('scripts/wormholes-search-index.js') < html.indexOf('scripts/global-search.js'), 'the index should load before the search interface');

console.log('search-index-layer.unit.js passed');

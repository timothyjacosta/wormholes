'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const literatureByUniverse = {
  u1:[
    {id:'lit-1', title:'Field Notes', tags:{universes:['u2'], entries:[{universeId:'u1', entryId:'a1'}, {universeId:'u2', entryId:'b1'}]}},
    {id:'lit-empty', title:'Unlinked Notes', tags:{universes:[], entries:[]}}
  ]
};
const visionByUniverse = {
  u1:[{id:'img-1', title:'Gate Sketch', tags:{entries:[{universeId:'u1', entryId:'a2'}]}}]
};

const context = {
  console,
  Map,
  Set,
  Object,
  Array,
  String,
  currentUniverseId:'u1',
  literatureEntries:literatureByUniverse.u1,
  visionEntries:visionByUniverse.u1,
  readLiteratureForUniverse(id){ return literatureByUniverse[id] || []; },
  readVisionBoardForUniverse(id){ return visionByUniverse[id] || []; },
  window:null
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-map-search.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-map-search.js'});
const api = context.WormholesMapSearch;
assert.ok(api, 'map search API should be exposed');

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(api.targetsForRecord({type:'archive', universeId:'u1', id:'a1'}))),
  {universes:[], entries:[{universeId:'u1', entryId:'a1'}]},
  'creation results should target their map entity'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(api.targetsForRecord({type:'universe', universeId:'u2', id:'u2'}))),
  {universes:['u2'], entries:[]},
  'universe results should target their universe'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(api.targetsForRecord({type:'literature', universeId:'u1', id:'lit-1'}))),
  {universes:['u2'], entries:[{universeId:'u1', entryId:'a1'}, {universeId:'u2', entryId:'b1'}]},
  'literature results should isolate every tagged map target'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(api.targetsForRecord({type:'vision', universeId:'u1', id:'img-1'}))),
  {universes:[], entries:[{universeId:'u1', entryId:'a2'}]},
  'images should isolate every tagged map target'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(api.targetsForRecord({type:'literature', universeId:'u1', id:'lit-empty'}))),
  {universes:[], entries:[]},
  'unlinked media should not pretend to have a map relationship'
);

api.setActive('connections', {id:'lit-1', type:'literature', title:'Field Notes', universeId:'u1'});
assert.strictEqual(api.getActive('connections').title, 'Field Notes');
assert.match(api.activeBannerHtml('connections'), /Show all/);
api.clearActive('connections');
assert.strictEqual(api.getActive('connections'), null);

const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const connections = fs.readFileSync(path.join(root, 'scripts', 'connections-map.js'), 'utf8');
const bridges = fs.readFileSync(path.join(root, 'scripts', 'bridges-map.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
assert.ok(html.includes('scripts/wormholes-map-search.js'), 'map search module should be loaded');
assert.match(connections, /mapSearchApi\?\.bind\("connections"/);
assert.match(bridges, /mapSearchApi\?\.bind\("wormholes"/);
assert.match(connections, /connectionsSearchIsolationActive/);
assert.match(bridges, /wormholeSearchIsolationActive/);
assert.match(css, /\.map-search-control\s*\{/);
assert.match(css, /right:\s*12px;[\s\S]*bottom:\s*12px;/);
assert.match(css, /\.map-search-isolation\s*\{/);

console.log('map-search-isolation.unit.js passed');

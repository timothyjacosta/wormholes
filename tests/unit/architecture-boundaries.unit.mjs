import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAppModel, collections} from '../../scripts/modules/app-model.mjs';
import {createRenderCoordinator} from '../../scripts/modules/render-coordinator.mjs';
import {installPersistenceRepositories} from '../../scripts/modules/persistence-repositories.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Model layer: pure selectors and observable state changes do not depend on DOM or storage.
const model = createAppModel({archive:[
  {id:'a', title:'A'},
  {id:'b', title:'B'},
  {id:'g', kind:'group', groupIds:['a','b']}
]});
assert.equal(collections.findById(model.read('archive'), 'a').title, 'A');
assert.equal(collections.groupForChild(model.read('archive'), 'a', item => item.kind === 'group').id, 'g');
assert.deepEqual(collections.topLevelItems(model.read('archive'), item => item.kind === 'group').map(item => item.id), ['g']);
let observed = null;
const unsubscribe = model.subscribe(change => { observed = change; });
model.replace('archive', [{id:'c'}], {source:'test', reason:'replace archive'});
assert.equal(model.revision('archive'), 1);
assert.equal(observed.domain, 'archive');
unsubscribe();

// Rendering layer: named dispatch is independent of persistence and can batch duplicate view requests.
const calls = [];
const rendering = createRenderCoordinator({model});
rendering.register('archive', () => { calls.push('archive'); return 'rendered'; }, {domains:['archive']});
assert.equal(rendering.render('archive'), 'rendered');
rendering.batch(() => {
  rendering.render('archive');
  rendering.render('archive');
});
assert.deepEqual(calls, ['archive', 'archive'], 'batched duplicate renders should collapse to one queued render');
assert.equal(rendering.context('archive').domains[0], 'archive');

// Persistence is now a canonical ES-module source, while the local-file build uses a generated adapter.
assert.equal(typeof installPersistenceRepositories, 'function');
const buildTool = fs.readFileSync(path.join(root, 'tools', 'build-shared-modules.mjs'), 'utf8');
assert.match(buildTool, /persistence-repositories\.mjs.*wormholes-repositories\.js/);
assert.match(buildTool, /app-model\.mjs.*wormholes-app-model\.js/);
assert.match(buildTool, /render-coordinator\.mjs.*wormholes-render-coordinator\.js/);
assert.match(buildTool, /document-zip-helpers\.mjs.*wormholes-document-zip-helpers\.js/);
assert.match(buildTool, /app-workflow-orchestration\.mjs.*wormholes-app-workflow\.js/);
assert.match(buildTool, /map-inspector-orchestration\.mjs.*wormholes-map-inspector\.js/);
assert.match(buildTool, /app-core\.mjs.*wormholes-app\.js/);

const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a,b) => a.localeCompare(b, undefined, {numeric:true})).pop();
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const modelIndex = html.indexOf('scripts/wormholes-app-model.js');
const renderIndex = html.indexOf('scripts/wormholes-render-coordinator.js');
const repositoryIndex = html.indexOf('scripts/wormholes-repositories.js');
const storageIndex = html.indexOf('scripts/storage.js');
const archiveIndex = html.indexOf('scripts/archive.js');
assert.ok(modelIndex > 0 && modelIndex < storageIndex, 'model boundary should load before persistence facade and feature controllers');
assert.ok(renderIndex > modelIndex && renderIndex < archiveIndex, 'render coordinator should load before feature renderers');
assert.ok(repositoryIndex > renderIndex && repositoryIndex < storageIndex, 'repository adapter should load before the storage facade');

const storage = fs.readFileSync(path.join(root, 'scripts', 'storage.js'), 'utf8');
assert.match(storage, /commitAppModelDomain\("universes"/);
assert.match(storage, /commitAppModelDomain\("archive"/);
assert.match(storage, /commitAppModelDomain\("connectionNotes"/);
assert.match(storage, /commitAppModelDomain\("bridgeNotes"/);

const literature = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const vision = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
assert.match(literature, /WormholesAppModel\?\.replace\?\.\("literature"/);
assert.match(vision, /WormholesAppModel\?\.replace\?\.\("vision"/);

const renderBoundaries = [
  ['scripts/archive.js', 'archive', 'renderArchiveView'],
  ['scripts/literature.js', 'literature', 'renderLiteratureListView'],
  ['scripts/vision-board.js', 'vision', 'renderVisionBoardView'],
  ['scripts/connections-map.js', 'connections-map', 'renderConnectionsMapView'],
  ['scripts/bridges-map.js', 'bridges-map', 'renderWormholesMapView']
];
for(const [file, name, implementation] of renderBoundaries){
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(source.includes(implementation), `${file} should keep its DOM implementation behind a view function`);
  assert.ok(source.includes(`WormholesRendering?.register?.("${name}"`), `${file} should register its top-level renderer`);
  assert.ok(source.includes(`coordinator.render("${name}"`), `${file} should dispatch top-level rendering through the coordinator`);
}

// Feature controllers continue to be forbidden from reaching around the persistence layer.
for(const file of ['archive.js','literature.js','vision-board.js','connections.js','bridges.js','universes.js','generation.js','wormholes-app.js','export-import.js']){
  const source = fs.readFileSync(path.join(root, 'scripts', file), 'utf8');
  assert.ok(!/localStorage\.(?:getItem|setItem|removeItem)/.test(source), `${file} should not access localStorage directly`);
  assert.ok(!/indexedDB\.open\s*\(/.test(source), `${file} should not open IndexedDB directly`);
}

console.log('architecture-boundaries.unit.mjs passed');

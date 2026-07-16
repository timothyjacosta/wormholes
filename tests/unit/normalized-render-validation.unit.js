const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const blocked = new Map();
const reports = [];
const context = {
  console,
  Object,
  Number,
  String,
  Math,
  Array,
  Set,
  Map,
  Error,
  Date,
  window:null,
  blockPersistedDatasetWrites(key, reason){ blocked.set(String(key), String(reason)); },
  unblockPersistedDatasetWrites(key){ blocked.delete(String(key)); },
  reportAppError(label, error, options){ reports.push({label, error, options}); }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-render-validation.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-render-validation.js'});

const validation = context.WormholesRenderValidation;
assert.ok(validation, 'normalized render validation API should be exposed');

const universe = {
  id:'u-1', title:'Book One', summary:'', bridges:[], createdAt:'2026-07-11T00:00:00.000Z', diskFolderName:'Book One -- u-1'
};
const validUniverses = validation.validateUniverses([universe], {storageKey:'wormholesUniverses'});
assert.strictEqual(validUniverses.ok, true);
assert.strictEqual(validUniverses.value.length, 1);
assert.strictEqual(blocked.has('wormholesUniverses'), false);

const archive = [
  {
    id:'a-1', title:'The Glass City', what:{val:'Place'}, attr1:{val:'Ancient'}, attr2:{val:'Hidden'}, pressure:{val:'A secret'},
    connections:[], bridges:[], notes:['Long-form lore remains valid'], summary:'', storage:'', folderFileName:'', createdAt:'2026-07-11T00:00:00.000Z'
  },
  {
    id:'bad', title:{unsafe:true}, what:{val:'Place'}, attr1:null, attr2:null, pressure:null,
    connections:[], bridges:[], storage:'', folderFileName:''
  }
];
const archiveResult = validation.validateArchive(archive, {storageKey:'wormholesUniverseArchive:u-1', universeId:'u-1'});
assert.strictEqual(archiveResult.ok, false, 'an unsafe normalized record should be rejected before rendering');
assert.deepStrictEqual(Array.from(archiveResult.value, item => item.id), ['a-1'], 'valid neighboring records should still render');
assert.strictEqual(blocked.has('wormholesUniverseArchive:u-1'), true, 'the filtered dataset should be write-protected');
assert.strictEqual(reports.length, 1, 'the user should receive one concise notice');
assert.match(reports[0].options.userMessage, /could not be displayed/i);
assert.match(reports[0].options.userMessage, /preserved/i);

validation.validateArchive(archive, {storageKey:'wormholesUniverseArchive:u-1', universeId:'u-1'});
assert.strictEqual(reports.length, 1, 'repeated renders should not repeat the same notice');

const repairedArchive = validation.validateArchive([archive[0]], {storageKey:'wormholesUniverseArchive:u-1', universeId:'u-1', report:false, releaseProtection:true});
assert.strictEqual(repairedArchive.ok, true);
assert.strictEqual(blocked.has('wormholesUniverseArchive:u-1'), false, 'a later valid restore should release validation-owned write protection');

const literature = [{
  id:'l-1', kind:'', title:'Manuscript', content:'<p>Long manuscript</p>', sourceName:'', fileType:'text', mimeType:'', fileData:'', fileSize:0,
  convertedFrom:'', storage:'', folderFileName:'', contentStoreKey:'literature:u-1:l-1:content', contentStored:'indexedDB',
  tags:{universes:['u-1'], entries:[{universeId:'u-1', entryId:'a-1'}]}, createdAt:'2026-07-11T00:00:00.000Z', updatedAt:'2026-07-11T00:00:00.000Z'
}];
assert.strictEqual(validation.validateLiterature(literature, {storageKey:'lit'}).ok, true, 'normalized Literature should remain supported');

const vision = [{
  id:'v-1', title:'Map', sourceName:'map.png', fileType:'image', mimeType:'image/png', thumbnailDataUrl:'', dataUrl:'', storage:'indexedDB',
  folderFileName:'', dataStoreKey:'vision:u-1:v-1:data', thumbnailStoreKey:'vision:u-1:v-1:thumb', dataStored:'indexedDB', thumbnailStored:'indexedDB',
  fileSize:50000000, tags:{universes:['u-1'], entries:[]}, createdAt:'2026-07-11T00:00:00.000Z'
}];
assert.strictEqual(validation.validateVision(vision, {storageKey:'vision'}).ok, true, 'large but supported image metadata should validate');

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(html.includes('scripts/wormholes-render-validation.js'), 'the final render validator should be loaded');
assert.ok(html.indexOf('scripts/wormholes-render-validation.js') < html.indexOf('scripts/archive.js'), 'render validation should load before render consumers');

const storageScript = fs.readFileSync(path.join(root, 'scripts', 'storage.js'), 'utf8');
const literatureScript = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const visionScript = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
const archiveScript = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
const startupScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-startup.js'), 'utf8');
assert.match(storageScript, /validateArchive\?\.\(archiveEntries/, 'Archive data should be checked after normalization');
assert.match(archiveScript, /function renderArchiveView\(\)[\s\S]*validateArchive/, 'Archive should be checked immediately before rendering');
assert.match(literatureScript, /function renderLiteratureListView\(\)[\s\S]*validateLiterature/, 'Literature should be checked immediately before rendering');
assert.match(visionScript, /async function renderVisionBoardView\(\)[\s\S]*validateVision/, 'Vision Board should be checked immediately before rendering');
assert.match(startupScript, /runAppSchemaMigrations\(\);[\s\S]*validateUniverses/, 'universe data should be checked after schema migration and before initial rendering');

console.log('normalized-render-validation.unit.js passed');

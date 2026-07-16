const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles', 'wormholes.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-storage-dashboard.js'), 'utf8');

assert.match(html, /id="storageUsageDetailsBtn"[^>]*>View Storage Details<\/button>/, 'Settings should expose a small View Storage Details control');
assert.match(html, /id="storageUsageDashboardModal"/, 'storage dashboard modal should exist');
assert.match(html, /id="closeStorageUsageDashboardBtn"[^>]*>Close<\/button>/, 'dashboard should have a simple Close button');
assert.match(html, /scripts\/wormholes-storage-dashboard\.js/, 'dashboard script should be linked');
assert.match(css, /\.settings-storage-summary \.settings-storage-more-button/, 'View Storage Details control should have compact text-button styling');
assert.ok(/\.settings-storage-summary \.settings-storage-more-button\s*\{[^}]*display:\s*inline;[^}]*color:\s*var\(--cream\) !important;[^}]*-webkit-text-fill-color:\s*var\(--cream\);/.test(css), 'View Storage Details control should remain cream-colored despite generic button styling');
assert.match(css, /\.storage-usage-dashboard-modal/, 'dashboard should have modal styling');

const storageEntries = new Map([
  ['wormholesUniverseArchive:u1', 'archive'],
  ['wormholesUniverseConnectionNotes:u1', 'connections'],
  ['wormholesUniverseLiterature:u1', 'literature'],
  ['wormholesUniverseVisionBoard:u1', 'vision'],
  ['wormholesManualCreationDrafts', 'draft'],
  ['wormholesUniverses', 'universes']
]);

const document = {
  documentElement:{dataset:{}},
  activeElement:null,
  getElementById(){ return null; }
};
const localStorage = {
  get length(){ return storageEntries.size; },
  key(index){ return Array.from(storageEntries.keys())[index] ?? null; },
  getItem(key){ return storageEntries.has(key) ? storageEntries.get(key) : null; }
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
  RegExp,
  Promise,
  Blob,
  localStorage,
  document,
  navigator:{storage:{}},
  storageByteSize(value){ return String(value ?? '').length; },
  formatStorageBytes(value){ return `${value} B`; },
  repositoryLayer(){ return null; },
  setTimeout(fn){ fn(); return 1; },
  clearTimeout(){},
  window:null
};
context.window = context;
vm.runInNewContext(source, context, {filename:'wormholes-storage-dashboard.js'});

const api = context.WormholesStorageDashboard;
assert.ok(api, 'dashboard API should be published');
assert.strictEqual(api.classifyLocalStorageKey('wormholesUniverseArchive:u1'), 'creations');
assert.strictEqual(api.classifyLocalStorageKey('wormholesUniverseConnectionNotes:u1'), 'creations');
assert.strictEqual(api.classifyLocalStorageKey('wormholesUniverseLiterature:u1'), 'literature');
assert.strictEqual(api.classifyLocalStorageKey('wormholesUniverseVisionBoard:u1'), 'images');
assert.strictEqual(api.classifyLocalStorageKey('wormholesManualCreationDrafts'), 'other');
assert.strictEqual(api.approximateSnapshotBytesFromSignature({signature:'fnv1a-12345678-4096'}), 5120);

const breakdown = api.localStorageBreakdown();
assert.ok(breakdown.creations > 0, 'creation and connection metadata should be itemized');
assert.ok(breakdown.literature > 0, 'literature metadata should be itemized');
assert.ok(breakdown.images > 0, 'image metadata should be itemized');
assert.ok(breakdown.other > 0, 'universes, drafts, and settings should be grouped as other');

console.log('storage-usage-dashboard.unit.js passed');

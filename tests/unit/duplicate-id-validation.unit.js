const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const elements = new Map();
function element(id){
  const value = {
    id,
    textContent:'',
    focused:false,
    listeners:{},
    classList:{
      values:new Set(),
      add(name){ this.values.add(name); },
      remove(name){ this.values.delete(name); },
      contains(name){ return this.values.has(name); }
    },
    addEventListener(type, handler){ this.listeners[type] = handler; },
    focus(){ this.focused = true; }
  };
  elements.set(id, value);
  return value;
}
[
  'duplicateIdModal',
  'duplicateIdTitle',
  'duplicateIdText',
  'duplicateIdDetail',
  'closeDuplicateIdBtn'
].forEach(element);

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
  Promise,
  setTimeout(handler){ handler(); return 1; },
  clearTimeout(){},
  alertMessage:'',
  alert(message){ context.alertMessage = message; },
  document:{getElementById(id){ return elements.get(id) || null; }}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-id-integrity.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-id-integrity.js'});

const ids = context.WormholesIdIntegrity;
assert.ok(ids, 'duplicate-ID API should be exposed');
assert.strictEqual(ids.findDuplicateIds([{id:'a'}, {id:'b'}], 'archive').ok, true);
const duplicate = ids.findDuplicateIds([{id:'secret-raw-123'}, {id:'b'}, {id:'secret-raw-123'}], 'archive', {context:'Book One'});
assert.strictEqual(duplicate.ok, false);
assert.strictEqual(duplicate.duplicateId, 'secret-raw-123');
assert.strictEqual(duplicate.firstIndex, 0);
assert.strictEqual(duplicate.duplicateIndex, 2);

const valid = {
  format:'Wormholes App Data Export',
  universes:[{id:'u-1', title:'Book One'}, {id:'u-2', title:'Book Two'}],
  universeData:{
    'u-1':{
      archive:[{id:'shared-id'}, {id:'a-2'}],
      literature:[{id:'shared-id'}],
      vision:[{id:'shared-id'}]
    },
    'u-2':{
      archive:[{id:'shared-id'}],
      literature:[],
      vision:[]
    }
  }
};
assert.strictEqual(ids.validateAppData(valid), true, 'IDs may repeat across separate scoped collections and universes');

const duplicateUniverses = {
  ...valid,
  universes:[{id:'u-1', title:'Book One'}, {id:'u-1', title:'Book Copy'}]
};
assert.throws(
  () => ids.validateAppData(duplicateUniverses),
  error => error?.code === 'WORMHOLES_DUPLICATE_ID' && error?.idIntegrityResult?.kind === 'universe',
  'duplicate universe IDs should be rejected'
);

const duplicateArchive = JSON.parse(JSON.stringify(valid));
duplicateArchive.universeData['u-1'].archive = [{id:'a-1'}, {id:'a-1'}];
assert.throws(
  () => ids.validateAppData(duplicateArchive),
  error => error?.code === 'WORMHOLES_DUPLICATE_ID' && error?.idIntegrityResult?.kind === 'archive',
  'duplicate Archive IDs in one universe should be rejected'
);

const duplicateLiterature = JSON.parse(JSON.stringify(valid));
duplicateLiterature.universeData['u-1'].literature = [{id:'l-1'}, {id:'l-1'}];
assert.throws(
  () => ids.validateAppData(duplicateLiterature),
  error => error?.code === 'WORMHOLES_DUPLICATE_ID' && error?.idIntegrityResult?.kind === 'literature',
  'duplicate Literature IDs in one universe should be rejected'
);

const duplicateVision = JSON.parse(JSON.stringify(valid));
duplicateVision.universeData['u-1'].vision = [{id:'v-1'}, {id:'v-1'}];
assert.throws(
  () => ids.validateAppData(duplicateVision),
  error => error?.code === 'WORMHOLES_DUPLICATE_ID' && error?.idIntegrityResult?.kind === 'vision',
  'duplicate Vision Board IDs in one universe should be rejected'
);
assert.strictEqual(ids.validateAppData(duplicateVision, {allowDuplicateIds:true}), true, 'internal rollback data can be preserved exactly');

ids.showDialog(duplicate);
assert.strictEqual(elements.get('duplicateIdModal').classList.contains('open'), true);
assert.strictEqual(elements.get('duplicateIdTitle').textContent, 'Duplicate items found');
assert.match(elements.get('duplicateIdText').textContent, /same internal ID/i);
assert.match(elements.get('duplicateIdDetail').textContent, /Nothing was imported/i);
assert.ok(!elements.get('duplicateIdText').textContent.includes('secret-raw-123') && !elements.get('duplicateIdDetail').textContent.includes('secret-raw-123'), 'the user-facing dialog should not expose unnecessary raw ID details');
assert.strictEqual(elements.get('closeDuplicateIdBtn').focused, true);
elements.get('closeDuplicateIdBtn').listeners.click();
assert.strictEqual(elements.get('duplicateIdModal').classList.contains('open'), false);

assert.strictEqual(ids.claimGeneratedId('new-id'), true, 'new generated IDs should be claimable');
assert.strictEqual(ids.claimGeneratedId('new-id'), false, 'a generated ID should not be issued twice in one session');

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(html.includes('id="duplicateIdModal"'), 'the concise duplicate-ID dialog should exist');
assert.ok(html.indexOf('scripts/wormholes-id-integrity.js') < html.indexOf('scripts/export-import.js'), 'duplicate-ID validation must load before import handling');
assert.ok(html.indexOf('scripts/wormholes-id-integrity.js') < html.indexOf('scripts/wormholes-app.js'), 'generated-ID claiming must load before app startup');

const importScript = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
const appScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-app.js'), 'utf8');
assert.match(importScript, /WormholesIdIntegrity\?\.validateAppData\?\.\(importData/, 'raw imports should be checked before migration');
assert.match(importScript, /WormholesIdIntegrity\?\.validateAppData\?\.\(migrated/, 'normalized imports should be checked again before staging');
assert.match(importScript, /WORMHOLES_DUPLICATE_ID/, 'import and restore failures should distinguish duplicate IDs');
assert.match(importScript, /categoryUniverseIds/, 'folder scans should reject repeated universe markers within one category');
assert.match(appScript, /claimGeneratedId/, 'new in-app IDs should avoid session collisions');

console.log('duplicate-id-validation.unit.js passed');

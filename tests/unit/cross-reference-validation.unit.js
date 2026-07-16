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
  'referenceIntegrityModal',
  'referenceIntegrityTitle',
  'referenceIntegrityText',
  'referenceIntegrityDetail',
  'closeReferenceIntegrityBtn'
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
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-reference-integrity.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-reference-integrity.js'});

const refs = context.WormholesReferenceIntegrity;
assert.ok(refs, 'cross-reference integrity API should be exposed');

function validData(){
  return {
    format:'Wormholes App Data Export',
    schemaVersion:4,
    currentUniverseId:'u-1',
    universes:[
      {id:'u-1', title:'Book One', bridges:[{universeId:'u-2', creationId:null}]},
      {id:'u-2', title:'Book Two', bridges:[]}
    ],
    bridgeNotes:{
      'U:u-1||U:u-2':'Universe bridge note',
      'C:u-1:a-1||C:u-2:b-1':'Creation bridge note'
    },
    universeData:{
      'u-1':{
        archive:[
          {id:'a-1', title:'A One', connections:['a-2'], bridges:[{universeId:'u-2', creationId:'b-1'}]},
          {id:'a-2', title:'A Two', connections:['a-1'], bridges:[]},
          {id:'g-1', kind:'group', title:'A Group', groupIds:['a-1', 'a-2'], connections:[], bridges:[]}
        ],
        connectionNotes:{'a-1::a-2':'Connection note'},
        literature:[
          {id:'l-1', title:'Chapter One', tags:{universes:['u-2'], entries:[{universeId:'u-2', entryId:'b-1'}]}},
          {id:'l-2', title:'Chapter Two', tags:{universes:[], entries:[]}},
          {id:'lg-1', kind:'literatureGroup', fileType:'group', groupIds:['l-1', 'l-2'], tags:{universes:[], entries:[]}}
        ],
        vision:[
          {id:'v-1', title:'Image', tags:{universes:['u-1'], entries:[{universeId:'u-1', entryId:'a-1'}]}}
        ]
      },
      'u-2':{
        archive:[{id:'b-1', title:'B One', connections:[], bridges:[]}],
        connectionNotes:{},
        literature:[],
        vision:[]
      }
    }
  };
}

assert.strictEqual(refs.validateAppData(validData()), true, 'a fully linked backup should validate');

function expectBroken(mutator, kind){
  const data = JSON.parse(JSON.stringify(validData()));
  mutator(data);
  assert.throws(
    () => refs.validateAppData(data),
    error => error?.code === 'WORMHOLES_BROKEN_REFERENCE' && (!kind || error?.referenceIntegrityResult?.kind === kind),
    `expected broken ${kind || 'cross-reference'} to be rejected`
  );
}

expectBroken(data => { data.currentUniverseId = 'missing-universe'; }, 'current-universe');
expectBroken(data => { data.universeData['u-1'].archive[2].groupIds.push('missing-entry'); }, 'Archive group');
expectBroken(data => { data.universeData['u-1'].archive.push({id:'g-2', kind:'group', groupIds:['a-1'], connections:[], bridges:[]}); }, 'Archive group');
expectBroken(data => { data.universeData['u-1'].archive[1].connections = []; }, 'connection');
expectBroken(data => { data.universeData['u-1'].connectionNotes['a-1::g-1'] = 'No relationship'; }, 'connection-note');
expectBroken(data => { data.universes[0].bridges[0].universeId = 'missing-universe'; }, 'bridge');
expectBroken(data => { data.universeData['u-1'].archive[0].bridges[0].creationId = 'missing-entry'; }, 'bridge');
expectBroken(data => { data.universeData['u-1'].archive[0].bridges[0].universeId = 'u-1'; }, 'bridge');
expectBroken(data => { data.bridgeNotes['U:u-1||C:u-2:b-1'] = 'No matching bridge'; }, 'bridge-note');
expectBroken(data => { data.universeData['u-1'].literature[0].tags.universes = ['missing-universe']; }, 'Literature-universe-tag');
expectBroken(data => { data.universeData['u-1'].vision[0].tags.entries[0].entryId = 'missing-entry'; }, 'Vision Board-entry-tag');
expectBroken(data => { data.universeData['u-1'].literature[2].groupIds.push('missing-doc'); }, 'Literature group');

const broken = validData();
broken.universeData['u-1'].archive[0].connections = ['missing'];
assert.strictEqual(refs.validateAppData(broken, {allowBrokenReferences:true}), true, 'internal rollback/recovery copies can be restored exactly');

let result;
try{
  refs.validateAppData(broken);
}catch(error){
  result = error.referenceIntegrityResult;
}
refs.showDialog(result);
assert.strictEqual(elements.get('referenceIntegrityModal').classList.contains('open'), true);
assert.strictEqual(elements.get('referenceIntegrityTitle').textContent, 'Some linked items are missing');
assert.match(elements.get('referenceIntegrityText').textContent, /group, connection, bridge, note, or tag/i);
assert.match(elements.get('referenceIntegrityDetail').textContent, /Nothing was imported/i);
assert.ok(!elements.get('referenceIntegrityText').textContent.includes('missing'), 'the dialog should not expose raw missing IDs');
assert.strictEqual(elements.get('closeReferenceIntegrityBtn').focused, true);
elements.get('closeReferenceIntegrityBtn').listeners.click();
assert.strictEqual(elements.get('referenceIntegrityModal').classList.contains('open'), false);

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(html.includes('id="referenceIntegrityModal"'), 'the concise cross-reference dialog should exist');
assert.ok(html.indexOf('scripts/wormholes-reference-integrity.js') < html.indexOf('scripts/export-import.js'), 'cross-reference validation must load before import handling');

const importScript = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
assert.match(importScript, /WormholesReferenceIntegrity\?\.validateAppData\?\.\(importData/, 'raw imports should be validated before migration');
assert.match(importScript, /WormholesReferenceIntegrity\?\.validateAppData\?\.\(migrated/, 'normalized imports should be validated again before staging');
assert.match(importScript, /WORMHOLES_BROKEN_REFERENCE/, 'import and restore failures should distinguish broken links');
assert.match(importScript, /allowBrokenReferenceBypass/, 'Undo and recovery paths should be able to preserve historical state exactly');

console.log('cross-reference-validation.unit.js passed');

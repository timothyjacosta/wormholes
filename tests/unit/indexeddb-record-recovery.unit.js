const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createLocalStorage(){
  const store = new Map();
  return {
    get length(){ return store.size; },
    key(index){ return Array.from(store.keys())[index] || null; },
    getItem(key){ return store.has(String(key)) ? store.get(String(key)) : null; },
    setItem(key, value){ store.set(String(key), String(value)); },
    removeItem(key){ store.delete(String(key)); }
  };
}

const PNG_A = 'data:image/png;base64,AAAA';
const PNG_B = 'data:image/png;base64,BBBB';
const JPG_C = 'data:image/jpeg;base64,CCCC';
const THUMB = 'data:image/jpeg;base64,DDDD';
const REGENERATED = 'data:image/jpeg;base64,EEEE';

const literature = [
  {id:'d1', title:'Portable', content:'<p>Portable recovery</p>', contentStoreKey:'literature:u1:d1:content', contentStored:'indexedDB'},
  {id:'d2', title:'Canonical', content:'', contentStoreKey:'stale-literature-key', contentStored:'indexedDB'},
  {id:'d3', title:'Snapshot', content:'', contentStoreKey:'literature:u1:d3:content', contentStored:'indexedDB'},
  {id:'d4', title:'Unrecoverable', content:'', contentStoreKey:'literature:u1:d4:content', contentStored:'indexedDB'},
  {id:'d5', title:'Invalid', content:'', contentStoreKey:'literature:u1:d5:content', contentStored:'indexedDB'},
  {id:'d6', title:'Unavailable', content:'<p>Must not be treated as missing</p>', contentStoreKey:'literature:u1:d6:content', contentStored:'indexedDB'}
];

const vision = [
  {id:'v1', title:'Snapshot image', dataStoreKey:'vision:u1:v1:dataUrl', dataStored:'indexedDB', thumbnailStored:''},
  {id:'v2', title:'Regenerate thumbnail', dataStoreKey:'vision:u1:v2:dataUrl', dataStored:'indexedDB', thumbnailStoreKey:'vision:u1:v2:thumbnailDataUrl', thumbnailStored:'indexedDB'},
  {id:'v3', title:'Missing full image', dataStoreKey:'vision:u1:v3:dataUrl', dataStored:'indexedDB', thumbnailStoreKey:'vision:u1:v3:thumbnailDataUrl', thumbnailStored:'indexedDB'},
  {id:'v4', title:'Invalid image', dataStoreKey:'vision:u1:v4:dataUrl', dataStored:'indexedDB', thumbnailStored:''}
];

const metadata = {literature:structuredClone(literature), vision:structuredClone(vision)};
const writes = {literature:0, vision:0};
const reports = [];
const payloads = new Map([
  ['literature:u1:d2:content', '<p>Canonical content</p>'],
  ['literature:u1:d5:content', {wrong:'type'}],
  ['vision:u1:v2:dataUrl', PNG_A],
  ['vision:u1:v3:thumbnailDataUrl', THUMB],
  ['vision:u1:v4:dataUrl', 'not-a-safe-data-url']
]);

const snapshots = [{
  id:'snapshot-newest',
  createdAt:'2026-07-11T19:00:00.000Z',
  data:{
    universeData:{
      u1:{
        literature:[
          {id:'d3', content:'<p>Snapshot content</p>'},
          {id:'d5', content:'<p>Recovered invalid content</p>'}
        ],
        vision:[
          {id:'v1', dataUrl:PNG_B},
          {id:'v4', dataUrl:JPG_C}
        ]
      }
    }
  }
}];

const localStorage = createLocalStorage();
localStorage.setItem('wormholesUniverseLiterature:u1', 'present');
localStorage.setItem('wormholesUniverseVisionBoard:u1', 'present');

function safeDataUrl(value){
  return /^data:image\/(png|jpe?g);base64,[a-z0-9+/=]+$/i.test(String(value || ''));
}

const context = {
  console,
  localStorage,
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
  structuredClone,
  universes:[{id:'u1', title:'Universe One'}],
  currentUniverseId:null,
  WormholesSnapshots:{async listSnapshots(){ return snapshots; }},
  WormholesLargeDataStore:{
    async inspect(key){
      if(key === 'literature:u1:d6:content') return {status:'unavailable', key, reason:'Temporary database access failure'};
      if(!payloads.has(key)) return {status:'missing', key};
      return {status:'found', key, value:payloads.get(key), updatedAt:'2026-07-11T19:00:00.000Z'};
    },
    async put(key, value){ payloads.set(key, value); return true; }
  },
  literatureStorageKey(id){ return `wormholesUniverseLiterature:${id}`; },
  oldLiteratureStorageKey(id){ return `worldBuilderUniverseLiterature:${id}`; },
  visionStorageKey(id){ return `wormholesUniverseVisionBoard:${id}`; },
  oldVisionStorageKey(id){ return `worldBuilderUniverseVisionBoard:${id}`; },
  readPersistedDatasetData(key){
    if(key.includes('Literature')) return structuredClone(metadata.literature);
    if(key.includes('VisionBoard')) return structuredClone(metadata.vision);
    return [];
  },
  normalizeLiteratureDoc(doc){ return {...doc}; },
  normalizeVisionEntry(item){ return {...item, dataUrl:item.dataUrl || '', thumbnailDataUrl:item.thumbnailDataUrl || ''}; },
  literatureContentStoreKeyFor(universeId, id){ return `literature:${universeId}:${id}:content`; },
  visionDataStoreKeyFor(universeId, id){ return `vision:${universeId}:${id}:dataUrl`; },
  visionThumbnailStoreKeyFor(universeId, id){ return `vision:${universeId}:${id}:thumbnailDataUrl`; },
  literaturePlainPreview(html){ return String(html || '').replace(/<[^>]*>/g, ' ').trim(); },
  sanitizeLiteratureHtml(html){ return String(html || ''); },
  isSafeImportedVisionImageDataUrl:safeDataUrl,
  async regenerateVisionThumbnailDataUrl(value){
    assert.strictEqual(value, PNG_A, 'thumbnail should be regenerated from the valid full image');
    return REGENERATED;
  },
  writeLiteratureMetadataOnly(universeId, docs){
    assert.strictEqual(universeId, 'u1');
    writes.literature += 1;
    metadata.literature = structuredClone(docs);
    return true;
  },
  writeVisionMetadataOnly(universeId, items){
    assert.strictEqual(universeId, 'u1');
    writes.vision += 1;
    metadata.vision = structuredClone(items);
    return true;
  },
  reportAppError(label, error, options = {}){
    reports.push({label, message:error?.message || String(error), userMessage:options.userMessage || ''});
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-indexeddb-recovery.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/wormholes-indexeddb-recovery.js'});

(async () => {
  const recovery = context.WormholesIndexedDbRecovery;
  assert.ok(recovery, 'IndexedDB recovery API should be exposed');

  const result = await recovery.recoverMissingOrPartialIndexedDbRecords();
  assert.strictEqual(result.repaired, 7, 'portable, canonical, snapshot, invalid, and regenerated payloads should repair');
  assert.strictEqual(result.unresolved, 2, 'one literature body and one full image should remain unresolved');
  assert.strictEqual(result.unverified, 1, 'temporary IndexedDB unavailability should be reported separately');

  assert.strictEqual(payloads.get('literature:u1:d1:content'), '<p>Portable recovery</p>', 'portable literature content should repopulate IndexedDB');
  assert.strictEqual(metadata.literature.find(doc => doc.id === 'd2').contentStoreKey, 'literature:u1:d2:content', 'stale literature key should relink to the canonical record');
  assert.strictEqual(payloads.get('literature:u1:d3:content'), '<p>Snapshot content</p>', 'missing literature should recover from snapshot');
  assert.strictEqual(payloads.get('literature:u1:d5:content'), '<p>Recovered invalid content</p>', 'invalid literature payload should be replaced from snapshot');
  assert.strictEqual(payloads.has('literature:u1:d4:content'), false, 'unrecoverable literature must not be replaced with empty content');
  assert.strictEqual(payloads.has('literature:u1:d6:content'), false, 'unavailable IndexedDB must not be mistaken for a missing record');

  assert.strictEqual(payloads.get('vision:u1:v1:dataUrl'), PNG_B, 'missing full image should recover from snapshot');
  assert.strictEqual(payloads.get('vision:u1:v2:thumbnailDataUrl'), REGENERATED, 'missing thumbnail should regenerate from full image');
  assert.strictEqual(payloads.get('vision:u1:v4:dataUrl'), JPG_C, 'invalid image payload should recover from snapshot');
  assert.strictEqual(payloads.has('vision:u1:v3:dataUrl'), false, 'thumbnail must not be substituted for a missing full image');

  assert.strictEqual(writes.literature, 1, 'literature metadata should be rewritten once after repairs');
  assert.strictEqual(writes.vision, 1, 'vision metadata should be rewritten once after repairs');
  assert.strictEqual(recovery.latestIssues.length, 3, 'unresolved and unverified issues should remain inspectable');
  assert.ok(reports.some(report => /metadata was preserved/i.test(report.userMessage)), 'the user should be told unresolved item metadata was preserved');

  console.log('indexeddb-record-recovery.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

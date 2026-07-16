const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sanitizerCalls = [];
const normalizedInputs = [];
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
  WORMHOLES_APP_VERSION:'Beta 197',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  WORMHOLES_MANAGED_MARKER:'.wormholes-managed.json',
  UNIVERSES_KEY:'wormholes_universes',
  OLD_UNIVERSES_KEY:'old_universes',
  WORMHOLE_BRIDGE_NOTES_KEY:'wormholes_bridge_notes',
  OLD_WORMHOLE_BRIDGE_NOTES_KEY:'old_bridge_notes',
  WORMHOLES_SCHEMA_KEY:'wormholes_schema_version',
  makeId(){ return 'generated-id'; },
  sanitizeLiteratureHtml(value){
    const raw = String(value || '');
    sanitizerCalls.push(raw);
    return raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, '');
  },
  normalizeBridgeListForImport(value){ return Array.isArray(value) ? value : []; },
  normalizeSchemaUniverse(universe){ return {...universe}; },
  normalizeSchemaArchiveEntry(entry){ return {...entry}; },
  normalizeImportedLiteratureDoc(doc, universeId){
    normalizedInputs.push({...doc});
    assert.doesNotMatch(String(doc.content || ''), /<script|<iframe|onerror|javascript:/i, 'normalization must receive already-sanitized rich text');
    return {...doc, universeId};
  },
  normalizeImportedVisionItem(item, universeId){ return {...item, universeId}; },
  stableUniverseFolderName(universe){ return `${universe.title || 'Universe'} -- ${universe.id}`; },
  window:{
    WormholesIdIntegrity:{validateAppData(){}},
    WormholesReferenceIntegrity:{validateAppData(){}},
    WormholesMediaLimits:{validateAppData(){}},
    WormholesUrlSafety:{validateAppData(){}},
    WormholesContentLimits:{validateAppData(){}},
    WormholesEntityLimits:{validateAppData(){}}
  },
  document:{getElementById(){ return null; }}
};
context.globalThis = context;
context.window.window = context.window;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app-data-validation.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-app-data-validation.js'}
);
const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/export-import.js'});

assert.strictEqual(typeof context.sanitizeImportedRichTextBeforeStaging, 'function', 'import sanitizer should be globally callable');

const maliciousContent = '<h2>Kept heading</h2><script>window.evil=1</script><p onerror="evil()">Kept text</p><iframe src="https://evil.example"></iframe><a href="javascript:evil()">Link text</a>';
const sourceImport = {
  format:'Wormholes App Data Export',
  schemaVersion:4,
  appVersion:'Beta 197',
  currentUniverseId:'u1',
  universes:[{id:'u1', title:'Universe', bridges:[]}],
  bridgeNotes:{},
  universeData:{
    u1:{
      archive:[],
      connectionNotes:{},
      literature:[
        {id:'doc-1', title:'Imported document', content:maliciousContent, fileType:'html'},
        {id:'group-1', kind:'literatureGroup', fileType:'group', title:'Group', content:'<script>group()</script>', groupIds:['doc-1']}
      ],
      vision:[]
    }
  }
};
const originalJson = JSON.stringify(sourceImport);

const sanitized = context.sanitizeImportedRichTextBeforeStaging(sourceImport);
assert.notStrictEqual(sanitized, sourceImport, 'sanitization should create a detached staging copy');
assert.strictEqual(JSON.stringify(sourceImport), originalJson, 'sanitization must not mutate the selected backup object');
assert.match(sanitized.universeData.u1.literature[0].content, /Kept heading/, 'safe formatting should remain');
assert.match(sanitized.universeData.u1.literature[0].content, /Kept text/, 'safe text should remain');
assert.doesNotMatch(sanitized.universeData.u1.literature[0].content, /<script|<iframe|onerror|javascript:/i, 'unsafe markup should be removed before staging');
assert.strictEqual(sanitized.universeData.u1.literature[1].content, '', 'Literature groups should not stage rich-text bodies');

const prepared = context.prepareWormholesAppDataImport(sourceImport);
assert.doesNotMatch(prepared.importData.universeData.u1.literature[0].content, /<script|<iframe|onerror|javascript:/i, 'prepared import data must contain only sanitized rich text');
assert.strictEqual(prepared.importData.universeData.u1.literature[1].content, '', 'prepared Literature groups should remain body-free');
assert.ok(sanitizerCalls.length >= 2, 'staging and normalization should both sanitize as defense in depth');
assert.ok(normalizedInputs.length >= 2, 'sanitized documents should continue through normal migration');

const prepareIndex = source.indexOf('const sanitizedImport = sanitizeImportedRichTextBeforeStaging(importData);');
const migrateIndex = source.indexOf('const migrated = migrateWormholesAppDataImport(sanitizedImport);');
assert.ok(prepareIndex >= 0 && migrateIndex > prepareIndex, 'rich text must be sanitized before migration and staging');
assert.doesNotMatch(source.slice(migrateIndex, source.indexOf('return {', migrateIndex)), /migrateWormholesAppDataImport\(importData\)/, 'raw imported data must not re-enter the staging path');

console.log('import-rich-text-sanitization.unit.js passed');

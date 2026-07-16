'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const fixtureDirectory = path.join(root, 'tests', 'fixtures', 'schema-versions');
const context = {console, Object, Array, Set, Number, Error};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'scripts', 'wormholes-schema-versions.js'), 'utf8'),
  context,
  {filename:'wormholes-schema-versions.js'}
);

const versions = context.WormholesSchemaVersions;
assert.ok(versions, 'the supported-schema manifest should be available');
assert.strictEqual(versions.current, 5, 'the manifest should identify the current schema');
assert.deepStrictEqual(Array.from(versions.supported), [1, 2, 3, 4, 5], 'supported versions should be explicit and ordered');
assert.strictEqual(versions.oldest, 1);
assert.strictEqual(versions.sourceVersion(undefined), 1, 'exports without a version should retain legacy version-one behavior');
assert.strictEqual(versions.isSupported(1), true);
assert.strictEqual(versions.isSupported(5), true);
assert.strictEqual(versions.isSupported(6), false);
assert.throws(() => versions.assertSupported(6), /newer Wormholes version/);

const fixtureFiles = fs.readdirSync(fixtureDirectory)
  .filter(name => /^schema-v\d+\.json$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const fixtureVersions = fixtureFiles.map(name => Number(name.match(/\d+/)[0]));
assert.deepStrictEqual(
  fixtureVersions,
  Array.from(versions.supported),
  'every supported schema version must have exactly one checked-in migration fixture'
);

fixtureFiles.forEach(fileName => {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, fileName), 'utf8'));
  const versionFromName = Number(fileName.match(/\d+/)[0]);
  assert.strictEqual(fixture.format, 'Wormholes App Data Export', `${fileName} should be an app-data export`);
  assert.strictEqual(fixture.schemaVersion, versionFromName, `${fileName} should declare its filename version`);
  assert.ok(Array.isArray(fixture.universes) && fixture.universes.length > 0, `${fileName} should exercise universe migration`);
  assert.ok(fixture.universeData && typeof fixture.universeData === 'object', `${fileName} should exercise per-universe data migration`);
});



function extractFunction(source, name){
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} should remain present in production source`);
  const paramsStart = source.indexOf('(', start);
  let parenDepth = 0;
  let paramsEnd = -1;
  for(let index = paramsStart; index < source.length; index += 1){
    if(source[index] === '(') parenDepth += 1;
    if(source[index] === ')'){
      parenDepth -= 1;
      if(parenDepth === 0){ paramsEnd = index; break; }
    }
  }
  assert.ok(paramsEnd >= 0, `${name} should have a complete parameter list`);
  const bodyStart = source.indexOf('{', paramsEnd);
  let depth = 0;
  let state = 'code';
  let escaped = false;
  for(let index = bodyStart; index < source.length; index += 1){
    const char = source[index];
    const next = source[index + 1];
    if(state === 'line-comment'){
      if(char === '\n') state = 'code';
      continue;
    }
    if(state === 'block-comment'){
      if(char === '*' && next === '/') { state = 'code'; index += 1; }
      continue;
    }
    if(state === 'single' || state === 'double' || state === 'template'){
      if(escaped){ escaped = false; continue; }
      if(char === '\\'){ escaped = true; continue; }
      if((state === 'single' && char === "'") || (state === 'double' && char === '"') || (state === 'template' && char === '`')) state = 'code';
      continue;
    }
    if(char === '/' && next === '/') { state = 'line-comment'; index += 1; continue; }
    if(char === '/' && next === '*') { state = 'block-comment'; index += 1; continue; }
    if(char === "'") { state = 'single'; continue; }
    if(char === '"') { state = 'double'; continue; }
    if(char === '`') { state = 'template'; continue; }
    if(char === '{') depth += 1;
    if(char === '}'){
      depth -= 1;
      if(depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

const migrationContext = {
  console,
  Date,
  JSON,
  Object,
  Number,
  String,
  Boolean,
  Array,
  Map,
  Set,
  Error,
  WORMHOLES_APP_SCHEMA_VERSION:versions.current,
  __id:0,
  makeId(){ migrationContext.__id += 1; return `migration-id-${migrationContext.__id}`; },
  stableUniverseFolderName(universe){ return `${universe?.title || 'Untitled Universe'} -- ${universe?.id || 'unknown'}`; },
  normalizeBridgeListForImport(bridges, sourceUniverseId = '', validUniverseIds = null){
    const seen = new Set();
    return (Array.isArray(bridges) ? bridges : []).map(bridge => {
      if(typeof bridge === 'string') return {universeId:bridge, creationId:''};
      return bridge && typeof bridge === 'object' ? {universeId:String(bridge.universeId || ''), creationId:String(bridge.creationId || '')} : null;
    }).filter(bridge => {
      if(!bridge?.universeId) return false;
      if(validUniverseIds instanceof Set && !validUniverseIds.has(bridge.universeId)) return false;
      if(sourceUniverseId && bridge.universeId === sourceUniverseId && !bridge.creationId) return false;
      const key = `${bridge.universeId}::${bridge.creationId}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
  normalizeUniverseBridges(universe){ return migrationContext.normalizeBridgeListForImport(universe?.bridges); },
  normalizeBridges(bridges){ return migrationContext.normalizeBridgeListForImport(bridges); },
  cleanNotesArray(notes){ return Array.isArray(notes) ? notes.filter(Boolean) : []; },
  sanitizeLiteratureHtml(value){ return String(value || ''); },
  literatureContentStoreKeyFor(universeId, id){ return `literature:${universeId}:${id}:content`; },
  uniqueList(values){ return Array.from(new Set((values || []).filter(Boolean))); },
  safeImportedVisionImageDataUrl(value){ return /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,/i.test(String(value || '')) ? String(value) : ''; },
  safeImportedVisionMimeType(item, dataUrl, thumbnailDataUrl){
    if(item?.mimeType) return String(item.mimeType);
    const match = String(dataUrl || thumbnailDataUrl || '').match(/^data:([^;,]+)/i);
    return match ? match[1] : '';
  },
  visionDataStoreKeyFor(universeId, id){ return `vision:${universeId}:${id}:data`; },
  visionThumbnailStoreKeyFor(universeId, id){ return `vision:${universeId}:${id}:thumbnail`; }
};
migrationContext.window = migrationContext;
migrationContext.globalThis = migrationContext;
migrationContext.WormholesSchemaVersions = versions;
vm.createContext(migrationContext);

const sourceByFile = {
  universes:fs.readFileSync(path.join(root, 'scripts', 'universes.js'), 'utf8'),
  archive:fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8'),
  literature:fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8'),
  literatureHelpers:fs.readFileSync(path.join(root, 'scripts', 'modules', 'literature-content-helpers.mjs'), 'utf8'),
  vision:fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8'),
  import:fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8')
};
[
  ['import', 'normalizeImportedTags'],
  ['universes', 'normalizeSchemaUniverse'],
  ['universes', 'runAppSchemaMigrations'],
  ['archive', 'normalizeSchemaArchiveEntry'],
  ['literatureHelpers', 'buildCanonicalLiteratureRecord'],
  ['literature', 'normalizeImportedLiteratureDoc'],
  ['vision', 'normalizeImportedVisionItem'],
  ['import', 'wormholesSourceSchemaVersion'],
  ['import', 'assertSupportedWormholesSchemaVersion'],
  ['import', 'migrateWormholesAppDataImport']
].forEach(([file, name]) => {
  vm.runInContext(extractFunction(sourceByFile[file], name), migrationContext, {filename:`${file}:${name}`});
});

fixtureFiles.forEach(fileName => {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, fileName), 'utf8'));
  const migrated = migrationContext.migrateWormholesAppDataImport(JSON.parse(JSON.stringify(fixture)));
  assert.strictEqual(migrated.schemaVersion, versions.current, `${fileName} should migrate to the current schema`);
  assert.ok(migrated.universes.every(universe => universe.id && universe.title && universe.summary !== undefined && Array.isArray(universe.bridges) && universe.createdAt && universe.diskFolderName), `${fileName} universes should normalize`);
  migrated.universes.forEach(universe => {
    const data = migrated.universeData[universe.id];
    assert.ok(data && Array.isArray(data.archive) && Array.isArray(data.literature) && Array.isArray(data.vision), `${fileName} should preserve all per-universe collections`);
    data.archive.forEach(entry => {
      assert.ok(entry.id && entry.title && Array.isArray(entry.connections) && Array.isArray(entry.bridges) && entry.createdAt, `${fileName} archive entries should normalize`);
      if(entry.kind === 'group'){
        assert.ok(Array.isArray(entry.groupIds), `${fileName} archive groups should use groupIds`);
        assert.strictEqual(Object.prototype.hasOwnProperty.call(entry, 'children'), false, `${fileName} archive groups should remove legacy children`);
      }
    });
    data.literature.forEach(doc => {
      assert.ok(doc.id && doc.title && doc.tags && Array.isArray(doc.tags.universes) && Array.isArray(doc.tags.entries), `${fileName} Literature records should normalize`);
    });
    data.vision.forEach(item => {
      assert.ok(item.id && item.title && item.tags && Array.isArray(item.tags.universes) && Array.isArray(item.tags.entries), `${fileName} Vision records should normalize`);
    });
  });
});
assert.throws(
  () => migrationContext.migrateWormholesAppDataImport({schemaVersion:versions.current + 1}),
  /newer Wormholes version/,
  'production migration code should reject future schemas'
);


fixtureFiles.forEach(fileName => {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDirectory, fileName), 'utf8'));
  const rawByKey = new Map();
  fixture.universes.forEach(universe => {
    const data = fixture.universeData[universe.id] || {};
    rawByKey.set(`archive:${universe.id}`, data.archive || []);
    rawByKey.set(`notes:${universe.id}`, data.connectionNotes || {});
    rawByKey.set(`literature:${universe.id}`, data.literature || []);
    rawByKey.set(`vision:${universe.id}`, data.vision || []);
  });

  migrationContext.universes = JSON.parse(JSON.stringify(fixture.universes));
  migrationContext.__storedVersion = fixture.schemaVersion;
  migrationContext.__savedSchemaVersion = null;
  migrationContext.__savedUniverses = null;
  migrationContext.__startupWrites = {archive:new Map(), notes:new Map(), literature:new Map(), vision:new Map()};
  migrationContext.readStoredSchemaVersion = () => migrationContext.__storedVersion;
  migrationContext.saveStoredSchemaVersion = () => { migrationContext.__savedSchemaVersion = versions.current; };
  migrationContext.wormholesRepository = () => null;
  migrationContext.archiveStorageKey = id => `archive:${id}`;
  migrationContext.oldArchiveStorageKey = id => `old-archive:${id}`;
  migrationContext.connectionNotesStorageKey = id => `notes:${id}`;
  migrationContext.oldConnectionNotesStorageKey = id => `old-notes:${id}`;
  migrationContext.literatureStorageKey = id => `literature:${id}`;
  migrationContext.oldLiteratureStorageKey = id => `old-literature:${id}`;
  migrationContext.visionStorageKey = id => `vision:${id}`;
  migrationContext.oldVisionStorageKey = id => `old-vision:${id}`;
  migrationContext.readPersistedDatasetData = (key, oldKey, fallback) => rawByKey.has(key) ? JSON.parse(JSON.stringify(rawByKey.get(key))) : fallback;
  migrationContext.saveArchiveForUniverse = (id, value) => migrationContext.__startupWrites.archive.set(id, value);
  migrationContext.saveConnectionNotesForUniverse = (id, value) => migrationContext.__startupWrites.notes.set(id, value);
  migrationContext.writeLiteratureMetadataOnly = (id, value) => migrationContext.__startupWrites.literature.set(id, value);
  migrationContext.writeVisionMetadataOnly = (id, value) => migrationContext.__startupWrites.vision.set(id, value);
  migrationContext.saveUniversesToStorage = () => { migrationContext.__savedUniverses = JSON.parse(JSON.stringify(migrationContext.universes)); return true; };

  migrationContext.runAppSchemaMigrations();
  assert.ok(migrationContext.universes.every(universe => universe.id && universe.title && universe.summary !== undefined && Array.isArray(universe.bridges) && universe.createdAt && universe.diskFolderName), `${fileName} startup universes should normalize`);

  if(fixture.schemaVersion < versions.current){
    assert.strictEqual(migrationContext.__savedSchemaVersion, versions.current, `${fileName} startup migration should stamp the current version`);
    fixture.universes.forEach(universe => {
      assert.ok(migrationContext.__startupWrites.archive.has(universe.id), `${fileName} should rewrite normalized Archive data during startup migration`);
      assert.ok(migrationContext.__startupWrites.literature.has(universe.id), `${fileName} should rewrite normalized Literature data during startup migration`);
      assert.ok(migrationContext.__startupWrites.vision.has(universe.id), `${fileName} should rewrite normalized Vision data during startup migration`);
    });
  } else {
    assert.strictEqual(migrationContext.__savedSchemaVersion, null, `${fileName} current-schema startup should remain a no-op when already normalized`);
  }
});


const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
const manifestIndex = html.indexOf('scripts/wormholes-schema-versions.js');
const importIndex = html.indexOf('scripts/export-import.js');
assert.ok(manifestIndex >= 0, 'the schema-version manifest should be loaded by the app');
assert.ok(manifestIndex < importIndex, 'the support manifest should load before import migrations');

const appSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-app.js'), 'utf8');
assert.match(
  appSource,
  /WORMHOLES_APP_SCHEMA_VERSION\s*=\s*window\.WormholesSchemaVersions\?\.current\s*\|\|\s*5/,
  'the app schema constant should come from the support manifest'
);
const importSource = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
assert.match(importSource, /assertSupportedWormholesSchemaVersion\(migrated\)/, 'migration should enforce the support manifest');
assert.match(importSource, /assertSupportedWormholesSchemaVersion\(data\)/, 'validation should enforce the support manifest');

console.log('schema-version-migrations.unit.js passed');

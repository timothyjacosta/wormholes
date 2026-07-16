'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {validImport, structuralCases, fileCases} = require('../fixtures/malformed-import-corpus');

const root = path.resolve(__dirname, '..', '..');
const observed = {
  status:'',
  toast:'',
  errors:[],
  snapshots:0,
  confirmations:0,
  writes:0
};

const quietConsole = {
  log(){},
  warn(){},
  error(...args){ observed.errors.push(args); }
};

const context = {
  console:quietConsole,
  Date,
  JSON,
  Object,
  Number,
  String,
  Boolean,
  Math,
  Map,
  Set,
  Array,
  Promise,
  Blob,
  Error,
  TypeError,
  SyntaxError,
  WORMHOLES_APP_VERSION:'Beta 209',
  WORMHOLES_APP_SCHEMA_VERSION:4,
  WORMHOLES_MANAGED_MARKER:'.wormholes-managed.json',
  UNIVERSES_KEY:'wormholesUniverses',
  OLD_UNIVERSES_KEY:'wormholesUniversesOld',
  WORMHOLE_BRIDGE_NOTES_KEY:'wormholesBridgeNotes',
  OLD_WORMHOLE_BRIDGE_NOTES_KEY:'wormholesBridgeNotesOld',
  WORMHOLES_SCHEMA_KEY:'wormholesSchemaVersion',
  navigator:{storage:{}},
  localStorage:{length:0, key(){ return null; }, removeItem(){}},
  document:{getElementById(){ return null; }, createElement(){ return {}; }},
  setTimeout(handler){ handler(); return 1; },
  clearTimeout(){},
  setSettingsStatus(message){ observed.status = String(message || ''); },
  showSavedToast(message){ observed.toast = String(message || ''); },
  makeId(){ return 'generated-id'; },
  sanitizeLiteratureHtml(value){ return String(value || ''); },
  normalizeSchemaUniverse(value){ return value; },
  normalizeSchemaArchiveEntry(value){ return value; },
  normalizeImportedLiteratureDoc(value){ return value; },
  normalizeImportedVisionItem(value){ return value; },
  stableUniverseFolderName(universe){ return `${universe?.title || 'Universe'} -- ${universe?.id || 'id'}`; },
  archiveStorageKey(id){ return `archive:${id}`; },
  oldArchiveStorageKey(id){ return `old-archive:${id}`; },
  connectionNotesStorageKey(id){ return `notes:${id}`; },
  oldConnectionNotesStorageKey(id){ return `old-notes:${id}`; },
  literatureStorageKey(id){ return `literature:${id}`; },
  oldLiteratureStorageKey(id){ return `old-literature:${id}`; },
  visionStorageKey(id){ return `vision:${id}`; },
  oldVisionStorageKey(id){ return `old-vision:${id}`; }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app-data-validation.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-app-data-validation.js'}
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'scripts', 'wormholes-schema-versions.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-schema-versions.js'}
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8'),
  context,
  {filename:'scripts/export-import.js'}
);

assert.strictEqual(context.validateWormholesAppDataImport(validImport()), true, 'the control backup should be structurally valid');

const schemaFixtureDirectory = path.join(root, 'tests', 'fixtures', 'schema-versions');
for(const fileName of fs.readdirSync(schemaFixtureDirectory).filter(name => name.endsWith('.json')).sort()){
  const fixture = JSON.parse(fs.readFileSync(path.join(schemaFixtureDirectory, fileName), 'utf8'));
  assert.strictEqual(
    context.validateWormholesAppDataImport(fixture),
    true,
    `${fileName} should remain accepted by raw structural validation`
  );
}

for(const testCase of structuralCases){
  const before = JSON.stringify(testCase.data);
  assert.throws(
    () => context.validateWormholesAppDataImport(testCase.data),
    error => {
      assert.strictEqual(error?.code, 'WORMHOLES_MALFORMED_IMPORT', `${testCase.name} should use the malformed-import error code`);
      assert.strictEqual(error?.importIssue?.path, testCase.path, `${testCase.name} should identify the damaged field`);
      const userMessage = context.simpleAppDataImportFailureMessage(error);
      assert.match(userMessage, /incomplete or damaged/i, `${testCase.name} should receive simple user-facing copy`);
      assert.match(userMessage, /existing data was not changed/i, `${testCase.name} should promise no mutation only after early rejection`);
      assert.ok(!userMessage.includes(testCase.path), `${testCase.name} should not expose internal paths in the UI`);
      return true;
    },
    testCase.name
  );
  assert.strictEqual(JSON.stringify(testCase.data), before, `${testCase.name} validation must not mutate the selected backup`);
}

const source = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
assert.ok(
  source.indexOf('validateWormholesAppDataImport(importData);') < source.indexOf('WormholesIdIntegrity?.validateAppData?.(importData'),
  'structural validation should run before deeper ID and relationship validators'
);
const applyImportSource = source.slice(source.indexOf('async function applyWormholesAppDataImport'));
assert.ok(
  applyImportSource.indexOf('const prepared = prepareWormholesAppDataImport(importData') < applyImportSource.indexOf('rollbackSnapshot = await buildWormholesAppDataExport()'),
  'malformed data should be rejected before the safety snapshot and any import-side work begins'
);

// Replace post-validation operations with counters. No malformed file may reach them.
context.buildWormholesAppDataExport = async () => {
  observed.snapshots += 1;
  return validImport();
};
context.confirmAppDataImportOverwrite = async () => {
  observed.confirmations += 1;
  return true;
};
context.writePreparedWormholesAppDataImport = async () => {
  observed.writes += 1;
};

(async () => {
  for(const testCase of fileCases){
    observed.status = '';
    observed.toast = '';
    observed.errors.length = 0;
    observed.snapshots = 0;
    observed.confirmations = 0;
    observed.writes = 0;

    const input = {
      files:[{
        name:`${testCase.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`,
        size:Buffer.byteLength(testCase.raw),
        async text(){ return testCase.raw; }
      }],
      value:'selected-file'
    };

    await context.handleAppDataImportFile({target:input});

    assert.strictEqual(observed.snapshots, 0, `${testCase.name} must fail before creating an import snapshot`);
    assert.strictEqual(observed.confirmations, 0, `${testCase.name} must fail before showing the destructive-import confirmation`);
    assert.strictEqual(observed.writes, 0, `${testCase.name} must never reach persistence`);
    assert.match(observed.status, /not changed|unchanged/i, `${testCase.name} should report that existing data is safe`);
    assert.match(observed.toast, /existing data unchanged/i, `${testCase.name} should use the compact failure toast`);
    assert.strictEqual(input.value, '', `${testCase.name} should reset the file input so it can be retried`);
  }

  assert.match(
    context.simpleAppDataImportFailureMessage(new SyntaxError('Unexpected end of JSON input')),
    /damaged or unreadable.*not changed/i,
    'truncated JSON should receive a specific and safe message'
  );

  console.log('malformed-import-regressions.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

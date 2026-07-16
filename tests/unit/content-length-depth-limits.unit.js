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
  'contentLimitModal',
  'contentLimitTitle',
  'contentLimitText',
  'contentLimitDetail',
  'closeContentLimitBtn'
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
  WeakSet,
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
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-content-limits.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-content-limits.js'});

const limits = context.WormholesContentLimits;
assert.ok(limits, 'content-limit API should be exposed');
assert.strictEqual(limits.limits.title.hard, 500, 'titles should remain generous but bounded');
assert.strictEqual(limits.limits.shortLabel.hard, 200, 'short creation labels should be bounded');
assert.strictEqual(limits.limits.note.hard, 250000, 'notes and summaries should support extensive lore');
assert.strictEqual(limits.limits.literature.hard, 15000000, 'full-length manuscripts should remain supported');
assert.strictEqual(limits.maxDataDepth, 32, 'imported object/array nesting should be bounded');
assert.strictEqual(limits.maxLiteratureHtmlDepth, 64, 'ordinary rich text should have ample nesting headroom');

assert.strictEqual(limits.stringResult('title', 'x'.repeat(500)).ok, true, 'the exact title boundary should be accepted');
const longTitle = limits.ensureString('title', 'x'.repeat(501), {fieldName:'creation title', context:'Test Creation', operation:'save this creation'});
assert.strictEqual(longTitle.ok, false, 'a title above the hard limit should be rejected');
assert.strictEqual(elements.get('contentLimitModal').classList.contains('open'), true, 'content violations should open the integrated dialog');
assert.match(elements.get('contentLimitTitle').textContent, /too long/i);
assert.match(elements.get('contentLimitText').textContent, /501/);
assert.match(elements.get('contentLimitText').textContent, /500/);
assert.match(elements.get('contentLimitDetail').textContent, /preserved/i);
assert.strictEqual(elements.get('closeContentLimitBtn').focused, true, 'dialog close control should receive focus');
elements.get('closeContentLimitBtn').listeners.click();
assert.strictEqual(elements.get('contentLimitModal').classList.contains('open'), false);

assert.strictEqual(
  limits.stringResult('title', 'x'.repeat(550), {previousValue:'x'.repeat(600)}).ok,
  true,
  'older over-limit text should be allowed when the user reduces it'
);
assert.strictEqual(
  limits.stringResult('title', 'x'.repeat(601), {previousValue:'x'.repeat(600)}).ok,
  false,
  'older over-limit text should not be allowed to grow further'
);

const depth32 = {};
let cursor = depth32;
for(let index = 0; index < 32; index += 1){ cursor.next = {}; cursor = cursor.next; }
assert.strictEqual(limits.structureResult(depth32).ok, true, 'the exact nesting boundary should be accepted');
cursor.next = {};
const tooDeep = limits.structureResult(depth32);
assert.strictEqual(tooDeep.ok, false, 'a structure deeper than the supported boundary should be rejected');
assert.strictEqual(tooDeep.issue, 'data-depth');

const html64 = '<div>'.repeat(64) + 'text' + '</div>'.repeat(64);
const html65 = '<div>'.repeat(65) + 'text' + '</div>'.repeat(65);
assert.strictEqual(limits.htmlResult(html64).ok, true, 'the exact Literature formatting-depth boundary should be accepted');
assert.strictEqual(limits.htmlResult(html65).ok, false, 'excessively nested Literature markup should be rejected');
assert.strictEqual(limits.htmlResult(html65).issue, 'html-depth');

const validImport = {
  format:'Wormholes App Data Export',
  schemaVersion:4,
  currentUniverseId:'u-1',
  universes:[{id:'u-1', title:'Book One', summary:'s'.repeat(10000), bridges:[]}],
  bridgeNotes:{},
  universeData:{
    'u-1':{
      archive:[{id:'a-1', title:'Creation', what:{val:'Place'}, attr1:{val:'Ancient'}, attr2:null, pressure:{val:'Hidden'}, summary:'lore', notes:['note'], connections:[], bridges:[]}],
      connectionNotes:{},
      literature:[{id:'l-1', title:'Long Manuscript', content:'<p>' + 'word '.repeat(400000) + '</p>'}],
      vision:[{id:'v-1', title:'Map', dataUrl:'data:image/png;base64,' + 'A'.repeat(1100000), thumbnailDataUrl:''}]
    }
  }
};
assert.strictEqual(limits.validateAppData(validImport), true, 'deep worldbuilding and embedded image data should pass text/depth validation');

const badTitleImport = JSON.parse(JSON.stringify(validImport));
badTitleImport.universes[0].title = 'x'.repeat(501);
assert.throws(
  () => limits.validateAppData(badTitleImport),
  error => error?.code === 'WORMHOLES_STRING_TOO_LONG' && error?.contentLimitResult?.kind === 'title',
  'imports with oversized strings should fail with a structured error'
);

const deeplyNestedImport = {format:'Wormholes App Data Export', universes:[], universeData:{}};
cursor = deeplyNestedImport;
for(let index = 0; index < 33; index += 1){ cursor.extra = {}; cursor = cursor.extra; }
assert.throws(
  () => limits.validateAppData(deeplyNestedImport),
  error => error?.code === 'WORMHOLES_NESTING_TOO_DEEP',
  'imports with pathological nesting should fail before staging'
);
assert.strictEqual(limits.validateAppData(badTitleImport, {allowOverLimit:true}), true, 'rollback and recovery copies should remain restorable');

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(html.includes('id="contentLimitModal"'), 'the integrated content-limit dialog should exist');
assert.ok(html.includes('id="literatureTitleInput" maxlength="500"'), 'Literature titles should have a native input cap');
assert.ok(html.includes('id="noteTextInput" maxlength="250000"'), 'notes should have a generous native input cap');
assert.ok(html.includes('id="manualWhatCustom" maxlength="200"'), 'custom short labels should have a native input cap');
assert.ok(html.indexOf('scripts/wormholes-content-limits.js') < html.indexOf('scripts/archive.js'), 'content limits must load before editor consumers');
assert.ok(html.indexOf('scripts/wormholes-content-limits.js') < html.indexOf('scripts/export-import.js'), 'content limits must load before import validation');

const importScript = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
const literatureScript = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const archiveScript = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
const appWorkflowScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-app-workflow.js'), 'utf8');
const universeScript = fs.readFileSync(path.join(root, 'scripts', 'universes.js'), 'utf8');
assert.match(importScript, /WormholesContentLimits\?\.validateAppData\?\.\(importData/, 'raw imported JSON should be checked before migration/staging');
assert.match(importScript, /WORMHOLES_NESTING_TOO_DEEP/, 'import failures should distinguish excessive nesting');
assert.match(literatureScript, /ensureHtml\(draft\.content/, 'Literature autosave should enforce manuscript length and formatting depth');
assert.match(literatureScript, /ensureHtml\(doc\.content/, 'uploaded Literature should be validated after conversion');
assert.match(archiveScript, /ensureString\("note", text/, 'Archive notes and summaries should enforce text limits');
assert.match(appWorkflowScript, /ensureString\("shortLabel", value/, 'custom creation fields should enforce short-label limits');
assert.match(universeScript, /ensureString\("note", summary/, 'universe summaries should enforce long-text limits');

console.log('content-length-depth-limits.unit.js passed');

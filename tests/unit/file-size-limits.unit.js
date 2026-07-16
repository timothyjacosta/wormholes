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
  'fileSizeLimitModal',
  'fileSizeLimitTitle',
  'fileSizeLimitText',
  'fileSizeLimitDetail',
  'closeFileSizeLimitBtn'
].forEach(element);

const context = {
  console,
  Object,
  Number,
  String,
  Math,
  Array,
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
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-file-limits.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-file-limits.js'});

const limits = context.WormholesFileLimits;
assert.ok(limits, 'file-limit API should be exposed');
assert.strictEqual(limits.limits.appData.perFileBytes, 256 * 1024 * 1024, 'app-data import limit should be generous but bounded');
assert.strictEqual(limits.limits.literature.perFileBytes, 50 * 1024 * 1024, 'Literature files should allow normal large documents');
assert.strictEqual(limits.limits.literature.batchBytes, 200 * 1024 * 1024, 'Literature selections should have a bounded batch size');
assert.strictEqual(limits.limits.vision.perFileBytes, 75 * 1024 * 1024, 'Vision image limit should accommodate high-resolution JPEG and PNG files');
assert.strictEqual(limits.limits.vision.batchBytes, 300 * 1024 * 1024, 'Vision selections should have a bounded batch size');

assert.strictEqual(limits.validate([{name:'large.docx', size:50 * 1024 * 1024}], 'literature').ok, true, 'a file exactly at the limit should be accepted');
const oversizedLiterature = limits.validate([{name:'too-large.docx', size:50 * 1024 * 1024 + 1}], 'literature');
assert.strictEqual(oversizedLiterature.ok, false, 'a Literature file above the limit should be rejected');
assert.strictEqual(oversizedLiterature.oversized[0].name, 'too-large.docx', 'the rejected filename should be retained for user messaging');

const batch = limits.validate(Array.from({length:5}, (_, i) => ({name:`part-${i}.txt`, size:45 * 1024 * 1024})), 'literature');
assert.strictEqual(batch.ok, false, 'a batch above the aggregate limit should be rejected');
assert.strictEqual(batch.batchExceeded, true, 'batch failures should be distinguishable from individual-file failures');

const normalImages = limits.validate([
  {name:'one.jpg', size:20 * 1024 * 1024},
  {name:'two.png', size:30 * 1024 * 1024}
], 'vision');
assert.strictEqual(normalImages.ok, true, 'normal high-resolution image uploads should be accepted');

const displayed = limits.enforce([{name:'huge.png', size:80 * 1024 * 1024}], 'vision', {label:'Vision Board image'});
assert.strictEqual(displayed.ok, false, 'enforcement should reject an oversized image');
assert.strictEqual(elements.get('fileSizeLimitModal').classList.contains('open'), true, 'oversized files should open the integrated dialog');
assert.match(elements.get('fileSizeLimitTitle').textContent, /too large/i, 'dialog title should clearly explain the problem');
assert.match(elements.get('fileSizeLimitText').textContent, /huge\.png/i, 'dialog should name the oversized file');
assert.match(elements.get('fileSizeLimitText').textContent, /75 MB/i, 'dialog should state the applicable size limit');
assert.match(elements.get('fileSizeLimitDetail').textContent, /Nothing was imported/i, 'dialog should reassure users that no partial import occurred');
assert.strictEqual(elements.get('closeFileSizeLimitBtn').focused, true, 'dialog close control should receive focus');

elements.get('closeFileSizeLimitBtn').listeners.click();
assert.strictEqual(elements.get('fileSizeLimitModal').classList.contains('open'), false, 'the dialog should close from its button');

assert.throws(
  () => limits.assertFile({name:'manifest.json', size:256 * 1024 * 1024 + 1}, 'backupManifest'),
  error => error?.code === 'WORMHOLES_FILE_TOO_LARGE' && error?.fileLimitResult?.oversized?.length === 1,
  'backup restore staging should receive a structured size-limit error'
);

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(html.includes('id="fileSizeLimitModal"'), 'the integrated file-size dialog should exist');
assert.ok(html.includes('up to 256 MB'), 'app-data import affordance should disclose its maximum');
assert.ok(html.includes('up to 50 MB each; up to 200 MB per selection'), 'Literature upload UI should disclose its limits');
assert.ok(html.indexOf('scripts/wormholes-file-limits.js') < html.indexOf('scripts/literature.js'), 'file limits must load before upload consumers');
assert.ok(html.indexOf('scripts/wormholes-file-limits.js') < html.indexOf('scripts/export-import.js'), 'file limits must load before app-data import');

const importScript = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
const literatureScript = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const visionScript = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
const handlerStart = importScript.indexOf('async function handleAppDataImportFile');
const readIndex = importScript.indexOf('const text = await file.text()', handlerStart);
const sizeIndex = importScript.indexOf('WormholesFileLimits?.enforce', handlerStart);
assert.ok(sizeIndex > handlerStart && sizeIndex < readIndex, 'app-data size must be checked before reading the file');
assert.match(importScript, /assertFile\?\.\(file, "backupManifest"/, 'backup manifests should be bounded before parsing');
assert.match(importScript, /assertFile\?\.\(file, "backupImage"/, 'backup images should be bounded before decoding');
assert.match(literatureScript, /WormholesFileLimits\?\.enforce\?\.\(fileList, "literature"/, 'Literature selections should be bounded before conversion');
assert.match(literatureScript, /textFromBackupFile\(file, fileName, "backupLiterature"\)/, 'folder-restored Literature should use the Literature file limit');
assert.match(visionScript, /WormholesFileLimits\?\.enforce\?\.\(fileList, "vision"/, 'Vision selections should be bounded before image decoding');
assert.match(visionScript, /up to 75 MB each; up to 300 MB per selection/, 'Vision upload UI should disclose its limits');

console.log('file-size-limits.unit.js passed');

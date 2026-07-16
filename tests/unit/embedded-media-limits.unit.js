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
  'mediaLimitModal',
  'mediaLimitTitle',
  'mediaLimitText',
  'mediaLimitDetail',
  'closeMediaLimitBtn'
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
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-media-limits.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-media-limits.js'});

const media = context.WormholesMediaLimits;
assert.ok(media, 'embedded-media API should be exposed');
assert.strictEqual(media.limits.visionImage.maxDecodedBytes, 75 * 1024 * 1024, 'full embedded images should match the generous image-upload limit');
assert.strictEqual(media.limits.visionThumbnail.maxDecodedBytes, 10 * 1024 * 1024, 'thumbnails should have ample room without becoming hidden full images');
assert.strictEqual(media.limits.literatureFile.maxDecodedBytes, 50 * 1024 * 1024, 'legacy Literature source payloads should match document-upload depth');
assert.strictEqual(media.maxTotalEmbeddedBytes, 225 * 1024 * 1024, 'portable backups should retain a generous aggregate media allowance');

const png = 'data:image/png;base64,QUJDRA==';
const jpg = 'data:image/jpeg;base64,QUJD';
assert.strictEqual(media.dataUrlResult(png, 'visionImage').ok, true, 'ordinary PNG data URLs should be accepted');
const webp = 'data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAADQAQCdASoEAAQAAUAmJaACdLoB+AADsAD+2O7/4s5GI7PN/8zRMcx+vQAAAA==';
assert.strictEqual(media.dataUrlResult(webp, 'visionImage').ok, true, 'existing WebP Vision Board images should remain safe to render');
assert.strictEqual(media.dataUrlResult(jpg, 'visionThumbnail').ok, true, 'ordinary JPEG thumbnails should be accepted');
assert.strictEqual(media.dataUrlResult('data:image/svg+xml;base64,PHN2Zz4=', 'visionImage').issue, 'mime', 'active or unsupported image formats should be rejected');
assert.strictEqual(media.dataUrlResult('data:image/png,not-base64', 'visionImage').issue, 'malformed', 'non-base64 portable image data should be rejected');
assert.strictEqual(media.dataUrlResult('not-a-data-url', 'visionImage').issue, 'not-data-url', 'dedicated media fields must contain valid data URLs');
const malformedField = JSON.parse(JSON.stringify({format:'Wormholes App Data Export', universes:[], universeData:{u1:{vision:[{dataUrl:'plain text'}]}}}));
assert.throws(() => media.validateAppData(malformedField), error => error?.mediaLimitResult?.issue === 'not-data-url', 'nonempty dedicated media fields cannot disguise arbitrary strings');

const tinyLimit = media.dataUrlResult(png, 'visionImage', {maxDecodedBytes:3, context:'$.universeData.u1.vision[0].dataUrl'});
assert.strictEqual(tinyLimit.ok, false, 'payloads above a field limit should be rejected');
assert.strictEqual(tinyLimit.issue, 'size');
media.showDialog(tinyLimit);
assert.strictEqual(elements.get('mediaLimitModal').classList.contains('open'), true, 'media violations should open the integrated dialog');
assert.match(elements.get('mediaLimitTitle').textContent, /too large/i);
assert.match(elements.get('mediaLimitText').textContent, /Vision Board image/i);
assert.match(elements.get('mediaLimitDetail').textContent, /Nothing was imported/i);
assert.strictEqual(elements.get('closeMediaLimitBtn').focused, true, 'dialog close control should receive focus');
elements.get('closeMediaLimitBtn').listeners.click();
assert.strictEqual(elements.get('mediaLimitModal').classList.contains('open'), false);

const validImport = {
  format:'Wormholes App Data Export',
  universes:[{id:'u1', title:'Book One'}],
  universeData:{
    u1:{
      vision:[
        {id:'v1', title:'Map One', dataUrl:png, thumbnailDataUrl:jpg},
        {id:'v2', title:'Map Two', dataUrl:jpg, thumbnailDataUrl:''}
      ],
      literature:[{id:'l1', title:'Manuscript', content:'<p>Text only.</p>', fileData:''}]
    }
  }
};
assert.strictEqual(media.validateAppData(validImport), true, 'normal image-heavy worldbuilding should pass embedded-media validation');

const unexpected = JSON.parse(JSON.stringify(validImport));
unexpected.universeData.u1.vision[0].title = 'data:text/html;base64,PHNjcmlwdD4=';
assert.throws(
  () => media.validateAppData(unexpected),
  error => error?.code === 'WORMHOLES_EMBEDDED_MEDIA_INVALID' && error?.mediaLimitResult?.issue === 'unexpected',
  'data URLs hidden in ordinary text fields should be rejected'
);

const unsupported = JSON.parse(JSON.stringify(validImport));
unsupported.universeData.u1.vision[0].dataUrl = 'data:image/svg+xml;base64,PHN2Zz4=';
assert.throws(
  () => media.validateAppData(unsupported),
  error => error?.code === 'WORMHOLES_EMBEDDED_MEDIA_INVALID' && error?.mediaLimitResult?.issue === 'mime',
  'unsupported embedded media types should reject the complete import'
);

const aggregate = JSON.parse(JSON.stringify(validImport));
assert.throws(
  () => media.validateAppData(aggregate, {maxTotalEmbeddedBytes:8}),
  error => error?.code === 'WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE' && error?.mediaLimitResult?.issue === 'total',
  'aggregate embedded media should be bounded independently of entity count'
);
assert.strictEqual(media.validateAppData(unsupported, {allowOverLimit:true}), true, 'internal rollback and recovery copies should remain restorable');
assert.strictEqual(media.safeDataUrl(png, 'visionImage'), png, 'safe portable images should remain unchanged');
assert.strictEqual(media.safeDataUrl('data:text/html;base64,PHNjcmlwdD4=', 'visionImage'), '', 'unsafe media should never be returned for rendering');

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(html.includes('id="mediaLimitModal"'), 'the integrated embedded-media dialog should exist');
assert.ok(html.indexOf('scripts/wormholes-media-limits.js') < html.indexOf('scripts/wormholes-content-limits.js'), 'media limits should load before broader content validation');
assert.ok(html.indexOf('scripts/wormholes-media-limits.js') < html.indexOf('scripts/vision-board.js'), 'media limits should load before Vision Board rendering/import code');
assert.ok(html.indexOf('scripts/wormholes-media-limits.js') < html.indexOf('scripts/export-import.js'), 'media limits should load before app-data import validation');

const importScript = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
const visionScript = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
const recoveryScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-indexeddb-recovery.js'), 'utf8');
const literatureScript = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const fileLimitsScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-file-limits.js'), 'utf8');
assert.match(importScript, /WormholesMediaLimits\?\.validateAppData\?\.\(importData/, 'raw app-data should be checked for embedded media before staging');
assert.match(importScript, /WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE/, 'import and restore failures should distinguish media-limit errors');
assert.match(visionScript, /WormholesMediaLimits\?\.dataUrlResult/, 'Vision Board normalization should reject unsafe or over-limit portable images');
assert.match(recoveryScript, /(?:WormholesMediaLimits|mediaLimitsApi)\?\.dataUrlResult/, 'IndexedDB recovery should not restore unsafe or over-limit media');
assert.ok(!/"img"/.test(literatureScript.match(/const allowedTags = new Set\(\[([\s\S]*?)\]\);/)?.[1] || ''), 'Literature should continue stripping embedded images rather than storing hidden media in rich text');
assert.match(fileLimitsScript, /perFileBytes:\s*75 \* MIB,[\s\S]*?batchBytes:\s*300 \* MIB/, 'normal image uploads should retain the existing generous depth');

console.log('embedded-media-limits.unit.js passed');

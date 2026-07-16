const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const vision = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');

const helperStart = vision.indexOf('async function decodeVisionFullImageIntoElement');
const helperEnd = vision.indexOf('async function visionItemThumbnailSource', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'the shared full-image decode helper should exist');
const helperSource = vision.slice(helperStart, helperEnd);
assert.match(helperSource, /typeof image\.decode === "function"/, 'full images should use the browser decode promise when available');
assert.match(helperSource, /await image\.decode\(\)/, 'full-image decode should be awaited');
assert.match(helperSource, /image\.decoding = "async"/, 'full images should request asynchronous decoding');

const expandedStart = vision.indexOf('async function openExpandedVisionImage');
const expandedEnd = vision.indexOf('function toggleExpandedVisionImage', expandedStart);
assert.match(vision.slice(expandedStart, expandedEnd), /await decodeVisionFullImageIntoElement\(/, 'Vision Board expansion should decode only after the user opens the image');

const viewerStart = vision.indexOf('async function openVisionImageViewer');
const viewerEnd = vision.indexOf('function closeVisionImageViewerModal', viewerStart);
assert.match(vision.slice(viewerStart, viewerEnd), /await decodeVisionFullImageIntoElement\(/, 'the full-image viewer should await decoding after it opens');
assert.match(html, /<img alt="" decoding="async" id="visionImageViewerImg"\/>/, 'the full-image viewer element should declare asynchronous decoding and start without a source');

const context = {
  console,
  Error,
  Promise,
  String,
  window:{
    WormholesSafeRender:{
      safeImageUrl(value){ return String(value || ''); },
      setAttribute(element, name, value){ element.setAttribute(name, value); return element; }
    }
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(helperSource, context, {filename:'decodeVisionFullImageIntoElement.js'});

function fakeImage({reject = false} = {}){
  return {
    attrs:{src:'data:image/png;base64,VEhVTUI='},
    naturalWidth:reject ? 0 : 120,
    complete:!reject,
    decodeCalls:0,
    setAttribute(name, value){ this.attrs[name] = String(value); },
    removeAttribute(name){ delete this.attrs[name]; },
    async decode(){
      this.decodeCalls += 1;
      if(reject) throw new Error('decode failed');
    }
  };
}

(async () => {
  const image = fakeImage();
  const decoded = await context.decodeVisionFullImageIntoElement(image, 'data:image/png;base64,RlVMTA==');
  assert.strictEqual(decoded, true);
  assert.strictEqual(image.decodeCalls, 1, 'the full source should be decoded exactly once when opened');
  assert.strictEqual(image.attrs.src, 'data:image/png;base64,RlVMTA==');
  assert.strictEqual(image.decoding, 'async');
  assert.strictEqual(image.loading, 'eager', 'an explicitly opened image may load immediately while still decoding asynchronously');

  const failed = fakeImage({reject:true});
  await assert.rejects(
    context.decodeVisionFullImageIntoElement(failed, 'data:image/png;base64,QkFE', {
      fallbackSource:'data:image/png;base64,VEhVTUI=',
      fallbackKind:'visionThumbnail'
    }),
    /decode failed/
  );
  assert.strictEqual(failed.attrs.src, 'data:image/png;base64,VEhVTUI=', 'a failed full decode should restore the thumbnail');

  console.log('lazy-full-image-decode.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

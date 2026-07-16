const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const visionPath = path.join(root, 'scripts', 'vision-board.js');
const vision = fs.readFileSync(visionPath, 'utf8');
const archive = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');
const folderStorage = fs.readFileSync(path.join(root, 'scripts', 'folder-storage.js'), 'utf8');

const thumbnailSourceStart = vision.indexOf('async function visionItemThumbnailSource');
const thumbnailSourceEnd = vision.indexOf('async function populateVisionThumbnailButton', thumbnailSourceStart);
const thumbnailSourceBody = vision.slice(thumbnailSourceStart, thumbnailSourceEnd);
assert.match(thumbnailSourceBody, /materializeVisionItemThumbnailData/, 'preview source should materialize thumbnail data');
assert.ok(!thumbnailSourceBody.includes('materializeVisionItemLargeData'), 'preview source must not materialize the full image and thumbnail together');

const boardStart = vision.indexOf('async function renderVisionBoard');
const boardEnd = vision.indexOf('function clearExpandedVisionObjectUrl', boardStart);
const boardBody = vision.slice(boardStart, boardEnd);
assert.match(boardBody, /await visionItemThumbnailSource\(item, currentUniverseId\)/, 'Vision Board tiles should use thumbnail sources');
assert.ok(!/displaySource\s*=\s*\{src:await visionItemDisplaySrc\(item, currentUniverseId\), imageKind:"visionImage"\}/.test(boardBody), 'image tiles should not select full image sources');

const expandedStart = vision.indexOf('async function openExpandedVisionImage');
const expandedEnd = vision.indexOf('function toggleExpandedVisionImage', expandedStart);
const expandedBody = vision.slice(expandedStart, expandedEnd);
assert.match(expandedBody, /await visionItemDisplaySrc\(item, currentUniverseId\)/, 'expanded Vision Board images should still load the full image');
assert.match(vision, /restoreVisionPinPreview/, 'closing an expanded Vision Board image should restore its thumbnail');

assert.match(archive, /populateVisionThumbnailButton\(/, 'Archive previews should use the shared thumbnail renderer');
assert.match(vision, /populateVisionThumbnailButton\([\s\S]*visionLinksObjectUrls/, 'Literature and map camera-badge previews should use the shared thumbnail renderer');
const folderThumbnailBranch = folderStorage.search(/if\s*\(\s*item\.thumbnailDataUrl\s*\)/);
const folderFullImageBranch = folderStorage.search(/if\s*\(\s*item\.dataUrl\s*\)/);
assert.ok(folderThumbnailBranch >= 0 && folderThumbnailBranch < folderFullImageBranch, 'export preview generation should prefer thumbnails before full images');

const loadedKeys = [];
const context = {
  console,
  currentUniverseId:'u1',
  uniqueList(values){ return Array.from(new Set(values.filter(Boolean))); },
  async loadLargeDataValue(key){
    loadedKeys.push(key);
    if(key.includes('thumbnail')) return 'data:image/png;base64,VEhVTUI=';
    if(key.includes('dataUrl')) return 'data:image/png;base64,RlVMTA==';
    return '';
  },
  window:{},
  globalThis:null
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(vision, context, {filename:'scripts/vision-board.js'});

(async () => {
  const item = {
    id:'image-1',
    dataStoreKey:'vision:u1:image-1:dataUrl',
    thumbnailStoreKey:'vision:u1:image-1:thumbnailDataUrl',
    dataUrl:'',
    thumbnailDataUrl:''
  };
  const source = await context.visionItemThumbnailSource(item, 'u1');
  assert.strictEqual(source.imageKind, 'visionThumbnail');
  assert.strictEqual(source.src, 'data:image/png;base64,VEhVTUI=');
  assert.deepStrictEqual(loadedKeys, ['vision:u1:image-1:thumbnailDataUrl'], 'a normal preview should read only the thumbnail record');
  assert.strictEqual(item.dataUrl, '', 'normal previews should leave full image data unloaded');

  console.log('image-thumbnail-audit.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

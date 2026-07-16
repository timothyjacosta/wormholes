const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const vision = fs.readFileSync(path.join(root, 'scripts', 'vision-board.js'), 'utf8');
const archive = fs.readFileSync(path.join(root, 'scripts', 'archive.js'), 'utf8');

const safeRender = fs.readFileSync(path.join(root, 'scripts', 'wormholes-safe-render.js'), 'utf8');
const dataBranch = safeRender.search(/if\s*\(\s*options\.allowDataImage\s*&&\s*\/\^data:\/i\.test\(candidate\)\s*\)/);
const ordinaryLengthOffset = dataBranch >= 0 ? safeRender.slice(dataBranch).search(/if\s*\(\s*candidate\.length\s*>\s*maxLength\s*\)/) : -1;
const ordinaryLengthCheck = ordinaryLengthOffset >= 0 ? dataBranch + ordinaryLengthOffset : -1;
assert.ok(dataBranch >= 0 && ordinaryLengthCheck > dataBranch, 'embedded image validation should run before the ordinary URL length cap');
assert.match(safeRender, /Real Vision Board thumbnails routinely exceed 8,000 characters/, 'the thumbnail URL-limit regression should remain documented');

const sourceStart = vision.indexOf('async function visionItemThumbnailSource');
const sourceEnd = vision.indexOf('async function populateVisionThumbnailButton', sourceStart);
assert.ok(sourceStart >= 0 && sourceEnd > sourceStart, 'Vision Board should expose a dedicated thumbnail source helper');
const sourceBody = vision.slice(sourceStart, sourceEnd);
const thumbnailBranch = sourceBody.search(/if\s*\(\s*item\.thumbnailDataUrl\s*\)/);
const fullImageBranch = sourceBody.search(/if\s*\(\s*item\.dataUrl\s*\)/);
assert.ok(thumbnailBranch >= 0, 'Thumbnail source should recognize stored thumbnails');
assert.ok(thumbnailBranch < fullImageBranch, 'Stored thumbnails should be preferred over full image data');
assert.match(sourceBody, /imageKind:\s*"visionThumbnail"/, 'Stored thumbnail data should use the thumbnail media limit');
assert.match(sourceBody, /imageKind:\s*"visionImage"/, 'Full-image fallback should use the full image media limit');

const rendererStart = vision.indexOf('async function populateVisionThumbnailButton');
const rendererEnd = vision.indexOf('async function renderVisionBoard', rendererStart);
assert.ok(rendererStart >= 0 && rendererEnd > rendererStart, 'Vision Board should expose a shared thumbnail button renderer');
const rendererBody = vision.slice(rendererStart, rendererEnd);
assert.match(rendererBody, /safeRender\.replaceWithImage/, 'Thumbnail rendering should remain URL-safe');
assert.match(rendererBody, /image\.addEventListener\(\s*"error"/, 'Thumbnail decode failures should fall back to the full image');
assert.match(rendererBody, /visionItemDisplaySrc/, 'Thumbnail renderer should retain a full-image fallback');

assert.match(vision, /populateVisionThumbnailButton\([\s\S]*visionLinksObjectUrls/, 'Map image lists should use the shared thumbnail renderer');
assert.match(archive, /populateVisionThumbnailButton\([\s\S]*archiveVisionObjectUrls/, 'Archive image previews should use the shared thumbnail renderer');

console.log('map-image-thumbnails.unit.js passed');

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeElement(id){
  return {
    id,
    dataset:{},
    style:{},
    clientWidth:800,
    clientHeight:500,
    value:'',
    textContent:'',
    innerHTML:'',
    classList:{ add(){}, remove(){} },
    listeners:{},
    addEventListener(type, fn){
      if(!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    },
    closest(){ return null; },
    setPointerCapture(){},
    releasePointerCapture(){},
    querySelectorAll(){ return []; }
  };
}

const wrap = makeElement('wormholesMapWrap');
const stage = makeElement('wormholesMapStage');
const slider = makeElement('wormholesZoomSlider');
const value = makeElement('wormholesZoomValue');

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
  requestAnimationFrame(fn){ fn(); },
  wormholesMapZoom:0.9,
  wormholesMapAutoFitOnNextRender:false,
  wormholesMapPanX:12,
  wormholesMapPanY:24,
  wormholesMapDragging:false,
  wormholesMapDragStart:null,
  wormholesMapFilters:{ bridges:true, connections:true, literature:true, images:true, relationships:true },
  universes:[],
  currentUniverseId:null,
  selectedMapNodeId:null,
  selectedWormholeCreation:null,
  wormholeFocusUniverseId:null,
  wormholesMapIsolatedSubgraph:false,
  bridgeNotes:{},
  connectionNotes:{},
  document:{
    getElementById(id){
      return {wormholesMapWrap:wrap, wormholesMapStage:stage, wormholesZoomSlider:slider, wormholesZoomValue:value}[id] || null;
    },
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  },
  window:{},
  updateSvgMapBadgeScale(el, zoom){ context.__badgeScale = [el.id, zoom]; },
  updateMapReadabilityState(el, zoom){ context.__readability = [el.id, zoom]; },
  mapPanForZoomAroundViewportCenter(){ return {panX:35, panY:45}; },
  updateDestructiveClearButtons(){ context.__updatedClear = true; },
  refreshOpenMapListView(scope){ context.__refreshedScope = scope; },
  readArchiveForUniverse(){ return []; },
  mapArchiveEntries(entries){ return entries || []; },
  topLevelArchiveEntries(){ return []; },
  isGroupEntry(){ return false; },
  groupChildIds(){ return []; },
  fitTextToCircle(){ return {r:80, rx:80, ry:80, lines:['Universe'], titleFontSize:14, lineHeight:18}; },
  fitCreationCircle(){ return {r:56, rx:56, ry:32, titleLines:['Creation'], titleFontSize:12, subtitleFontSize:10, titleLineHeight:13, subtitleLineHeight:11}; },
  fitWormholeGroupCircle(){ return {isGroupFit:true, r:70, rx:70, ry:40, titleLines:['Group'], titleFontSize:12, subtitleFontSize:10, titleLineHeight:13, subtitleLineHeight:11}; },
  mapInspectorAllBridgeLedger(){ return []; },
  mapInspectorConnectionLedgerForArchive(){ return []; },
  mapInspectorConnectedEntityRowsForUniverse(){ return []; },
  mapInspectorBridgedEntityRowsForUniverse(){ return []; },
  mapInspectorEscape(value){ return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
  mapInspectorEntityCountButtonHtml(){ return ''; },
  mapInspectorEntityPanelHtml(){ return ''; },
  mapInspectorLedgerListHtml(){ return ''; },
  mapInspectorEntityIndexHtml(){ return ''; },
  mapUniversePalette(){ return {stroke:'#000', fill:'#fff'}; },
  mapUniversePaletteStyle(){ return ''; },
  mapFilterClass(){ return ''; },
  mapFilterControlsHtml(){ return ''; },
  bindMapFilterControls(){ context.__boundFilters = true; },
  improveSvgMapAccessibility(){ context.__improvedAccessibility = true; },
  truncateSvgText(value){ return String(value || ''); },
  truncatePreview(value){ return String(value || ''); },
  escapeHtml(value){ return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
  displayValue(){ return '—'; },
  normalizeBridges(){ return []; },
  normalizeUniverseBridges(){ return []; },
  findUniverseBridgeBetween(){ return null; },
  bridgeKey(a,b){ return `${a}:${b || ''}`; },
  connectionKey(a,b){ return [a,b].sort().join('::'); },
  getConnectionNote(){ return ''; },
  getUniverseTitle(){ return 'Universe'; },
  getUniverseSummary(){ return ''; },
  getEntry(){ return null; },
  getCreationTitleFromUniverse(){ return ''; },
  archiveForUniverseLinkCheck(){ return []; },
  entityExistsInUniverse(){ return true; },
  rectShapeFromPosition(x,y,w,h){ return {type:'rect', x, y, width:w, height:h, cx:x+w/2, cy:y+h/2}; },
  capsuleShapeFromPosition(x,y,w,h){ return {type:'capsule', x, y, width:w, height:h, cx:x+w/2, cy:y+h/2}; },
  pointOnShapeOutline(){ return {x:0, y:0}; },
  clippedLineBetweenShapes(){ return {x1:0,y1:0,x2:1,y2:1}; },
  edgeEndpointDots(){ return ''; },
  notePointAvoidingRects(){ return {x:0,y:0}; },
  notePointNearSource(){ return {x:0,y:0}; },
  svgLinkedLiteratureBadge(){ return ''; },
  svgVisionBadge(){ return ''; },
  bindVisionBadgeClickHandlers(){},
  clearMapSelection(){},
  openUniverseSummaryModal(){},
  openUniverseBridgeModal(){},
  openBridgeModal(){},
  openBridgeNoteModal(){ context.__bridgeNoteModal = true; },
  openLiteratureLinksModal(){},
  protectAllControls(){}
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'bridges-map.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/bridges-map.js'});

assert.strictEqual(typeof context.renderWormholesMap, 'function', 'bridges map renderer should remain globally callable');
assert.strictEqual(typeof context.bindWormholesMapViewport, 'function', 'bridges map viewport binder should remain globally callable');
assert.strictEqual(typeof context.applyWormholesMapTransform, 'function', 'bridges map transform helper should remain globally callable');
assert.strictEqual(typeof context.buildWormholesMapListViewHtml, 'function', 'bridges map list view should remain globally callable');

context.applyWormholesMapTransform();
assert.strictEqual(stage.style.transform, 'translate(12px, 24px) scale(0.9)');
assert.deepStrictEqual(context.__badgeScale, ['wormholesMapStage', 0.9]);
assert.deepStrictEqual(context.__readability, ['wormholesMapStage', 0.9]);
assert.strictEqual(slider.value, '0.9');
assert.strictEqual(value.textContent, '90%');

context.bindWormholesMapViewport();
context.bindWormholesMapViewport();
context.bindWormholesMapViewport();
assert.strictEqual((wrap.listeners.pointerdown || []).length, 1, 'persistent wrapper pointerdown listener should bind only once');
assert.strictEqual((wrap.listeners.pointermove || []).length, 1, 'persistent wrapper pointermove listener should bind only once');
assert.strictEqual((wrap.listeners.pointerup || []).length, 1, 'persistent wrapper pointerup listener should bind only once');
assert.ok((slider.listeners.input || []).length >= 1, 'zoom slider input listener should be bound');

context.renderWormholesMap();
assert.ok(wrap.innerHTML.includes('No universes yet'), 'empty bridges map state should still render');
assert.strictEqual(context.__refreshedScope, 'wormholes', 'bridges map should refresh wormholes list-view scope');

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
assert.ok(htmlName, 'Wormholes beta html file should exist');
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const order = ['scripts/connections-map.js', 'scripts/bridges-map.js', 'scripts/wormholes-app.js'].map(src => html.indexOf(src));
assert.ok(order[0] !== -1 && order[1] !== -1 && order[2] !== -1, 'expected script tags should be present');
assert.ok(order[0] < order[1] && order[1] < order[2], 'bridges-map.js should load after connections-map.js and before wormholes-app.js');

const appScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app.js'), 'utf8');
assert.ok(!/function\s+renderWormholesMap\s*\(/.test(appScript), 'renderWormholesMap should be cordoned off from wormholes-app.js');
assert.ok(!/function\s+bindWormholesMapViewport\s*\(/.test(appScript), 'bindWormholesMapViewport should be cordoned off from wormholes-app.js');
assert.ok(/handleWormholeCreationClick/.test(script), 'bridges map should still route creation clicks through Manage Bridges handlers');
assert.ok(/handleWormholeUniverseClick/.test(script), 'bridges map should still route universe clicks through Manage Bridges handlers');
assert.ok(/openBridgeNoteModal/.test(script), 'bridges map should still open bridge-note modal from bridge notes');
assert.ok(/function\s+bridgeMapShapeFromPosition\s*\(/.test(script), 'bridges map should define its own rounded-shape clipping helper');
assert.ok(/type:\s*"capsule"/.test(script), 'bridges map clipping helper should use capsule outlines for bridge endpoints');

console.log('bridges-map-module.unit.js passed');

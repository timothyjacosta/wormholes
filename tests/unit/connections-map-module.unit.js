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

const wrap = makeElement('connectionsMapWrap');
const stage = makeElement('connectionsMapStage');
const slider = makeElement('connectionsZoomSlider');
const value = makeElement('connectionsZoomValue');
const svg = {dataset:{graphWidth:'1000', graphHeight:'600'}, viewBox:{baseVal:{width:1000,height:600}}};
let animationFrameCalls = 0;

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
  requestAnimationFrame(fn){ animationFrameCalls += 1; fn(); },
  connectionsMapZoom:1,
  connectionsMapAutoFitOnNextRender:false,
  connectionsMapPanX:10,
  connectionsMapPanY:20,
  connectionsMapDragging:false,
  connectionsMapDragStart:null,
  document:{
    getElementById(id){
      return {connectionsMapWrap:wrap, connectionsMapStage:stage, connectionsZoomSlider:slider, connectionsZoomValue:value}[id] || null;
    },
    querySelector(selector){ return selector === '#connectionsMapStage svg' ? svg : null; },
    querySelectorAll(){ return []; }
  },
  window:{},
  updateSvgMapBadgeScale(el, zoom){ context.__badgeScale = [el.id, zoom]; },
  updateMapReadabilityState(el, zoom){ context.__readability = [el.id, zoom]; },
  mapPanForZoomAroundViewportCenter(){ return {panX:30, panY:40}; },
  updateDestructiveClearButtons(){ context.__updatedClear = true; },
  isSelectableConnectionsMapNodeId(){ return true; },
  renderConnectionsMapStatus(){ context.__renderedStatus = true; },
  getCurrentUniverse(){ return {id:'u1', title:'Alpha'}; },
  currentUniverseId:'u1',
  archiveEntries:[],
  topLevelArchiveEntries(){ return []; },
  selectedMapNodeId:null,
  connectionsMapIsolatedSubgraph:false,
  getUniverseTitle(){ return 'Alpha'; },
  getUniverseSummary(){ return ''; },
  readArchiveForUniverse(){ return []; },
  archiveForUniverseLinkCheck(){ return []; },
  groupChildIds(){ return []; },
  isGroupEntry(){ return false; },
  getGroupForEntryId(){ return null; },
  getCreationTitleFromUniverse(){ return ''; },
  getEntry(){ return null; },
  normalizeBridges(){ return []; },
  normalizeUniverseBridges(){ return []; },
  findUniverseBridgeBetween(){ return null; },
  bridgeKey(a,b){ return `${a}:${b || ''}`; },
  entityExistsInUniverse(){ return true; },
  mapUniversePalette(){ return {stroke:'#000', fill:'#fff'}; },
  mapUniversePaletteStyle(){ return ''; },
  truncateSvgText(value){ return String(value || ''); },
  truncatePreview(value){ return String(value || ''); },
  connectionKey(a,b){ return [a,b].sort().join('::'); },
  getConnectionNote(){ return ''; },
  escapeHtml(value){ return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
  displayValue(){ return '—'; },
  fitCreationCircle(){ return {radius:60, lines:['Creation'], titleFontSize:16, subtitleFontSize:12}; },
  rectShapeFromPosition(x,y,w,h){ return {type:'rect', x, y, width:w, height:h, cx:x+w/2, cy:y+h/2}; },
  capsuleShapeFromPosition(x,y,w,h){ return {type:'capsule', x, y, width:w, height:h, cx:x+w/2, cy:y+h/2}; },
  pointOnShapeOutline(){ return {x:0, y:0}; },
  clippedLineBetweenShapes(){ return {x1:0,y1:0,x2:1,y2:1}; },
  edgeEndpointDots(){ return ''; },
  notePointAvoidingRects(){ return {x:0,y:0}; },
  notePointNearSource(){ return {x:0,y:0}; },
  svgLinkedLiteratureBadge(){ return ''; },
  svgVisionBadge(){ return ''; },
  mapFilterControlsHtml(){ return ''; },
  bindConnectionsMapViewport(){ context.__boundViewport = true; },
  bindMapFilterControls(){},
  improveSvgMapAccessibility(){},
  refreshOpenMapListView(){},
  isCurrentUniverseConnectionsMapNodeId(){ return false; },
  openUniverseBridgeModal(){},
  openBridgeModal(){},
  clearMapSelection(){},
  openConnectionModal(){},
  openBridgeNoteModal(){},
  openLiteratureLinksModal(){},
  bindVisionBadgeClickHandlers(){},
  isExternalConnectionsMapNodeId(){ return false; },
  toggleUniverseBridgeToExternalNode(){},
  toggleEntryBridgeToExternalNode(){},
  toggleMapConnection(){},
  protectAllControls(){}
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'connections-map.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/connections-map.js'});

assert.strictEqual(typeof context.renderConnectionsMap, 'function', 'connections map renderer should remain globally callable');
assert.strictEqual(typeof context.bindConnectionsMapViewport, 'function', 'connections map viewport binder should remain globally callable');
assert.strictEqual(typeof context.applyConnectionsMapTransform, 'function', 'connections map transform helper should remain globally callable');

context.applyConnectionsMapTransform();
assert.strictEqual(stage.style.transform, 'translate(10px, 20px) scale(1)');
assert.deepStrictEqual(context.__badgeScale, ['connectionsMapStage', 1]);
assert.deepStrictEqual(context.__readability, ['connectionsMapStage', 1]);
assert.strictEqual(slider.value, '1');
assert.strictEqual(value.textContent, '100%');

context.bindConnectionsMapViewport();
context.bindConnectionsMapViewport();
context.bindConnectionsMapViewport();
assert.strictEqual((wrap.listeners.pointerdown || []).length, 1, 'persistent wrapper pointerdown listener should bind only once');
assert.strictEqual((wrap.listeners.pointermove || []).length, 1, 'persistent wrapper pointermove listener should bind only once');
assert.strictEqual((wrap.listeners.pointerup || []).length, 1, 'persistent wrapper pointerup listener should bind only once');
assert.ok((slider.listeners.input || []).length >= 1, 'zoom slider input listener should be bound');

// Rebuilding an already visible map for Isolate must fit in the same task.
// Waiting for requestAnimationFrame paints one unfitted frame and causes a
// visible graphics/text stutter before the isolated map settles.
context.connectionsMapAutoFitOnNextRender = true;
context.connectionsMapZoom = 1;
context.connectionsMapPanX = 0;
context.connectionsMapPanY = 0;
animationFrameCalls = 0;
context.bindConnectionsMapViewport();
assert.strictEqual(animationFrameCalls, 0, 'a measurable open map should fit synchronously before paint');
assert.strictEqual(context.connectionsMapAutoFitOnNextRender, false, 'synchronous fit should consume the pending auto-fit');
assert.ok(stage.style.transform.includes('scale('), 'synchronous fit should apply the final transform immediately');
assert.notStrictEqual(stage.style.visibility, 'hidden', 'a measurable open map should never be hidden for fitting');

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
assert.ok(htmlName, 'Wormholes beta html file should exist');
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const order = ['scripts/vision-board.js', 'scripts/connections-map.js', 'scripts/wormholes-app.js'].map(src => html.indexOf(src));
assert.ok(order[0] !== -1 && order[1] !== -1 && order[2] !== -1, 'expected script tags should be present');
assert.ok(order[0] < order[1] && order[1] < order[2], 'connections-map.js should load after vision-board.js and before wormholes-app.js');

const appScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app.js'), 'utf8');
assert.ok(!/function\s+renderConnectionsMap\s*\(/.test(appScript), 'renderConnectionsMap should be cordoned off from wormholes-app.js');
assert.ok(/openConnectionModal/.test(script), 'connections map should still wire edge clicks to the connection modal');

console.log('connections-map-module.unit.js passed');

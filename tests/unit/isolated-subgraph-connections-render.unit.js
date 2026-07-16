const fs=require('fs'),vm=require('vm');
function el(id){return {id,dataset:{},style:{},clientWidth:1000,clientHeight:700,value:'',textContent:'',innerHTML:'',classList:{add(){},remove(){},contains(){return false}},addEventListener(){},querySelectorAll(){return []},querySelector(){return null}}}
const wrap=el('connectionsMapWrap'), stage=el('connectionsMapStage'), slider=el('connectionsZoomSlider'), value=el('connectionsZoomValue');
const entries=[
  {id:'g',title:'Main Group',group:true,members:['a','c'],connections:[],bridges:[]},
  {id:'a',title:'Alpha',what:{val:'Character — Hero'},connections:['b'],bridges:[]},
  {id:'c',title:'Unlinked Sibling',what:{val:'Technology — Tool'},connections:[],bridges:[]},
  {id:'b',title:'Beta',what:{val:'Place — City'},connections:['a'],bridges:[]},
  {id:'d',title:'Unlinked Standalone',what:{val:'Society — Guild'},connections:[],bridges:[]}
];
const group=entries[0];
const ctx={console,Math,Map,Set,Array,Object,String,Number,Date,JSON,Promise,requestAnimationFrame(fn){fn()},
 connectionsMapZoom:1,connectionsMapAutoFitOnNextRender:false,connectionsMapPanX:0,connectionsMapPanY:0,connectionsMapDragging:false,connectionsMapDragStart:null,
 currentUniverseId:'u1',selectedMapNodeId:'a',connectionsMapIsolatedSubgraph:true,archiveEntries:entries,universes:[{id:'u1',title:'U1',bridges:[]}],connectionsMapFilters:{},
 document:{getElementById(id){return {connectionsMapWrap:wrap,connectionsMapStage:stage,connectionsZoomSlider:slider,connectionsZoomValue:value}[id]||null},querySelectorAll(){return []},querySelector(){return null}},window:{},
 updateDestructiveClearButtons(){},renderConnectionsMapStatus(){},isSelectableConnectionsMapNodeId(){return true},getCurrentUniverse(){return ctx.universes[0]},topLevelArchiveEntries(){return [group,entries[3],entries[4]]},getUniverseTitle(){return 'U1'},readArchiveForUniverse(){return entries},archiveForUniverseLinkCheck(){return entries},groupChildIds(entry){return entry?.id==='g'?['a','c']:[]},isGroupEntry(entry){return !!entry?.group},getGroupForEntryId(id){return ['a','c'].includes(id)?group:null},getCreationTitleFromUniverse(u,id){return entries.find(e=>e.id===id)?.title||''},getEntry(id){return entries.find(e=>e.id===id)||null},normalizeBridges(v){return v||[]},normalizeUniverseBridges(v){return v?.bridges||[]},bridgeNoteKeyForNodes(a,b){return JSON.stringify([a,b])},getBridgeNote(){return ''},visibleEntryTitleForUniverseEntry(u,id){return entries.find(e=>e.id===id)?.title||''},
 approximateTextWidth(t,f){return String(t).length*f*.55},wrapTextToLines(t,w,f){return [String(t)]},escapeHtml(v){return String(v)},truncatePreview(v){return String(v)},truncateSvgText(v){return String(v)},clippedLineBetweenShapes(a,b){return {ax:a.x+a.w/2,ay:a.y+a.h/2,bx:b.x+b.w/2,by:b.y+b.h/2}},notePointAvoidingRects(ax,ay,bx,by){return {mx:(ax+bx)/2,my:(ay+by)/2}},edgeEndpointDots(){return ''},connectionKey(a,b){return [a,b].sort().join('::')},getConnectionNote(){return ''},
 literatureCountForUniverseTag(){return 0},literatureCountForEntryTag(){return 0},visionCountForUniverseTag(){return 0},visionCountForEntryTag(){return 0},rectangleBadgeStackSvg(){return ''},mapUniversePaletteStyle(){return ''},mapFilterClass(){return ''},mapFilterControlsHtml(){return ''},bindConnectionsMapViewport(){},bindMapFilterControls(){},improveSvgMapAccessibility(){},refreshOpenMapListView(){},protectAllControls(){},bindVisionBadgeClickHandlers(){},isExternalConnectionsMapNodeId(){return false},isCurrentUniverseConnectionsMapNodeId(id){return id==='universe:u1'},openBridgeModal(){},openUniverseBridgeModal(){},clearMapSelection(){},openConnectionModal(){},openBridgeNoteModal(){},openLiteratureLinksModal(){},toggleUniverseBridgeToExternalNode(){},toggleEntryBridgeToExternalNode(){},toggleMapConnection(){},updateSvgMapBadgeScale(){},updateMapReadabilityState(){},mapPanForZoomAroundViewportCenter(){return {panX:0,panY:0}},
};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').resolve(__dirname, '..', '..', 'scripts', 'connections-map.js'),'utf8'),ctx);
ctx.renderConnectionsMap();

const assert=require('assert');
assert.ok(wrap.innerHTML.includes('data-id="a"'),'Selected creation should remain');
assert.ok(wrap.innerHTML.includes('data-id="b"'),'Directly connected creation should remain');
assert.ok(wrap.innerHTML.includes('data-id="g"'),'Containing group shell should remain as context');
assert.ok(wrap.innerHTML.includes('data-id="universe:u1"'),'Current universe context should remain');
assert.ok(!wrap.innerHTML.includes('data-id="c"'),'Unlinked sibling should disappear');
assert.ok(!wrap.innerHTML.includes('data-id="d"'),'Unlinked standalone creation should disappear');
assert.ok(wrap.innerHTML.includes('connections-orbit-guides'),'Orbit graphics should remain while isolated');
assert.ok(wrap.innerHTML.includes('<ellipse'),'At least one orbit ellipse should remain while isolated');
assert.ok(!wrap.innerHTML.includes('Isolated Subgraph'),'Isolation should be communicated by buttons only');
assert.ok(wrap.innerHTML.includes('Back to item'));
console.log('isolated-subgraph-connections-render.unit.js passed');

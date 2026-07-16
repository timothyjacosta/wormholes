const fs=require('fs'),vm=require('vm');
function el(id){return {id,dataset:{},style:{},clientWidth:1200,clientHeight:800,value:'',textContent:'',innerHTML:'',classList:{add(){},remove(){},contains(){return false}},isConnected:true,addEventListener(){},querySelectorAll(){return []},querySelector(){return null}}}
const wrap=el('wormholesMapWrap'), stage=el('wormholesMapStage'), slider=el('wormholesZoomSlider'), value=el('wormholesZoomValue');
const data={
 u1:[{id:'a',title:'Alpha',what:{val:'Character — Hero'},connections:[],bridges:[{universeId:'u2',creationId:'b'}]}],
 u2:[{id:'b',title:'Beta',what:{val:'Place — City'},connections:[],bridges:[]}],
 u3:[{id:'c',title:'Gamma',what:{val:'Technology — Tool'},connections:[],bridges:[]}]
};
const universes=[{id:'u1',title:'U1',bridges:[]},{id:'u2',title:'U2',bridges:[]},{id:'u3',title:'U3',bridges:[]}];
let bridgeTargets=new Set(['u2:b']);
const ctx={console,Math,Map,Set,Array,Object,String,Number,Date,JSON,Promise,requestAnimationFrame(fn){fn()},
 wormholesMapZoom:1,wormholesMapAutoFitOnNextRender:false,wormholesMapPanX:0,wormholesMapPanY:0,wormholesMapDragging:false,wormholesMapDragStart:null,wormholesMapFilters:{bridges:true,connections:true,literature:true,images:true,relationships:true},universes,currentUniverseId:'u1',selectedMapNodeId:null,selectedWormholeCreation:{universeId:'u1',creationId:'a'},wormholeFocusUniverseId:'u1',wormholesMapIsolatedSubgraph:true,bridgeNotes:{},connectionNotes:{},
 document:{getElementById(id){return {wormholesMapWrap:wrap,wormholesMapStage:stage,wormholesZoomSlider:slider,wormholesZoomValue:value}[id]||null},querySelectorAll(){return []},querySelector(){return null}},window:{},
 updateDestructiveClearButtons(){},renderWormholesMapStatus(){},refreshOpenMapListView(){},readArchiveForUniverse(u){return data[u]||[]},mapArchiveEntries(e){return e},topLevelArchiveEntries(e){return e},isGroupEntry(){return false},groupChildIds(){return []},getGroupForEntryId(){return null},mapEntryForIdInEntries(id,e){return e.find(x=>x.id===id)||null},
 fitTextToCircle(title){return {r:70,rx:90,ry:40,lines:[title],fontSize:14,lineHeight:18}},fitCreationCircle(title,sub){return {r:50,rx:70,ry:30,titleLines:[title],subtitleLines:[sub],titleFontSize:12,subtitleFontSize:9,titleLineHeight:14,subtitleLineHeight:11,subtitleGap:4,totalHeight:30}},fitWormholeGroupCircle(){return {}},
 mapFilterClass(){return ''},mapFilterControlsHtml(){return ''},bindMapFilterControls(){},improveSvgMapAccessibility(){},mapUniversePaletteStyle(){return ''},escapeHtml(v){return String(v)},normalizeBridges(v){return v||[]},normalizeUniverseBridges(u){return u?.bridges||[]},getUniverseTitle(u){return universes.find(x=>x.id===u)?.title||u},getCreationTitleFromUniverse(u,id){return data[u]?.find(x=>x.id===id)?.title||id},visibleEntryTitleForUniverseEntry(u,id){return data[u]?.find(x=>x.id===id)?.title||id},getArchiveEntryFromUniverse(u,id){return data[u]?.find(x=>x.id===id)||null},
 getCreationBridgeTargetsForCreation(){return bridgeTargets},getUniverseBridgeTargetsForCreation(){return new Set()},getCreationBridgeContextForUniverse(){return {externalTargets:new Set(),internalSources:new Set()}},getUniverseToCreationBridgeContextForFocus(){return {externalTargets:new Set(),internalTargets:new Set()}},getUniverseBridgeTargetsForFocus(){return new Set()},
 bridgeNoteKeyForNodes(a,b){return JSON.stringify([a,b])},getBridgeNote(){return ''},connectionKey(a,b){return [a,b].sort().join('::')},getConnectionNote(){return ''},truncatePreview(v){return String(v)},truncateSvgText(v){return String(v)},
 clippedLineBetweenShapes(a,b){return {ax:a.cx||a.x,ay:a.cy||a.y,bx:b.cx||b.x,by:b.cy||b.y}},edgeEndpointDots(){return ''},notePointAvoidingRects(ax,ay,bx,by){return {mx:(ax+bx)/2,my:(ay+by)/2}},
 capsuleRectSvg(){return '<rect class="wormhole-node-shape"></rect>'},orbitCapsuleRectSvg(cx,cy,rx,ry,cls){return `<rect class="${cls}"></rect>`},capsuleBadgeStackSvg(){return ''},wormholeNodeTextX(pos,p){return pos.cx-(pos.rx||pos.r)+p},
 bindWormholesMapViewport(){},bindVisionBadgeClickHandlers(){},protectAllControls(){},openLiteratureLinksModal(){},openBridgeNoteModal(){},clearWormholeFocus(){},handleWormholeCreationClick(){},handleWormholeUniverseClick(){},installSafeControl(){},swallowDownloadBehavior(){},updateSvgMapBadgeScale(){},updateMapReadabilityState(){},mapPanForZoomAroundViewportCenter(){return {panX:0,panY:0}},
 mapInspectorAllBridgeLedger(){return []},mapInspectorConnectionLedgerForArchive(){return []},mapInspectorConnectedEntityRowsForUniverse(){return []},mapInspectorBridgedEntityRowsForUniverse(){return []},mapInspectorEscape(v){return String(v)},mapInspectorEntityCountButtonHtml(){return ''},mapInspectorEntityPanelHtml(){return ''},mapInspectorLedgerListHtml(){return ''},mapInspectorEntityIndexHtml(){return ''},
};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').resolve(__dirname, '..', '..', 'scripts', 'bridges-map.js'),'utf8'),ctx);
ctx.renderWormholesMap();

const assert=require('assert');
assert.ok(!wrap.innerHTML.includes('Isolated Subgraph'));
assert.ok(wrap.innerHTML.includes('Back to item'));
assert.ok(wrap.innerHTML.match(/wormhole-universe-content isolated-subgraph-hidden[^>]*data-universe-id="u3"/), 'Unlinked universe content should disappear');
assert.ok(!wrap.innerHTML.match(/wormhole-universe-content isolated-subgraph-hidden[^>]*data-universe-id="u1"/), 'Selected universe should remain visible');
assert.ok(!wrap.innerHTML.match(/wormhole-universe-content isolated-subgraph-hidden[^>]*data-universe-id="u2"/), 'Linked universe should remain visible');
assert.ok(wrap.innerHTML.match(/<g class="wormhole-cluster[^"]*isolated-subgraph-hidden[^"]*" data-id="u3"/), 'An unrelated universe cluster, including its orbit graphics, should be hidden');
assert.ok(!wrap.innerHTML.match(/<g class="wormhole-cluster[^"]*isolated-subgraph-hidden[^"]*" data-id="u1"/), 'The selected universe orbit should remain visible');
assert.ok(!wrap.innerHTML.match(/<g class="wormhole-cluster[^"]*isolated-subgraph-hidden[^"]*" data-id="u2"/), 'A directly bridged universe orbit should remain visible');
assert.ok(wrap.innerHTML.includes('class="wormhole-system-halo"'), 'Visible universe orbit halo graphics should remain');

// Reproduce the reported case: the selected item has no bridge to another universe.
data.u1[0].bridges=[];
bridgeTargets=new Set();
ctx.renderWormholesMap();
assert.ok(!wrap.innerHTML.match(/<g class="wormhole-cluster[^"]*isolated-subgraph-hidden[^"]*" data-id="u1"/), 'The active universe orbit should remain visible without bridges');
assert.ok(wrap.innerHTML.match(/<g class="wormhole-cluster[^"]*isolated-subgraph-hidden[^"]*" data-id="u2"/), 'An unlinked second-universe orbit should disappear');
assert.ok(wrap.innerHTML.match(/<g class="wormhole-cluster[^"]*isolated-subgraph-hidden[^"]*" data-id="u3"/), 'Every other unlinked universe orbit should disappear');
console.log('isolated-subgraph-bridges-render.unit.js passed');

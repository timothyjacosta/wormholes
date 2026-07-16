const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const bridgesSource = fs.readFileSync(path.join(root, 'scripts', 'bridges.js'), 'utf8');
const bridgesMapSource = fs.readFileSync(path.join(root, 'scripts', 'bridges-map.js'), 'utf8');
const connectionsMapSource = fs.readFileSync(path.join(root, 'scripts', 'connections-map.js'), 'utf8');

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function makeClassList(initial = []){
  const values = new Set(initial);
  return {
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); }
  };
}

function makeElement(id, initialClasses = []){
  return {
    id,
    dataset:{},
    style:{},
    value:'',
    textContent:'',
    innerHTML:'',
    hidden:false,
    disabled:false,
    isConnected:true,
    clientWidth:1200,
    clientHeight:800,
    classList:makeClassList(initialClasses),
    listeners:{},
    addEventListener(type, fn){
      if(!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    getAttribute(name){ return this[name] || null; },
    focus(){ this.focused = true; },
    setPointerCapture(){},
    releasePointerCapture(){}
  };
}

function makeBridgeHarness(){
  const elements = new Map();
  const calls = [];
  const undoOffers = [];
  const archives = {
    u1:[
      {id:'a', title:'Alpha', what:{val:'Character — Hero'}, connections:[], bridges:[]},
      {id:'d', title:'Delta', what:{val:'Place — Port'}, connections:[], bridges:[]}
    ],
    u2:[
      {id:'g', title:'Remote Group', kind:'group', groupIds:['b', 'c'], what:{val:'Group'}, connections:[], bridges:[]},
      {id:'b', title:'Beta', what:{val:'Place — City'}, connections:[], bridges:[]},
      {id:'c', title:'Gamma', what:{val:'Technology — Tool'}, connections:[], bridges:[]}
    ],
    u3:[{id:'z', title:'Zeta', what:{val:'Society — Guild'}, connections:[], bridges:[]}]
  };

  function element(id){
    if(!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  }
  element('connectionsScreen').classList.add('active');
  element('wormholesModal').classList.add('open');
  element('bridgeModal').classList.add('open');

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
    setTimeout(fn){ if(typeof fn === 'function') fn(); return 1; },
    requestAnimationFrame(fn){ if(typeof fn === 'function') fn(); },
    document:{
      getElementById:element,
      querySelectorAll(){ return []; }
    },
    window:{},
    universes:[
      {id:'u1', title:'Universe One', summary:'', bridges:[]},
      {id:'u2', title:'Universe Two', summary:'', bridges:[]},
      {id:'u3', title:'Universe Three', summary:'', bridges:[]}
    ],
    currentUniverseId:'u1',
    archiveEntries:archives.u1,
    bridgeNotes:{},
    connectionNotes:{},
    activeConnectionKey:null,
    activeBridgeNoteKey:null,
    activeBridgeEntryId:null,
    activeBridgeUniverseId:null,
    expandedBridgePickerNodes:new Set(),
    stagedBridgeTargetKeys:new Set(),
    selectedWormholeCreation:null,
    wormholeFocusUniverseId:null,
    selectedMapNodeId:null,
    connectSourceId:null,
    wormholesMapIsolatedSubgraph:false,
    wormholesMapAutoFitOnNextRender:false,
    __saveArchiveResult:true,
    __saveUniversesResult:true,
    __saveBridgeNotesResult:true,
    __saveConnectionNotesResult:true,
    __connectionNotesByUniverse:{u1:{}},
    escapeHtml(value){ return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); },
    compactText(value){ return String(value || '').trim(); },
    truncatePreview(value){ return String(value || ''); },
    addUniqueId(list, id){ return Array.from(new Set([...(list || []), id])); },
    uniqueList(list){ return Array.from(new Set((list || []).filter(Boolean))); },
    parseConnectionsExternalNodeId(nodeId){
      if(String(nodeId).startsWith('universe:')) return {type:'universe', universeId:String(nodeId).slice(9)};
      if(String(nodeId).startsWith('external:')){
        const parts = String(nodeId).split(':');
        return {type:'creation', universeId:parts[1], creationId:parts.slice(2).join(':')};
      }
      return null;
    },
    linkBridgeTargetStillExists(bridge){
      if(!bridge?.universeId || !archives[bridge.universeId]) return false;
      if(!bridge.creationId) return context.universes.some(item => item.id === bridge.universeId);
      return archives[bridge.universeId].some(entry => entry.id === bridge.creationId);
    },
    archiveForUniverseLinkCheck(universeId){ return archives[universeId] || []; },
    entityExistsInUniverse(universeId, creationId){ return (archives[universeId] || []).some(entry => entry.id === creationId); },
    readArchiveForUniverse(universeId){ return archives[universeId] || []; },
    saveArchiveForUniverse(universeId, archive){
      calls.push(`save-archive:${universeId}`);
      if(!context.__saveArchiveResult) return false;
      archives[universeId] = archive;
      if(universeId === context.currentUniverseId) context.archiveEntries = archive;
      return true;
    },
    saveArchiveToStorage(){ calls.push('save-current-archive'); return context.__saveArchiveResult; },
    saveUniversesToStorage(){ calls.push('save-universes'); return context.__saveUniversesResult; },
    saveBridgeNotesToStorage(){ calls.push('save-bridge-notes'); return context.__saveBridgeNotesResult; },
    readConnectionNotesForUniverse(universeId){ return clone(context.__connectionNotesByUniverse[universeId] || {}); },
    saveConnectionNotesForUniverse(universeId, notes){
      calls.push(`save-connection-notes:${universeId}`);
      if(!context.__saveConnectionNotesResult) return false;
      context.__connectionNotesByUniverse[universeId] = clone(notes);
      return true;
    },
    getEntry(id){ return context.archiveEntries.find(entry => entry.id === id) || null; },
    topLevelArchiveEntries(entries){ return (entries || []).filter(entry => !['b', 'c'].includes(entry.id)); },
    isGroupEntry(entry){ return entry?.kind === 'group'; },
    groupChildIds(entry){ return Array.isArray(entry?.groupIds) ? entry.groupIds : []; },
    setModalErrorText(id, text){ element(id).textContent = text; },
    setDestructiveButtonVisibility(id, visible){ element(id).hidden = !visible; },
    duplicateUniverseTitleExists(){ return false; },
    makeId(){ return 'u4'; },
    stableUniverseFolderName(universe){ return universe.title; },
    cleanupAllStaleLinks(){ calls.push('cleanup-links'); },
    cleanupBridgeNotes(){ calls.push('cleanup-bridge-notes'); },
    renderArchive(){ calls.push('render-archive'); },
    renderConnectionsMap(){ calls.push('render-connections-map'); },
    renderWormholesMap(){ calls.push('render-wormholes-map'); },
    showSavedToast(message){ calls.push(`toast:${message}`); },
    protectAllControls(){},
    currentUniverseHasClearableConnections(){ return false; },
    closeClearMapConfirm(){ calls.push('close-clear-confirm'); },
    closeGroupConnectionModal(){},
    makeConnectionKeyFromIds(a, b){ return [a, b].sort().join('::'); }
  };
  context.globalThis = context;
  context.window = context;
  context.WormholesUndo = {
    captureState(){ calls.push('capture-undo'); return {snapshot:true}; },
    offer(payload){ undoOffers.push(payload); calls.push(`undo:${payload.message}`); return true; }
  };

  vm.createContext(context);
  vm.runInContext(bridgesSource, context, {filename:'scripts/bridges.js'});
  return {context, archives, calls, undoOffers, element};
}

function bridgeKeyFor(context, source, target){
  return context.bridgeNoteKeyForNodes(source, target);
}

// Every bridge direction should add, find, remove, clean its note, and preserve the one-sided storage model.
{
  const {context, archives, calls, undoOffers} = makeBridgeHarness();

  assert.strictEqual(context.toggleUniverseBridge('u1', 'u2'), true);
  assert.deepStrictEqual(clone(context.universes[0].bridges), [{universeId:'u2', creationId:null}]);
  const universeNote = bridgeKeyFor(context, {type:'universe', universeId:'u1'}, {type:'universe', universeId:'u2'});
  context.bridgeNotes[universeNote] = 'Universe note';
  assert.strictEqual(context.toggleUniverseBridge('u2', 'u1'), true, 'reverse-side toggle should find the stored universe bridge');
  assert.deepStrictEqual(clone(context.universes[0].bridges), []);
  assert.strictEqual(context.bridgeNotes[universeNote], undefined, 'removing a universe bridge should remove its note immediately');

  assert.strictEqual(context.toggleUniverseBridge('u1', 'u2', 'b'), true);
  const universeCreationNote = bridgeKeyFor(context, {type:'universe', universeId:'u1'}, {type:'creation', universeId:'u2', creationId:'b'});
  context.bridgeNotes[universeCreationNote] = 'Universe to creation note';
  const universeCreationRecord = context.findUniverseToCreationBridgeBetween('u1', 'u2', 'b');
  assert.ok(universeCreationRecord);
  assert.strictEqual(context.removeUniverseToCreationBridge(universeCreationRecord), true);
  assert.strictEqual(context.bridgeNotes[universeCreationNote], undefined);

  assert.strictEqual(context.toggleWormholeBridge('u1', 'a', 'u2', 'b'), true);
  assert.deepStrictEqual(clone(archives.u1.find(entry => entry.id === 'a').bridges), [{universeId:'u2', creationId:'b'}]);
  const creationNote = bridgeKeyFor(context, {type:'creation', universeId:'u1', creationId:'a'}, {type:'creation', universeId:'u2', creationId:'b'});
  context.bridgeNotes[creationNote] = 'Creation note';
  assert.strictEqual(context.toggleWormholeBridge('u2', 'b', 'u1', 'a'), true, 'reverse-side creation toggle should remove the original record');
  assert.deepStrictEqual(clone(archives.u1.find(entry => entry.id === 'a').bridges), []);
  assert.strictEqual(context.bridgeNotes[creationNote], undefined);

  assert.strictEqual(context.toggleWormholeBridge('u1', 'a', 'u2', null), true);
  const creationUniverseNote = bridgeKeyFor(context, {type:'creation', universeId:'u1', creationId:'a'}, {type:'universe', universeId:'u2'});
  context.bridgeNotes[creationUniverseNote] = 'Creation to universe note';
  const creationUniverseRecord = context.findBridgeBetweenCreationAndUniverse('u1', 'a', 'u2');
  assert.ok(creationUniverseRecord);
  assert.strictEqual(context.removeBridgeBetweenCreationAndUniverse(creationUniverseRecord), true);
  assert.strictEqual(context.bridgeNotes[creationUniverseNote], undefined);

  assert.ok(calls.filter(call => call === 'save-bridge-notes').length >= 4, 'each successful noted removal should persist note cleanup');
  assert.ok(undoOffers.length >= 4, 'destructive bridge removals should remain undoable');
}

// A bridge to a grouped child should be removable by selecting the group-level external map node.
{
  const {context, archives} = makeBridgeHarness();
  archives.u1.find(entry => entry.id === 'a').bridges = [{universeId:'u2', creationId:'b'}];
  const noteKey = bridgeKeyFor(context, {type:'creation', universeId:'u1', creationId:'a'}, {type:'creation', universeId:'u2', creationId:'b'});
  context.bridgeNotes[noteKey] = 'Grouped child bridge';
  assert.strictEqual(context.removeMapBridgeToExternalNode('a', 'external:u2:g'), true);
  assert.deepStrictEqual(clone(archives.u1.find(entry => entry.id === 'a').bridges), []);
  assert.strictEqual(context.bridgeNotes[noteKey], undefined);
  assert.strictEqual(context.selectedMapNodeId, 'a');
}

// Failed writes must not leave bridge edits, note deletions, closed dialogs, or success feedback in memory.
{
  const {context, archives, calls, undoOffers, element} = makeBridgeHarness();
  context.__saveUniversesResult = false;
  assert.strictEqual(context.toggleUniverseBridge('u1', 'u2'), false);
  assert.deepStrictEqual(clone(context.universes[0].bridges), []);
  assert.ok(!calls.includes('render-wormholes-map'));
  assert.deepStrictEqual(undoOffers, []);

  context.__saveUniversesResult = true;
  context.__saveArchiveResult = false;
  assert.strictEqual(context.toggleWormholeBridge('u1', 'a', 'u2', 'b'), false);
  assert.deepStrictEqual(clone(archives.u1.find(entry => entry.id === 'a').bridges), []);

  archives.u1.find(entry => entry.id === 'a').bridges = [{universeId:'u2', creationId:'b'}];
  context.activeBridgeEntryId = 'a';
  context.stagedBridgeTargetKeys = new Set();
  const noteKey = bridgeKeyFor(context, {type:'creation', universeId:'u1', creationId:'a'}, {type:'creation', universeId:'u2', creationId:'b'});
  context.bridgeNotes[noteKey] = 'Keep on failed picker save';
  element('bridgeModal').classList.add('open');
  const callCount = calls.length;
  assert.strictEqual(context.saveBridgePickerModal(), false);
  assert.deepStrictEqual(clone(archives.u1.find(entry => entry.id === 'a').bridges), [{universeId:'u2', creationId:'b'}]);
  assert.strictEqual(context.bridgeNotes[noteKey], 'Keep on failed picker save');
  assert.ok(element('bridgeModal').classList.contains('open'));
  assert.ok(!calls.slice(callCount).some(call => call.startsWith('toast:') || call.startsWith('undo:')));
}

// Manage Bridges also edits local map connections; those changes must be symmetric and failure-atomic.
{
  const {context, archives, undoOffers} = makeBridgeHarness();
  const alpha = archives.u1.find(entry => entry.id === 'a');
  const delta = archives.u1.find(entry => entry.id === 'd');
  alpha.connections = ['d'];
  delta.connections = ['a'];
  context.__connectionNotesByUniverse.u1 = {'a::d':'Internal map note'};
  context.connectionNotes = {'a::d':'Internal map note'};

  assert.strictEqual(context.toggleWormholeInternalConnection('u1', 'a', 'd'), true);
  assert.deepStrictEqual(clone(alpha.connections), []);
  assert.deepStrictEqual(clone(delta.connections), []);
  assert.deepStrictEqual(context.__connectionNotesByUniverse.u1, {});
  assert.strictEqual(undoOffers.at(-1)?.message, 'Connection removed');

  alpha.connections = ['d'];
  delta.connections = ['a'];
  context.__connectionNotesByUniverse.u1 = {'a::d':'Keep after failed save'};
  context.connectionNotes = {'a::d':'Keep after failed save'};
  context.__saveArchiveResult = false;
  assert.strictEqual(context.toggleWormholeInternalConnection('u1', 'a', 'd'), false);
  assert.deepStrictEqual(clone(alpha.connections), ['d']);
  assert.deepStrictEqual(clone(delta.connections), ['a']);
  assert.deepStrictEqual(context.__connectionNotesByUniverse.u1, {'a::d':'Keep after failed save'});
}

// Clearing bridges should cover every universe/archive, notes, map focus, persistence store, and Undo handoff.
{
  const {context, archives, calls, undoOffers} = makeBridgeHarness();
  context.universes[0].bridges = [{universeId:'u2', creationId:null}];
  context.universes[2].bridges = [{universeId:'u1', creationId:'a'}];
  archives.u1[0].bridges = [{universeId:'u2', creationId:'b'}];
  archives.u2[1].bridges = [{universeId:'u3', creationId:'z'}];
  context.bridgeNotes = {one:'note', two:'note'};
  context.selectedWormholeCreation = {universeId:'u1', creationId:'a'};
  context.wormholeFocusUniverseId = 'u1';
  context.selectedMapNodeId = 'a';

  context.clearAllBridgesOnly();
  assert.ok(context.universes.every(universe => universe.bridges.length === 0));
  assert.ok(Object.values(archives).flat().every(entry => entry.bridges.length === 0));
  assert.deepStrictEqual(clone(context.bridgeNotes), {});
  assert.strictEqual(context.selectedWormholeCreation, null);
  assert.strictEqual(context.wormholeFocusUniverseId, null);
  assert.strictEqual(context.selectedMapNodeId, null);
  assert.ok(calls.includes('save-universes'));
  assert.ok(calls.includes('save-current-archive'));
  assert.ok(calls.includes('save-archive:u2'));
  assert.ok(calls.includes('save-archive:u3'));
  assert.ok(calls.includes('save-bridge-notes'));
  assert.strictEqual(undoOffers.at(-1)?.message, 'Bridges cleared');
}

function createMapBase(){
  const wrapById = new Map();
  function element(id){
    if(!wrapById.has(id)) wrapById.set(id, makeElement(id));
    return wrapById.get(id);
  }
  return {wrapById, element};
}

function runWormholesMapRegression(){
  const {element} = createMapBase();
  const wrap = element('wormholesMapWrap');
  const stage = element('wormholesMapStage');
  const slider = element('wormholesZoomSlider');
  const zoomValue = element('wormholesZoomValue');
  const archives = {
    u1:[
      {id:'a', title:'Alpha', what:{val:'Character — Hero'}, connections:['d'], bridges:[{universeId:'u2', creationId:'b'}]},
      {id:'d', title:'Delta', what:{val:'Place — Port'}, connections:['a'], bridges:[]}
    ],
    u2:[{id:'b', title:'Beta', what:{val:'Place — City'}, connections:[], bridges:[]}],
    u3:[{id:'z', title:'Zeta', what:{val:'Society — Guild'}, connections:[], bridges:[]}]
  };
  const universes = [
    {id:'u1', title:'Universe One', bridges:[]},
    {id:'u2', title:'Universe Two', bridges:[{universeId:'u3', creationId:null}]},
    {id:'u3', title:'Universe Three', bridges:[]}
  ];
  const context = {
    console, Math, Map, Set, Array, Object, String, Number, Date, JSON, Promise,
    requestAnimationFrame(fn){ fn(); },
    wormholesMapZoom:1,
    wormholesMapAutoFitOnNextRender:false,
    wormholesMapPanX:0,
    wormholesMapPanY:0,
    wormholesMapDragging:false,
    wormholesMapDragStart:null,
    wormholesMapFilters:{bridges:true, connections:true, literature:true, images:true, relationships:true},
    universes,
    currentUniverseId:'u1',
    selectedMapNodeId:null,
    selectedWormholeCreation:null,
    wormholeFocusUniverseId:null,
    wormholesMapIsolatedSubgraph:false,
    bridgeNotes:{},
    connectionNotes:{'a::d':'Local note'},
    document:{
      getElementById(id){ return {wormholesMapWrap:wrap, wormholesMapStage:stage, wormholesZoomSlider:slider, wormholesZoomValue:zoomValue}[id] || element(id); },
      querySelector(){ return null; },
      querySelectorAll(){ return []; }
    },
    window:{},
    updateDestructiveClearButtons(){},
    refreshOpenMapListView(){},
    readArchiveForUniverse(id){ return archives[id] || []; },
    mapArchiveEntries(entries){ return entries; },
    topLevelArchiveEntries(entries){ return entries; },
    isGroupEntry(){ return false; },
    groupChildIds(){ return []; },
    getGroupForEntryId(){ return null; },
    mapEntryForIdInEntries(id, entries){ return entries.find(entry => entry.id === id) || null; },
    fitTextToCircle(title){ return {r:70, rx:90, ry:40, lines:[title], fontSize:14, lineHeight:18}; },
    fitCreationCircle(title, subtitle){ return {r:50, rx:70, ry:30, titleLines:[title], subtitleLines:[subtitle], titleFontSize:12, subtitleFontSize:9, titleLineHeight:14, subtitleLineHeight:11, subtitleGap:4, totalHeight:30}; },
    fitWormholeGroupCircle(){ return {}; },
    mapInspectorAllBridgeLedger(){ return []; },
    mapInspectorConnectionLedgerForArchive(){ return []; },
    mapInspectorConnectedEntityRowsForUniverse(){ return []; },
    mapInspectorBridgedEntityRowsForUniverse(){ return []; },
    mapInspectorEscape(value){ return String(value); },
    mapInspectorEntityCountButtonHtml(){ return ''; },
    mapInspectorEntityPanelHtml(){ return ''; },
    mapInspectorLedgerListHtml(){ return ''; },
    mapInspectorEntityIndexHtml(){ return ''; },
    mapUniversePalette(){ return {stroke:'#000', fill:'#fff'}; },
    mapUniversePaletteStyle(){ return ''; },
    mapFilterClass(){ return ''; },
    mapFilterControlsHtml(){ return ''; },
    bindMapFilterControls(){},
    improveSvgMapAccessibility(){},
    truncateSvgText(value){ return String(value); },
    truncatePreview(value){ return String(value); },
    escapeHtml(value){ return String(value); },
    displayValue(){ return '—'; },
    normalizeBridges(value){ return Array.isArray(value) ? value : []; },
    normalizeUniverseBridges(universe){ return Array.isArray(universe?.bridges) ? universe.bridges : []; },
    findUniverseBridgeBetween(a, b){
      for(const universe of universes){
        const bridge = (universe.bridges || []).find(item => !item.creationId && ((universe.id === a && item.universeId === b) || (universe.id === b && item.universeId === a)));
        if(bridge) return {sourceUniverseId:universe.id, targetUniverseId:bridge.universeId};
      }
      return null;
    },
    bridgeKey(a, b){ return `${a}::${b || ''}`; },
    connectionKey(a, b){ return [a, b].sort().join('::'); },
    getConnectionNote(key){ return context.connectionNotes[key] || ''; },
    getUniverseTitle(id){ return universes.find(item => item.id === id)?.title || id; },
    getUniverseSummary(){ return ''; },
    getEntry(id){ return archives.u1.find(entry => entry.id === id) || null; },
    getCreationTitleFromUniverse(universeId, creationId){ return archives[universeId].find(entry => entry.id === creationId)?.title || creationId; },
    getArchiveEntryFromUniverse(universeId, creationId){ return archives[universeId].find(entry => entry.id === creationId) || null; },
    visibleEntryTitleForUniverseEntry(universeId, creationId){ return archives[universeId].find(entry => entry.id === creationId)?.title || creationId; },
    getCreationBridgeTargetsForCreation(universeId, creationId){
      const targets = new Set();
      const entry = archives[universeId].find(item => item.id === creationId);
      (entry?.bridges || []).filter(item => item.creationId).forEach(item => targets.add(`${item.universeId}:${item.creationId}`));
      return targets;
    },
    getUniverseBridgeTargetsForCreation(universeId, creationId){
      const targets = new Set();
      const entry = archives[universeId].find(item => item.id === creationId);
      (entry?.bridges || []).filter(item => !item.creationId).forEach(item => targets.add(item.universeId));
      return targets;
    },
    getCreationBridgeContextForUniverse(){ return {externalTargets:new Set(), internalSources:new Set()}; },
    getUniverseToCreationBridgeContextForFocus(){ return {externalTargets:new Set(), internalTargets:new Set()}; },
    getUniverseBridgeTargetsForFocus(){ return new Set(); },
    bridgeNoteKeyForNodes(a, b){ return [JSON.stringify(a), JSON.stringify(b)].sort().join('||'); },
    getBridgeNote(){ return ''; },
    clippedLineBetweenShapes(a, b){ return {ax:a.cx || a.x, ay:a.cy || a.y, bx:b.cx || b.x, by:b.cy || b.y}; },
    edgeEndpointDots(){ return ''; },
    notePointAvoidingRects(ax, ay, bx, by){ return {mx:(ax + bx) / 2, my:(ay + by) / 2}; },
    capsuleRectSvg(cx, cy, rx, ry, className){ return `<rect class="${className}" x="${cx-rx}" y="${cy-ry}" width="${rx*2}" height="${ry*2}"></rect>`; },
    orbitCapsuleRectSvg(cx, cy, rx, ry, className){ return `<rect class="${className}" x="${cx-rx}" y="${cy-ry}" width="${rx*2}" height="${ry*2}"></rect>`; },
    capsuleBadgeStackSvg(){ return ''; },
    wormholeNodeTextX(position, padding){ return position.cx - (position.rx || position.r) + padding; },
    bindWormholesMapViewport(){},
    bindVisionBadgeClickHandlers(){},
    protectAllControls(){},
    openLiteratureLinksModal(){},
    openBridgeNoteModal(){},
    clearWormholeFocus(){},
    handleWormholeCreationClick(){},
    handleWormholeUniverseClick(){},
    installSafeControl(){},
    swallowDownloadBehavior(){},
    updateSvgMapBadgeScale(){},
    updateMapReadabilityState(){},
    mapPanForZoomAroundViewportCenter(){ return {panX:0, panY:0}; }
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(bridgesMapSource, context, {filename:'scripts/bridges-map.js'});
  context.renderWormholesMap();

  assert.ok(wrap.innerHTML.includes('data-universe-id="u1" data-creation-id="a"'));
  assert.ok(wrap.innerHTML.includes('data-universe-id="u2" data-creation-id="b"'));
  assert.ok(wrap.innerHTML.includes('data-id="u3"'));
  assert.ok(wrap.innerHTML.includes('wormhole-internal-line'), 'Manage Bridges should draw local connections');
  assert.ok(((wrap.innerHTML.match(/wormhole-bridge-line/g) || []).length + (wrap.innerHTML.match(/wormhole-universe-bridge-line/g) || []).length) >= 2, 'Manage Bridges should draw creation and universe bridges');
  assert.ok(!wrap.innerHTML.includes('No universes yet'));
}

function runConnectionsMapRegression(){
  const {element} = createMapBase();
  const wrap = element('connectionsMapWrap');
  const stage = element('connectionsMapStage');
  const slider = element('connectionsZoomSlider');
  const zoomValue = element('connectionsZoomValue');
  const current = [
    {id:'a', title:'Alpha', what:{val:'Character — Hero'}, connections:['d'], bridges:[{universeId:'u2', creationId:'b'}]},
    {id:'d', title:'Delta', what:{val:'Place — Port'}, connections:['a'], bridges:[]}
  ];
  const remote = [{id:'b', title:'Beta', what:{val:'Place — City'}, connections:[], bridges:[]}];
  const universes = [{id:'u1', title:'Universe One', bridges:[]}, {id:'u2', title:'Universe Two', bridges:[]}];
  const context = {
    console, Math, Map, Set, Array, Object, String, Number, Date, JSON, Promise,
    requestAnimationFrame(fn){ fn(); },
    connectionsMapZoom:1,
    connectionsMapAutoFitOnNextRender:false,
    connectionsMapPanX:0,
    connectionsMapPanY:0,
    connectionsMapDragging:false,
    connectionsMapDragStart:null,
    currentUniverseId:'u1',
    selectedMapNodeId:'a',
    connectionsMapIsolatedSubgraph:false,
    archiveEntries:current,
    universes,
    connectionsMapFilters:{bridges:true, connections:true, literature:true, images:true, relationships:true},
    document:{
      getElementById(id){ return {connectionsMapWrap:wrap, connectionsMapStage:stage, connectionsZoomSlider:slider, connectionsZoomValue:zoomValue}[id] || element(id); },
      querySelector(){ return null; },
      querySelectorAll(){ return []; }
    },
    window:{},
    updateDestructiveClearButtons(){},
    renderConnectionsMapStatus(){},
    isSelectableConnectionsMapNodeId(){ return true; },
    getCurrentUniverse(){ return universes[0]; },
    topLevelArchiveEntries(entries){ return entries; },
    getUniverseTitle(id){ return universes.find(item => item.id === id)?.title || id; },
    readArchiveForUniverse(id){ return id === 'u1' ? current : remote; },
    archiveForUniverseLinkCheck(id){ return id === 'u1' ? current : remote; },
    groupChildIds(){ return []; },
    isGroupEntry(){ return false; },
    getGroupForEntryId(){ return null; },
    getCreationTitleFromUniverse(id, creationId){ return (id === 'u1' ? current : remote).find(entry => entry.id === creationId)?.title || creationId; },
    getEntry(id){ return current.find(entry => entry.id === id) || null; },
    normalizeBridges(value){ return Array.isArray(value) ? value : []; },
    normalizeUniverseBridges(universe){ return Array.isArray(universe?.bridges) ? universe.bridges : []; },
    bridgeNoteKeyForNodes(a, b){ return [JSON.stringify(a), JSON.stringify(b)].sort().join('||'); },
    getBridgeNote(){ return ''; },
    visibleEntryTitleForUniverseEntry(universeId, creationId){ return (universeId === 'u1' ? current : remote).find(entry => entry.id === creationId)?.title || creationId; },
    approximateTextWidth(text, fontSize){ return String(text).length * fontSize * 0.55; },
    wrapTextToLines(text){ return [String(text)]; },
    escapeHtml(value){ return String(value); },
    truncatePreview(value){ return String(value); },
    truncateSvgText(value){ return String(value); },
    clippedLineBetweenShapes(a, b){ return {ax:a.x + a.w/2, ay:a.y + a.h/2, bx:b.x + b.w/2, by:b.y + b.h/2}; },
    notePointAvoidingRects(ax, ay, bx, by){ return {mx:(ax + bx)/2, my:(ay + by)/2}; },
    edgeEndpointDots(){ return ''; },
    connectionKey(a, b){ return [a, b].sort().join('::'); },
    getConnectionNote(){ return ''; },
    literatureCountForUniverseTag(){ return 0; },
    literatureCountForEntryTag(){ return 0; },
    visionCountForUniverseTag(){ return 0; },
    visionCountForEntryTag(){ return 0; },
    rectangleBadgeStackSvg(){ return ''; },
    mapUniversePaletteStyle(){ return ''; },
    mapFilterClass(){ return ''; },
    mapFilterControlsHtml(){ return ''; },
    bindConnectionsMapViewport(){},
    bindMapFilterControls(){},
    improveSvgMapAccessibility(){},
    refreshOpenMapListView(){},
    protectAllControls(){},
    bindVisionBadgeClickHandlers(){},
    isExternalConnectionsMapNodeId(id){ return String(id).startsWith('external:'); },
    isCurrentUniverseConnectionsMapNodeId(id){ return id === 'universe:u1'; },
    openBridgeModal(){},
    openUniverseBridgeModal(){},
    clearMapSelection(){},
    openConnectionModal(){},
    openBridgeNoteModal(){},
    openLiteratureLinksModal(){},
    toggleUniverseBridgeToExternalNode(){},
    toggleEntryBridgeToExternalNode(){},
    toggleMapConnection(){},
    updateSvgMapBadgeScale(){},
    updateMapReadabilityState(){},
    mapPanForZoomAroundViewportCenter(){ return {panX:0, panY:0}; }
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(connectionsMapSource, context, {filename:'scripts/connections-map.js'});
  context.renderConnectionsMap();

  assert.ok(wrap.innerHTML.includes('data-id="a"'));
  assert.ok(wrap.innerHTML.includes('data-id="d"'));
  assert.ok(wrap.innerHTML.includes('data-id="external:u2:b"'), 'Connections should render the remote bridge target');
  assert.ok(wrap.innerHTML.includes('data-source="a" data-target="d"') || wrap.innerHTML.includes('data-source="d" data-target="a"'), 'Connections should render the local edge');
  assert.ok(wrap.innerHTML.includes('bridge-note-edge'), 'Connections should render a bridge edge through the note-capable edge path');
  assert.ok(wrap.innerHTML.includes('id="mapBridgeBtn"'), 'A selected local node should expose the Bridge action');
}

runWormholesMapRegression();
runConnectionsMapRegression();

console.log('bridge-map-regressions.unit.js passed');

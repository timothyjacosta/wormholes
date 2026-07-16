const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeClassList(initial = []){
  const classes = new Set(initial);
  return {
    add(name){ classes.add(name); },
    remove(name){ classes.delete(name); },
    contains(name){ return classes.has(name); },
    toString(){ return Array.from(classes).join(' '); }
  };
}

function makeElement(id){
  return {
    id,
    dataset:{},
    style:{},
    textContent:'',
    innerHTML:'',
    value:'',
    hidden:false,
    disabled:false,
    classList:makeClassList(),
    listeners:{},
    addEventListener(type, fn){
      if(!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    },
    focus(){ this.__focused = true; },
    querySelectorAll(){ return []; },
    getAttribute(name){ return this[name] || null; }
  };
}

const elements = {
  bridgeModal: makeElement('bridgeModal'),
  bridgeModalTitle: makeElement('bridgeModalTitle'),
  bridgeModalSubtitle: makeElement('bridgeModalSubtitle'),
  bridgeUniverseList: makeElement('bridgeUniverseList'),
  bridgeNewUniverseModal: makeElement('bridgeNewUniverseModal'),
  bridgeNewUniverseInput: makeElement('bridgeNewUniverseInput'),
  bridgeNewUniverseError: makeElement('bridgeNewUniverseError'),
  connectionModal: makeElement('connectionModal'),
  connectionModalTitle: makeElement('connectionModalTitle'),
  connectionModalSubtitle: makeElement('connectionModalSubtitle'),
  connectionTextInput: makeElement('connectionTextInput'),
  connectionError: makeElement('connectionError'),
  deleteConnectionTextBtn: makeElement('deleteConnectionTextBtn'),
  connectionsScreen: makeElement('connectionsScreen'),
  wormholesModal: makeElement('wormholesModal')
};

const archiveByUniverse = {
  u1:[{id:'c1', title:'Alpha', bridges:[], connections:[]}, {id:'c2', title:'Beta', bridges:[], connections:[]}],
  u2:[{id:'r1', title:'Remote', bridges:[], connections:[]}]
};

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
  setTimeout(fn){ fn(); return 1; },
  requestAnimationFrame(fn){ fn(); },
  document:{
    getElementById(id){ return elements[id] || null; }
  },
  window:{},
  universes:[
    {id:'u1', title:'Universe One', summary:'First', bridges:[]},
    {id:'u2', title:'Universe Two', summary:'Second', bridges:[]}
  ],
  currentUniverseId:'u1',
  archiveEntries:archiveByUniverse.u1,
  bridgeNotes:{},
  connectionNotes:{},
  activeConnectionKey:'old-connection',
  activeBridgeNoteKey:null,
  expandedBridgePickerNodes:new Set(),
  stagedBridgeTargetKeys:new Set(),
  activeBridgeEntryId:null,
  activeBridgeUniverseId:null,
  selectedWormholeCreation:{universeId:'u1', creationId:'c1'},
  wormholeFocusUniverseId:'u1',
  selectedMapNodeId:'c1',
  connectSourceId:null,
  escapeHtml(value){ return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); },
  compactText(value){ return String(value || '').trim(); },
  truncatePreview(value){ return String(value || ''); },
  addUniqueId(list, id){ return Array.from(new Set([...(list || []), id])); },
  uniqueList(list){ return Array.from(new Set(list || [])); },
  linkBridgeTargetStillExists(bridge){
    if(!bridge || !bridge.universeId) return false;
    if(!archiveByUniverse[bridge.universeId]) return false;
    if(bridge.creationId) return archiveByUniverse[bridge.universeId].some(entry => entry.id === bridge.creationId);
    return true;
  },
  archiveForUniverseLinkCheck(universeId){ return archiveByUniverse[universeId] || []; },
  entityExistsInUniverse(universeId, creationId){ return (archiveByUniverse[universeId] || []).some(entry => entry.id === creationId); },
  readArchiveForUniverse(universeId){ return archiveByUniverse[universeId] || []; },
  saveArchiveForUniverse(universeId, archive){ archiveByUniverse[universeId] = archive; context.__savedArchiveFor = universeId; return true; },
  saveArchiveToStorage(){ context.__savedCurrentArchive = true; return true; },
  saveUniversesToStorage(){ context.__savedUniverses = true; return true; },
  saveBridgeNotesToStorage(){ context.__savedBridgeNotes = true; return true; },
  readConnectionNotesForUniverse(){ return {}; },
  saveConnectionNotesForUniverse(){ context.__savedConnectionNotesForUniverse = true; },
  getEntry(id){ return archiveByUniverse.u1.find(entry => entry.id === id) || null; },
  topLevelArchiveEntries(entries){ return entries || []; },
  isGroupEntry(entry){ return !!entry && entry.kind === 'group'; },
  groupChildIds(entry){ return entry?.groupIds || []; },
  duplicateUniverseTitleExists(title){ return context.universes.some(universe => universe.title.toLowerCase() === String(title).toLowerCase()); },
  makeId(){ return 'u3'; },
  stableUniverseFolderName(universe){ return universe.title; },
  setModalErrorText(id, text){ elements[id].textContent = text; elements[id].classList.add('show'); },
  setDestructiveButtonVisibility(id, hasSomething){ const el = elements[id] || makeElement(id); el.hidden = !hasSomething; elements[id] = el; },
  cleanupAllStaleLinks(){ context.__cleaned = true; },
  cleanupBridgeNotes(){ context.__cleanedBridgeNotes = true; },
  renderArchive(){ context.__renderedArchive = true; },
  renderConnectionsMap(){ context.__renderedConnectionsMap = (context.__renderedConnectionsMap || 0) + 1; },
  renderWormholesMap(){ context.__renderedWormholesMap = (context.__renderedWormholesMap || 0) + 1; },
  showSavedToast(message){ context.__toast = message; },
  protectAllControls(){ context.__protected = true; },
  currentUniverseHasClearableConnections(){ return false; },
  closeClearMapConfirm(){ context.__closedClearConfirm = true; },
  closeGroupConnectionModal(){},
  makeConnectionKeyFromIds(a, b){ return [a, b].sort().join('::'); }
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'bridges.js');
const script = fs.readFileSync(scriptPath, 'utf8');
vm.runInContext(script, context, {filename:'scripts/bridges.js'});

assert.strictEqual(typeof context.openBridgeModal, 'function', 'openBridgeModal should remain globally callable');
assert.strictEqual(typeof context.openUniverseBridgeModal, 'function', 'openUniverseBridgeModal should remain globally callable');
assert.strictEqual(typeof context.openWormholesModal, 'function', 'openWormholesModal should remain globally callable');
assert.strictEqual(typeof context.toggleWormholeBridge, 'function', 'toggleWormholeBridge should remain globally callable');
assert.strictEqual(typeof context.normalizeBridges, 'function', 'normalizeBridges should remain globally callable');
assert.strictEqual(typeof context.clearAllBridgesOnly, 'function', 'clearAllBridgesOnly should remain globally callable');

assert.strictEqual(JSON.stringify(context.normalizeBridge('u2')), JSON.stringify({universeId:'u2', creationId:null}));
assert.strictEqual(JSON.stringify(context.normalizeBridge({universeId:'u2', creationId:'r1'})), JSON.stringify({universeId:'u2', creationId:'r1'}));
assert.strictEqual(context.bridgeKey('u2', 'r1'), 'u2::r1');
assert.strictEqual(JSON.stringify(context.normalizeBridges([{universeId:'u2', creationId:'r1'}, {universeId:'missing'}])), JSON.stringify([{universeId:'u2', creationId:'r1'}]));

context.openBridgeModal('c1');
assert.strictEqual(context.activeBridgeEntryId, 'c1', 'bridge modal should set active source creation');
assert.strictEqual(context.activeBridgeUniverseId, null, 'bridge modal should clear universe source');
assert.ok(elements.bridgeModal.classList.contains('open'), 'bridge modal should open');
assert.ok(elements.bridgeUniverseList.innerHTML.includes('Universe Two'), 'bridge picker should render target universes');

context.bridgeEntryToUniverse('u2', 'r1');
assert.ok(context.stagedBridgeTargetKeys.has('u2::r1'), 'bridge picker should stage target creation');
context.saveBridgePickerModal();
assert.strictEqual(JSON.stringify(archiveByUniverse.u1[0].bridges), JSON.stringify([{universeId:'u2', creationId:'r1'}]), 'saving bridge picker should persist staged bridges to source creation');
assert.ok(!elements.bridgeModal.classList.contains('open'), 'bridge modal should close after save');
assert.strictEqual(context.__savedCurrentArchive, true, 'saving bridge picker should save current archive');
assert.strictEqual(context.__toast, 'Bridges saved', 'archive bridge picker save should show its success toast');

context.toggleUniverseBridge('u1', 'u2');
assert.strictEqual(JSON.stringify(context.universes[0].bridges), JSON.stringify([{universeId:'u2', creationId:null}]), 'toggleUniverseBridge should add universe bridge');
context.toggleUniverseBridge('u1', 'u2');
assert.strictEqual(JSON.stringify(context.universes[0].bridges), JSON.stringify([]), 'toggleUniverseBridge should remove existing universe bridge');

context.selectedWormholeCreation = {universeId:'u1', creationId:'c1'};
context.wormholeFocusUniverseId = 'u1';
context.openWormholesModal();
assert.strictEqual(context.selectedWormholeCreation, null, 'opening Manage Bridges should clear selected creation focus');
assert.strictEqual(context.wormholeFocusUniverseId, null, 'opening Manage Bridges should clear universe focus');
assert.ok(context.__renderedWormholesMap >= 1, 'opening Manage Bridges should render the bridge map');

const root = path.resolve(__dirname, '..', '..');
const appScript = fs.readFileSync(path.join(root, 'scripts', 'wormholes-app.js'), 'utf8');
assert.ok(!/function\s+openBridgeModal\s*\(/.test(appScript), 'openBridgeModal should be cordoned off from wormholes-app.js');
assert.ok(!/function\s+toggleWormholeBridge\s*\(/.test(appScript), 'toggleWormholeBridge should be cordoned off from wormholes-app.js');
assert.ok(/function\s+openBridgeModal\s*\(/.test(script), 'openBridgeModal should live in bridges.js');
assert.ok(/function\s+toggleWormholeBridge\s*\(/.test(script), 'toggleWormholeBridge should live in bridges.js');

const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
assert.ok(htmlName, 'Wormholes beta html file should exist');
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const order = ['scripts/connections.js', 'scripts/bridges.js', 'scripts/connections-map.js', 'scripts/bridges-map.js', 'scripts/wormholes-app.js'].map(src => html.indexOf(src));
assert.ok(order.every(index => index !== -1), 'bridges script order targets should be present');
assert.ok(order[0] < order[1] && order[1] < order[2] && order[2] < order[3] && order[3] < order[4], 'bridges.js should load after connections.js and before the map modules/app core');

console.log('bridges-module.unit.js passed');

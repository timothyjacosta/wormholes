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

function makeElement(id, initialClasses = []){
  return {
    id,
    dataset:{},
    style:{},
    textContent:'',
    innerHTML:'',
    value:'',
    disabled:false,
    hidden:false,
    classList:makeClassList(initialClasses),
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
  connectStatus: makeElement('connectStatus'),
  connectionsScreen: makeElement('connectionsScreen'),
  archiveListScreen: makeElement('archiveListScreen', ['active']),
  connectPickerSubtitle: makeElement('connectPickerSubtitle'),
  connectPickerModal: makeElement('connectPickerModal'),
  connectPickerList: makeElement('connectPickerList'),
  connectionError: makeElement('connectionError'),
  connectionModalTitle: makeElement('connectionModalTitle'),
  connectionModalSubtitle: makeElement('connectionModalSubtitle'),
  connectionTextInput: makeElement('connectionTextInput'),
  deleteConnectionTextBtn: makeElement('deleteConnectionTextBtn'),
  connectionModal: makeElement('connectionModal')
};

const entries = {
  a:{id:'a', title:'Alpha', connections:['b']},
  b:{id:'b', title:'Beta', connections:['a']},
  c:{id:'c', title:'Gamma', connections:[]}
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
  document:{
    getElementById(id){ return elements[id] || null; }
  },
  window:{},
  currentUniverseId:'u1',
  universes:[{id:'u1', title:'Universe One'}, {id:'u2', title:'Universe Two'}],
  archiveEntries:[entries.a, entries.b, entries.c],
  connectionNotes:{'a::b':'existing note'},
  bridgeNotes:{},
  activeConnectionKey:null,
  activeBridgeNoteKey:null,
  activeConnectEntryId:null,
  expandedConnectPickerNodes:new Set(),
  stagedConnectTargetIds:new Set(),
  connectSourceId:null,
  selectedMapNodeId:null,
  connectionsMapAutoFitOnNextRender:false,
  escapeHtml(value){ return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
  getEntry(id){ return entries[id] || null; },
  getCurrentUniverse(){ return {id:'u1', title:'Universe One'}; },
  isGroupEntry(){ return false; },
  groupChildIds(){ return []; },
  nestedPickerKey(...parts){ return parts.join(':'); },
  entryPickerMeta(){ return 'creation'; },
  topLevelArchiveEntries(list){ return list; },
  protectAllControls(){ context.__protected = true; },
  cleanupAllStaleLinks(){ context.__cleaned = true; },
  updateDestructiveClearButtons(){ context.__updatedDestructive = true; },
  addUniqueId(list, id){ return Array.from(new Set([...(list || []), id])); },
  saveArchiveToStorage(){ context.__savedArchive = true; return true; },
  saveConnectionNotesToStorage(){ context.__savedConnectionNotes = true; return true; },
  saveBridgeNotesToStorage(){ context.__savedBridgeNotes = true; return true; },
  setDestructiveButtonVisibility(id, visible){ elements[id].hidden = !visible; },
  renderArchive(){ context.__renderedArchive = true; },
  renderConnectionsMap(){ context.__renderedConnectionsMap = (context.__renderedConnectionsMap || 0) + 1; },
  renderWormholesMap(){ context.__renderedWormholesMap = true; },
  showSavedToast(message = 'Saved'){ context.__toast = message; },
  closeMenus(){ context.__closedMenus = true; },
  closeGroupConnectionModal(){ context.__closedGroupConnection = true; },
  closeClearMapConfirm(){ context.__closedClearMap = true; },
  getUniverseTitle(id){ return id === 'u2' ? 'Universe Two' : 'Universe One'; },
  visibleEntryTitleForUniverseEntry(){ return ''; },
  getCreationTitleFromUniverse(){ return 'Remote Creation'; },
  entityExistsInUniverse(){ return true; },
  connectEntries(sourceId, targetId){ context.__connectedPair = [sourceId, targetId]; }
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'connections.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/connections.js'});

assert.strictEqual(typeof context.showConnectionsScreen, 'function', 'showConnectionsScreen should remain globally callable');
assert.strictEqual(typeof context.openConnectionModal, 'function', 'openConnectionModal should remain globally callable');
assert.strictEqual(typeof context.saveConnectPickerModal, 'function', 'saveConnectPickerModal should remain globally callable');
assert.strictEqual(typeof context.toggleMapConnection, 'function', 'toggleMapConnection should remain globally callable');

assert.strictEqual(context.connectionKey('b', 'a'), 'a::b');
assert.strictEqual(context.makeConnectionKeyFromIds('z', 'm'), 'm::z');
assert.strictEqual(context.getConnectionNote('b', 'a'), 'existing note');
context.setConnectionNote('a', 'c', ' new note ');
assert.strictEqual(context.connectionNotes['a::c'], 'new note');
assert.strictEqual(context.__savedConnectionNotes, true);
context.setConnectionNote('a', 'c', '');
assert.strictEqual(context.connectionNotes['a::c'], undefined);

context.openConnectionModal('a', 'b');
assert.strictEqual(context.activeConnectionKey, 'a::b');
assert.strictEqual(context.activeBridgeNoteKey, null);
assert.ok(elements.connectionModal.classList.contains('open'), 'connection modal should open');
assert.ok(elements.connectionModalSubtitle.textContent.includes('Alpha'), 'connection modal should label source');
assert.strictEqual(elements.connectionTextInput.value, 'existing note');

context.activeConnectionKey = 'a::b';
elements.connectionTextInput.value = 'updated note';
context.saveConnectionModalText();
assert.strictEqual(context.connectionNotes['a::b'], 'updated note');
assert.strictEqual(context.__toast, 'Connection details saved');
assert.ok(!elements.connectionModal.classList.contains('open'), 'connection modal should close after save');

context.activeBridgeNoteKey = 'bridge-key';
context.activeConnectionKey = null;
elements.connectionTextInput.value = 'bridge note';
context.saveConnectionModalText();
assert.strictEqual(context.bridgeNotes['bridge-key'], 'bridge note');
assert.strictEqual(context.__savedBridgeNotes, true);
assert.strictEqual(context.__renderedWormholesMap, true);

assert.strictEqual(JSON.stringify(context.parseConnectionsExternalNodeId('universe:u2')), JSON.stringify({type:'universe', universeId:'u2'}));
assert.strictEqual(JSON.stringify(context.parseConnectionsExternalNodeId('external:u2:entry:with:colon')), JSON.stringify({type:'creation', universeId:'u2', creationId:'entry:with:colon'}));
assert.strictEqual(context.connectionsMapNodeTitle('external:u2:c9'), 'Remote Creation');
assert.strictEqual(context.isSelectableConnectionsMapNodeId('universe:u2'), true);
assert.strictEqual(context.isCurrentUniverseConnectionsMapNodeId('universe:u1'), true);
assert.strictEqual(context.isExternalConnectionsMapNodeId('external:u2:c9'), true);

context.selectedMapNodeId = 'b';
context.showConnectionsScreen();
assert.strictEqual(context.selectedMapNodeId, null, 'opening the Connections screen should start with no focused entity');
assert.ok(elements.connectionsScreen.classList.contains('active'), 'Connections screen should become active');
assert.ok(context.__renderedConnectionsMap >= 1, 'Connections screen should render the map after clearing focus');

context.toggleMapConnection('a', 'c');
assert.strictEqual(JSON.stringify(context.__connectedPair), JSON.stringify(['a', 'c']));
assert.strictEqual(context.selectedMapNodeId, 'a');
assert.ok(context.__renderedConnectionsMap >= 1, 'connections map should rerender after toggle');

context.openConnectPickerModal('a');
assert.strictEqual(context.activeConnectEntryId, 'a');
assert.ok(elements.connectPickerModal.classList.contains('open'), 'connect picker modal should open');
assert.ok(elements.connectPickerSubtitle.textContent.includes('Alpha'), 'connect picker should label source');
context.applyConnectPickerChoice('c');
assert.ok(context.stagedConnectTargetIds.has('c'), 'connect picker should stage selected target');
context.saveConnectPickerModal();
assert.ok(entries.a.connections.includes('c'), 'saved picker should connect source to staged target');
assert.ok(entries.c.connections.includes('a'), 'saved picker should connect staged target back to source');
assert.strictEqual(context.__toast, 'Connections saved', 'archive connection picker save should show its success toast');

context.connectionNotes = {'a::b':'keep?'};
entries.a.connections = ['b'];
entries.b.connections = ['a'];
elements.connectionsScreen.classList.add('active');
context.clearCurrentUniverseConnectionsOnly();
assert.strictEqual(JSON.stringify(entries.a.connections), JSON.stringify([]));
assert.strictEqual(JSON.stringify(entries.b.connections), JSON.stringify([]));
assert.strictEqual(JSON.stringify(context.connectionNotes), JSON.stringify({}));
assert.strictEqual(context.connectSourceId, null);
assert.strictEqual(context.__closedClearMap, true);

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
assert.ok(htmlName, 'Wormholes beta html file should exist');
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const order = ['scripts/vision-board.js', 'scripts/connections.js', 'scripts/connections-map.js', 'scripts/wormholes-app.js'].map(src => html.indexOf(src));
assert.ok(order.every(index => index !== -1), 'expected connection script tags should be present');
assert.ok(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'connections.js should load before connections-map.js and before wormholes-app.js');

const appScript = fs.readFileSync(path.resolve(root, 'scripts', 'wormholes-app.js'), 'utf8');
assert.ok(!/function\s+openConnectionModal\s*\(/.test(appScript), 'openConnectionModal should be cordoned off from wormholes-app.js');
assert.ok(!/function\s+showConnectionsScreen\s*\(/.test(appScript), 'showConnectionsScreen should be cordoned off from wormholes-app.js');
assert.ok(!/function\s+clearCurrentUniverseConnectionsOnly\s*\(/.test(appScript), 'clearCurrentUniverseConnectionsOnly should be cordoned off from wormholes-app.js');

console.log('connections-module.unit.js passed');

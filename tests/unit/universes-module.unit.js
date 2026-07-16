const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(root, 'scripts', 'universes.js');
const appPath = path.join(root, 'scripts', 'wormholes-app.js');
const htmlPath = latestDirectHtmlPath(root);

const script = fs.readFileSync(scriptPath, 'utf8');
const appScript = fs.readFileSync(appPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

const elements = new Map();
function element(id){
  if(!elements.has(id)){
    elements.set(id, {
      id,
      value:'',
      textContent:'',
      disabled:false,
      dataset:{},
      focusCalled:false,
      focus(){ this.focusCalled = true; },
      classList:{ add(){}, remove(){}, contains(){ return false; } },
      toggleAttribute(){},
      setAttribute(){},
      querySelector(){ return null; },
      closest(){ return null; },
      addEventListener(){},
    });
  }
  return elements.get(id);
}

const context = {
  console,
  setTimeout(fn){ if(typeof fn === 'function') fn(); },
  Date,
  universes:[],
  currentUniverseId:null,
  localFoldersEnabled:false,
  wormholesParentFolderHandle:null,
  archiveEntries:[],
  literatureEntries:[],
  visionEntries:[],
  connectionNotes:{},
  activeUniverseSummaryId:null,
  activeUniverseEditId:null,
  activeUniverseDeleteId:null,
  stagedMigrateTargetUniverseId:null,
  activeMigrateEntryId:null,
  current:{what:null, attr1:null, attr2:null, pressure:null},
  connectSourceId:null,
  selectedMapNodeId:null,
  activeConnectionKey:null,
  document:{
    body:{classList:{add(){}, remove(){}}},
    getElementById: element,
    querySelectorAll(){ return []; },
  },
  window:{},
  sanitizeFileNamePart(text){ return String(text || '').replace(/[^a-z0-9 -]/gi, '').trim() || 'Untitled Universe'; },
  makeId(){ return 'u1'; },
  setModalErrorText(id, message){ element(id).textContent = message; element(id).classList.shown = true; },
  saveUniversesToStorage(){ return true; },
  closeUniverseTitleModal(){ context.closedUniverseTitle = true; },
  enterUniverse(id){ context.enteredUniverseId = id; },
  showSavedToast(message){ context.toastMessage = message || 'Saved'; },
  prepareWormholesFolderHandles(){ return Promise.resolve(true); },
  ensureUniverseFolders(){ return Promise.resolve(true); },
  readArchiveForUniverse(){ return []; },
  isGroupEntry(){ return false; },
  readLiteratureForUniverse(){ return []; },
  isLiteratureGroup(){ return false; },
  readVisionBoardForUniverse(){ return []; },
  readMigratedLocalStorageValue(){ return null; },
  readPersistedDatasetData(primaryKey, oldKey, fallbackValue){ return fallbackValue; },
  archiveStorageKey(){ return 'archive'; },
  oldArchiveStorageKey(){ return 'oldArchive'; },
  escapeHtml(text){ return String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); },
};
context.global = context;
vm.createContext(context);
vm.runInContext(script, context, {filename:'scripts/universes.js'});

[
  'createUniverseFromModal',
  'renderUniverseArchiveList',
  'openUniverseEditModal',
  'deleteUniverseStorage',
  'openMigrateModal',
  'enterUniverse',
  'normalizeSchemaUniverse',
].forEach(name => {
  assert.strictEqual(typeof context[name], 'function', `${name} should be defined by universes.js`);
  assert.ok(!new RegExp(`function\\s+${name}\\s*\\(`).test(appScript), `${name} should be moved out of wormholes-app.js`);
});

context.universes = [{id:'u0', title:'Existing  Universe'}];
assert.strictEqual(context.normalizedUniverseTitle(' Existing   Universe '), 'existing universe');
assert.strictEqual(context.duplicateUniverseTitleExists('existing universe'), true);
assert.strictEqual(context.duplicateUniverseTitleExists('New Universe'), false);
assert.ok(context.stableUniverseFolderName({id:'abcdef123456', title:'My Universe'}).includes('abcdef12'));

// Failed universe creation should roll back in-memory state and stay in the modal.
element('universeTitleInput').value = 'Rollback Universe';
context.universes = [{id:'old', title:'Old'}];
context.saveUniversesToStorage = () => false;
context.closedUniverseTitle = false;
context.enteredUniverseId = null;
context.createUniverseFromModal();
assert.deepStrictEqual(context.universes, [{id:'old', title:'Old'}], 'failed create should restore previous universes');
assert.strictEqual(element('universeTitleError').textContent, 'Could not save universe. Try again.');
assert.strictEqual(context.enteredUniverseId, null, 'failed create should not enter an unsaved universe');

// Successful universe creation should save, close, enter, and show the clearer success toast.
element('universeTitleInput').value = 'Fresh Universe';
context.universes = [];
context.saveUniversesToStorage = () => true;
context.closeUniverseTitleModal = () => { context.closedUniverseTitle = true; };
context.enterUniverse = id => { context.enteredUniverseId = id; };
context.showSavedToast = message => { context.toastMessage = message || 'Saved'; };
context.closedUniverseTitle = false;
context.enteredUniverseId = null;
context.toastMessage = '';
context.createUniverseFromModal();
assert.strictEqual(context.universes.length, 1);
assert.strictEqual(context.closedUniverseTitle, true);
assert.strictEqual(context.enteredUniverseId, 'u1');
assert.strictEqual(context.toastMessage, 'Universe created');

const order = ['scripts/bridges.js', 'scripts/universes.js', 'scripts/connections-map.js', 'scripts/wormholes-app.js'].map(src => html.indexOf(src));
assert.ok(order.every(index => index >= 0), 'script tags should include bridges.js, universes.js, connections-map.js, and wormholes-app.js');
assert.ok(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'universes.js should load after bridges.js and before map modules/app core');

console.log('universes-module.unit.js passed');

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'universes.js'), 'utf8');

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function createClassList(initial = []){
  const values = new Set(initial);
  return {
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); },
    toArray(){ return [...values]; }
  };
}

function createHarness(){
  const elements = new Map();
  const stores = {archive:{}, notes:{}, literature:{}, vision:{}};
  const calls = [];
  const removals = [];
  const savedUniverseSnapshots = [];

  function element(id){
    if(!elements.has(id)){
      elements.set(id, {
        id,
        value:'',
        textContent:'',
        innerHTML:'',
        disabled:false,
        dataset:{},
        focusCalled:false,
        classList:createClassList(),
        style:{setProperty(){}, removeProperty(){}},
        focus(){ this.focusCalled = true; },
        setAttribute(){},
        removeAttribute(){},
        toggleAttribute(){},
        addEventListener(){},
        querySelector(){ return null; },
        closest(){ return null; }
      });
    }
    return elements.get(id);
  }

  const context = {
    console,
    Date,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Promise,
    Math,
    setTimeout(fn){ if(typeof fn === 'function') fn(); return 1; },
    clearTimeout(){},
    universes:[],
    currentUniverseId:null,
    archiveEntries:[],
    literatureEntries:[],
    visionEntries:[],
    connectionNotes:{},
    bridgeNotes:{},
    activeUniverseSummaryId:null,
    activeUniverseEditId:null,
    activeUniverseDeleteId:null,
    stagedMigrateTargetUniverseId:null,
    activeMigrateEntryId:null,
    current:{what:null, attr1:null, attr2:null, pressure:null},
    connectSourceId:null,
    selectedMapNodeId:null,
    activeConnectionKey:null,
    localFoldersEnabled:false,
    wormholesParentFolderHandle:null,
    wormholesRootFolderHandle:null,
    wormholesLiteratureRootHandle:null,
    wormholesImagesRootHandle:null,
    wormholesCreationsRootHandle:null,
    visionFolderHandle:null,
    literatureFolderHandle:null,
    creationFolderHandle:null,
    document:{
      body:{classList:createClassList()},
      getElementById:element,
      querySelectorAll(){ return []; },
    },
    window:{},
    sanitizeFileNamePart(text){ return String(text || '').replace(/[^a-z0-9 -]/gi, '').trim() || 'Untitled Universe'; },
    makeId(){ return `generated-${context.universes.length + 1}`; },
    setModalErrorText(id, message){ element(id).textContent = message; element(id).classList.add('show'); },
    saveUniversesToStorage(){
      calls.push('save-universes');
      if(context.saveUniversesResult === false) return false;
      savedUniverseSnapshots.push(clone(context.universes));
      return true;
    },
    saveUniversesResult:true,
    readArchiveForUniverse(id){ return clone(stores.archive[id] || []); },
    saveArchiveForUniverse(id, entries){ stores.archive[id] = clone(entries); calls.push(`save-archive:${id}`); return true; },
    saveArchiveToStorage(){ stores.archive[context.currentUniverseId] = clone(context.archiveEntries); calls.push(`save-archive:${context.currentUniverseId}`); return true; },
    readConnectionNotesForUniverse(id){ return clone(stores.notes[id] || {}); },
    saveConnectionNotesForUniverse(id, notes){ stores.notes[id] = clone(notes); calls.push(`save-notes:${id}`); return true; },
    readLiteratureForUniverse(id){ return clone(stores.literature[id] || []); },
    readVisionBoardForUniverse(id){ return clone(stores.vision[id] || []); },
    loadArchiveFromStorage(){ context.archiveEntries = clone(stores.archive[context.currentUniverseId] || []); calls.push(`load-archive:${context.currentUniverseId}`); },
    normalizeArchiveNotes(){ calls.push('normalize-archive-notes'); },
    loadConnectionNotesFromStorage(){ context.connectionNotes = clone(stores.notes[context.currentUniverseId] || {}); calls.push(`load-notes:${context.currentUniverseId}`); },
    loadLiteratureFromStorage(){ context.literatureEntries = clone(stores.literature[context.currentUniverseId] || []); calls.push(`load-literature:${context.currentUniverseId}`); },
    loadVisionBoardFromStorage(){ context.visionEntries = clone(stores.vision[context.currentUniverseId] || []); calls.push(`load-vision:${context.currentUniverseId}`); },
    restoreFolderHandlesForCurrentUniverse(){ calls.push(`restore-folders:${context.currentUniverseId}`); },
    clearManualCreate(){ calls.push('clear-manual'); },
    renderCurrent(){ calls.push('render-current'); },
    renderArchive(){ calls.push('render-archive'); },
    showArchiveListScreen(){ calls.push('show-archive-list'); },
    switchTab(tab){ calls.push(`switch-tab:${tab}`); },
    closeMenus(){},
    closeTitleModal(){},
    closeUniverseTitleModal(){},
    closeUniverseArchiveModal(){},
    closeGroupModal(){},
    closeGroupConnectionModal(){},
    closeLiteratureTagModal(){},
    closeLiteratureViewer(){},
    closeLiteratureUploadModal(){},
    closeVisionUploadModal(){},
    closeLiteratureLinksModal(){},
    closeMigrateModal(){},
    closeMigrateNewUniverseModal(){},
    closeBridgeModal(){},
    closeBridgeNewUniverseModal(){},
    closeWormholesModal(){},
    closeUniverseSummaryModal(){ context.activeUniverseSummaryId = null; element('universeSummaryModal').classList.remove('open'); },
    closeUniverseEditModal(){ context.activeUniverseEditId = null; element('universeEditModal').classList.remove('open'); },
    closeDeleteEntryConfirm(){},
    closeDeleteUniverseModal(){ element('deleteUniverseModal').classList.remove('open'); },
    closeDeleteUniverseMigrateModal(){ element('deleteUniverseMigrateModal').classList.remove('open'); },
    showSavedToast(message){ calls.push(`toast:${message || 'Saved'}`); },
    showHomeScreen(){ calls.push('show-home'); },
    showAppScreen(){ calls.push('show-app'); },
    renderUniverseArchiveList(){ calls.push('render-universe-list'); },
    prepareWormholesFolderHandles(){ return Promise.resolve(true); },
    ensureUniverseFolders(){ return Promise.resolve(true); },
    deleteUniverseFoldersFromDisk(){ calls.push('delete-universe-folders'); return Promise.resolve(); },
    pruneWormholesFolderToAppState(){ calls.push('prune-folders'); return Promise.resolve(); },
    removeMigratedLocalStorageValue(primary, old){ removals.push([primary, old]); },
    archiveStorageKey(id){ return `archive:${id}`; },
    oldArchiveStorageKey(id){ return `old-archive:${id}`; },
    connectionNotesStorageKey(id){ return `notes:${id}`; },
    oldConnectionNotesStorageKey(id){ return `old-notes:${id}`; },
    literatureStorageKey(id){ return `literature:${id}`; },
    oldLiteratureStorageKey(id){ return `old-literature:${id}`; },
    visionStorageKey(id){ return `vision:${id}`; },
    oldVisionStorageKey(id){ return `old-vision:${id}`; },
    normalizeBridge(bridge){ return bridge && bridge.universeId ? {universeId:bridge.universeId, creationId:bridge.creationId || null} : null; },
    bridgeKey(universeId, creationId){ return `${universeId}:${creationId || ''}`; },
    normalizeBridges(bridges){ return (Array.isArray(bridges) ? bridges : []).filter(Boolean).map(item => ({...item})); },
    normalizeUniverseBridges(universe){ return (Array.isArray(universe?.bridges) ? universe.bridges : []).filter(Boolean).map(item => ({...item})); },
    cleanupBridgeNotes(){ calls.push('cleanup-bridge-notes'); return false; },
    saveBridgeNotesToStorage(){ calls.push('save-bridge-notes'); return true; },
    isGroupEntry(){ return false; },
    isLiteratureGroup(){ return false; },
    escapeHtml(value){ return String(value); },
    togglePositionedMenu(){},
    reportAppError(){},
    cloneMigratedArchiveEntries(sourceArchive){
      const idMap = Object.fromEntries(sourceArchive.map(entry => [entry.id, `migrated-${entry.id}`]));
      return {
        idMap,
        migratedEntries:sourceArchive.map(entry => ({...clone(entry), id:idMap[entry.id]}))
      };
    },
    makeConnectionKeyFromIds(a, b){ return [a, b].sort().join('::'); },
    remapIncomingBridgesForMigration(sourceId, targetId, idMap){ calls.push(`remap-incoming:${sourceId}:${targetId}:${Object.keys(idMap).length}`); },
    remapBridgeNotesForMigratedEntries(sourceId, targetId, idMap){ calls.push(`remap-notes:${sourceId}:${targetId}:${Object.keys(idMap).length}`); },
  };

  context.global = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, {filename:'scripts/universes.js'});

  // Function declarations in the production module replace a few test spies.
  context.renderUniverseArchiveList = () => calls.push('render-universe-list');
  context.showHomeScreen = () => calls.push('show-home');
  context.showAppScreen = () => calls.push('show-app');
  context.closeUniverseSummaryModal = () => { context.activeUniverseSummaryId = null; element('universeSummaryModal').classList.remove('open'); calls.push('close-summary'); };
  context.closeUniverseEditModal = () => { context.activeUniverseEditId = null; element('universeEditModal').classList.remove('open'); calls.push('close-edit'); };
  context.closeDeleteUniverseModal = () => { element('deleteUniverseModal').classList.remove('open'); calls.push('close-delete'); };
  context.closeDeleteUniverseMigrateModal = () => { element('deleteUniverseMigrateModal').classList.remove('open'); calls.push('close-delete-migrate'); };

  return {context, element, stores, calls, removals, savedUniverseSnapshots};
}

(async () => {
  // Metadata edits must be failure-atomic in memory as well as in storage.
  {
    const {context, element, calls} = createHarness();
    context.universes = [{id:'u1', title:'Original', summary:'Old summary'}];
    context.currentUniverseId = 'u1';
    context.activeUniverseEditId = 'u1';
    element('universeEditModal').classList.add('open');
    element('universeEditTitleInput').value = 'Renamed';
    element('universeEditSummaryInput').value = 'New summary';
    context.saveUniversesResult = false;

    context.saveUniverseEdit();

    assert.strictEqual(context.universes[0].title, 'Original', 'failed rename should restore the old title');
    assert.strictEqual(context.universes[0].summary, 'Old summary', 'failed rename should restore the old summary');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(context.universes[0], 'diskFolderName'), false, 'failed rename should not leave generated folder metadata behind');
    assert.strictEqual(context.activeUniverseEditId, 'u1', 'failed rename should keep the editor active');
    assert.ok(element('universeEditModal').classList.contains('open'), 'failed rename should keep the editor open');
    assert.ok(!calls.some(call => call === 'toast:Universe updated'), 'failed rename should not report success');

    context.activeUniverseSummaryId = 'u1';
    element('universeSummaryInput').value = 'Failed summary';
    context.saveUniverseSummary();
    assert.strictEqual(context.universes[0].summary, 'Old summary', 'failed summary save should restore the old summary');
    assert.strictEqual(context.activeUniverseSummaryId, 'u1', 'failed summary save should keep the summary editor active');
  }

  // Successful edits should preserve the stable disk folder and update the active label.
  {
    const {context, element, calls} = createHarness();
    context.universes = [{id:'u1', title:'Original', summary:'', diskFolderName:'Original -- u1'}];
    context.currentUniverseId = 'u1';
    context.activeUniverseEditId = 'u1';
    element('universeEditTitleInput').value = 'Renamed Universe';
    element('universeEditSummaryInput').value = 'Updated summary';

    context.saveUniverseEdit();

    assert.strictEqual(context.universes[0].title, 'Renamed Universe');
    assert.strictEqual(context.universes[0].summary, 'Updated summary');
    assert.strictEqual(context.universes[0].diskFolderName, 'Original -- u1', 'renaming should not strand the existing local folder');
    assert.strictEqual(element('currentUniverseLabel').textContent, 'Renamed Universe');
    assert.ok(calls.includes('toast:Universe updated'));
    assert.strictEqual(context.activeUniverseEditId, null);
  }

  // Switching universes must load only the selected universe's datasets and reset transient state.
  {
    const {context, element, stores, calls} = createHarness();
    context.universes = [
      {id:'u1', title:'One', diskFolderName:'One -- u1'},
      {id:'u2', title:'Two', diskFolderName:'Two -- u2'}
    ];
    context.currentUniverseId = 'u1';
    context.archiveEntries = [{id:'stale'}];
    context.connectionNotes = {stale:'note'};
    context.literatureEntries = [{id:'stale-lit'}];
    context.visionEntries = [{id:'stale-image'}];
    context.current = {what:'stale', attr1:'x', attr2:'y', pressure:'z'};
    context.connectSourceId = 'stale-source';
    context.selectedMapNodeId = 'stale-node';
    context.activeConnectionKey = 'stale-key';
    stores.archive.u2 = [{id:'a2', title:'Two creation'}];
    stores.notes.u2 = {'a2::b2':'Two note'};
    stores.literature.u2 = [{id:'l2', title:'Two doc'}];
    stores.vision.u2 = [{id:'v2', title:'Two image'}];

    context.enterUniverse('u2');

    assert.strictEqual(context.currentUniverseId, 'u2');
    assert.deepStrictEqual(clone(context.archiveEntries), stores.archive.u2);
    assert.deepStrictEqual(clone(context.connectionNotes), stores.notes.u2);
    assert.deepStrictEqual(clone(context.literatureEntries), stores.literature.u2);
    assert.deepStrictEqual(clone(context.visionEntries), stores.vision.u2);
    assert.deepStrictEqual(clone(context.current), {what:null, attr1:null, attr2:null, pressure:null});
    assert.strictEqual(context.connectSourceId, null);
    assert.strictEqual(context.selectedMapNodeId, null);
    assert.strictEqual(context.activeConnectionKey, null);
    assert.strictEqual(element('currentUniverseLabel').textContent, 'Two');
    assert.ok(calls.includes('restore-folders:u2'));
    assert.ok(calls.includes('switch-tab:current'));
    assert.ok(calls.includes('show-app'));

    const previousCallCount = calls.length;
    context.enterUniverse('missing');
    assert.strictEqual(context.currentUniverseId, 'u2', 'an unknown universe ID should be a no-op');
    assert.strictEqual(calls.length, previousCallCount, 'an unknown universe ID should not trigger rendering or storage loads');
  }

  // Deleting an inactive universe should clean exact references without touching a longer, similar ID.
  {
    const {context, stores, removals} = createHarness();
    context.universes = [
      {id:'u1', title:'Current', bridges:[{universeId:'u2'}, {universeId:'u20'}]},
      {id:'u2', title:'Delete me', bridges:[]},
      {id:'u20', title:'Keep me', bridges:[]}
    ];
    context.currentUniverseId = 'u1';
    context.archiveEntries = [{
      id:'a1',
      bridges:[{universeId:'u2', creationId:'a2'}, {universeId:'u20', creationId:'a20'}]
    }];
    stores.archive.u20 = [{id:'a20', bridges:[]}];
    context.bridgeNotes = {
      'U:u1||U:u2':'delete universe note',
      'C:u1:a1||C:u2:a2':'delete creation note',
      'U:u1||U:u20':'keep longer universe note',
      'C:u1:a1||C:u20:a20':'keep longer creation note'
    };

    const finalize = await context.deleteUniverseStorage('u2', {deferCleanup:true});

    assert.deepStrictEqual(context.universes.map(item => item.id), ['u1', 'u20']);
    assert.strictEqual(context.currentUniverseId, 'u1', 'deleting an inactive universe should leave the current universe open');
    assert.deepStrictEqual(clone(context.archiveEntries[0].bridges), [{universeId:'u20', creationId:'a20'}]);
    assert.deepStrictEqual(clone(context.universes[0].bridges), [{universeId:'u20'}]);
    assert.strictEqual(context.bridgeNotes['U:u1||U:u2'], undefined);
    assert.strictEqual(context.bridgeNotes['C:u1:a1||C:u2:a2'], undefined);
    assert.strictEqual(context.bridgeNotes['U:u1||U:u20'], 'keep longer universe note', 'deleting u2 must not overmatch u20');
    assert.strictEqual(context.bridgeNotes['C:u1:a1||C:u20:a20'], 'keep longer creation note', 'creation notes for u20 must remain');
    assert.strictEqual(removals.length, 4, 'all four per-universe storage datasets should be removed');
    assert.strictEqual(typeof finalize, 'function', 'deferred deletion should return its final cleanup callback');
  }

  // Deleting the active universe should clear active data and return home while retaining other universes.
  {
    const {context, calls} = createHarness();
    context.universes = [{id:'u1', title:'Active'}, {id:'u2', title:'Remaining'}];
    context.currentUniverseId = 'u1';
    context.archiveEntries = [{id:'a1'}];
    context.connectionNotes = {'a1::b1':'note'};
    context.literatureEntries = [{id:'l1'}];
    context.visionEntries = [{id:'v1'}];

    await context.deleteUniverseStorage('u1', {deferCleanup:true});

    assert.deepStrictEqual(context.universes.map(item => item.id), ['u2']);
    assert.strictEqual(context.currentUniverseId, null);
    assert.deepStrictEqual(clone(context.archiveEntries), []);
    assert.deepStrictEqual(clone(context.connectionNotes), {});
    assert.deepStrictEqual(clone(context.literatureEntries), []);
    assert.deepStrictEqual(clone(context.visionEntries), []);
    assert.ok(calls.includes('show-home'));
  }

  // Migration-before-delete should copy entries and notes, remap bridges, and offer one Undo transaction.
  {
    const {context, stores, calls} = createHarness();
    context.universes = [{id:'source', title:'Source'}, {id:'target', title:'Target'}];
    context.activeUniverseDeleteId = 'source';
    stores.archive.source = [{id:'a1', title:'One'}, {id:'a2', title:'Two'}];
    stores.archive.target = [{id:'existing', title:'Existing'}];
    stores.notes.source = {'a1::a2':'relationship'};
    stores.notes.target = {'existing::other':'existing note'};
    let deleteCall = null;
    const finalize = async () => {};
    context.deleteUniverseStorage = async (id, options) => { deleteCall = {id, options}; return finalize; };
    let offered = null;
    context.window.WormholesUndo = {
      captureState(){ return {snapshot:true}; },
      async offer(options){ offered = options; return true; }
    };

    await context.migrateAllAndDeleteUniverse('target');

    assert.deepStrictEqual(stores.archive.target.map(entry => entry.id), ['migrated-a1', 'migrated-a2', 'existing']);
    assert.strictEqual(stores.notes.target['migrated-a1::migrated-a2'], 'relationship');
    assert.strictEqual(stores.notes.target['existing::other'], 'existing note');
    assert.ok(calls.includes('remap-incoming:source:target:2'));
    assert.ok(calls.includes('remap-notes:source:target:2'));
    assert.deepStrictEqual(clone(deleteCall), {id:'source', options:{deferCleanup:true}});
    assert.strictEqual(context.activeUniverseDeleteId, null);
    assert.strictEqual(offered.message, 'Creations moved; universe deleted');
    assert.strictEqual(offered.restoredMessage, 'Universe deletion undone');
    assert.deepStrictEqual(clone(offered.state), {snapshot:true});
    assert.strictEqual(offered.finalize, finalize);
  }

  console.log('universe-lifecycle-regressions.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

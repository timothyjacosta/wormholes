const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const bootstrapPath = path.join(root, 'scripts', 'bootstrap.js');
const appPath = path.join(root, 'scripts', 'wormholes-app.js');
const htmlPath = latestDirectHtmlPath(root);

const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const appScript = fs.readFileSync(appPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

const currentBeta = /Wormholes_Beta_(\d+)\.html$/.exec(latestDirectHtmlName(root))?.[1];
assert.ok(currentBeta && bootstrap.includes(`Wormholes Beta ${currentBeta} bootstrap`), 'bootstrap.js should identify the current beta');
assert.ok(!appScript.includes('document.getElementById("currentTabBtn").addEventListener'), 'startup event wiring should be moved out of wormholes-app.js');
assert.ok(appScript.includes('Bootstrap module: moved startup wiring to scripts/bootstrap.js in Beta 138'), 'app core should leave a bootstrap handoff marker');

const order = [
  'scripts/wormholes-snapshots.js',
  'scripts/wormholes-write-ahead-journal.js',
  'scripts/wormholes-storage-recovery.js',
  'scripts/wormholes-indexeddb-recovery.js',
  'scripts/generation.js',
  'scripts/wormholes-app.js',
  'scripts/wormholes-copy-to-universe.js',
  'scripts/wormholes-startup.js',
  'scripts/bootstrap.js',
  'scripts/wormholes-accessibility.js'
].map(src => html.indexOf(src));
assert.ok(order.every(index => index >= 0), 'script tags should include snapshots, the write-ahead journal, recovery modules, generation, app core, bootstrap, and accessibility scripts');
assert.ok(order.every((index, i) => i === 0 || order[i - 1] < index), 'recovery modules and the startup coordinator should load before bootstrap and accessibility');
assert.ok(bootstrap.includes('WormholesStartup?.startWormholesApp'), 'bootstrap should hand startup to the dedicated coordinator');
assert.ok(!bootstrap.includes('async function initializeWormholesApp'), 'bootstrap should not duplicate the startup sequence');

function makeElement(id){
  return {
    id,
    value:'',
    textContent:'',
    hidden:false,
    dataset:{},
    attributes:new Map(),
    listeners:{},
    addEventListener(type, fn){
      if(!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    },
    setAttribute(name, value){ this.attributes.set(name, String(value)); },
    getAttribute(name){ return this.attributes.has(name) ? this.attributes.get(name) : null; },
    focus(){},
    closest(){ return null; },
  };
}

const elements = new Map();
function element(id){
  if(!elements.has(id)) elements.set(id, makeElement(id));
  return elements.get(id);
}

const calls = [];
const context = {
  console,
  document:{
    getElementById: element,
    addEventListener(type, fn, options){ calls.push(`document:${type}`); },
  },
  requestAnimationFrame(fn){ if(typeof fn === 'function') fn(); },
  window:{
    addEventListener(type, fn){ calls.push(`window:${type}`); },
    localStorage:{
      values:new Map(),
      getItem(key){ return this.values.has(key) ? this.values.get(key) : null; },
      setItem(key, value){ this.values.set(key, String(value)); },
    },
    WormholesStartup:{ startWormholesApp(){ calls.push('startWormholesApp'); } },
  },
  activeUniverseDeleteId:'existing',
};
context.globalThis = context;

[
  'switchTab',
  'toggleArchiveFilterPanel',
  'applyArchiveFiltersFromControls',
  'resetArchiveFilters',
  'closeArchiveFilterPanel',
  'toggleArchiveSortPanel',
  'applyArchiveSortFromControl',
  'resetArchiveSort',
  'closeArchiveSortPanel',
  'toggleLiteratureFilterPanel',
  'applyLiteratureFiltersFromControls',
  'resetLiteratureFilters',
  'closeLiteratureFilterPanel',
  'toggleLiteratureSortPanel',
  'applyLiteratureSortFromControl',
  'resetLiteratureSort',
  'closeLiteratureSortPanel',
  'toggleVisionFilterPanel',
  'applyVisionFiltersFromControls',
  'resetVisionFilters',
  'closeVisionFilterPanel',
  'toggleVisionSortPanel',
  'applyVisionSortFromControl',
  'resetVisionSort',
  'closeVisionSortPanel',
  'showConnectionsScreen',
  'showArchiveListScreen',
  'openLiteratureUploadModal',
  'chooseLiteratureUploadFiles',
  'closeLiteratureUploadModal',
  'openVisionUploadModal',
  'chooseVisionUploadFiles',
  'closeVisionUploadModal',
  'handleLocalFolderToggleChange',
  'acknowledgeLocalFolderDeletionWarning',
  'reconnectSavedLocalFolderFromModal',
  'findLocalFolderFromNotFoundModal',
  'useAppOnlyFromNotFoundModal',
  'confirmLocalFolderSync',
  'showLiteratureEditorScreen',
  'showLiteratureListScreen',
  'closeLiteratureEditor',
  'literatureEditorIsOpen',
  'markLiteratureEditorDirty',
  'handleLiteratureBeforeUnload',
  'handleLiteratureEditorTextTransfer',
  'uploadLiteratureFiles',
  'uploadVisionImages',
  'saveLiteratureDoc',
  'applyLiteratureFormat',
  'saveAndCloseLiteratureTagModal',
  'closeLiteratureTagModal',
  'closeLiteratureViewer',
  'editFromLiteratureViewer',
  'saveAndCloseLiteratureLinksModal',
  'closeLiteratureLinksModal',
  'openVisionLinksModal',
  'saveAndCloseVisionLinksModal',
  'closeVisionLinksModal',
  'closeVisionImageViewerModal',
  'closeVisionRenameModal',
  'saveVisionRename',
  'confirmVisionDelete',
  'closeVisionDeleteConfirm',
  'confirmLiteratureDelete',
  'closeLiteratureDeleteConfirm',
  'toggleVisionMoveMode',
  'openUniverseTitleModal',
  'openUniverseArchiveModal',
  'openWormholesModal',
  'exitUniverseToHome',
  'rollWhat',
  'rollAttr',
  'rollAttr1',
  'rollAttr2',
  'rollPressure',
  'quickRoll',
  'quickFullRoll',
  'clearCurrent',
  'newCreation',
  'openTitleModal',
  'closeTitleModal',
  'saveCurrentToArchive',
  'closeConnectionModal',
  'saveConnectionModalText',
  'deleteConnectionModalText',
  'closeSummaryModal',
  'saveSummaryText',
  'deleteSummaryText',
  'closeNoteModal',
  'saveNoteText',
  'closeGroupModal',
  'saveGroupModal',
  'closeGroupConnectionModal',
  'saveConnectPickerModal',
  'closeConnectPickerModal',
  'closeRelationshipRemovalConfirm',
  'confirmRelationshipRemoval',
  'closeEditModal',
  'saveEditEntry',
  'clearManualCreate',
  'saveManualCreation',
  'updateManualButtons',
  'createManualSelects',
  'createUniverseFromModal',
  'closeUniverseTitleModal',
  'closeUniverseArchiveModal',
  'closeMigrateModal',
  'closeMigrateNewUniverseModal',
  'closeCopyToUniverseModal',
  'openCopyNewUniverseModal',
  'closeCopyNewUniverseModal',
  'saveCopyToUniverse',
  'createCopyNewUniverse',
  'closeBridgeModal',
  'openEditAddNoteModal',
  'openVisionTagGoModal',
  'closeVisionTagGoModal',
  'goToVisionTagTarget',
  'handleVisionBoardDelegatedClick',
  'handleTaggedImageThumbnailClick',
  'closeWormholesModal',
  'closeUniverseSummaryModal',
  'closeUniverseEditModal',
  'closeDeleteEntryConfirm',
  'confirmDeleteEntry',
  'closeClearMapConfirm',
  'confirmClearMapAction',
  'closeDeleteUniverseModal',
  'closeDeleteUniverseMigrateModal',
  'confirmDeleteUniverseWithoutMigration',
  'openDeleteUniverseMigrateModal',
  'createBridgeNewUniverse',
  'closeBridgeNewUniverseModal',
  'openBridgeNewUniverseModal',
  'createMigrateNewUniverse',
  'openMigrateNewUniverseModal',
  'saveUniverseSummary',
  'saveBridgePickerModal',
  'saveUniverseEdit',
  'loadLocalFolderEnabled',
  'loadUniversesFromStorage',
  'loadBridgeNotesFromStorage',
  'runAppSchemaMigrations',
  'repairFolderCollisionTitles',
  'autoSyncLocalFolderOnStartup',
  'installUiProtectionGuards',
  'installPrimarySafeControls',
  'disableNativeDownloadBehaviors',
  'protectAllControls',
  'populateManualSelects',
  'populateEditSelects',
  'loadSkipRollAnimation',
  'installSkipRollLayoutWatcher',
  'renderCurrent',
  'renderArchive',
  'showHomeScreen',
  'closeMenus',
  'toggleSettingsMenu',
  'installSettingsMenuHandlers',
  'handleSkipRollAnimationToggle',
].forEach(name => {
  context[name] = (...args) => { calls.push(name); return undefined; };
});
context.showSavedToast = message => { calls.push(`showSavedToast:${message}`); };

vm.createContext(context);
vm.runInContext(bootstrap, context, {filename:'scripts/bootstrap.js'});

assert.ok(element('currentTabBtn').listeners.click?.length === 1, 'current tab button should receive one click listener');
assert.ok(element('archiveBtn').listeners.click?.length === 1, 'archive button should receive one click listener');

let beforeButtonClick = calls.length;
element('backToArchiveBtn').listeners.click[0]();
assert.deepStrictEqual(
  calls.slice(beforeButtonClick),
  ['showArchiveListScreen', 'showSavedToast:Connections saved'],
  'Back to Archive should close Connections and confirm that connections were saved'
);

beforeButtonClick = calls.length;
element('closeWormholesBtn').listeners.click[0]();
assert.deepStrictEqual(
  calls.slice(beforeButtonClick),
  ['closeWormholesModal', 'showSavedToast:Bridges saved'],
  'Manage Bridges Close should close the modal and confirm that bridges were saved'
);

assert.ok(calls.includes('window:beforeunload'), 'bootstrap should register the Literature abandonment warning');
assert.ok(calls.includes('installSettingsMenuHandlers'), 'settings menu handlers should be installed by bootstrap');
assert.ok(calls.includes('startWormholesApp'), 'bootstrap should start the app through the startup coordinator');

console.log('bootstrap-module.unit.js passed');

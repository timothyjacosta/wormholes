const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeClassList(){
  const set = new Set();
  return {
    add(...names){ names.forEach(name => set.add(name)); },
    remove(...names){ names.forEach(name => set.delete(name)); },
    contains(name){ return set.has(name); },
    toString(){ return Array.from(set).join(' '); }
  };
}

function makeElement(id, opts = {}){
  const el = {
    id,
    hidden:false,
    textContent:'',
    title:'',
    dataset:{},
    style:{},
    disabled:false,
    tabIndex:0,
    classList:makeClassList(),
    attributes:{},
    listeners:{},
    parentElement:null,
    tagName:opts.tagName || 'DIV',
    nodeType:1,
    matches(selector){
      if(selector === '.app-button') return !!opts.appButton;
      if(selector === '.tab-button') return !!opts.tabButton;
      if(selector === 'button, input, select, textarea, a[href], [role]') return ['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(this.tagName) || this.attributes.role;
      if(selector === 'input, select, textarea, option, label') return ['INPUT','SELECT','TEXTAREA','OPTION','LABEL'].includes(this.tagName);
      if(selector === '[download]') return !!this.attributes.download;
      return false;
    },
    closest(selector){
      if(selector === '.menu-wrap' && opts.menuWrap) return opts.menuWrap;
      if(selector === '.entry, .universe-entry, .vision-pin' && opts.menuOwner) return opts.menuOwner;
      if(selector === '.app-button' && opts.appButton) return this;
      if(selector === '#settingsDock' && id === 'settingsDock') return this;
      return null;
    },
    querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {left:opts.left ?? 20}; },
    focus(){ this.focused = (this.focused || 0) + 1; },
    addEventListener(type, fn){
      if(!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    },
    setAttribute(name, value){ this.attributes[name] = String(value); if(name === 'role') this.role = String(value); },
    getAttribute(name){ return this.attributes[name] ?? ''; },
    removeAttribute(name){ delete this.attributes[name]; },
    hasAttribute(name){ return Object.prototype.hasOwnProperty.call(this.attributes, name); }
  };
  return el;
}

const elements = {};
[
  'settingsStatus','settingsPanel','settingsGearBtn','quickStartModal','quickStartMenuBtn','privacyLocalDataBtn','localDataHelpModal','closeLocalDataHelpBtn','closeQuickStartBtn',
  'exportAppDataBtn','importAppDataBtn','clearAppDataBtn','appDataImportInput','cancelAppDataImportBtn','confirmAppDataImportBtn',
  'appDataImportConfirmModal','cancelClearAppDataBtn','confirmClearAppDataBtn','clearAppDataConfirmModal','closeAppDataExportSummaryBtn','appDataExportSummaryModal','createBackupBtn','restoreBackupBtn',
  'changeTargetStorageBtn','localFolderDeletionWarningModal','localFolderSyncModal','localFolderNotFoundModal','localFolderNotFoundMessage',
  'createUniverseBtn','enterUniverseBtn','manageWormholesBtn'
].forEach(id => { elements[id] = makeElement(id, {tagName:id.endsWith('Btn') ? 'BUTTON' : 'DIV'}); });
elements.settingsPanel.hidden = true;

const htmlRoot = makeElement('html');
const documentListeners = {};
const windowListeners = {};

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
  setTimeout(fn){ fn(); },
  document:{
    documentElement:htmlRoot,
    getElementById(id){ return elements[id] || null; },
    querySelectorAll(selector){ return []; },
    addEventListener(type, fn){
      if(!documentListeners[type]) documentListeners[type] = [];
      documentListeners[type].push(fn);
    }
  },
  window:{
    addEventListener(type, fn){
      if(!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(fn);
    }
  },
  MutationObserver: class {
    constructor(fn){ this.fn = fn; context.__observer = this; }
    observe(target, options){ this.target = target; this.options = options; context.__observerStarted = true; }
  },
  requestStorageFootnoteUpdate(){ context.__requestedStorageFootnote = true; },
  showSavedToast(message){ context.__toasts.push(message); },
  __toasts:[],
  renderLiteratureList(){ context.__renderedLiterature = true; },
  renderVisionBoard(){ context.__renderedVision = true; },
  clearWormholesFolderHandles(){ context.__clearedFolderHandles = true; },
  saveLocalFolderEnabled(){ context.__savedLocalFolderSetting = true; },
  localFoldersEnabled:true,
  localFolderPendingSync:true,
  localFolderSwitchInProgress:true,
  closeAppDataExportSummaryModal(){ context.__closedSummary = true; },
  closeAppDataImportConfirmModal(value){ context.__closedImport = value; },
  exportAppDataFromSettings(){ context.__exportClicked = true; },
  importAppDataFromSettings(){ context.__importClicked = true; },
  openClearAppDataConfirmModal(){ context.__clearAppDataClicked = true; },
  closeClearAppDataConfirmModal(){ context.__clearAppDataClosed = true; },
  proceedClearAppDataConfirm(){ context.__clearAppDataProceeded = true; },
  handleAppDataImportFile(){ context.__importFile = true; },
  createBackupFromSettings(){ context.__backupClicked = true; },
  restoreBackupFromSettings(){ context.__restoreClicked = true; },
  changeTargetStorageFromSettings(){ context.__changeTargetClicked = true; },
  openUniverseTitleModal(){ context.__openUniverseTitle = true; },
  openUniverseArchiveModal(){ context.__openUniverseArchive = true; },
  openWormholesModal(){ context.__openWormholes = true; },
  applyContextualActionAriaLabels(){ context.__appliedLabels = true; },
  isWormholesSafeDownloadElement(){ return false; }
};
context.globalThis = context;

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'modals-settings.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/modals-settings.js'});

assert.strictEqual(typeof context.setSettingsStatus, 'function', 'settings status helper should remain globally callable');
assert.strictEqual(typeof context.toggleSettingsMenu, 'function', 'settings menu toggler should remain globally callable');
assert.strictEqual(typeof context.closeMenus, 'function', 'shared menu closer should remain globally callable');
assert.strictEqual(typeof context.protectAllControls, 'function', 'control protection helper should remain globally callable');
assert.strictEqual(typeof context.installSettingsMenuHandlers, 'function', 'settings handler installer should be globally callable');

context.setSettingsStatus('Backup folder created: Creations 1, Literature 2.');
assert.deepStrictEqual(context.__toasts, ['Backup folder created'], 'settings messages should use compact standard toast text');
assert.strictEqual(elements.settingsStatus.hidden, true, 'legacy settings status element should remain hidden and not affect menu layout');

context.toggleSettingsMenu(true);
assert.strictEqual(elements.settingsPanel.hidden, false, 'settings menu should open');
assert.strictEqual(elements.settingsGearBtn.attributes['aria-expanded'], 'true');
assert.strictEqual(context.__requestedStorageFootnote, undefined, 'opening settings should not restart storage measurement or reflow the panel');
context.toggleSettingsMenu(false);
assert.strictEqual(elements.settingsPanel.hidden, true, 'settings menu should close');

context.installSettingsMenuHandlers();
context.installSettingsMenuHandlers();
assert.strictEqual((elements.settingsGearBtn.listeners.click || []).length, 1, 'settings gear listener should bind only once');
(elements.settingsGearBtn.listeners.click || [])[0]({stopPropagation(){}});
assert.strictEqual(elements.settingsPanel.hidden, false, 'settings gear click should toggle the panel');
assert.strictEqual((elements.privacyLocalDataBtn.listeners.click || []).length, 1, 'Privacy & Local Data should bind once');
(elements.privacyLocalDataBtn.listeners.click || [])[0]({currentTarget:elements.privacyLocalDataBtn});
assert.strictEqual(elements.localDataHelpModal.classList.contains('open'), true, 'Privacy & Local Data should open the local-data dialog');

const keydownBeforeGuards = (documentListeners.keydown || []).length;
context.installUiProtectionGuards();
const keydownAfterFirstGuard = (documentListeners.keydown || []).length;
context.installUiProtectionGuards();
assert.strictEqual((documentListeners.keydown || []).length, keydownAfterFirstGuard, 'keyboard guard should bind only once');
assert.strictEqual(keydownAfterFirstGuard, keydownBeforeGuards + 1, 'UI protection should add exactly one keyboard guard');
assert.strictEqual((windowListeners.click || []).length, 1, 'download guard should bind only once per event type on window');
assert.strictEqual((documentListeners.click || []).length, 1, 'download guard should bind only once per event type on document');
assert.strictEqual(context.__observerStarted, true, 'mutation observer should be installed for new controls');

context.installPrimarySafeControls();
assert.strictEqual((elements.createUniverseBtn.listeners.click || []).length, 1, 'primary safe controls should bind create-universe once');
context.installPrimarySafeControls();
assert.strictEqual((elements.createUniverseBtn.listeners.click || []).length, 1, 'primary safe controls should stay idempotent');

const root = path.resolve(__dirname, '..', '..');
const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
assert.ok(htmlName, 'Wormholes beta html file should exist');
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const order = ['scripts/bridges-map.js', 'scripts/modals-settings.js', 'scripts/export-import.js', 'scripts/wormholes-app.js'].map(src => html.indexOf(src));
assert.ok(order.every(index => index !== -1), 'expected script tags should be present');
assert.ok(order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'modals-settings.js should load after map modules, before export-import.js, and before wormholes-app.js');

const appScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app.js'), 'utf8');
const bootstrapScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'bootstrap.js'), 'utf8');
const startupScript = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-startup.js'), 'utf8');
assert.ok(!/function\s+setSettingsStatus\s*\(/.test(appScript), 'setSettingsStatus should be cordoned off from wormholes-app.js');
assert.ok(!/function\s+toggleSettingsMenu\s*\(/.test(appScript), 'toggleSettingsMenu should be cordoned off from wormholes-app.js');
assert.ok(!/function\s+protectAllControls\s*\(/.test(appScript), 'protectAllControls should be cordoned off from wormholes-app.js');
assert.ok(/installSettingsMenuHandlers\(\)/.test(bootstrapScript), 'bootstrap startup should install settings menu handlers');
assert.ok(/installUiProtectionGuards\(\)/.test(startupScript), 'startup coordinator should install UI protection guards');

console.log('modals-settings-module.unit.js passed');

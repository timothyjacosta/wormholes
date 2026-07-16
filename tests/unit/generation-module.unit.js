const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeClassList(){
  const classes = new Set();
  return {
    add(name){ classes.add(name); },
    remove(name){ classes.delete(name); },
    toggle(name, force){
      if(force === undefined){
        if(classes.has(name)){ classes.delete(name); return false; }
        classes.add(name); return true;
      }
      if(force) classes.add(name); else classes.delete(name);
      return !!force;
    },
    contains(name){ return classes.has(name); },
    toString(){ return [...classes].join(' '); }
  };
}

function makeElement(id){
  return {
    id,
    value:'',
    checked:false,
    textContent:'',
    innerHTML:'',
    dataset:{},
    style:{},
    disabled:false,
    options:[],
    classList:makeClassList(),
    listeners:{},
    focus(){ this.__focused = true; },
    addEventListener(type, fn){ this.listeners[type] = fn; },
    getBoundingClientRect(){ return {width:120, height:40}; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; }
  };
}

const ids = [
  'skipRollAnimationToggle','manualTitle','manualWhat','manualWhatCustom','manualAttr1','manualAttr1Custom',
  'manualAttr2','manualAttr2Custom','manualStory','manualStoryCustom','manualError','saveManualBtn',
  'clearManualBtn','manualDraftStatus','titleError','modalTitle','creationTitleInput','titleModal'
];
const elements = Object.fromEntries(ids.map(id => [id, makeElement(id)]));
elements.titleModal.querySelector = () => makeElement('titleModalNote');

function setSelectOptions(id, values){
  elements[id].options = values.map(value => ({
    value,
    textContent:value || 'Choose...',
    dataset:{},
    disabled:false
  }));
}
setSelectOptions('manualAttr1', ['', 'Ancient', 'Living', '__custom__']);
setSelectOptions('manualAttr2', ['', 'Ancient', 'Living', '__custom__']);

const localStore = {};
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
  localStorage:{
    getItem(key){ return Object.prototype.hasOwnProperty.call(localStore, key) ? localStore[key] : null; },
    setItem(key, value){ localStore[key] = String(value); },
    removeItem(key){ delete localStore[key]; }
  },
  window:{
    matchMedia(){ return {matches:false}; },
    addEventListener(){}
  },
  document:{
    getElementById(id){ return elements[id] || makeElement(id); },
    querySelector(selector){
      if(selector === '.generate-bottom-controls' || selector === '.creation-action-buttons' || selector === '.skip-roll-toggle') return makeElement(selector);
      if(selector === '#titleModal .modal p') return makeElement('titleModalNote');
      return null;
    },
    querySelectorAll(selector){
      if(selector === '.custom-input') return [elements.manualWhatCustom, elements.manualAttr1Custom, elements.manualAttr2Custom, elements.manualStoryCustom];
      return [];
    }
  },
  requestAnimationFrame(fn){ fn(Date.now()); },
  ResizeObserver: undefined,
  currentUniverseId:'u1',
  archiveEntries:[],
  makeId(){ return 'manual-1'; },
  entryHasArchivableCreationData(values){ return !!(values && (values.what || values.attr1 || values.attr2 || values.pressure)); },
  saveArchiveToStorage(){ context.__savedArchive = true; return true; },
  writeArchiveEntryToFolderIfNeeded(entry){ context.__folderWrite = entry.id; return Promise.resolve(); },
  renderArchive(){ context.__renderedArchive = true; },
  renderCurrent(){ context.__renderedCurrent = true; },
  updateButtons(){ context.__updatedButtons = true; },
  showSavedToast(){ context.__savedToast = true; },
  setAppButtonDisabled(el, disabled){ if(el) el.disabled = !!disabled; },
  syncAllAppButtonStates(){ context.__syncedButtons = true; }
};
context.globalThis = context;
context.window.window = context.window;
const undoOffers = [];
context.window.WormholesUndo = {
  offer(options){ undoOffers.push(options); return true; }
};
context.window.WormholesActivityLog = {
  recordAction(message){ context.__generationLogMessage = message; }
};
const manualDraftStore = Object.create(null);
context.window.WormholesManualDrafts = {
  fieldsHaveData(fields){ return Object.values(fields || {}).some(value => String(value || '').trim()); },
  saveDraft(universeId, fields){
    manualDraftStore[universeId] = {fields:{...fields}, updatedAt:new Date().toISOString()};
    return {ok:true, draft:manualDraftStore[universeId]};
  },
  getDraft(universeId){ return manualDraftStore[universeId] || null; },
  removeDraft(universeId){ delete manualDraftStore[universeId]; return true; }
};

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'generation.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/generation.js'});

assert.strictEqual(typeof context.rollWhat, 'function', 'rollWhat should remain globally callable');
assert.strictEqual(typeof context.quickFullRoll, 'function', 'quickFullRoll should remain globally callable');
assert.strictEqual(typeof context.saveManualCreation, 'function', 'saveManualCreation should remain globally callable');
assert.strictEqual(typeof context.animateD20, 'function', 'animateD20 should remain globally callable');

assert.strictEqual(context.resultFromRoll(['a', 'b', 'c'], 1).val, 'a');
assert.strictEqual(context.resultFromRoll(['a', 'b', 'c'], 20).val, 'c');
assert.strictEqual(context.resultFromAttributeRoll(1).roll, 1, 'attribute rolls should start at 1');
assert.strictEqual(context.resultFromAttributeRoll(40).roll, 40, 'attribute rolls should reach 40');
assert.strictEqual(context.normalizedAttributeValue('  Ancient   Thing '), 'ancient thing');

vm.runInContext('current = {what:null, attr1:{val:"Ancient"}, attr2:null, pressure:null}; skipRollAnimation = true;', context);
const excluded = context.resultFromAttributeRollExcluding(1, ['Ancient but still active']);
assert.notStrictEqual(context.normalizedAttributeValue(excluded.val), context.normalizedAttributeValue('Ancient but still active'), 'duplicate attribute values should be avoided when possible');

localStore.wormholesSkipRollAnimation = 'true';
context.loadSkipRollAnimation();
assert.strictEqual(elements.skipRollAnimationToggle.checked, true, 'skip animation preference should load into the checkbox');
elements.skipRollAnimationToggle.checked = false;
context.handleSkipRollAnimationToggle({target:elements.skipRollAnimationToggle});
assert.strictEqual(localStore.wormholesSkipRollAnimation, 'false', 'skip animation preference should save from the checkbox');

vm.runInContext('current = {what:null, attr1:null, attr2:null, pressure:null}; skipRollAnimation = true;', context);
context.rollWhat();
assert.ok(vm.runInContext('current.what', context), 'rollWhat should fill the current creation when animation is skipped');
assert.strictEqual(context.__renderedCurrent, true, 'rollWhat should re-render current creation');

assert.strictEqual(typeof context.toggleGenerationFieldLock, 'function', 'field locks should remain globally callable');
assert.strictEqual(typeof context.rerollGenerationField, 'function', 'individual rerolls should remain globally callable');
assert.strictEqual(context.toggleGenerationFieldLock('what'), true, 'a rolled field should be lockable');
assert.strictEqual(context.generationUiSnapshot().locks.what, true, 'lock state should be included in the UI snapshot');

vm.runInContext(`
  current = {
    what:{val:"Locked What", roll:1},
    attr1:{val:"Ancient but still active", roll:1},
    attr2:{val:"Living, semi-living, or biologically engineered", roll:5},
    pressure:{val:"It is being hunted, stolen, or captured.", roll:1}
  };
  currentLocks = {what:true, attr1:false, attr2:true, pressure:false};
  skipRollAnimation = true;
`, context);
const beforeQuick = JSON.parse(JSON.stringify(context.generationUiSnapshot()));
context.quickFullRoll();
const afterQuick = context.generationUiSnapshot();
assert.strictEqual(afterQuick.current.what.val, beforeQuick.current.what.val, 'Quick Roll should preserve a locked What field');
assert.strictEqual(afterQuick.current.attr2.val, beforeQuick.current.attr2.val, 'Quick Roll should preserve a locked second attribute');
assert.notStrictEqual(afterQuick.current.attr1.val, beforeQuick.current.attr1.val, 'Quick Roll should reroll an unlocked first attribute');
assert.notStrictEqual(afterQuick.current.pressure.val, beforeQuick.current.pressure.val, 'Quick Roll should reroll an unlocked Story field');
assert.strictEqual(undoOffers.at(-1).message, 'Quick Roll changed 2 fields', 'Quick Roll rerolls should offer a concise undo');

const lockedAttr2 = afterQuick.current.attr2.val;
assert.strictEqual(context.rerollGenerationField('attr2'), false, 'locked fields should reject individual rerolls');
assert.strictEqual(context.generationUiSnapshot().current.attr2.val, lockedAttr2);

assert.strictEqual(context.toggleGenerationFieldLock('attr2'), false, 'a locked field should be unlockable');
const beforeAttr2Reroll = context.generationUiSnapshot().current.attr2.val;
assert.strictEqual(context.rerollGenerationField('attr2'), true, 'an unlocked field should allow an individual reroll');
assert.notStrictEqual(context.generationUiSnapshot().current.attr2.val, beforeAttr2Reroll, 'individual rerolls should change the selected field');
assert.strictEqual(undoOffers.at(-1).message, 'Re-rolled Attribute 2');

// Manual draft persistence and save flow.
elements.manualTitle.value = 'Unfinished Draft';
elements.manualWhat.value = '__custom__';
elements.manualWhatCustom.value = 'Clockwork Orchard';
context.handleManualCreateFieldChange();
assert.strictEqual(manualDraftStore.u1.fields.manualTitle, 'Unfinished Draft', 'manual field changes should save a per-universe draft');
assert.strictEqual(elements.manualDraftStatus.textContent, 'Draft saved locally.');

elements.manualTitle.value = '';
elements.manualWhat.value = '';
elements.manualWhatCustom.value = '';
context.restoreManualCreateDraftForCurrentUniverse();
assert.strictEqual(elements.manualTitle.value, 'Unfinished Draft', 'saved draft should restore into the manual form');
assert.strictEqual(elements.manualWhatCustom.value, 'Clockwork Orchard');
assert.ok(elements.manualDraftStatus.textContent.includes('Restored unfinished draft'));

// Manual duplicate protection and save flow.
elements.manualTitle.value = 'Manual Creation';
elements.manualWhat.value = 'Custom What';
elements.manualAttr1.value = 'Ancient';
elements.manualAttr2.value = 'Ancient';
elements.manualStory.value = '';
assert.strictEqual(context.manualAttributeDuplicateExists(), true, 'manual duplicate attributes should be detected');
context.updateManualButtons();
assert.strictEqual(elements.saveManualBtn.disabled, true, 'manual save should be disabled for duplicate attributes');

elements.manualAttr2.value = 'Living';
assert.strictEqual(context.manualAttributeDuplicateExists(), false, 'different attributes should be allowed');
context.updateManualButtons();
assert.strictEqual(elements.saveManualBtn.disabled, false, 'manual save should be enabled with title and creation data');

(async () => {
  await undoOffers.at(-1).undo();
  assert.strictEqual(context.generationUiSnapshot().current.attr2.val, beforeAttr2Reroll, 'individual reroll undo should restore the previous field value');

  const beforeNewCreation = context.generationUiSnapshot().current.what.val;
  context.newCreation();
  assert.strictEqual(context.generationUiSnapshot().hasCreation, false, 'New Creation should clear the generated result');
  assert.strictEqual(undoOffers.at(-1).message, 'Started a new creation');
  await undoOffers.at(-1).undo();
  assert.strictEqual(context.generationUiSnapshot().current.what.val, beforeNewCreation, 'New Creation undo should restore the previous result');

  await context.saveManualCreation();
  assert.strictEqual(context.archiveEntries.length, 1, 'manual save should add an archive entry');
  assert.strictEqual(context.archiveEntries[0].title, 'Manual Creation');
  assert.strictEqual(context.__savedArchive, true, 'manual save should persist archive storage');
  assert.strictEqual(context.__folderWrite, 'manual-1', 'manual save should attempt folder sync through archive helper');
  assert.strictEqual(context.__renderedArchive, true, 'manual save should render archive');
  assert.strictEqual(context.__savedToast, true, 'manual save should show normal saved toast');
  assert.strictEqual(manualDraftStore.u1, undefined, 'successful archive should remove the unfinished draft');

  const root = path.resolve(__dirname, '..', '..');
  const htmlName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, {numeric:true})).pop();
  assert.ok(htmlName, 'Wormholes beta html file should exist');
  const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
  const order = ['scripts/export-import.js', 'scripts/generation.js', 'scripts/wormholes-app.js'].map(src => html.indexOf(src));
  assert.ok(order.every(index => index !== -1), 'generation script and neighbors should be present');
  assert.ok(order[0] < order[1] && order[1] < order[2], 'generation.js should load after export-import.js and before wormholes-app.js');

  const appScript = fs.readFileSync(path.resolve(root, 'scripts', 'wormholes-app.js'), 'utf8');
  assert.ok(!/function\s+quickFullRoll\s*\(/.test(appScript), 'quickFullRoll should be cordoned off from wormholes-app.js');
  assert.ok(!/function\s+saveManualCreation\s*\(/.test(appScript), 'saveManualCreation should be cordoned off from wormholes-app.js');
  assert.ok(!/const\s+what\s*=\s*\[/.test(appScript), 'generation tables should be cordoned off from wormholes-app.js');

  const shellScript = fs.readFileSync(path.resolve(root, 'scripts', 'wormholes-shell-interface.js'), 'utf8');
  assert.match(shellScript, /data-generation-action="reroll"/, 'rendered fields should include individual reroll controls');
  assert.match(shellScript, /data-generation-action="lock"/, 'rendered fields should include lock controls');
  assert.match(shellScript, /aria-pressed=/, 'lock controls should expose their pressed state');

  const bootstrapScript = fs.readFileSync(path.resolve(root, 'scripts', 'bootstrap.js'), 'utf8');
  assert.match(bootstrapScript, /rerollGenerationField/, 'bootstrap should route field reroll actions');
  assert.match(bootstrapScript, /toggleGenerationFieldLock/, 'bootstrap should route field lock actions');

  const css = fs.readFileSync(path.resolve(root, 'styles', 'reskin.css'), 'utf8');
  assert.match(css, /\.generation-field-button\s*\{[\s\S]*?width:\s*30px;/, 'field controls should stay compact');
  assert.match(css, /\.generation-field-button:focus-visible/, 'field controls should have a visible keyboard focus state');
  assert.match(css, /\.generation-field-button\s*\{[\s\S]*?color:\s*#12355b;/, 'field control graphics should use the darker blue contrast color');
  assert.match(css, /\.generation-reroll-icon\s*\{[\s\S]*?font-size:\s*1\.35rem;/, 'reroll graphics should be larger without enlarging their buttons');
  assert.match(css, /\.generation-lock-icon\s*\{[\s\S]*?width:\s*19px;[\s\S]*?height:\s*19px;/, 'lock graphics should be larger without enlarging their buttons');
  assert.match(css, /\.generation-lock-icon\s+path\s*\{[\s\S]*?fill:\s*none\s*!important;[\s\S]*?stroke:\s*#12355b\s*!important;/, 'padlock shackle should use the reroll graphic dark blue');
  assert.match(css, /\.generation-lock-icon\s+rect\s*\{[\s\S]*?fill:\s*#12355b\s*!important;[\s\S]*?stroke:\s*#12355b\s*!important;/, 'padlock body should use the reroll graphic dark blue');
  console.log('generation-module.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

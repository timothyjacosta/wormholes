const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function classList(active = false){
  const values = new Set(active ? ['active'] : []);
  return {
    contains(name){ return values.has(name); },
    add(name){ values.add(name); },
    remove(name){ values.delete(name); }
  };
}

const elements = {
  literatureEditorScreen:{classList:classList(true)},
  literatureTitleInput:{value:'Saved title'},
  literatureEditor:{innerHTML:'<p>Saved body</p>'},
  literatureSaveStatus:{dataset:{state:'saved'}, textContent:'Saved in app'}
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
  currentUniverseId:'u1',
  literatureEntries:[{id:'doc-1', title:'Saved title', content:'<p>Saved body</p>'}],
  activeLiteratureId:'doc-1',
  document:{
    getElementById(id){ return elements[id] || null; },
    querySelectorAll(){ return []; },
    createElement(){ return {innerHTML:'', textContent:'', innerText:''}; }
  },
  window:{},
  setTimeout(){ return 1; },
  clearTimeout(){},
  sanitizeLiteratureHtml(value){ return String(value || ''); },
  literaturePlainPreview(value){ return String(value || '').replace(/<[^>]*>/g, ' ').trim(); },
  uniqueList(list){ return Array.from(new Set((list || []).filter(Boolean))); },
  tagEntryKey(universeId, entryId){ return `${universeId}::${entryId}`; },
  persistLargeDataValue:async () => true,
  largeDataStoreAvailable:() => true,
  reportAppError(){},
  requestStorageFootnoteUpdate(){},
  renderLiteratureList(){},
  refreshLiteratureLinkDisplays(){},
  showSavedToast(){},
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'literature.js'), 'utf8'), context);
context.sanitizeLiteratureHtml = value => String(value || '');
context.literaturePlainPreview = value => String(value || '').replace(/<[^>]*>/g, ' ').trim();

function setVersions(changeVersion, savedVersion){
  vm.runInContext(`literatureEditorChangeVersion = ${changeVersion}; literatureEditorSavedVersion = ${savedVersion};`, context);
}

function unloadEvent(){
  return {
    prevented:false,
    returnValue:undefined,
    preventDefault(){ this.prevented = true; }
  };
}

// A fully saved editor should never irritate the user with a warning.
setVersions(1, 1);
elements.literatureSaveStatus.dataset.state = 'saved';
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), false);
let event = unloadEvent();
assert.strictEqual(context.handleLiteratureBeforeUnload(event), undefined);
assert.strictEqual(event.prevented, false);

// Dirty edits should activate the browser-native warning.
setVersions(2, 1);
elements.literatureSaveStatus.dataset.state = 'dirty';
elements.literatureTitleInput.value = 'Changed title';
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), true);
event = unloadEvent();
assert.strictEqual(context.handleLiteratureBeforeUnload(event), '');
assert.strictEqual(event.prevented, true);
assert.strictEqual(event.returnValue, '');

// An in-progress or failed save remains unresolved even while the save state changes.
elements.literatureSaveStatus.dataset.state = 'saving';
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), true);
elements.literatureSaveStatus.dataset.state = 'error';
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), true);

// A title-blocked new draft with authored body text should warn.
context.activeLiteratureId = null;
elements.literatureTitleInput.value = '';
elements.literatureEditor.innerHTML = '<p>Unsaved body text</p>';
elements.literatureSaveStatus.dataset.state = 'needs-title';
setVersions(1, 0);
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), true);

// Returning a brand-new draft to a truly empty state should remove the warning.
elements.literatureEditor.innerHTML = '';
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), false);

// Existing documents still warn if the user clears the required title.
context.activeLiteratureId = 'doc-1';
elements.literatureSaveStatus.dataset.state = 'needs-title';
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), true);

// Once autosave succeeds, the warning disappears immediately.
elements.literatureTitleInput.value = 'Saved title';
elements.literatureEditor.innerHTML = '<p>Saved body</p>';
elements.literatureSaveStatus.dataset.state = 'saved';
setVersions(2, 2);
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), false);

// No warning should leak after the editor closes.
elements.literatureEditorScreen.classList.remove('active');
elements.literatureSaveStatus.dataset.state = 'error';
setVersions(3, 2);
assert.strictEqual(context.literatureEditorHasUnresolvedChanges(), false);

console.log('literature-abandonment-warning.unit.js passed');

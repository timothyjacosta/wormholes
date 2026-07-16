const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  literatureEntries:[],
  document:{
    getElementById(){ return null; },
    querySelectorAll(){ return []; },
    createElement(){ return { innerHTML:'', textContent:'', innerText:'' }; }
  },
  window:{},
  uniqueList(list){ return Array.from(new Set((list || []).filter(Boolean))); },
  tagEntryKey(universeId, entryId){ return `${universeId}::${entryId}`; },
  escapeHtml(text){
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  saveLiteratureToStorage(){ context.__savedLiterature = true; return true; }
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'literature.js'), 'utf8'), context);

assert.strictEqual(typeof context.getLiteratureDoc, 'function', 'literature module should expose literature helpers globally');
assert.strictEqual(context.literatureFileKind({name:'notes.docx', type:''}), 'docx');
assert.strictEqual(context.literatureFileKind({name:'notes.txt', type:'text/plain'}), 'text');
assert.strictEqual(context.literatureFileKind({name:'notes.pdf', type:'application/pdf'}), 'unsupported');

context.sanitizeLiteratureHtml = value => String(value || '');
context.normalizeImportedTags = tags => tags || {universes:[], entries:[]};


const normalizedImportedDocument = context.normalizeImportedLiteratureDoc({
  id:'imported-doc',
  title:'Imported document',
  content:'<p>Safe text</p>',
  tags:{universes:[], entries:[]}
}, 'u1');
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(normalizedImportedDocument, 'groupIds'),
  false,
  'normal imported Literature documents must not retain an own groupIds property with an undefined value'
);
const normalizedImportedGroup = context.normalizeImportedLiteratureDoc({
  id:'imported-group',
  kind:'literatureGroup',
  title:'Imported group',
  groupIds:['imported-doc']
}, 'u1');
assert.deepStrictEqual(normalizedImportedGroup.groupIds, ['imported-doc'], 'imported Literature groups should retain normalized membership');

const docA = {id:'doc-a', title:'A', tags:{universes:['u1'], entries:[{universeId:'u1', entryId:'e1'}]}};
const docB = {id:'doc-b', title:'B', tags:{universes:['u1','u2'], entries:[{universeId:'u2', entryId:'e2'}]}};
const group = {id:'group-1', kind:'literatureGroup', title:'Group', fileType:'group', groupIds:['doc-a','doc-b']};
context.literatureEntries = [group, docA, docB];

assert.strictEqual(context.isLiteratureGroup(group), true);
assert.strictEqual(context.isLiteratureGroup({id:'legacy-group', fileType:'group', groupIds:['doc-a', 'doc-b']}), true, 'legacy fileType=group literature records should remain expandable');
assert.deepStrictEqual(context.literatureGroupChildIds(group), ['doc-a', 'doc-b']);
assert.strictEqual(context.getLiteratureDoc('doc-a'), docA);
assert.strictEqual(context.getLiteratureGroupForDocId('doc-b'), group);
assert.deepStrictEqual(context.topLevelLiteratureEntries(context.literatureEntries).map(item => item.id), ['group-1']);
assert.deepStrictEqual(context.literatureGroupChildDocs(group).map(item => item.id), ['doc-a', 'doc-b']);

const normalizedTags = context.normalizeLiteratureTags({
  universes:['u1', '', 'u1', 'u2'],
  entries:[
    {universeId:'u1', entryId:'e1'},
    {universeId:'u1', entryId:'e1'},
    {universeId:'', entryId:'missing'},
    {universeId:'u2', entryId:'e2'}
  ]
});
assert.strictEqual(JSON.stringify(normalizedTags), JSON.stringify({
  universes:['u1', 'u2'],
  entries:[{universeId:'u1', entryId:'e1'}, {universeId:'u2', entryId:'e2'}]
}));

const union = context.literatureGroupTagUnion(['doc-a', 'doc-b'], {universes:['u3'], entries:[]}, context.literatureEntries);
assert.deepStrictEqual(Array.from(union.universes).sort(), ['u1', 'u2', 'u3']);
assert.strictEqual(JSON.stringify(union.entries), JSON.stringify([{universeId:'u1', entryId:'e1'}, {universeId:'u2', entryId:'e2'}]));

assert.strictEqual(context.literatureFileTypeLabel(group), 'Literature Group');
assert.strictEqual(context.plainTextToLiteratureHtml('One\n\nTwo'), '<p>One</p><p>Two</p>');

let prevented = 0;
let stopped = 0;
let stoppedImmediate = 0;
const classNames = new Set();
const fakeEntry = {
  dataset:{id:'group-1'},
  classList:{
    toggle(name){ classNames.has(name) ? classNames.delete(name) : classNames.add(name); },
    contains(name){ return classNames.has(name); }
  }
};
const fakeButton = {
  attrs:{},
  closest(selector){ return selector === '.literature-entry' ? fakeEntry : null; },
  setAttribute(name, value){ this.attrs[name] = value; }
};
context.handleLiteratureTitleToggle(fakeButton, {
  preventDefault(){ prevented += 1; },
  stopPropagation(){ stopped += 1; },
  stopImmediatePropagation(){ stoppedImmediate += 1; }
});
assert.strictEqual(classNames.has('open'), true, 'literature group title should expand the group');
assert.strictEqual(fakeButton.attrs['aria-expanded'], 'true');
assert.strictEqual(prevented, 1);
assert.strictEqual(stopped, 1);
assert.strictEqual(stoppedImmediate, 1);
context.handleLiteratureTitleToggle(fakeButton, {
  preventDefault(){ prevented += 1; },
  stopPropagation(){ stopped += 1; },
  stopImmediatePropagation(){ stoppedImmediate += 1; }
});
assert.strictEqual(stoppedImmediate, 2);
assert.strictEqual(classNames.has('open'), false, 'literature group title should collapse the group');
assert.strictEqual(fakeButton.attrs['aria-expanded'], 'false');

let captureHandler = null;
let bubbleHandler = null;
const fakeList = {
  dataset:{},
  contains(node){ return node === fakeButton; },
  addEventListener(type, handler, options){
    if(type === 'click' && options === true) captureHandler = handler;
    else if(type === 'click') bubbleHandler = handler;
  }
};
context.installLiteratureListControlDelegation(fakeList);
assert.strictEqual(typeof captureHandler, 'function', 'literature list should install a capture-phase title handler');
assert.strictEqual(typeof bubbleHandler, 'function', 'literature list should keep delegated controls handler');
classNames.add('open');
fakeButton.closest = selector => selector === '.literature-title-toggle' ? fakeButton : (selector === '.literature-entry' ? fakeEntry : null);
captureHandler({
  target:fakeButton,
  preventDefault(){ prevented += 1; },
  stopPropagation(){ stopped += 1; },
  stopImmediatePropagation(){ stoppedImmediate += 1; }
});
assert.strictEqual(classNames.has('open'), false, 'capture-phase literature title handler should collapse an expanded group exactly once');
assert.strictEqual(fakeButton.attrs['aria-expanded'], 'false');

console.log('literature-module.unit.js passed');

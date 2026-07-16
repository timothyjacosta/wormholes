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
  Blob,
  currentUniverseId:'u1',
  universes:[{id:'u1', title:'Alpha'}, {id:'u2', title:'Beta'}],
  archiveEntries:[
    {id:'e1', title:'Creation One'},
    {id:'g1', title:'Group One', kind:'group', groupIds:['e1']}
  ],
  visionEntries:[],
  document:{
    getElementById(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    createElement(){ return { style:{}, classList:{add(){}, remove(){}}, setAttribute(){}, appendChild(){}, remove(){}, dataset:{} }; }
  },
  window:{},
  URL:{ createObjectURL(){ return 'blob:test'; }, revokeObjectURL(){} },
  CSS:{ escape(value){ return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); } },
  navigator:{},
  localFoldersEnabled:false,
  visionFolderHandle:null,
  activeVisionTagId:null,
  activeLiteratureTagId:null,
  expandedLiteratureTagGroups:new Set(),
  activeVisionTagGoTarget:null,
  expandedVisionId:null,
  expandedVisionPlaceholder:null,
  visionObjectUrls:[],
  visionLinksObjectUrls:[],
  visionImageViewerObjectUrl:'',
  visionMoveMode:false,
  activeVisionDragId:null,
  activeVisionDeleteId:null,
  activeVisionRenameId:null,
  makeId(){ return 'made-id'; },
  normalizeLiteratureTags(tags){
    return {
      universes:Array.from(new Set((tags?.universes || []).filter(Boolean))),
      entries:(tags?.entries || [])
        .filter(tag => tag && tag.universeId && tag.entryId)
        .filter((tag, index, arr) => arr.findIndex(other => other.universeId === tag.universeId && other.entryId === tag.entryId) === index)
        .map(tag => ({universeId:tag.universeId, entryId:tag.entryId}))
    };
  },
  normalizeImportedTags(tags){ return context.normalizeLiteratureTags(tags); },
  readArchiveForUniverse(universeId){
    return universeId === 'u1' ? context.archiveEntries : [{id:'e2', title:'Other Creation'}];
  },
  getUniverseTitle(id){ return context.universes.find(universe => universe.id === id)?.title || ''; },
  isGroupEntry(entry){ return !!entry && entry.kind === 'group'; },
  readMigratedLocalStorageValue(){ return null; },
  readPersistedDatasetData(primaryKey, oldKey, fallbackValue){ return fallbackValue; },
  visionStorageKey(id = 'u1'){ return `vision:${id}`; },
  oldVisionStorageKey(id = 'u1'){ return `old-vision:${id}`; },
  writeJsonToLocalStorage(){ context.__wroteVision = true; return true; },
  saveLocalStorageJson(){ context.__wroteVision = true; return true; },
  requestStorageFootnoteUpdate(){ context.__storageFootnoteUpdated = true; },
  scheduleVisionLargeDataSave(){ return Promise.resolve(); },
  reportAppError(){},
  largeDataStoreAvailable(){ return false; },
  largeDataStore(){ return { delete(){ return Promise.resolve(); }, get(){ return Promise.resolve(null); }, set(){ return Promise.resolve(); } }; },
  loadLargeDataValue(){ return Promise.resolve(''); },
  persistLargeDataValue(){ return Promise.resolve(true); },
  dataUrlToBlob(dataUrl){ return new Blob([dataUrl]); },
  escapeHtml(text){
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  compactText(text){ return String(text || '').trim(); },
  setContextualAriaLabel(){},
  syncAllAppButtonStates(){},
  protectAllControls(){},
  closeMenus(){},
  showSavedToast(){ context.__toastShown = true; },
  switchTab(){},
  revealArchiveEntryForTag(){},
  enterUniverse(id){ context.currentUniverseId = id; },
  nestedPickerKey(type, id){ return `${type}:${id}`; },
  initializeTagPickerDraft(){},
  renderLiteratureTagList(){},
  toggleDraftUniverseTag(){ context.__toggledUniverse = true; },
  toggleDraftEntryTag(){ context.__toggledEntry = true; }
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'vision-board.js'), 'utf8'), context, {filename:'scripts/vision-board.js'});

assert.strictEqual(typeof context.normalizeVisionEntry, 'function', 'vision board module should expose vision helpers globally');
assert.strictEqual(typeof context.renderVisionBoard, 'function', 'vision board renderer should remain globally callable');
assert.strictEqual(typeof context.uploadVisionFiles, 'function', 'vision upload helper should remain globally callable');

assert.strictEqual(typeof context.startVisionPointerDrag, 'function', 'vision drag pointer helper should remain globally callable');
assert.strictEqual(typeof context.finishVisionPointerDrag, 'function', 'vision drag finish helper should remain globally callable');
assert.strictEqual(typeof context.clearVisionDragIndicators, 'function', 'vision drag cleanup helper should remain globally callable');

assert.strictEqual(context.visionFileKind({name:'map.png', type:'image/png'}), 'image');
assert.strictEqual(context.visionFileKind({name:'guide.pdf', type:'application/pdf'}), 'unsupported');
assert.strictEqual(context.visionFileKind({name:'notes.txt', type:'text/plain'}), 'unsupported');
assert.strictEqual(context.visionOutputMimeTypeForFile({name:'art.png', type:'image/png'}), 'image/png');
assert.strictEqual(context.visionExtensionForMimeType('image/webp', '.jpg'), '.jpg');
assert.strictEqual(context.visionExtensionForMimeType('image/unknown', '.jpg'), '.jpg');
assert.strictEqual(context.mimeTypeFromDataUrl('data:image/png;base64,AAAA'), 'image/png');
assert.strictEqual(context.dataUrlWithMimeType('data:application/octet-stream;base64,AAAA', 'image/jpeg'), 'data:image/jpeg;base64,AAAA');

assert.strictEqual(context.isSafeImportedVisionImageDataUrl('data:image/png;base64,AAAA'), true);
assert.strictEqual(context.isSafeImportedVisionImageDataUrl('data:image/jpeg;base64,/9j/AA=='), true);
assert.strictEqual(context.isSafeImportedVisionImageDataUrl('data:text/html;base64,PHNjcmlwdD4='), false);
assert.strictEqual(context.isSafeImportedVisionImageDataUrl('data:image/svg+xml;base64,PHN2Zy8+'), false);
assert.strictEqual(context.isSafeImportedVisionImageDataUrl('javascript:alert(1)'), false);
const importedVision = context.normalizeImportedVisionItem({
  id:'imported-safe',
  title:'Imported Safe',
  mimeType:'image/png',
  dataUrl:'data:image/png;base64,AAAA',
  thumbnailDataUrl:'data:image/jpeg;base64,/9j/AA==',
  dataStoreKey:'external:bad:key',
  thumbnailStoreKey:'external:bad:thumb'
}, 'u1');
assert.strictEqual(importedVision.dataUrl, 'data:image/png;base64,AAAA');
assert.strictEqual(importedVision.thumbnailDataUrl, 'data:image/jpeg;base64,/9j/AA==');
assert.strictEqual(importedVision.mimeType, 'image/png');
assert.strictEqual(importedVision.dataStoreKey, 'vision:u1:imported-safe:dataUrl');
assert.strictEqual(importedVision.thumbnailStoreKey, 'vision:u1:imported-safe:thumbnailDataUrl');
const importedUnsafeVision = context.normalizeImportedVisionItem({
  id:'imported-unsafe',
  title:'Imported Unsafe',
  mimeType:'text/html',
  dataUrl:'data:text/html;base64,PHNjcmlwdD4=',
  thumbnailDataUrl:'data:image/svg+xml;base64,PHN2Zy8+',
  dataStored:'embedded-export',
  thumbnailStored:'embedded-export'
}, 'u1');
assert.strictEqual(importedUnsafeVision.dataUrl, '', 'unsafe imported image data URL should be stripped');
assert.strictEqual(importedUnsafeVision.thumbnailDataUrl, '', 'unsafe imported thumbnail data URL should be stripped');
assert.strictEqual(importedUnsafeVision.mimeType, '', 'unsafe imported MIME type should not be preserved');
assert.strictEqual(importedUnsafeVision.dataStored, '', 'stripped image data should not preserve stored marker');
assert.strictEqual(importedUnsafeVision.thumbnailStored, '', 'stripped thumbnail data should not preserve stored marker');

const normalized = context.normalizeVisionEntry({
  id:'v1',
  title:'Image One',
  type:'image',
  mimeType:'image/png',
  tags:{universes:['u1'], entries:[{universeId:'u1', entryId:'e1'}]}
});
assert.strictEqual(normalized.id, 'v1');
assert.strictEqual(normalized.title, 'Image One');
assert.strictEqual(normalized.fileType, 'image');
assert.strictEqual(normalized.mimeType, 'image/png');
assert.strictEqual(JSON.stringify(normalized.tags), JSON.stringify({universes:['u1'], entries:[{universeId:'u1', entryId:'e1'}]}));
assert.ok(normalized.dataStoreKey.includes('vision:u1:v1:dataUrl'));

context.visionEntries = [normalized, {id:'v2', title:'Image Two', tags:{universes:['u2'], entries:[{universeId:'u2', entryId:'e2'}]}}];
assert.strictEqual(context.getVisionItem('v1'), normalized);
assert.strictEqual(context.visionItemHasUniverseTag(normalized, 'u1'), true);
assert.strictEqual(context.visionItemHasEntryTag(normalized, 'u1', 'e1'), true);
assert.strictEqual(context.visionCountForUniverseTag('u1'), 1);
assert.strictEqual(context.visionCountForEntryTag('u1', 'e1'), 1);
assert.strictEqual(JSON.stringify(context.visionTagLabels(normalized)), JSON.stringify(['Universe: Alpha', 'Creation: Creation One (Alpha)']));
assert.strictEqual(context.visionTagCount(normalized), 2);
assert.ok(context.visionTagCountBadgeHtml(normalized).includes('2'));
assert.ok(context.renderVisionTagsHtml(normalized).includes('Creation One'));

context.toggleVisionUniverseTag('u1');
context.toggleVisionEntryTag('u1', 'e1');
assert.strictEqual(context.__toggledUniverse, true);
assert.strictEqual(context.__toggledEntry, true);


function fakeClassList(){
  const values = new Set();
  return {
    values,
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    toggle(name, force){
      if(force === undefined){
        if(values.has(name)){ values.delete(name); return false; }
        values.add(name); return true;
      }
      if(force) values.add(name); else values.delete(name);
      return !!force;
    },
    contains(name){ return values.has(name); }
  };
}

const sourcePin = {
  dataset:{visionId:'v1'},
  classList:fakeClassList(),
  querySelector(){ return null; },
  getBoundingClientRect(){ return {left:0, right:100, top:0, bottom:100, width:100, height:100}; }
};
const targetPin = {
  dataset:{visionId:'v2'},
  classList:fakeClassList(),
  querySelector(){ return null; },
  getBoundingClientRect(){ return {left:120, right:220, top:0, bottom:100, width:100, height:100}; }
};
const dragLayer = {
  setPointerCapture(){ context.__capturedPointer = true; },
  releasePointerCapture(){ context.__releasedPointer = true; }
};
context.document = {
  getElementById(id){
    if(id === 'visionBoardGrid') return { getBoundingClientRect(){ return {left:0, right:260, top:0, bottom:140}; } };
    return null;
  },
  querySelector(){ return null; },
  querySelectorAll(selector){
    if(selector.includes('.vision-pin')) return [sourcePin, targetPin];
    return [];
  },
  createElement(){ return { style:{}, classList:fakeClassList(), setAttribute(){}, appendChild(){}, remove(){}, dataset:{} }; }
};
context.visionMoveMode = true;
context.visionEntries = [{id:'v1', title:'Image One'}, {id:'v2', title:'Image Two'}];
context.startVisionPointerDrag({
  button:0, pointerId:1, clientX:20, clientY:20,
  target:{ closest(){ return null; } },
  preventDefault(){ context.__dragPrevented = true; },
  stopPropagation(){}
}, sourcePin, dragLayer);
context.updateVisionPointerDrag({
  pointerId:1, clientX:180, clientY:20,
  preventDefault(){},
  stopPropagation(){}
});
context.finishVisionPointerDrag({
  pointerId:1, clientX:180, clientY:20,
  preventDefault(){},
  stopPropagation(){}
}, true);
assert.strictEqual(context.visionEntries[0].id, 'v2', 'pointer drag should move source after target when released on target right half');
assert.strictEqual(context.visionEntries[1].id, 'v1', 'pointer drag should reorder the dragged image');
assert.strictEqual(context.__toastShown, true, 'drag reorder should save through the normal save/toast path');

console.log('vision-board-module.unit.js passed');

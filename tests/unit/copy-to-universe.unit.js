const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'scripts/wormholes-copy-to-universe.js'), 'utf8');

function contextBase(){
  let id = 0;
  const context = {
    console,
    window:{},
    document:{getElementById(){return null;}, querySelectorAll(){return[];}},
    universes:[
      {id:'u1', title:'Source', summary:'', bridges:[]},
      {id:'u2', title:'Target', summary:'', bridges:[]}
    ],
    currentUniverseId:'u1',
    makeId(){ id += 1; return `new-${id}`; },
    escapeHtml(value){return String(value ?? '');},
    closeMenus(){},
    showSavedToast(){},
    showErrorToast(){},
    reportAppError(message, error){throw error || new Error(message);},
    requestFolderPermission:async()=>false,
    localFoldersEnabled:false,
    wormholesCreationsRootHandle:null,
    wormholesLiteratureRootHandle:null,
    wormholesImagesRootHandle:null,
    largeDataStoreAvailable(){return true;},
    windowWormholesEntityLimits:null,
    activeCopyItemType:null,
    activeCopyItemId:null,
    stagedCopyTargetUniverseId:null
  };
  context.window = context;
  context.WormholesEntityLimits = {ensure(){return {ok:true};}};
  context.WormholesDuplicateCreations = {reviewBatch:async()=>({decision:'proceed'})};
  return context;
}

async function runArchiveCopy(){
  const c = contextBase();
  c.archiveEntries = [{
    id:'a1', title:'Lantern', what:{val:'Object'}, attr1:{val:'Old'}, attr2:{val:'Blue'}, pressure:{val:'Lost'},
    connections:['a2'], bridges:[{universeId:'u2', creationId:'x'}], notes:[{text:'Keep me'}], createdAt:'2026-01-01'
  }, {id:'a2', title:'Other', connections:['a1'], bridges:[]}];
  c.getEntry = id => c.archiveEntries.find(item => item.id === id);
  c.getCurrentUniverse = () => c.universes[0];
  c.isGroupEntry = item => item?.kind === 'group';
  c.groupChildIds = item => item?.groupIds || [];
  c.readArchiveForUniverse = id => id === 'u2' ? [] : c.archiveEntries;
  c.savedArchive = null;
  c.saveArchiveForUniverse = (id, entries) => {c.savedArchive = {id, entries}; return true;};
  c.writeArchiveEntryToFolder = async()=>{};
  c.rememberFolderSaveFailure = ()=>{};
  c.enterUniverse = ()=>{};
  c.switchTab = ()=>{};
  c.revealArchiveEntryForTag = ()=>{};

  vm.createContext(c);
  vm.runInContext(source, c, {filename:'wormholes-copy-to-universe.js'});
  const ok = await c.copyArchiveItemToUniverse('a1', 'u2');
  assert.strictEqual(ok, true);
  assert.strictEqual(c.archiveEntries[0].connections.length, 1, 'source connections must remain unchanged');
  assert.strictEqual(c.savedArchive.id, 'u2');
  const copy = c.savedArchive.entries[0];
  assert.notStrictEqual(copy.id, 'a1');
  assert.deepStrictEqual(Array.from(copy.connections), []);
  assert.deepStrictEqual(Array.from(copy.bridges), []);
  assert.strictEqual(copy.notes[0].text, 'Keep me');
  assert.strictEqual(copy.copiedFromUniverseId, 'u1');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(copy, 'groupIds'), false, 'normal copied creations must not persist a groupIds field');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(copy, 'children'), false, 'normal copied creations must not persist legacy group children');
}

async function runLiteratureCopy(){
  const c = contextBase();
  c.literatureEntries = [{
    id:'l1', title:'Chronicle', content:'<p>Text</p>', tags:{universes:['u1'], entries:[{universeId:'u1', entryId:'a1'}]},
    storage:'folder', folderFileName:'chronicle.docx', createdAt:'2026-01-01', updatedAt:'2026-01-02'
  }];
  c.getLiteratureDoc = id => c.literatureEntries.find(item => item.id === id);
  c.isLiteratureGroup = item => item?.kind === 'literatureGroup';
  c.literatureGroupChildDocs = ()=>[];
  c.materializeLiteratureDoc = async doc => doc;
  c.literatureContentStoreKeyFor = (universeId, id) => `literature:${universeId}:${id}:content`;
  c.readLiteratureForUniverse = id => id === 'u2' ? [] : c.literatureEntries;
  c.persistedDocs = [];
  c.persistLiteratureLargeData = async (id, doc) => {c.persistedDocs.push({id, doc}); doc.contentStored='indexedDB'; return doc;};
  c.savedLiterature = null;
  c.saveLiteratureForUniverse = (id, docs) => {c.savedLiterature={id, docs}; return true;};
  c.writeLiteratureDocToSpecificFolder = async()=>{};
  c.rememberFolderSaveFailure = ()=>{};
  c.getCurrentUniverse = () => c.universes[0];

  vm.createContext(c);
  vm.runInContext(source, c, {filename:'wormholes-copy-to-universe.js'});
  const ok = await c.copyLiteratureItemToUniverse('l1', 'u2');
  assert.strictEqual(ok, true);
  const copy = c.savedLiterature.docs[0];
  assert.notStrictEqual(copy.id, 'l1');
  assert.strictEqual(copy.content, '<p>Text</p>');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(copy.tags)), {universes:[], entries:[]});
  assert.strictEqual(copy.storage, '');
  assert.strictEqual(copy.folderFileName, '');
  assert.strictEqual(copy.contentStoreKey, `literature:u2:${copy.id}:content`);
  assert.deepStrictEqual(c.literatureEntries[0].tags.universes, ['u1']);
}

async function runVisionCopy(){
  const c = contextBase();
  c.visionEntries = [{
    id:'v1', title:'Moon', sourceName:'moon.png', mimeType:'image/png', dataUrl:'data:image/png;base64,AAAA',
    thumbnailDataUrl:'data:image/png;base64,BBBB', tags:{universes:['u1'], entries:[{universeId:'u1', entryId:'a1'}]},
    storage:'folder', folderFileName:'moon.png', createdAt:'2026-01-01'
  }];
  c.getVisionItem = id => c.visionEntries.find(item => item.id === id);
  c.materializeVisionItemForAppDataExport = async item => item;
  c.visionDataStoreKeyFor = (u,id)=>`vision:${u}:${id}:dataUrl`;
  c.visionThumbnailStoreKeyFor = (u,id)=>`vision:${u}:${id}:thumbnailDataUrl`;
  c.readVisionBoardForUniverse = id => id === 'u2' ? [] : c.visionEntries;
  c.persistVisionLargeData = async (id, item) => {item.dataStored='indexedDB'; item.thumbnailStored='indexedDB'; return item;};
  c.savedVision = null;
  c.saveVisionBoardForUniverse = (id, items) => {c.savedVision={id, items}; return true;};
  c.visionExtensionForStoredItem = ()=>'.png';
  c.uniqueFolderFileName = async()=> 'moon-copy.png';
  c.writeBlobToFolder = async()=>{};
  c.dataUrlToBlob = data => ({type:'image/png', data});
  c.rememberFolderSaveFailure = ()=>{};
  c.getCurrentUniverse = () => c.universes[0];

  vm.createContext(c);
  vm.runInContext(source, c, {filename:'wormholes-copy-to-universe.js'});
  const ok = await c.copyVisionItemToUniverse('v1', 'u2');
  assert.strictEqual(ok, true);
  const copy = c.savedVision.items[0];
  assert.notStrictEqual(copy.id, 'v1');
  assert.strictEqual(copy.dataUrl, 'data:image/png;base64,AAAA');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(copy.tags)), {universes:[], entries:[]});
  assert.strictEqual(copy.storage, '');
  assert.strictEqual(copy.folderFileName, '');
  assert.strictEqual(copy.dataStoreKey, `vision:u2:${copy.id}:dataUrl`);
  assert.deepStrictEqual(c.visionEntries[0].tags.universes, ['u1']);
}

function runUiWordingChecks(){
  const html = fs.readFileSync(latestDirectHtmlPath(root), 'utf8');
  const archive = fs.readFileSync(path.join(root, 'scripts/archive.js'), 'utf8');
  const literature = fs.readFileSync(path.join(root, 'scripts/literature.js'), 'utf8');
  const vision = fs.readFileSync(path.join(root, 'scripts/vision-board.js'), 'utf8');
  assert.match(html, />Move to New Universe</);
  assert.doesNotMatch(html, />Migrate(?:\s|<)/i);
  assert.match(archive, />Move to Universe</);
  assert.match(archive, />Copy to Universe</);
  assert.match(literature, />Copy to Universe</);
  assert.match(vision, />Copy to Universe</);
}

(async()=>{
  runUiWordingChecks();
  await runArchiveCopy();
  await runLiteratureCopy();
  await runVisionCopy();
  console.log('copy-to-universe.unit.js passed');
})().catch(error => {console.error(error); process.exit(1);});

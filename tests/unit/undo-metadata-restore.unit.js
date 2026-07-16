const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function classList(){ return {add(){}, remove(){}, contains(){ return false; }}; }
function element(){
  return {
    className:'', textContent:'', style:{setProperty(){}, removeProperty(){}}, classList:classList(),
    append(){}, replaceChildren(){}, addEventListener(){}, setAttribute(){}, querySelector(){ return null; }
  };
}

(async () => {
  const stored = {archive:{}, notes:{}, literature:{}, vision:{}};
  const toast = element();
  const context = {
    console, Date, JSON, Object, Array, Set, Map, Promise, Math,
    setTimeout(){ return 1; }, clearTimeout(){}, requestAnimationFrame(){ return 1; }, cancelAnimationFrame(){},
    document:{getElementById(id){ return id === 'savedToast' ? toast : null; }, createElement(){ return element(); }},
    window:{addEventListener(){}},
    universes:[{id:'u1', title:'One'}, {id:'u2', title:'Two'}],
    currentUniverseId:'u1',
    archiveEntries:[{id:'a1', title:'Creation'}],
    connectionNotes:{'a1::a2':'note'},
    literatureEntries:[{id:'l1', title:'Doc', content:'Body'}],
    visionEntries:[{id:'v1', title:'Image', dataStoreKey:'vision:u1:v1:data'}],
    bridgeNotes:{'U:u1||U:u2':'bridge note'},
    readArchiveForUniverse(id){ return stored.archive[id] || (id === 'u2' ? [{id:'a2', title:'Other'}] : []); },
    readConnectionNotesForUniverse(id){ return stored.notes[id] || {}; },
    readLiteratureForUniverse(id){ return stored.literature[id] || []; },
    readVisionBoardForUniverse(id){ return stored.vision[id] || []; },
    saveUniversesToStorage(){ return true; },
    saveBridgeNotesToStorage(){ return true; },
    saveArchiveForUniverse(id, value){ stored.archive[id] = JSON.parse(JSON.stringify(value)); return true; },
    saveConnectionNotesForUniverse(id, value){ stored.notes[id] = JSON.parse(JSON.stringify(value)); return true; },
    writeLiteratureMetadataOnly(id, value){ stored.literature[id] = JSON.parse(JSON.stringify(value)); return true; },
    writeVisionMetadataOnly(id, value){ stored.vision[id] = JSON.parse(JSON.stringify(value)); return true; },
    loadArchiveFromStorage(){ context.archiveEntries = JSON.parse(JSON.stringify(stored.archive[context.currentUniverseId] || [])); },
    loadConnectionNotesFromStorage(){ context.connectionNotes = JSON.parse(JSON.stringify(stored.notes[context.currentUniverseId] || {})); },
    loadLiteratureFromStorage(){ context.literatureEntries = JSON.parse(JSON.stringify(stored.literature[context.currentUniverseId] || [])); },
    loadVisionBoardFromStorage(){ context.visionEntries = JSON.parse(JSON.stringify(stored.vision[context.currentUniverseId] || [])); },
    archiveStorageKey(id){ return `archive:${id}`; }, oldArchiveStorageKey(){ return ''; },
    connectionNotesStorageKey(id){ return `notes:${id}`; }, oldConnectionNotesStorageKey(){ return ''; },
    literatureStorageKey(id){ return `lit:${id}`; }, oldLiteratureStorageKey(){ return ''; },
    visionStorageKey(id){ return `vision:${id}`; }, oldVisionStorageKey(){ return ''; },
    removeMigratedLocalStorageValue(){},
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-undo.js'), 'utf8'), context);

  const snapshot = context.window.WormholesUndo.captureState();
  context.universes = [];
  context.currentUniverseId = null;
  context.archiveEntries = [];
  context.connectionNotes = {};
  context.literatureEntries = [];
  context.visionEntries = [];
  context.bridgeNotes = {};

  const restored = await context.window.WormholesUndo.restoreState(snapshot);
  assert.strictEqual(restored, true);
  assert.deepStrictEqual(context.universes.map(item => item.id), ['u1', 'u2']);
  assert.strictEqual(context.currentUniverseId, 'u1');
  assert.strictEqual(context.archiveEntries[0].title, 'Creation');
  assert.strictEqual(context.literatureEntries[0].content, 'Body');
  assert.strictEqual(context.visionEntries[0].title, 'Image');
  assert.strictEqual(context.bridgeNotes['U:u1||U:u2'], 'bridge note');
  assert.strictEqual(stored.archive.u2[0].title, 'Other');

  console.log('undo-metadata-restore.unit.js passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

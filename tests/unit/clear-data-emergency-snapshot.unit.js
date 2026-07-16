const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeElement(){
  return {
    disabled:false,
    textContent:'',
    classList:{add(){}, remove(){}},
    focus(){}
  };
}

const elements = new Map([
  ['confirmClearAppDataBtn', makeElement()],
  ['cancelClearAppDataBtn', makeElement()],
  ['clearAppDataConfirmTitle', makeElement()],
  ['clearAppDataConfirmText', makeElement()],
  ['clearAppDataConfirmDetail', makeElement()],
  ['clearAppDataConfirmModal', makeElement()]
]);

const order = [];
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
  setTimeout(callback){ if(typeof callback === 'function') callback(); return 1; },
  clearTimeout(){},
  document:{getElementById(id){ return elements.get(id) || null; }},
  WORMHOLES_APP_SCHEMA_VERSION:4,
  window:{
    location:{reload(){}},
    WormholesUndo:null,
    WormholesSnapshots:{
      async preserveEmergencySnapshotBeforeClearData(){
        order.push('snapshot');
        return {id:'emergency-1', reason:'before-clear-data', data:{universes:[]}};
      }
    }
  },
  navigator:{},
  localStorage:{length:0, key(){return null;}, removeItem(){}, getItem(){return null;}},
  sessionStorage:{length:0, key(){return null;}, removeItem(){}},
  setSettingsStatus(){},
  showSavedToast(){},
  showHomeScreen(){},
  renderUniverseArchiveList(){},
  renderCurrent(){},
  toggleSettingsMenu(){},
  FOLDER_HANDLE_DATABASES:[],
  FOLDER_HANDLES_STORE:'handles',
  WORMHOLES_LOCAL_ENABLED_KEY:'wormholesLocalFoldersEnabled',
  OLD_WORMHOLES_LOCAL_ENABLED_KEY:'worldBuilderWormholesLocalFoldersEnabled',
  WORMHOLES_LOCAL_MODE_KEY:'wormholesLocalFolderMode',
  OLD_WORMHOLES_LOCAL_MODE_KEY:'worldBuilderWormholesLocalFolderMode'
};
context.globalThis = context;
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-app-data-validation.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-app-data-validation.js'}
);

const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'export-import.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/export-import.js'});

(async () => {
  context.clearAllWormholesAppData = async () => {
    order.push('clear');
    return {warnings:[]};
  };
  await context.performClearAppDataFromConfirm();
  assert.deepStrictEqual(order, ['snapshot', 'clear'], 'the emergency snapshot must be committed before any Clear Data mutation begins');

  order.length = 0;
  context.window.WormholesSnapshots.preserveEmergencySnapshotBeforeClearData = async () => {
    order.push('snapshot-failed');
    const error = new Error('Snapshot verification failed because browser storage is full.');
    error.name = 'QuotaExceededError';
    throw error;
  };
  await context.performClearAppDataFromConfirm();
  assert.deepStrictEqual(order, ['snapshot-failed'], 'Clear Data must fail closed when the emergency snapshot cannot be preserved');
  assert.strictEqual(elements.get('confirmClearAppDataBtn').disabled, false, 'the user should be able to retry after snapshot preservation fails');
  assert.match(elements.get('clearAppDataConfirmDetail').textContent, /snapshot verification failed/i, 'the Clear Data dialog should explain why nothing was cleared');

  console.log('clear-data-emergency-snapshot.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

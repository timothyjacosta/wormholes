const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const startupSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-startup.js'), 'utf8');

const downstreamFunctions = [
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
  'updateManualButtons',
  'loadSkipRollAnimation',
  'installSkipRollLayoutWatcher',
  'renderCurrent',
  'renderArchive',
  'showHomeScreen',
  'requestStorageFootnoteUpdate'
];

function makeContext(options = {}){
  const calls = [];
  const reports = [];
  const context = {
    console,
    Promise,
    setTimeout,
    clearTimeout,
    setImmediate,
    universes:[],
    bridgeNotes:{},
    currentUniverseId:options.currentUniverseId || null,
    UNIVERSES_KEY:'wormholesUniverses',
    WORMHOLE_BRIDGE_NOTES_KEY:'wormholesBridgeNotes',
    reportAppError(contextLabel, error, reportOptions){
      reports.push({context:contextLabel, message:error?.message || String(error), userMessage:reportOptions?.userMessage || ''});
      calls.push(`report:${contextLabel}`);
    }
  };

  downstreamFunctions.forEach(name => {
    context[name] = () => {
      calls.push(name);
      if(name === 'loadUniversesFromStorage'){
        assert.strictEqual(context.__journalRecoveryFinished, true, 'authored datasets must not load before write-ahead recovery finishes');
        assert.strictEqual(context.__localRecoveryFinished, true, 'authored datasets must not load before local corruption recovery finishes');
        context.universes = options.loadedUniverses || [];
      }
      if(name === 'loadBridgeNotesFromStorage') context.bridgeNotes = options.loadedBridgeNotes || {};
    };
  });

  context.WormholesWriteAheadJournal = {
    async recoverPendingOperations(){
      calls.push('journalRecovery:start');
      if(options.journalRecoveryError) throw options.journalRecoveryError;
      context.__journalRecoveryFinished = true;
      calls.push('journalRecovery:finish');
      return options.journalRecoveryResult || {recovered:0};
    },
    consumeRecoveryNotice(){ return ''; }
  };
  context.WormholesStorageRecovery = {
    async recoverCorruptedLocalStorageRecords(){
      calls.push('localRecovery:start');
      if(options.localRecoveryError) throw options.localRecoveryError;
      context.__localRecoveryFinished = true;
      calls.push('localRecovery:finish');
      return options.localRecoveryResult || {recovered:0, blocked:0, results:[]};
    }
  };
  context.WormholesIndexedDbRecovery = {
    async recoverMissingOrPartialIndexedDbRecords(){
      calls.push('indexedDbRecovery:start');
      if(options.indexedDbRecoveryError) throw options.indexedDbRecoveryError;
      calls.push('indexedDbRecovery:finish');
      return options.indexedDbRecoveryResult || {repaired:0, unresolved:0, unverified:0, results:[]};
    }
  };
  context.WormholesRenderValidation = {
    validateUniverses(value){ calls.push('validateUniverses'); return {value}; },
    validateBridgeNotes(value){ calls.push('validateBridgeNotes'); return {value}; }
  };
  if(Object.prototype.hasOwnProperty.call(options, 'singleTabReady')){
    context.WormholesSingleTab = {ready:options.singleTabReady};
  }

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(startupSource, context, {filename:'scripts/wormholes-startup.js'});
  return {context, calls, reports};
}

function flushAsync(){
  return new Promise(resolve => setImmediate(resolve));
}

(async () => {
  {
    const {context, calls, reports} = makeContext({
      localRecoveryResult:{recovered:2, blocked:1, results:[{status:'recovered'}, {status:'blocked'}]},
      indexedDbRecoveryResult:{repaired:1, unresolved:2, unverified:0, results:[{status:'recovered'}, {status:'unresolved'}]},
      loadedUniverses:[{id:'u1', title:'Recovered Realm'}],
      currentUniverseId:'missing-universe'
    });

    await context.WormholesStartup.initializeWormholesApp();
    assert.ok(calls.indexOf('journalRecovery:finish') < calls.indexOf('localRecovery:start'), 'write-ahead recovery should finish before corruption recovery begins');
    assert.ok(calls.indexOf('localRecovery:finish') < calls.indexOf('loadUniversesFromStorage'), 'local corruption recovery should finish before persisted datasets load');
    assert.ok(calls.indexOf('runAppSchemaMigrations') < calls.indexOf('indexedDbRecovery:start'), 'schema migration should finish before IndexedDB payload repair');
    assert.ok(calls.indexOf('indexedDbRecovery:finish') < calls.indexOf('renderCurrent'), 'large-payload recovery should finish before rendering');
    assert.ok(calls.includes('showHomeScreen'), 'recoverable and blocked records should not prevent a safe startup');
    assert.strictEqual(context.currentUniverseId, null, 'a missing active universe should be cleared after recovered storage loads');
    assert.deepStrictEqual(reports, [], 'non-throwing recovery outcomes should not be misreported as startup failures');
  }

  {
    const {context, calls, reports} = makeContext({localRecoveryError:new Error('Malformed persisted JSON could not be quarantined')});
    context.WormholesStartup.startWormholesApp();
    await flushAsync();
    assert.ok(calls.includes('report:Wormholes startup failed'), 'a local-storage recovery exception should be reported as a startup failure');
    assert.ok(!calls.includes('loadUniversesFromStorage'), 'startup must not read damaged authored data after recovery throws');
    assert.ok(!calls.includes('renderCurrent'), 'startup must not render a partial app after local recovery throws');
    assert.strictEqual(reports[0].userMessage, 'Some saved data couldn’t load. Reload the app.');
  }

  {
    const {context, calls, reports} = makeContext({indexedDbRecoveryError:new Error('IndexedDB record inspection failed')});
    context.WormholesStartup.startWormholesApp();
    await flushAsync();
    assert.ok(calls.includes('loadUniversesFromStorage'), 'metadata may load before IndexedDB inspection begins');
    assert.ok(calls.includes('report:Wormholes startup failed'), 'an IndexedDB recovery exception should be reported as a startup failure');
    assert.ok(!calls.includes('renderCurrent'), 'startup must not render after IndexedDB recovery throws');
    assert.match(reports[0].message, /IndexedDB record inspection failed/);
  }

  {
    const inactiveReady = Promise.resolve(false);
    const {context, calls, reports} = makeContext({singleTabReady:inactiveReady});
    context.WormholesStartup.startWormholesApp();
    await flushAsync();
    assert.ok(!calls.includes('journalRecovery:start'), 'an inactive tab should not run write-ahead recovery or startup');
    assert.ok(!calls.includes('localRecovery:start'), 'an inactive tab should not run storage recovery or startup');
    assert.deepStrictEqual(reports, []);
  }

  console.log('corrupted-storage-startup-regressions.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});

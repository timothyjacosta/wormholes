const { test, expect } = require('@playwright/test');
const { createUniverse, archiveQuickRollCreation, uniqueTitle } = require('../support/app');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('journal recovery rolls back an interrupted multi-store operation', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});
  const originalUniverseTitle = uniqueTitle('Journal Original');
  const creationTitle = uniqueTitle('Journal Creation');
  await createUniverse(page, originalUniverseTitle);
  await archiveQuickRollCreation(page, creationTitle);

  const interruptedUniverseId = 'journal-interrupted-universe';
  const recoveryResult = await page.evaluate(async ({ interruptedUniverseId }) => {
    const rollbackData = await buildWormholesAppDataExport();
    const recoveryPoint = await window.WormholesSnapshots.createSnapshot({
      reason:'before-import',
      force:true,
      data:rollbackData,
      skipCapacityPreflight:true,
      verifyWrite:true,
      preserveExistingUntilCommitted:true
    });

    const interruptedData = structuredClone(rollbackData);
    interruptedData.universes[0].title = 'Interrupted Replacement';
    interruptedData.universes.push({
      id:interruptedUniverseId,
      title:'Interrupted Extra Universe',
      summary:'',
      bridges:[],
      createdAt:new Date().toISOString()
    });
    interruptedData.universeData[interruptedUniverseId] = {
      archive:[],
      connectionNotes:{},
      literature:[],
      vision:[]
    };
    interruptedData.exportSummary = summarizeWormholesAppDataExport(interruptedData);

    const prepared = prepareWormholesAppDataImport(interruptedData);
    const transaction = await window.WormholesWriteAheadJournal.begin({
      operation:'e2e-interrupted-import',
      label:'Interrupted import test',
      rollbackSnapshotId:recoveryPoint.id,
      additionalUniverses:prepared.universes
    });
    await window.WormholesWriteAheadJournal.markPhase(transaction, 'writing-browser-stores');
    await writePreparedWormholesAppDataImport(prepared, {journal:false});

    const beforeRecovery = {
      targetArchiveKeyPresent:localStorage.getItem(archiveStorageKey(interruptedUniverseId)) !== null,
      pending:(await window.WormholesWriteAheadJournal.pendingRecords()).length
    };
    const result = await window.WormholesWriteAheadJournal.recoverPendingOperations();
    loadUniversesFromStorage();

    return {
      beforeRecovery,
      recovered:result.recovered,
      titles:universes.map(universe => universe.title),
      originalUniverseId:rollbackData.universes[0].id,
      targetArchiveKeyPresent:localStorage.getItem(archiveStorageKey(interruptedUniverseId)) !== null,
      pending:(await window.WormholesWriteAheadJournal.pendingRecords()).length
    };
  }, { interruptedUniverseId });

  expect(recoveryResult.beforeRecovery.targetArchiveKeyPresent).toBe(true);
  expect(recoveryResult.beforeRecovery.pending).toBe(1);
  expect(recoveryResult.recovered).toBe(1);
  expect(recoveryResult.titles).toEqual([originalUniverseTitle]);
  expect(recoveryResult.targetArchiveKeyPresent).toBe(false);
  expect(recoveryResult.pending).toBe(0);

  const creationRestored = await page.evaluate(({ universeId, creationTitle }) => (
    readArchiveForUniverse(universeId).some(entry => entry.title === creationTitle)
  ), { universeId:recoveryResult.originalUniverseId, creationTitle });
  expect(creationRestored).toBe(true);
  expect(runtimeErrors).toEqual([]);
});

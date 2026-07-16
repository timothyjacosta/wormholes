const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse, uniqueTitle } = require('../support/app');

test('bridge lifecycle and both maps preserve records, notes, undo, and failed-save atomicity', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  const firstTitle = await createUniverse(page, uniqueTitle('Bridge Map One'));

  const seeded = await page.evaluate(({firstTitle}) => {
    const first = universes.find(universe => universe.title === firstTitle);
    const now = new Date().toISOString();
    const second = {
      id:makeId(),
      title:`Bridge Map Two ${Date.now()}`,
      summary:'Remote bridge coverage',
      bridges:[],
      createdAt:now
    };
    second.diskFolderName = stableUniverseFolderName(second);
    universes.push(second);

    const alpha = {id:makeId(), title:'Bridge Alpha', what:{val:'Character — Hero'}, attr1:{val:'A'}, attr2:{val:'B'}, pressure:{val:'C'}, connections:[], bridges:[], notes:[], createdAt:now};
    const delta = {id:makeId(), title:'Bridge Delta', what:{val:'Place — Port'}, attr1:{val:'A'}, attr2:{val:'B'}, pressure:{val:'C'}, connections:[], bridges:[], notes:[], createdAt:now};
    const beta = {id:makeId(), title:'Bridge Beta', what:{val:'Technology — Tool'}, attr1:{val:'A'}, attr2:{val:'B'}, pressure:{val:'C'}, connections:[], bridges:[], notes:[], createdAt:now};

    alpha.connections = [delta.id];
    delta.connections = [alpha.id];
    alpha.bridges = [{universeId:second.id, creationId:beta.id}];
    first.bridges = [{universeId:second.id, creationId:null}];

    const bridgeNoteKey = bridgeNoteKeyForNodes(
      {type:'creation', universeId:first.id, creationId:alpha.id},
      {type:'creation', universeId:second.id, creationId:beta.id}
    );
    bridgeNotes[bridgeNoteKey] = 'Seeded bridge note';

    saveUniversesToStorage();
    saveArchiveForUniverse(first.id, [alpha, delta]);
    saveArchiveForUniverse(second.id, [beta]);
    saveBridgeNotesToStorage();
    enterUniverse(first.id);

    return {
      firstId:first.id,
      secondId:second.id,
      alphaId:alpha.id,
      deltaId:delta.id,
      betaId:beta.id,
      bridgeNoteKey
    };
  }, {firstTitle});

  await page.evaluate(() => showConnectionsScreen());
  await expect(page.locator('#connectionsScreen')).toHaveClass(/active/);
  await expect(page.locator(`#connectionsMapWrap .connection-node[data-id="${seeded.alphaId}"]`)).toBeVisible();
  await expect(page.locator(`#connectionsMapWrap .connection-node[data-id="${seeded.deltaId}"]`)).toBeVisible();
  await expect(page.locator(`#connectionsMapWrap .connection-node[data-id="external:${seeded.secondId}:${seeded.betaId}"]`)).toBeVisible();
  await expect(page.locator('#connectionsMapWrap .connection-edge-group[data-source]')).toHaveCount(1);
  await expect(page.locator('#connectionsMapWrap .bridge-note-edge')).toHaveCount(2);

  await page.evaluate(id => {
    selectedMapNodeId = id;
    renderConnectionsMap();
  }, seeded.alphaId);
  await expect(page.locator('#mapBridgeBtn')).toBeVisible();

  await page.evaluate(() => openWormholesModal());
  await expect(page.locator('#wormholesModal')).toHaveClass(/open/);
  await expect(page.locator(`#wormholesMapWrap .wormhole-creation[data-universe-id="${seeded.firstId}"][data-creation-id="${seeded.alphaId}"]`)).toBeVisible();
  await expect(page.locator(`#wormholesMapWrap .wormhole-creation[data-universe-id="${seeded.secondId}"][data-creation-id="${seeded.betaId}"]`)).toBeVisible();
  await expect(page.locator('#wormholesMapWrap .wormhole-internal-line')).toHaveCount(1);
  await expect(page.locator('#wormholesMapWrap .wormhole-bridge-line')).toHaveCount(1);
  await expect(page.locator('#wormholesMapWrap .wormhole-universe-bridge-line')).toHaveCount(1);

  const removed = await page.evaluate(({firstId, secondId, alphaId, betaId, bridgeNoteKey}) => {
    const result = toggleWormholeBridge(firstId, alphaId, secondId, betaId);
    return {
      result,
      bridges:readArchiveForUniverse(firstId).find(entry => entry.id === alphaId)?.bridges || [],
      note:bridgeNotes[bridgeNoteKey]
    };
  }, seeded);
  expect(removed.result).toBe(true);
  expect(removed.bridges).toEqual([]);
  expect(removed.note).toBeUndefined();
  await expect(page.locator('#savedToast .undo-toast-button')).toBeVisible();
  await page.locator('#savedToast .undo-toast-button').click();

  const restored = await page.evaluate(({firstId, alphaId, bridgeNoteKey}) => ({
    bridges:readArchiveForUniverse(firstId).find(entry => entry.id === alphaId)?.bridges || [],
    note:bridgeNotes[bridgeNoteKey]
  }), seeded);
  expect(restored.bridges).toEqual([{universeId:seeded.secondId, creationId:seeded.betaId}]);
  expect(restored.note).toBe('Seeded bridge note');

  const failedWrite = await page.evaluate(({firstId, secondId, deltaId, betaId}) => {
    const originalSave = window.saveArchiveForUniverse;
    window.saveArchiveForUniverse = () => false;
    try{
      const result = toggleWormholeBridge(firstId, deltaId, secondId, betaId);
      return {
        result,
        bridges:readArchiveForUniverse(firstId).find(entry => entry.id === deltaId)?.bridges || []
      };
    } finally {
      window.saveArchiveForUniverse = originalSave;
    }
  }, seeded);
  expect(failedWrite.result).toBe(false);
  expect(failedWrite.bridges).toEqual([]);

  expect(runtimeErrors).toEqual([]);
});

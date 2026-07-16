const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('large maps cluster only while zoomed out and preserve underlying map data', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  const seeded = await page.evaluate(() => {
    const now = new Date().toISOString();
    const universe = {
      id:makeId(),
      title:'Crowded Map Universe',
      summary:'Clustering coverage',
      bridges:[],
      createdAt:now
    };
    universe.diskFolderName = stableUniverseFolderName(universe);
    universes.push(universe);

    const entries = Array.from({length:24}, (_, index) => ({
      id:makeId(),
      title:`Map Entity ${String(index + 1).padStart(2, '0')}`,
      what:{val:index % 2 ? 'Character — Explorer' : 'Place — Landmark'},
      attr1:{val:'A'},
      attr2:{val:'B'},
      pressure:{val:'C'},
      connections:[],
      bridges:[],
      notes:[],
      createdAt:now
    }));

    entries.forEach((entry, index) => {
      const next = entries[(index + 1) % entries.length];
      entry.connections = [next.id];
    });

    saveUniversesToStorage();
    saveArchiveForUniverse(universe.id, entries);
    enterUniverse(universe.id);
    switchTab('archive');
    showConnectionsScreen();

    return {universeId:universe.id, firstId:entries[0].id, count:entries.length};
  });

  await page.locator('#connectionsZoomSlider').evaluate(slider => {
    slider.value = '0.3';
    slider.dispatchEvent(new Event('input', {bubbles:true}));
  });

  const connectionsStage = page.locator('#connectionsMapStage');
  await expect(connectionsStage).toHaveClass(/map-clusters-active/);
  await expect(page.locator('#connectionsMapWrap .connections-aggregate-cluster')).not.toHaveCount(0);
  await expect(page.locator(`#connectionsMapWrap .connection-node[data-id="${seeded.firstId}"]`)).toBeHidden();

  await page.locator('#connectionsMapWrap .connections-aggregate-cluster').first().click();
  await expect(connectionsStage).not.toHaveClass(/map-clusters-active/);
  await expect(page.locator(`#connectionsMapWrap .connection-node[data-id="${seeded.firstId}"]`)).toBeVisible();

  await page.evaluate(() => openWormholesModal());
  await expect(page.locator('#wormholesModal')).toHaveClass(/open/);
  await page.locator('#wormholesZoomSlider').evaluate(slider => {
    slider.value = '0.3';
    slider.dispatchEvent(new Event('input', {bubbles:true}));
  });

  const wormholesStage = page.locator('#wormholesMapStage');
  await expect(wormholesStage).toHaveClass(/map-clusters-active/);
  await expect(page.locator('#wormholesMapWrap .wormhole-aggregate-cluster')).toHaveCount(1);
  await expect(page.locator(`#wormholesMapWrap .wormhole-creation[data-creation-id="${seeded.firstId}"]`)).toBeHidden();

  await page.locator('#wormholesMapWrap .wormhole-aggregate-cluster').click();
  await expect(wormholesStage).not.toHaveClass(/map-clusters-active/);
  await expect(page.locator(`#wormholesMapWrap .wormhole-creation[data-creation-id="${seeded.firstId}"]`)).toBeVisible();

  const preserved = await page.evaluate(universeId => ({
    count:readArchiveForUniverse(universeId).length,
    connectionCount:readArchiveForUniverse(universeId).reduce((sum, entry) => sum + (entry.connections || []).length, 0)
  }), seeded.universeId);
  expect(preserved).toEqual({count:24, connectionCount:24});
  expect(runtimeErrors).toEqual([]);
});

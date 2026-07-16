const { test, expect } = require('@playwright/test');
const { openCleanApp } = require('../support/app');

function envelope(data){
  return JSON.stringify({
    format:'Wormholes Persisted Dataset',
    revision:1,
    updatedAt:'2026-07-12T20:24:18.000Z',
    data
  });
}

test.describe('corrupted storage startup regressions', () => {
  test('malformed global storage is preserved, blocked, reported, and does not crash startup', async ({ page }) => {
    const runtimeErrors = await openCleanApp(page);
    const damagedRaw = '{"format":"Wormholes Persisted Dataset","revision":1,"data":[';

    await page.evaluate(raw => {
      localStorage.setItem('wormholesUniverses', raw);
      localStorage.setItem('wormholesSchemaVersion', String(window.WormholesSchemaVersions.current));
    }, damagedRaw);
    await page.reload({waitUntil:'domcontentloaded'});

    await expect(page.locator('#homeScreen')).toBeVisible();
    await expect(page.locator('#appErrorPanel')).toHaveClass(/open/);
    await expect(page.locator('#appErrorPanel')).toContainText(/damaged local data|Corrupted local data recovery|protected from overwriting/i);

    const state = await page.evaluate(() => ({
      raw:localStorage.getItem('wormholesUniverses'),
      blocked:persistedDatasetWriteBlocked('wormholesUniverses'),
      loadedCount:Array.isArray(universes) ? universes.length : -1
    }));
    expect(state.raw).toBe(damagedRaw);
    expect(state.blocked).toBe(true);
    expect(state.loadedCount).toBe(0);
    expect(runtimeErrors).toEqual([]);
  });

  test('schema-invalid per-universe storage remains protected while the rest of the app starts', async ({ page }) => {
    const runtimeErrors = await openCleanApp(page);
    const universeId = 'corrupt-startup-u1';
    const archiveKey = `wormholesUniverseArchive:${universeId}`;
    const invalidArchive = envelope([{id:'bad-entry', title:'Broken Entry', connections:'not-an-array'}]);
    const universeList = envelope([{
      id:universeId,
      title:'Corruption Test Realm',
      summary:'',
      bridges:[],
      createdAt:'2026-07-12T20:24:18.000Z',
      diskFolderName:'Corruption Test Realm -- corrupt-s'
    }]);

    await page.evaluate(({universeList, archiveKey, invalidArchive}) => {
      localStorage.setItem('wormholesUniverses', universeList);
      localStorage.setItem(archiveKey, invalidArchive);
      localStorage.setItem('wormholesSchemaVersion', String(window.WormholesSchemaVersions.current));
    }, {universeList, archiveKey, invalidArchive});
    await page.reload({waitUntil:'domcontentloaded'});

    await expect(page.locator('#homeScreen')).toBeVisible();
    await expect(page.locator('#appErrorPanel')).toHaveClass(/open/);
    const state = await page.evaluate(key => ({
      raw:localStorage.getItem(key),
      blocked:persistedDatasetWriteBlocked(key),
      universeTitle:universes.find(universe => universe.id === 'corrupt-startup-u1')?.title || ''
    }), archiveKey);
    expect(state.raw).toBe(invalidArchive);
    expect(state.blocked).toBe(true);
    expect(state.universeTitle).toBe('Corruption Test Realm');
    expect(runtimeErrors).toEqual([]);
  });
});

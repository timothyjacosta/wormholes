'use strict';

const {test, expect} = require('@playwright/test');
const {openCleanApp, createUniverse, archiveQuickRollCreation} = require('../support/app');
const {validImport} = require('../fixtures/malformed-import-corpus');

async function localStorageSnapshot(page){
  return page.evaluate(() => {
    const entries = [];
    for(let index = 0; index < localStorage.length; index += 1){
      const key = localStorage.key(index);
      if(key === 'wormholes_activity_log_v1' || key === 'wormholesSingleTabLease') continue;
      entries.push([key, localStorage.getItem(key)]);
    }
    return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
  });
}

test.describe('malformed app-data import regressions', () => {
  test('invalid and structurally malformed files cannot replace existing data', async ({page}) => {
    await openCleanApp(page);
    const universeTitle = await createUniverse(page, 'Malformed Import Safety Realm');
    const creationTitle = await archiveQuickRollCreation(page, 'Import Safety Beacon');
    const before = await localStorageSnapshot(page);

    const malformedStructure = validImport();
    malformedStructure.universeData['u-1'].archive[0].connections = 'not-an-array';
    const cases = [
      {
        name:'truncated-backup.json',
        body:'{"format":"Wormholes App Data Export","universes":['
      },
      {
        name:'malformed-structure.json',
        body:JSON.stringify(malformedStructure)
      }
    ];

    for(const testCase of cases){
      await page.locator('#appDataImportInput').setInputFiles({
        name:testCase.name,
        mimeType:'application/json',
        buffer:Buffer.from(testCase.body)
      });
      await expect(page.locator('#savedToast')).toContainText(/Import failed|existing data unchanged/i);
      await expect(page.locator('#appDataImportConfirmModal')).not.toHaveClass(/open/);
      expect(await localStorageSnapshot(page)).toEqual(before);
      await expect(page.locator('#currentUniverseLabel')).toHaveText(universeTitle);
      await page.locator('#archiveTabBtn').click();
      await expect(page.locator('#archiveList .entry-title-main', {hasText:creationTitle})).toBeVisible();
    }
  });
});

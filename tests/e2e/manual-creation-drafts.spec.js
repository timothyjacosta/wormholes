const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse, uniqueTitle } = require('../support/app');

async function reenterUniverse(page, title){
  await expect(page.locator('#homeScreen')).toBeVisible();
  await page.locator('#enterUniverseBtn').click();
  await expect(page.locator('#universeArchiveModal')).toHaveClass(/open/);
  const entry = page.locator('#universeArchiveList .universe-entry', { hasText:title });
  await entry.locator('.universe-entry-main').click();
  await expect(page.locator('#appScreen')).toBeVisible();
  await expect(page.locator('#currentUniverseLabel')).toHaveText(title);
}

test('unfinished manual creation restores after reload and Clear discards it', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  const universeTitle = await createUniverse(page, uniqueTitle('Draft Realm'));

  await page.locator('#createTabBtn').click();
  await page.locator('#manualTitle').fill('The Unfinished Observatory');
  await page.locator('#manualWhat').selectOption('__custom__');
  await page.locator('#manualWhatCustom').fill('A clockwork observatory');
  await page.locator('#manualAttr1').selectOption('Ancient but still active');
  await expect(page.locator('#manualDraftStatus')).toHaveText('Draft saved locally.');

  await page.reload({ waitUntil:'domcontentloaded' });
  await reenterUniverse(page, universeTitle);
  await page.locator('#createTabBtn').click();

  await expect(page.locator('#manualTitle')).toHaveValue('The Unfinished Observatory');
  await expect(page.locator('#manualWhat')).toHaveValue('__custom__');
  await expect(page.locator('#manualWhatCustom')).toHaveValue('A clockwork observatory');
  await expect(page.locator('#manualAttr1')).toHaveValue('Ancient but still active');
  await expect(page.locator('#manualDraftStatus')).toContainText('Restored unfinished draft');

  await page.locator('#clearManualBtn').click();
  await expect(page.locator('#manualTitle')).toHaveValue('');
  await expect(page.locator('#manualDraftStatus')).toHaveText('');

  await page.reload({ waitUntil:'domcontentloaded' });
  await reenterUniverse(page, universeTitle);
  await page.locator('#createTabBtn').click();
  await expect(page.locator('#manualTitle')).toHaveValue('');
  await expect(page.locator('#manualWhat')).toHaveValue('');
  await expect(page.locator('#manualDraftStatus')).toHaveText('');

  expect(runtimeErrors).toEqual([]);
});

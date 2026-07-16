const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse, uniqueTitle } = require('../support/app');

async function createTypedEntry(page, title, type){
  await page.locator('#createTabBtn').click();
  await page.locator('#manualTitle').fill(title);
  await page.locator('#manualWhat').selectOption('__custom__');
  await page.locator('#manualWhatCustom').fill(type);
  await page.locator('#saveManualBtn').click();
  await expect(page.locator('#manualError')).toContainText('Archived partial creation');
}

test('Archive filter narrows entries by creation type and resets cleanly', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  await createUniverse(page, uniqueTitle('Filter Universe'));
  const characterTitle = uniqueTitle('Character Entry');
  const placeTitle = uniqueTitle('Place Entry');

  await createTypedEntry(page, characterTitle, 'Character');
  await createTypedEntry(page, placeTitle, 'Place');
  await page.locator('#archiveTabBtn').click();

  await page.locator('#archiveFilterBtn').click();
  await expect(page.locator('#archiveFilterPanel')).toBeVisible();
  await page.locator('#archiveFilterType').selectOption('Character');
  await expect(page.locator('#archiveList .entry-title-main', { hasText:characterTitle })).toBeVisible();
  await expect(page.locator('#archiveList .entry-title-main', { hasText:placeTitle })).toHaveCount(0);
  await expect(page.locator('#archiveFilterBtn')).toHaveText('Filter (1)');

  await page.locator('#resetArchiveFiltersBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', { hasText:characterTitle })).toBeVisible();
  await expect(page.locator('#archiveList .entry-title-main', { hasText:placeTitle })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

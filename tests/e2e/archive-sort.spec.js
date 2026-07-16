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

async function visibleTitles(page){
  return page.locator('#archiveList > .entry .entry-title-main').allTextContents();
}

test('Archive sorting changes display order without changing saved items', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  await createUniverse(page, uniqueTitle('Sort Universe'));
  await createTypedEntry(page, 'Zeta Place', 'Place');
  await createTypedEntry(page, 'Alpha Character', 'Character');
  await page.locator('#archiveTabBtn').click();

  await page.locator('#archiveSortBtn').click();
  await expect(page.locator('#archiveSortPanel')).toBeVisible();
  await page.locator('#archiveSortOrder').selectOption('title-asc');
  await expect.poll(() => visibleTitles(page)).toEqual(['Alpha Character', 'Zeta Place']);
  await expect(page.locator('#archiveSortBtn')).toHaveText('Sort (A–Z)');

  await page.locator('#archiveSortOrder').selectOption('title-desc');
  await expect.poll(() => visibleTitles(page)).toEqual(['Zeta Place', 'Alpha Character']);

  await page.locator('#resetArchiveSortBtn').click();
  await expect(page.locator('#archiveSortBtn')).toHaveText('Sort');
  expect(runtimeErrors).toEqual([]);
});

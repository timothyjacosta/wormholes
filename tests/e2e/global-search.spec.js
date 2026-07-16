const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse, archiveQuickRollCreation, uniqueTitle } = require('../support/app');

test('global search opens from the dock and jumps to an Archive result', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  const universeTitle = await createUniverse(page, uniqueTitle('Search Universe'));
  const creationTitle = await archiveQuickRollCreation(page, uniqueTitle('Search Creation'));

  await page.locator('#homeBtn').click();
  await page.locator('#globalSearchBtn').click();
  await expect(page.locator('#globalSearchModal')).toHaveClass(/open/);
  await page.locator('#globalSearchInput').fill(creationTitle);
  const result = page.locator('.global-search-result', { hasText:creationTitle });
  await expect(result).toContainText(universeTitle);
  await result.click();

  await expect(page.locator('#appScreen')).toBeVisible();
  await expect(page.locator('#archiveTab')).toHaveClass(/active/);
  await expect(page.locator(`#archiveList .entry-title-main`, { hasText:creationTitle })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('Ctrl or Command K opens global search', async ({ page }) => {
  await openCleanApp(page);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await expect(page.locator('#globalSearchModal')).toHaveClass(/open/);
  await expect(page.locator('#globalSearchInput')).toBeFocused();
});

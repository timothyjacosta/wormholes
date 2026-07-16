const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse } = require('../support/app');

test('Literature autosaves in browser storage and flushes before leaving the editor', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  await createUniverse(page, 'Literature Autosave Universe');

  await page.locator('#literatureTabBtn').click();
  await page.locator('#createLiteratureBtn').click();
  await page.locator('#literatureTitleInput').fill('Autosaved Literature');
  await page.locator('#literatureEditor').fill('This body should autosave without closing the editor.');

  await expect(page.locator('#literatureSaveStatus')).toHaveText('Saved in app');
  await expect(page.locator('#literatureEditorScreen')).toHaveClass(/active/);

  const firstSavedRecord = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(candidate => candidate.startsWith('wormholesUniverseLiterature:'));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
  expect(firstSavedRecord?.data?.[0]?.title).toBe('Autosaved Literature');
  expect(firstSavedRecord?.data?.[0]?.content).toContain('This body should autosave');

  await page.locator('#literatureTitleInput').fill('Exit-Flushed Literature');
  await page.locator('#literatureEditor').fill('This newer body should save before the tab changes.');
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveTab')).toHaveClass(/active/);

  await page.locator('#literatureTabBtn').click();
  await expect(page.locator('#literatureListScreen')).toHaveClass(/active/);
  await expect(page.locator('#literatureList .entry-title-main').first()).toHaveText('Exit-Flushed Literature');

  const exitSavedRecord = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(candidate => candidate.startsWith('wormholesUniverseLiterature:'));
    return JSON.parse(localStorage.getItem(key));
  });
  expect(exitSavedRecord.data[0].title).toBe('Exit-Flushed Literature');
  expect(exitSavedRecord.data[0].content).toContain('This newer body should save');
  expect(runtimeErrors).toEqual([]);
});

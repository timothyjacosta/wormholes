const { test, expect } = require('@playwright/test');
const {
  openCleanApp,
  createUniverse,
  archiveQuickRollCreation,
  uniqueTitle
} = require('../support/app');

function universeEntry(page, title){
  return page.locator('#universeArchiveList .universe-entry').filter({hasText:title});
}

async function openUniverseArchive(page){
  await page.locator('#enterUniverseBtn').click();
  await expect(page.locator('#universeArchiveModal')).toHaveClass(/open/);
}

async function exitToHome(page){
  await page.locator('#homeBtn').click();
  await expect(page.locator('#homeScreen')).toBeVisible();
}

async function enterSavedUniverse(page, title){
  await openUniverseArchive(page);
  const entry = universeEntry(page, title);
  await expect(entry).toHaveCount(1);
  await entry.locator('.universe-entry-main').click();
  await expect(page.locator('#currentUniverseLabel')).toHaveText(title);
}

async function openUniverseEntryMenu(page, title){
  const entry = universeEntry(page, title);
  await expect(entry).toHaveCount(1);
  await entry.locator('.menu-button').click();
  return entry;
}

test('universe lifecycle preserves isolated data through edit, switch, reload, delete, and undo', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  const firstTitle = uniqueTitle('Lifecycle One');
  const secondTitle = uniqueTitle('Lifecycle Two');
  const renamedTitle = uniqueTitle('Lifecycle Renamed');
  const creationTitle = uniqueTitle('Lifecycle Creation');

  await createUniverse(page, firstTitle);
  await archiveQuickRollCreation(page, creationTitle);

  await exitToHome(page);
  await createUniverse(page, secondTitle);
  await exitToHome(page);

  await openUniverseArchive(page);
  const secondEntry = await openUniverseEntryMenu(page, secondTitle);
  await secondEntry.locator('.universe-edit-action').click();
  await expect(page.locator('#universeEditModal')).toHaveClass(/open/);
  await page.locator('#universeEditTitleInput').fill(renamedTitle);
  await page.locator('#universeEditSummaryInput').fill('Lifecycle regression summary');
  await page.locator('#saveUniverseEditBtn').click();
  await expect(page.locator('#universeEditModal')).not.toHaveClass(/open/);
  await expect(universeEntry(page, renamedTitle)).toContainText('Lifecycle regression summary');

  await universeEntry(page, firstTitle).locator('.universe-entry-main').click();
  await expect(page.locator('#currentUniverseLabel')).toHaveText(firstTitle);
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', {hasText:creationTitle})).toBeVisible();

  await exitToHome(page);
  await enterSavedUniverse(page, renamedTitle);
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', {hasText:creationTitle})).toHaveCount(0);

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await enterSavedUniverse(page, firstTitle);
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', {hasText:creationTitle})).toBeVisible();

  await exitToHome(page);
  await openUniverseArchive(page);
  let deleteEntry = await openUniverseEntryMenu(page, renamedTitle);
  await deleteEntry.locator('.universe-delete-action').click();
  await page.locator('#confirmDeleteUniverseBtn').click();
  await expect(universeEntry(page, renamedTitle)).toHaveCount(0);
  await expect(page.locator('#savedToast .undo-toast-button')).toBeVisible();
  await page.locator('#savedToast .undo-toast-button').click();

  await expect(page.locator('#appScreen')).toBeVisible();
  await exitToHome(page);
  await openUniverseArchive(page);
  await expect(universeEntry(page, renamedTitle)).toHaveCount(1);

  deleteEntry = await openUniverseEntryMenu(page, renamedTitle);
  await deleteEntry.locator('.universe-delete-action').click();
  await page.locator('#confirmDeleteUniverseBtn').click();
  await page.evaluate(async () => { await window.WormholesUndo.commitActive({silent:true}); });
  await expect(universeEntry(page, renamedTitle)).toHaveCount(0);

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await openUniverseArchive(page);
  await expect(universeEntry(page, firstTitle)).toHaveCount(1);
  await expect(universeEntry(page, renamedTitle)).toHaveCount(0);

  expect(runtimeErrors).toEqual([]);
});

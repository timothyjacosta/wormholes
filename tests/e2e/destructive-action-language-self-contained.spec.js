const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');
const { createUniverse, createManualPartialCreation } = require('../support/app');

async function openEntryMenu(page, listSelector, title){
  const entry = page.locator(`${listSelector} .entry`).filter({hasText:title}).first();
  await entry.locator(':scope > .entry-top .menu-button').click();
  return entry;
}

test('destructive actions use concise specific language and Literature waits for confirmation', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});
  await createUniverse(page, 'Destructive Language Universe');
  await createManualPartialCreation(page, 'Careful Creation');

  let entry = await openEntryMenu(page, '#archiveList', 'Careful Creation');
  await entry.locator(':scope > .entry-top .delete-action').click();
  await expect(page.locator('#deleteEntryConfirmModal')).toHaveClass(/open/);
  await expect(page.locator('#deleteEntryConfirmTitle')).toHaveText('Delete “Careful Creation”?');
  await expect(page.locator('#deleteEntryConfirmText')).toContainText('removes the creation and its links');
  await expect(page.locator('#deleteEntryConfirmText')).not.toContainText(/toast/i);
  await expect(page.locator('#cancelDeleteEntryBtn')).toHaveText('Keep Creation');
  await expect(page.locator('#confirmDeleteEntryBtn')).toHaveText('Delete Creation');
  await page.locator('#cancelDeleteEntryBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', {hasText:'Careful Creation'})).toBeVisible();

  await page.locator('#literatureTabBtn').click();
  await page.evaluate(() => {
    literatureEntries = [normalizeLiteratureDoc({
      id:'language-lit',
      kind:'',
      title:'Careful Literature',
      content:'<p>Keep this until confirmed.</p>',
      fileType:'text',
      mimeType:'text/html',
      tags:{universes:[currentUniverseId], entries:[]},
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    })];
    saveLiteratureToStorage();
    renderLiteratureList();
  });

  entry = await openEntryMenu(page, '#literatureList', 'Careful Literature');
  await expect(entry.locator(':scope > .entry-top .literature-delete-action')).toHaveText('Delete Document');
  await entry.locator(':scope > .entry-top .literature-delete-action').click();
  await expect(page.locator('#literatureDeleteConfirmModal')).toHaveClass(/open/);
  await expect(page.locator('#literatureDeleteConfirmTitle')).toHaveText('Delete “Careful Literature”?');
  await expect(page.locator('#cancelLiteratureDeleteBtn')).toHaveText('Keep Document');
  await expect(page.locator('#confirmLiteratureDeleteBtn')).toHaveText('Delete Document');
  await expect(page.locator('#literatureList .entry-title-main', {hasText:'Careful Literature'})).toBeVisible();

  await page.locator('#confirmLiteratureDeleteBtn').click();
  await expect(page.locator('#literatureList .entry-title-main', {hasText:'Careful Literature'})).toHaveCount(0);
  await expect(page.locator('#savedToast .undo-toast-button')).toBeVisible();

  await page.evaluate(() => openClearMapConfirm('connections'));
  await expect(page.locator('#clearMapConfirmTitle')).toHaveText('Remove all connections?');
  await expect(page.locator('#cancelClearMapBtn')).toHaveText('Keep Connections');
  await expect(page.locator('#confirmClearMapBtn')).toHaveText('Remove All Connections');
  await page.locator('#cancelClearMapBtn').click();

  expect(runtimeErrors).toEqual([]);
});

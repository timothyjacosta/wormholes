const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse, archiveQuickRollCreation } = require('../support/app');

test('deleting a creation offers an accessible short-lived Undo and restores it', async ({ page }) => {
  await openCleanApp(page);
  await createUniverse(page);
  const title = await archiveQuickRollCreation(page);

  const card = page.locator('#archiveList .entry', { hasText:title });
  await card.locator('.menu-button').click();
  await card.locator('.delete-action').click();
  await expect(page.locator('#deleteEntryConfirmModal')).toHaveClass(/open/);
  await page.locator('#confirmDeleteEntryBtn').click();

  await expect(page.locator('#archiveList .entry', { hasText:title })).toHaveCount(0);
  const toast = page.locator('#savedToast');
  await expect(toast).toHaveClass(/undo-toast/);
  await expect(toast).toContainText('Creation deleted');
  await expect(toast.getByRole('button', { name:/undo/i })).toBeVisible();

  await toast.getByRole('button', { name:/undo/i }).click();
  await expect(page.locator('#archiveList .entry', { hasText:title })).toBeVisible();
  await expect(page.locator('#savedToast')).toContainText('Creation restored');
});

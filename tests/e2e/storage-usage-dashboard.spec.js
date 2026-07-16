const { test, expect } = require('@playwright/test');
const { createUniverse } = require('../support/app');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('storage usage dashboard opens from Settings and returns to Settings', async ({ page }) => {
  await openSelfContainedApp(page, {inlineStyles:true});
  await createUniverse(page, 'Storage Dashboard Universe');

  await page.locator('#settingsGearBtn').click();
  await expect(page.locator('#settingsPanel')).toBeVisible();
  await page.locator('#settingsStorageToggle').click();
  await expect(page.locator('#storageUsageDetailsBtn')).toBeVisible();

  await page.locator('#storageUsageDetailsBtn').click();
  const modal = page.locator('#storageUsageDashboardModal');
  await expect(modal).toHaveClass(/open/);
  await expect(page.locator('#storageUsageDashboardStatus')).toHaveText('Storage usage updated.');
  await expect(page.locator('#storageUsageContentTotal')).not.toHaveText('Calculating…');
  await expect(page.locator('#storageUsageBrowserTotal')).not.toHaveText('Calculating…');
  await expect(page.locator('#storageUsageCreationsBrowser')).not.toHaveText('—');
  await expect(page.locator('#storageUsageSnapshotsValue')).not.toHaveText('Calculating…');
  await expect(page.locator('#storageUsageCapacityStatus')).not.toHaveText('Calculating…');

  await page.locator('#closeStorageUsageDashboardBtn').click();
  await expect(modal).not.toHaveClass(/open/);
  await expect(page.locator('#settingsPanel')).toBeVisible();
  await expect(page.locator('#storageUsageDetailsBtn')).toBeFocused();
});

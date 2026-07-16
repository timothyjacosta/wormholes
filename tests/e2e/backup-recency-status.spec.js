const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('backup recency remains visible and persists in Settings', async ({ page }) => {
  await openSelfContainedApp(page, {inlineStyles:true});

  await page.locator('#settingsGearBtn').click();
  await page.locator('#settingsBackupToggle').click();
  const status = page.locator('#settingsBackupStatus');
  await expect(status).toBeVisible();
  await expect(status).toHaveText('Backup: none');

  await page.evaluate(() => window.WormholesBackupStatus.recordSuccess('json'));
  await expect(status).toHaveText('Backup: Today');
  await expect(status).toHaveAttribute('data-state', 'recent');

  await page.locator('#settingsGearBtn').click();
  await expect(page.locator('#settingsPanel')).not.toBeVisible();
  await page.locator('#settingsGearBtn').click();
  await expect(page.locator('#settingsBackupToggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#settingsBackupStatus')).toHaveText('Backup: Today');
  await expect(page.evaluate(() => JSON.parse(localStorage.getItem('wormholesBackupStatus')).lastSuccessKind)).resolves.toBe('json');

  await page.evaluate(() => window.WormholesBackupStatus.recordFailure('folder'));
  await expect(page.locator('#settingsBackupStatus')).toHaveText('Backup: failed');
  await expect(page.locator('#settingsBackupStatus')).toHaveAttribute('data-state', 'failed');
});

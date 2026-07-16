const { test, expect } = require('@playwright/test');
const { openCleanApp } = require('../support/app');

test('local-data explanations stay opt-in and return users to context', async ({ page }) => {
  await openCleanApp(page);

  await expect(page.locator('#localDataHelpModal')).not.toHaveClass(/open/);
  await page.locator('#settingsGearBtn').click();
  await page.locator('#settingsHelpToggle').click();
  await page.locator('#privacyLocalDataBtn').click();

  await expect(page.locator('#localDataHelpModal')).toHaveClass(/open/);
  await expect(page.locator('#localDataHelpModal')).toContainText('does not sync them to an account');
  await expect(page.locator('#localDataHelpModal')).toContainText('Imports are checked before use');
  await expect(page.locator('#localDataHelpModal')).toContainText('cannot protect data after someone gains control');
  await expect(page.locator('#localDataHelpModal')).toContainText('does not encrypt your browser data');
  await expect(page.locator('#exportFromLocalDataHelpBtn')).toHaveCount(0);
  await expect(page.locator('#closeLocalDataHelpBtn')).toHaveText('Close');
  await page.locator('#closeLocalDataHelpBtn').click();

  await expect(page.locator('#localDataHelpModal')).not.toHaveClass(/open/);
  await expect(page.locator('#settingsPanel')).toBeVisible();

  await page.locator('#settingsBackupToggle').click();
  await page.locator('#recoverySnapshotsBtn').click();
  await expect(page.locator('#recoverySnapshotsModal')).toHaveClass(/open/);
  await page.locator('#recoveryLocalDataHelpBtn').click();
  await expect(page.locator('#recoverySnapshotsModal')).not.toHaveClass(/open/);
  await expect(page.locator('#localDataHelpModal')).toHaveClass(/open/);

  await page.locator('#closeLocalDataHelpBtn').click();
  await expect(page.locator('#localDataHelpModal')).not.toHaveClass(/open/);
  await expect(page.locator('#recoverySnapshotsModal')).toHaveClass(/open/);
});

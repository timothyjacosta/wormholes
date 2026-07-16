const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { openSelfContainedApp } = require('../support/self-contained-app');

test('Data Safety stays concise and returns users to Settings and Restore Points', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, { inlineStyles:true });

  await page.locator('#settingsGearBtn').click();
  await page.locator('#settingsHelpToggle').click();
  await expect(page.locator('#privacyLocalDataBtn')).toHaveText('Data Safety');
  await page.locator('#privacyLocalDataBtn').click();

  const modal = page.locator('#localDataHelpModal');
  await expect(modal).toHaveClass(/open/);
  await expect(page.locator('#localDataHelpTitle')).toHaveText('Data Safety');
  await expect(modal.locator('.local-data-help-card')).toHaveCount(5);
  await expect(modal).toContainText('What Wormholes protects');
  await expect(modal).toContainText('What Wormholes relies on');
  await expect(modal).toContainText('Restore point limits');
  await expect(modal).toContainText('Backups and folders');
  await expect(modal).not.toContainText(/trust boundar|threat model|attack surface/i);

  const accessibility = await new AxeBuilder({ page }).include('#localDataHelpModal').analyze();
  expect(accessibility.violations).toEqual([]);
  const geometry = await modal.locator('.local-data-help-modal').evaluate(element => ({
    clientWidth:element.clientWidth,
    scrollWidth:element.scrollWidth,
    clientHeight:element.clientHeight,
    scrollHeight:element.scrollHeight
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);

  await page.locator('#closeLocalDataHelpBtn').click();
  await expect(modal).not.toHaveClass(/open/);
  await expect(page.locator('#settingsPanel')).toBeVisible();
  await expect(page.locator('#privacyLocalDataBtn')).toBeFocused();

  await page.locator('#settingsBackupToggle').click();
  await page.locator('#recoverySnapshotsBtn').click();
  await expect(page.locator('#recoverySnapshotsModal')).toHaveClass(/open/);
  await page.locator('#recoveryLocalDataHelpBtn').click();
  await expect(page.locator('#recoverySnapshotsModal')).not.toHaveClass(/open/);
  await expect(modal).toHaveClass(/open/);
  await page.locator('#closeLocalDataHelpBtn').click();
  await expect(page.locator('#recoverySnapshotsModal')).toHaveClass(/open/);
  await expect(page.locator('#recoveryLocalDataHelpBtn')).toBeFocused();

  expect(runtimeErrors).toEqual([]);
});

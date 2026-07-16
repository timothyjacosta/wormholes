const { test, expect } = require('@playwright/test');
const { openCleanApp } = require('../support/app');

const groups = [
  ['settingsHelpToggle', 'settingsHelpBody', 'Help & About'],
  ['settingsStorageToggle', 'settingsStorageBody', 'Storage'],
  ['settingsBackupToggle', 'settingsBackupBody', 'Backup & Recovery'],
  ['settingsAdvancedToggle', 'settingsAdvancedBody', 'Advanced'],
  ['settingsDangerToggle', 'settingsDangerBody', 'Danger Zone'],
];

test('Settings uses compact collapsed groups with simple labels', async ({ page }) => {
  await openCleanApp(page);
  await page.locator('#settingsGearBtn').click();
  const panel = page.locator('#settingsPanel');
  await expect(panel).toBeVisible();

  for (const [toggleId, bodyId, label] of groups) {
    const toggle = page.locator(`#${toggleId}`);
    await expect(toggle).toHaveText(label);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(`#${bodyId}`)).toBeHidden();
  }

  await page.locator('#settingsBackupToggle').click();
  await expect(page.locator('#settingsBackupToggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#settingsBackupBody')).toBeVisible();
  await expect(page.locator('#exportAppDataBtn')).toHaveText('Download Backup');
  await expect(page.locator('#importAppDataBtn')).toHaveText('Restore from Backup');
  await expect(page.locator('#recoverySnapshotsBtn')).toHaveText('Restore Points');
  await expect(page.locator('#createBackupBtn')).toHaveText('Back Up Folder');
  await expect(page.locator('#restoreBackupBtn')).toHaveText('Choose Backup Folder');

  await page.locator('#settingsStorageToggle').click();
  await expect(page.locator('#settingsStorageBody')).toBeVisible();
  await expect(page.locator('#settingsBackupBody')).toBeHidden();
  await expect(page.locator('#settingsBackupToggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#changeTargetStorageBtn')).toHaveText('Choose Storage Folder');

  await page.locator('#settingsAdvancedToggle').click();
  await expect(page.locator('#activityLogBtn')).toHaveText('Recent Activity');

  await page.locator('#settingsDangerToggle').click();
  await expect(page.locator('#clearAppDataBtn')).toHaveText('Delete All Wormholes Data');
  await expect(page.locator('.settings-section--danger #clearAppDataBtn')).toHaveCount(1);

  await page.locator('#settingsDangerToggle').click();
  await expect(page.locator('#settingsDangerBody')).toBeHidden();
  await expect(page.locator('#settingsDangerToggle')).toHaveAttribute('aria-expanded', 'false');
});

test('nested Settings works with the keyboard', async ({ page }) => {
  await openCleanApp(page);
  await page.locator('#settingsGearBtn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#settingsHelpToggle')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#settingsHelpToggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#settingsHelpBody')).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#quickStartMenuBtn')).toBeFocused();

  await page.locator('#settingsDangerToggle').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#settingsDangerToggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#settingsDangerBody')).toBeVisible();
  await expect(page.locator('#settingsHelpBody')).toBeHidden();
});

test('Settings panel is easier to read while remaining softly translucent', async ({ page }) => {
  await openCleanApp(page);
  await page.locator('#settingsGearBtn').click();
  const panel = page.locator('#settingsPanel');
  await expect(panel).toBeVisible();

  const visual = await panel.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      backgroundImage: style.backgroundImage,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter || '',
      boxShadow: style.boxShadow,
      color: style.color,
    };
  });

  expect(visual.backgroundImage).toMatch(/rgba\(38, 44, 60, 0\.98[34]\)/);
  expect(visual.backgroundImage).toMatch(/rgba\(24, 29, 41, 0\.99[56]\)/);
  expect(visual.backdropFilter).toContain('blur(14px)');
  expect(visual.boxShadow).not.toBe('none');
  expect(visual.color).not.toBe('rgba(0, 0, 0, 0)');
});

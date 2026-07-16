'use strict';

const {test, expect} = require('@playwright/test');
const {openCleanApp} = require('../support/app');

test.describe('actionable import reports and activity log', () => {
  test('failed import toast opens a full report that remains available in Log', async ({page}) => {
    await openCleanApp(page);

    await page.locator('#appDataImportInput').setInputFiles({
      name:'damaged-wormholes-backup.json',
      mimeType:'application/json',
      buffer:Buffer.from('{"format":"Wormholes App Data Export","universes":[')
    });

    const toast = page.locator('#savedToast');
    await expect(toast).toHaveClass(/action-toast/);
    await expect(toast).toContainText('Import failed');
    await expect(toast.locator('.saved-toast-more-button')).toHaveText('More information');

    await toast.locator('.saved-toast-more-button').click();
    await expect(page.locator('#activityDetailModal')).toHaveClass(/open/);
    await expect(page.locator('#activityDetailTitle')).toHaveText('Import report');
    await expect(page.locator('#activityDetailBody')).toContainText('What happened');
    await expect(page.locator('#activityDetailBody')).toContainText('What to do next');
    await expect(page.locator('#activityDetailBody')).toContainText('Download Backup again');
    await page.locator('#activityDetailBody details').open?.();
    await expect(page.locator('#activityDetailBody')).toContainText('damaged-wormholes-backup.json');
    await page.locator('#closeActivityDetailBtn').click();

    await page.locator('#settingsGearBtn').click();
    await page.locator('#settingsAdvancedToggle').click();
    await page.locator('#activityLogBtn').click();
    await expect(page.locator('#activityLogModal')).toHaveClass(/open/);
    const importItem = page.locator('#activityLogList .activity-log-item--error').filter({hasText:'Import failed'}).first();
    await expect(importItem).toBeVisible();
    await expect(importItem.locator('time')).not.toHaveText('');
    await importItem.getByRole('button', {name:'More information'}).click();
    await expect(page.locator('#activityDetailTitle')).toHaveText('Import report');
    await page.locator('#closeActivityDetailBtn').click();
    await expect(page.locator('#activityLogModal')).toHaveClass(/open/);
  });

  test('an active Undo can be used from its log item', async ({page}) => {
    await openCleanApp(page);
    await page.evaluate(async () => {
      window.__activityLogUndoWorked = false;
      await window.WormholesUndo.offer({
        message:'Temporary test action',
        restoredMessage:'Temporary action undone',
        undo:async () => {
          window.__activityLogUndoWorked = true;
          return true;
        }
      });
    });

    await page.locator('#settingsGearBtn').click();
    await page.locator('#settingsAdvancedToggle').click();
    await page.locator('#activityLogBtn').click();
    const item = page.locator('#activityLogList .activity-log-item--undo').filter({hasText:'Temporary test action'}).first();
    await expect(item).toBeVisible();
    await expect(item.getByRole('button', {name:'Undo'})).toBeEnabled();
    await item.getByRole('button', {name:'Undo'}).click();
    await expect.poll(() => page.evaluate(() => window.__activityLogUndoWorked)).toBe(true);
  });
  test('Undo remains available in Log after the toast timer ends', async ({page}) => {
    await openCleanApp(page);
    await page.evaluate(async () => {
      window.__activityLogDelayedUndoWorked = false;
      await window.WormholesUndo.offer({
        message:'Delayed test action',
        restoredMessage:'Delayed action undone',
        undo:async () => {
          window.__activityLogDelayedUndoWorked = true;
          return true;
        }
      });
    });

    await expect(page.locator('#savedToast')).toHaveClass(/undo-toast/);
    await page.waitForTimeout(8300);
    await expect(page.locator('#savedToast')).not.toHaveClass(/show/);

    await page.locator('#settingsGearBtn').click();
    await page.locator('#settingsAdvancedToggle').click();
    await page.locator('#activityLogBtn').click();
    const item = page.locator('#activityLogList .activity-log-item--undo').filter({hasText:'Delayed test action'}).first();
    await expect(item.getByRole('button', {name:'Undo'})).toBeEnabled();
    await item.getByRole('button', {name:'Undo'}).click();
    await expect.poll(() => page.evaluate(() => window.__activityLogDelayedUndoWorked)).toBe(true);
  });

});

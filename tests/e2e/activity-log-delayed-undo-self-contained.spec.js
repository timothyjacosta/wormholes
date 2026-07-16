'use strict';

const {test, expect} = require('@playwright/test');
const {openSelfContainedApp} = require('../support/self-contained-app');

test.describe('Activity Log delayed Undo', () => {
  test('restores deleted Literature after the toast has ended', async ({page}) => {
    await openSelfContainedApp(page, {inlineStyles:true});

    await page.locator('#createUniverseBtn').click();
    await page.locator('#universeTitleInput').fill('Delayed Undo Test');
    await page.locator('#saveUniverseTitleBtn').click();
    await expect(page.locator('#appScreen')).toBeVisible();

    await page.evaluate(() => {
      literatureEntries = [{
        id:'delayed-undo-literature',
        title:'Document to restore',
        type:'Document',
        content:'Test content',
        tags:[],
        connections:[]
      }];
      normalizeLiteratureEntries();
      if(!saveLiteratureToStorage()) throw new Error('Could not save Literature fixture.');
      renderLiteratureList();
    });

    await page.evaluate(() => deleteLiteratureDoc('delayed-undo-literature'));
    await expect(page.locator('#savedToast')).toHaveClass(/undo-toast/);
    await page.waitForTimeout(8300);
    await expect(page.locator('#savedToast')).not.toHaveClass(/show/);
    await expect.poll(() => page.evaluate(() => window.WormholesUndo.hasActive())).toBe(true);

    await page.locator('#settingsGearBtn').click();
    await page.locator('#settingsAdvancedToggle').click();
    await page.locator('#activityLogBtn').click();
    const item = page.locator('#activityLogList .activity-log-item--undo').filter({hasText:'Document deleted'}).first();
    const undo = item.getByRole('button', {name:'Undo'});
    await expect(undo).toBeEnabled();
    await undo.click();

    await expect.poll(() => page.evaluate(() => literatureEntries.some(entry => entry.id === 'delayed-undo-literature'))).toBe(true);
    await expect(item).toContainText('Undone');
  });

  test('expired Undo entries show status instead of a dead button', async ({page}) => {
    await openSelfContainedApp(page, {inlineStyles:true});

    await page.evaluate(async () => {
      await window.WormholesUndo.offer({
        message:'Expired test action',
        undo:async () => true
      });
      await window.WormholesUndo.commitActive({silent:true});
    });

    await page.locator('#settingsGearBtn').click();
    await page.locator('#settingsAdvancedToggle').click();
    await page.locator('#activityLogBtn').click();
    const item = page.locator('#activityLogList .activity-log-item--undo').filter({hasText:'Expired test action'}).first();
    await expect(item).toContainText('Undo expired');
    await expect(item.getByRole('button', {name:'Undo'})).toHaveCount(0);
  });

});

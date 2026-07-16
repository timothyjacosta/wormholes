const { test, expect } = require('@playwright/test');
const { appUrl } = require('../support/app');

test('a second Wormholes tab is blocked before it can write', async ({ context, page }) => {
  await page.goto(appUrl(), {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.WormholesSingleTab?.getState() === 'active');
  await expect(page.locator('#homeScreen')).toBeVisible();

  const duplicate = await context.newPage();
  await duplicate.goto(appUrl(), {waitUntil:'domcontentloaded'});
  await duplicate.waitForFunction(() => window.WormholesSingleTab?.getState() === 'duplicate');

  await expect(duplicate.locator('#wormholesDuplicateTabBlocker')).toBeVisible();
  await expect(duplicate.locator('#wormholesDuplicateTabMessage')).toHaveText(
    'Wormholes is already open in another tab. To prevent lost work, return to the existing Wormholes tab.'
  );

  const writeAttempt = await duplicate.evaluate(() => ({
    result:saveLocalStorageText('wormholesDuplicateWriteTest', 'blocked'),
    stored:localStorage.getItem('wormholesDuplicateWriteTest'),
    canWrite:window.WormholesSingleTab.canWrite(),
  }));

  expect(writeAttempt).toEqual({result:false, stored:null, canWrite:false});
  await expect(page.locator('#homeScreen')).toBeVisible();
});

test('a stale second tab cannot overwrite newer data saved by the active tab', async ({ context, page }) => {
  const regressionKey = 'wormholesMultiTabStaleWriteRegression';
  const originalValue = JSON.stringify({ revision:1, title:'Original data' });
  const newerValue = JSON.stringify({ revision:2, title:'Newer active-tab data' });

  await page.goto(appUrl(), {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => window.WormholesSingleTab?.getState() === 'active');

  const initialWrite = await page.evaluate(({ key, value }) => ({
    result:saveLocalStorageText(key, value),
    stored:localStorage.getItem(key),
  }), { key:regressionKey, value:originalValue });
  expect(initialWrite).toEqual({result:true, stored:originalValue});

  // Capture the old value exactly as a second tab would have held it before
  // the active tab saved a newer revision.
  const staleValue = initialWrite.stored;

  const duplicate = await context.newPage();
  await duplicate.goto(appUrl(), {waitUntil:'domcontentloaded'});
  await duplicate.waitForFunction(() => window.WormholesSingleTab?.getState() === 'duplicate');

  const activeWrite = await page.evaluate(({ key, value }) => ({
    result:saveLocalStorageText(key, value),
    stored:localStorage.getItem(key),
  }), { key:regressionKey, value:newerValue });
  expect(activeWrite).toEqual({result:true, stored:newerValue});

  const staleWriteAttempt = await duplicate.evaluate(({ key, value }) => ({
    result:saveLocalStorageText(key, value),
    stored:localStorage.getItem(key),
    canWrite:window.WormholesSingleTab.canWrite(),
  }), { key:regressionKey, value:staleValue });

  expect(staleWriteAttempt).toEqual({
    result:false,
    stored:newerValue,
    canWrite:false,
  });

  const finalStoredValue = await page.evaluate(key => localStorage.getItem(key), regressionKey);
  expect(finalStoredValue).toBe(newerValue);
});


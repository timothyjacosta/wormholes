const {test, expect} = require('@playwright/test');
const {openCleanApp, createUniverse, archiveQuickRollCreation} = require('../support/app');

test('Connections and Bridges explain their difference with inline help', async ({page}) => {
  await openCleanApp(page);
  await createUniverse(page, 'Relationship Help Universe');
  await archiveQuickRollCreation(page, 'Relationship Help Item');

  await page.locator('#connectionsBtn').click();
  await expect(page.locator('#connectionsScreen')).toBeVisible();
  await expect(page.locator('[data-relationship-guide="connections"]')).toContainText(
    'Connections link items in this universe.',
  );
  await expect(page.locator('#connectionsHelpPanel')).toBeVisible();
  await expect(page.locator('#connectionsHelpBtn')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#connectionsHelpPanel')).toContainText(
    'To link an item in another universe, use a Bridge.',
  );

  const modalCountBeforeConnectionsHelp = await page.locator('.modal-backdrop.open').count();
  await page.locator('#dismissConnectionsHelpBtn').click();
  await expect(page.locator('#connectionsHelpPanel')).toBeHidden();
  await expect(page.locator('#connectionsHelpBtn')).toHaveText('What’s this?');
  expect(await page.locator('.modal-backdrop.open').count()).toBe(modalCountBeforeConnectionsHelp);
  expect(await page.evaluate(() => localStorage.getItem('wormholesConnectionsHelpSeen'))).toBe('true');

  await page.locator('#backToArchiveBtn').click();
  await page.locator('#connectionsBtn').click();
  await expect(page.locator('#connectionsHelpPanel')).toBeHidden();
  await page.locator('#connectionsHelpBtn').click();
  await expect(page.locator('#connectionsHelpPanel')).toBeVisible();
  await expect(page.locator('#connectionsHelpBtn')).toHaveText('Hide help');
  await page.locator('#connectionsHelpBtn').click();
  await expect(page.locator('#connectionsHelpPanel')).toBeHidden();

  await page.locator('#homeBtn').click();
  await page.locator('#manageWormholesBtn').click();
  await expect(page.locator('#wormholesModal')).toHaveClass(/open/);
  await expect(page.locator('[data-relationship-guide="bridges"]')).toContainText(
    'Bridges link items across universes.',
  );
  await expect(page.locator('#bridgesHelpPanel')).toBeVisible();
  await expect(page.locator('#bridgesHelpPanel')).toContainText(
    'To link items inside one universe, use a Connection.',
  );

  const modalCountBeforeBridgesHelp = await page.locator('.modal-backdrop.open').count();
  await page.locator('#dismissBridgesHelpBtn').click();
  await expect(page.locator('#bridgesHelpPanel')).toBeHidden();
  expect(await page.locator('.modal-backdrop.open').count()).toBe(modalCountBeforeBridgesHelp);
  expect(await page.evaluate(() => localStorage.getItem('wormholesBridgesHelpSeen'))).toBe('true');

  await page.locator('#closeWormholesBtn').click();
  await page.locator('#manageWormholesBtn').click();
  await expect(page.locator('#bridgesHelpPanel')).toBeHidden();
  await page.locator('#bridgesHelpBtn').click();
  await expect(page.locator('#bridgesHelpPanel')).toBeVisible();
});

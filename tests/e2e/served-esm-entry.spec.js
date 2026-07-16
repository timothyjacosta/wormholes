const fs = require('fs');
const path = require('path');
const {test, expect} = require('@playwright/test');

function servedUrl(){
  const root = path.resolve(__dirname, '..', '..');
  const name = fs.readdirSync(root)
    .filter(file => /^Wormholes_Beta_\d+\.served\.html$/.test(file))
    .sort((a,b) => a.localeCompare(b, undefined, {numeric:true}))
    .pop();
  if(!name) throw new Error('No served Wormholes build found.');
  return `http://127.0.0.1:4173/${name}`;
}

test('served build boots through the ES-module entry point and completes a basic workflow', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if(message.type() === 'error') errors.push(message.text()); });

  await page.goto(servedUrl(), {waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.WormholesServedRuntime?.mode || '')).toBe('esm-entry');
  const runtime = await page.evaluate(() => window.WormholesServedRuntime);
  expect(runtime.nativeBoundaries).toContain('domain-state');
  expect(runtime.nativeBoundaries).toContain('shell-interface');
  expect(runtime.transitionalAdapterCount).toBeGreaterThan(0);

  await page.locator('#createUniverseBtn').click();
  await page.locator('#universeTitleInput').fill('Served Runtime Universe');
  await page.locator('#saveUniverseTitleBtn').click();
  await expect(page.locator('#appScreen')).toBeVisible();
  await expect(page.locator('#currentUniverseLabel')).toHaveText('Served Runtime Universe');

  await page.locator('#skipRollAnimationToggle').check();
  await page.locator('#quickFullRollBtn').click();
  await expect(page.locator('#archiveBtn')).toBeEnabled();
  await page.locator('#archiveBtn').click();
  await page.locator('#creationTitleInput').fill('Served Runtime Creation');
  await page.locator('#saveArchiveBtn').click();
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', {hasText:'Served Runtime Creation'})).toBeVisible();

  expect(errors).toEqual([]);
});

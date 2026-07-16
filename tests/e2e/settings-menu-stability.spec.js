const { test, expect } = require('@playwright/test');
const { openCleanApp } = require('../support/app');

test('settings menu opens without launcher or panel reflow', async ({ page }) => {
  await openCleanApp(page);
  const gear = page.locator('#settingsGearBtn');
  const dock = page.locator('#settingsDock');
  const panel = page.locator('#settingsPanel');

  const gearBefore = await gear.boundingBox();
  const dockBefore = await dock.boundingBox();
  await gear.click();
  await expect(panel).toBeVisible();

  const panelBefore = await panel.boundingBox();
  const storageText = await page.locator('#settingsStorageFootnote').textContent();
  expect(storageText).not.toContain('calculating');

  for(const delay of [0, 16, 50, 100, 250, 500]){
    if(delay) await page.waitForTimeout(delay);
    const gearNow = await gear.boundingBox();
    const dockNow = await dock.boundingBox();
    const panelNow = await panel.boundingBox();

    expect(Math.abs(gearNow.x - gearBefore.x)).toBeLessThan(0.1);
    expect(Math.abs(gearNow.y - gearBefore.y)).toBeLessThan(0.1);
    expect(Math.abs(dockNow.x - dockBefore.x)).toBeLessThan(0.1);
    expect(Math.abs(dockNow.y - dockBefore.y)).toBeLessThan(0.1);
    expect(Math.abs(dockNow.width - dockBefore.width)).toBeLessThan(0.1);
    expect(Math.abs(dockNow.height - dockBefore.height)).toBeLessThan(0.1);
    expect(Math.abs(panelNow.x - panelBefore.x)).toBeLessThan(0.1);
    expect(Math.abs(panelNow.y - panelBefore.y)).toBeLessThan(0.1);
    expect(Math.abs(panelNow.width - panelBefore.width)).toBeLessThan(0.1);
    expect(Math.abs(panelNow.height - panelBefore.height)).toBeLessThan(0.1);
  }
});

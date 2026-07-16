const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');
const { createUniverse, createManualPartialCreation } = require('../support/app');

function relativeLuminance([red, green, blue]){
  const channels = [red, green, blue].map(value => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground, background){
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function parseRgb(value){
  const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if(!match) throw new Error(`Unable to parse color: ${value}`);
  return match.slice(1, 4).map(Number);
}

async function assertVisibleAndContrasting(button){
  await expect(button).toBeVisible();
  const metrics = await button.evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      display:style.display,
      visibility:style.visibility,
      opacity:Number(style.opacity),
      color:style.color,
      backgroundColor:style.backgroundColor,
      width:rect.width,
      height:rect.height
    };
  });
  expect(metrics.display).not.toBe('none');
  expect(metrics.visibility).toBe('visible');
  expect(metrics.opacity).toBe(1);
  expect(metrics.width).toBeGreaterThanOrEqual(27);
  expect(metrics.height).toBeGreaterThanOrEqual(27);
  expect(contrastRatio(parseRgb(metrics.color), parseRgb(metrics.backgroundColor))).toBeGreaterThanOrEqual(4.5);
}

test('ellipsis action buttons remain visible and high contrast across collection surfaces', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, { inlineStyles:true });
  const universeTitle = await createUniverse(page, 'Ellipsis Test Universe');
  await createManualPartialCreation(page, 'Ellipsis Test Creation');

  const archiveButton = page.locator('#archiveList .entry .menu-button').first();
  await assertVisibleAndContrasting(archiveButton);
  await page.evaluate(() => document.activeElement?.blur());
  for(let index = 0; index < 80; index += 1){
    await page.keyboard.press('Tab');
    if(await archiveButton.evaluate(element => document.activeElement === element)) break;
  }
  await expect(archiveButton).toBeFocused();
  const focusMetrics = await archiveButton.evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineStyle:style.outlineStyle, outlineWidth:style.outlineWidth };
  });
  expect(focusMetrics.outlineStyle).not.toBe('none');
  expect(parseFloat(focusMetrics.outlineWidth)).toBeGreaterThanOrEqual(3);

  await page.locator('#homeBtn').click();
  await page.locator('#enterUniverseBtn').click();
  const universeButton = page.locator('#universeArchiveList .universe-entry').filter({hasText:universeTitle}).locator('.menu-button');
  await assertVisibleAndContrasting(universeButton);
  await page.locator('#closeUniverseArchiveBtn').click();

  await page.locator('#enterUniverseBtn').click();
  await page.locator('#universeArchiveList .universe-entry').filter({hasText:universeTitle}).locator('.universe-entry-main').click();

  await page.locator('#literatureTabBtn').click();
  await page.locator('#literatureList').evaluate(list => {
    list.innerHTML = '<article class="entry"><div class="entry-top"><button class="entry-title app-button">Sample document</button><div class="menu-wrap"><button class="menu-button app-button" type="button" aria-label="Open document actions" aria-expanded="false">⋮</button><div class="menu"></div></div></div></article>';
  });
  await assertVisibleAndContrasting(page.locator('#literatureList .menu-button'));

  await page.locator('#visionTabBtn').click();
  await page.locator('#visionBoardGrid').evaluate(grid => {
    grid.innerHTML = '<article class="vision-pin"><div class="vision-pin-menu-wrap menu-wrap"><button class="vision-pin-menu-button menu-button app-button" type="button" aria-label="Open image actions" aria-expanded="false">⋮</button><div class="menu vision-pin-menu"></div></div><div class="vision-pin-label">Sample image</div></article>';
  });
  const visionButton = page.locator('#visionBoardGrid .vision-pin-menu-button');
  await assertVisibleAndContrasting(visionButton);
  expect(runtimeErrors).toEqual([]);
});

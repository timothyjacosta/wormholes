const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');
const { createUniverse, createManualPartialCreation } = require('../support/app');

async function rowMetrics(row){
  return row.evaluate(element => {
    const style = getComputedStyle(element);
    const main = element.querySelector(':scope > .ellipsis-row-main, :scope > .universe-entry-main, :scope > .entry-title');
    const action = element.querySelector(':scope > .ellipsis-row-actions > .menu-button, :scope > .menu-wrap > .menu-button');
    const rowRect = element.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const mainStyle = getComputedStyle(main);
    const actionStyle = getComputedStyle(action);
    return {
      row:{
        backgroundImage:style.backgroundImage,
        borderRadius:style.borderRadius,
        borderTopWidth:style.borderTopWidth,
        boxShadow:style.boxShadow,
        left:rowRect.left,
        right:rowRect.right,
        top:rowRect.top,
        bottom:rowRect.bottom
      },
      main:{
        topLeft:mainStyle.borderTopLeftRadius,
        topRight:mainStyle.borderTopRightRadius,
        bottomLeft:mainStyle.borderBottomLeftRadius,
        bottomRight:mainStyle.borderBottomRightRadius,
        left:mainRect.left,
        right:mainRect.right
      },
      action:{
        backgroundColor:actionStyle.backgroundColor,
        color:actionStyle.color,
        borderLeftWidth:actionStyle.borderLeftWidth,
        topLeft:actionStyle.borderTopLeftRadius,
        topRight:actionStyle.borderTopRightRadius,
        bottomLeft:actionStyle.borderBottomLeftRadius,
        bottomRight:actionStyle.borderBottomRightRadius,
        left:actionRect.left,
        right:actionRect.right,
        top:actionRect.top,
        bottom:actionRect.bottom
      }
    };
  });
}

function expectUnifiedGeometry(metrics){
  expect(parseFloat(metrics.row.borderRadius)).toBeGreaterThanOrEqual(10);
  expect(parseFloat(metrics.main.topLeft)).toBeGreaterThanOrEqual(9);
  expect(parseFloat(metrics.main.bottomLeft)).toBeGreaterThanOrEqual(9);
  expect(parseFloat(metrics.main.topRight)).toBe(0);
  expect(parseFloat(metrics.main.bottomRight)).toBe(0);
  expect(parseFloat(metrics.action.topLeft)).toBe(0);
  expect(parseFloat(metrics.action.bottomLeft)).toBe(0);
  expect(parseFloat(metrics.action.topRight)).toBeGreaterThanOrEqual(9);
  expect(parseFloat(metrics.action.bottomRight)).toBeGreaterThanOrEqual(9);
  expect(parseFloat(metrics.action.borderLeftWidth)).toBe(2);
  expect(Math.abs(metrics.action.right - metrics.row.right)).toBeLessThanOrEqual(2);
  expect(Math.abs(metrics.action.top - metrics.row.top)).toBeLessThanOrEqual(2);
  expect(Math.abs(metrics.action.bottom - metrics.row.bottom)).toBeLessThanOrEqual(2);
  expect(metrics.action.backgroundColor).toBe('rgb(165, 144, 121)');
}

test('Universe, Archive, and Literature share the Enter Universe split-row style', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, { inlineStyles:true });
  const universeTitle = await createUniverse(page, 'Unified Row Universe');
  await createManualPartialCreation(page, 'Unified Row Archive Entity');

  const archiveRow = page.locator('#archiveList .entry-top').first();
  const archive = await rowMetrics(archiveRow);
  expectUnifiedGeometry(archive);
  await archiveRow.locator('.menu-button').click();
  const archiveMenu = archiveRow.locator('.menu');
  await expect(archiveMenu).toBeVisible();
  const archiveMenuExtendsOutsideRow = await archiveMenu.evaluate((menu, row) => {
    const menuRect = menu.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    return menuRect.bottom > rowRect.bottom || menuRect.left < rowRect.left;
  }, await archiveRow.elementHandle());
  expect(archiveMenuExtendsOutsideRow).toBe(true);
  await archiveRow.locator('.menu-button').click();

  await page.locator('#homeBtn').click();
  await page.locator('#enterUniverseBtn').click();
  const universeRow = page.locator('#universeArchiveList .universe-entry').filter({hasText:universeTitle});
  const universe = await rowMetrics(universeRow);
  expectUnifiedGeometry(universe);

  expect(archive.row.backgroundImage).toBe(universe.row.backgroundImage);
  expect(archive.row.borderTopWidth).toBe(universe.row.borderTopWidth);
  expect(archive.row.boxShadow).toBe(universe.row.boxShadow);

  await page.locator('#closeUniverseArchiveBtn').click();
  await page.locator('#enterUniverseBtn').click();
  await universeRow.locator('.universe-entry-main').click();
  await page.locator('#literatureTabBtn').click();
  await page.locator('#literatureList').evaluate(list => {
    list.innerHTML = '<article class="entry literature-entry"><div class="entry-top ellipsis-row"><button class="entry-title ellipsis-row-main app-button" type="button"><span class="entry-title-text"><span class="entry-title-main">Unified Literature Entity</span><span class="entry-title-what">Document</span></span></button><div class="menu-wrap ellipsis-row-actions"><button class="menu-button app-button" type="button" aria-label="Open document actions">⋮</button><div class="menu"></div></div></div></article>';
  });
  const literature = await rowMetrics(page.locator('#literatureList .entry-top'));
  expectUnifiedGeometry(literature);
  expect(literature.row.backgroundImage).toBe(universe.row.backgroundImage);
  expect(literature.row.boxShadow).toBe(universe.row.boxShadow);
  expect(runtimeErrors).toEqual([]);
});

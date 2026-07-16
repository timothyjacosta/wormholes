const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');
const { createUniverse, createManualPartialCreation } = require('../support/app');

async function expectAllCornersRounded(locator, minimumRadius){
  const metrics = await locator.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      topLeft:parseFloat(style.borderTopLeftRadius),
      topRight:parseFloat(style.borderTopRightRadius),
      bottomRight:parseFloat(style.borderBottomRightRadius),
      bottomLeft:parseFloat(style.borderBottomLeftRadius),
      overflow:style.overflow
    };
  });
  expect(metrics.topLeft).toBeGreaterThanOrEqual(minimumRadius);
  expect(metrics.topRight).toBeGreaterThanOrEqual(minimumRadius);
  expect(metrics.bottomRight).toBeGreaterThanOrEqual(minimumRadius);
  expect(metrics.bottomLeft).toBeGreaterThanOrEqual(minimumRadius);
  expect(metrics.overflow).toBe('visible');
}

test('Archive and Literature entity headers round all four corners when collapsed and expanded', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, { inlineStyles:true });
  await createUniverse(page, 'Rounded Header Test Universe');
  await createManualPartialCreation(page, 'Rounded Archive Entity');

  const archiveHeader = page.locator('#archiveList .entry-top').first();
  await expectAllCornersRounded(archiveHeader, 12);
  await page.locator('#archiveList .entry-title').first().click();
  await expect(page.locator('#archiveList .entry').first()).toHaveClass(/open/);
  await expectAllCornersRounded(archiveHeader, 12);

  await page.locator('#literatureTabBtn').click();
  await page.locator('#literatureList').evaluate(list => {
    list.innerHTML = '<article class="entry"><div class="entry-top"><button class="entry-title app-button" type="button"><span class="entry-title-main">Rounded Literature Entity</span></button><div class="menu-wrap"><button class="menu-button app-button" type="button" aria-label="Open document actions">⋮</button></div></div><div class="entry-details" style="display:block">Details</div></article>';
  });
  await expectAllCornersRounded(page.locator('#literatureList .entry-top'), 12);
  expect(runtimeErrors).toEqual([]);
});

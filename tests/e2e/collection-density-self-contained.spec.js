const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

async function createUniverse(page){
  await page.locator('#createUniverseBtn').click();
  await page.locator('#universeTitleInput').fill('Density Test Universe');
  await page.locator('#saveUniverseTitleBtn').click();
  await expect(page.locator('#appScreen')).toBeVisible();
}

async function setRange(page, selector, value){
  await page.locator(selector).evaluate((slider, nextValue) => {
    slider.value = String(nextValue);
    slider.dispatchEvent(new Event('input', { bubbles:true }));
  }, value);
}

test('collection density sliders apply layouts and reset to Comfortable on tab reopen', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, { inlineStyles:true });
  await createUniverse(page);

  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveTab')).toBeVisible();
  await expect(page.locator('#archiveDensityValue')).toHaveText('Comfortable');
  await expect(page.locator('#archiveListScreen')).toHaveAttribute('data-density', 'comfortable');
  await setRange(page, '#archiveDensitySlider', 1);
  await expect(page.locator('#archiveDensityValue')).toHaveText('Compact');
  await expect(page.locator('#archiveDensitySlider')).toHaveAttribute('aria-valuetext', 'Compact');
  await expect(page.locator('#archiveListScreen')).toHaveAttribute('data-density', 'compact');
  await page.locator('#currentTabBtn').click();
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveDensityValue')).toHaveText('Comfortable');
  await expect(page.locator('#archiveDensitySlider')).toHaveValue('2');

  await page.locator('#literatureTabBtn').click();
  await expect(page.locator('#literatureTab')).toBeVisible();
  await setRange(page, '#literatureDensitySlider', 3);
  await expect(page.locator('#literatureDensityValue')).toHaveText('Spacious');
  await expect(page.locator('#literatureListScreen')).toHaveAttribute('data-density', 'spacious');
  await page.locator('#archiveTabBtn').click();
  await page.locator('#literatureTabBtn').click();
  await expect(page.locator('#literatureDensityValue')).toHaveText('Comfortable');
  await expect(page.locator('#literatureListScreen')).toHaveAttribute('data-density', 'comfortable');

  await page.locator('#visionTabBtn').click();
  await expect(page.locator('#visionTab')).toBeVisible();
  await setRange(page, '#visionDensitySlider', 1);
  await expect(page.locator('#visionDensityValue')).toHaveText('Compact');
  await expect(page.locator('#visionTab')).toHaveAttribute('data-density', 'compact');
  const compactColumns = await page.locator('#visionBoardGrid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns);
  await page.locator('#currentTabBtn').click();
  await page.locator('#visionTabBtn').click();
  await expect(page.locator('#visionTab')).toBeVisible();
  await expect(page.locator('#visionDensityValue')).toHaveText('Comfortable');
  await expect(page.locator('#visionTab')).toHaveAttribute('data-density', 'comfortable');
  const comfortableColumns = await page.locator('#visionBoardGrid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns);
  expect(compactColumns).not.toBe(comfortableColumns);

  expect(runtimeErrors).toEqual([]);
});

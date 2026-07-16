const { test, expect } = require('@playwright/test');
const path = require('path');
const { openCleanApp, createUniverse, uniqueTitle } = require('../support/app');

function universeEntry(page, title){
  return page.locator('#universeArchiveList .universe-entry').filter({hasText:title});
}

async function enterSavedUniverse(page, title){
  await page.locator('#enterUniverseBtn').click();
  await expect(page.locator('#universeArchiveModal')).toHaveClass(/open/);
  const entry = universeEntry(page, title);
  await expect(entry).toHaveCount(1);
  await entry.locator('.universe-entry-main').click();
  await expect(page.locator('#currentUniverseLabel')).toHaveText(title);
}

function visionPin(page, title){
  return page.locator('#visionBoardGrid .vision-pin').filter({hasText:title});
}

async function openVisionMenu(page, title){
  const pin = visionPin(page, title);
  await expect(pin).toHaveCount(1);
  await pin.locator('.vision-pin-menu-button').click();
  return pin;
}

test('Vision Board lifecycle preserves upload, rename, tags, reload, delete, undo, and final cleanup', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  const universeTitle = await createUniverse(page, uniqueTitle('Vision Lifecycle'));
  const originalTitle = 'vision-sample';
  const renamedTitle = uniqueTitle('Vision Renamed');
  const imagePath = path.join(__dirname, '..', 'fixtures', 'vision-sample.png');

  await page.locator('#visionTabBtn').click();
  await page.locator('#visionFileInput').setInputFiles(imagePath);
  await expect(page.locator('#visionBoardCount')).toHaveText('1 image added');
  await expect(visionPin(page, originalTitle)).toBeVisible();

  let pin = await openVisionMenu(page, originalTitle);
  await pin.locator('.vision-rename-action').click();
  await expect(page.locator('#visionRenameModal')).toHaveClass(/open/);
  await page.locator('#visionRenameInput').fill(renamedTitle);
  await page.locator('#saveVisionRenameBtn').click();
  await expect(page.locator('#visionRenameModal')).not.toHaveClass(/open/);
  await expect(visionPin(page, renamedTitle)).toBeVisible();
  await expect(visionPin(page, originalTitle)).toHaveCount(0);

  pin = await openVisionMenu(page, renamedTitle);
  await pin.locator('.vision-tag-action').click();
  await expect(page.locator('#literatureTagModal')).toHaveClass(/open/);
  const universeChoice = page.locator('#literatureTagList .literature-tag-choice[data-tag-type="universe"]').filter({hasText:universeTitle});
  await expect(universeChoice).toHaveCount(1);
  await universeChoice.click();
  await page.locator('#saveLiteratureTagBtn').click();
  await expect(page.locator('#literatureTagModal')).not.toHaveClass(/open/);
  await expect(visionPin(page, renamedTitle).locator('.vision-tag-count-badge')).toHaveText('1');

  let stored = await page.evaluate(title => {
    const key = Object.keys(localStorage).find(candidate => candidate.startsWith('wormholesUniverseVision:'));
    const envelope = key ? JSON.parse(localStorage.getItem(key)) : null;
    return envelope?.data?.find(item => item.title === title) || null;
  }, renamedTitle);
  expect(stored?.tags?.universes?.length).toBe(1);

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await enterSavedUniverse(page, universeTitle);
  await page.locator('#visionTabBtn').click();
  await expect(visionPin(page, renamedTitle)).toBeVisible();
  await expect(visionPin(page, renamedTitle).locator('.vision-tag-count-badge')).toHaveText('1');

  pin = await openVisionMenu(page, renamedTitle);
  await pin.locator('.vision-delete-action').click();
  await expect(page.locator('#visionDeleteConfirmModal')).toHaveClass(/open/);
  await page.locator('#confirmVisionDeleteBtn').click();
  await expect(visionPin(page, renamedTitle)).toHaveCount(0);
  await expect(page.locator('#savedToast .undo-toast-button')).toBeVisible();
  await page.locator('#savedToast .undo-toast-button').click();
  await expect(visionPin(page, renamedTitle)).toBeVisible();

  pin = await openVisionMenu(page, renamedTitle);
  await pin.locator('.vision-delete-action').click();
  await page.locator('#confirmVisionDeleteBtn').click();
  await page.evaluate(async () => { await window.WormholesUndo.commitActive({silent:true}); });
  await expect(visionPin(page, renamedTitle)).toHaveCount(0);

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await enterSavedUniverse(page, universeTitle);
  await page.locator('#visionTabBtn').click();
  await expect(visionPin(page, renamedTitle)).toHaveCount(0);

  stored = await page.evaluate(title => {
    const key = Object.keys(localStorage).find(candidate => candidate.startsWith('wormholesUniverseVision:'));
    const envelope = key ? JSON.parse(localStorage.getItem(key)) : null;
    return envelope?.data?.find(item => item.title === title) || null;
  }, renamedTitle);
  expect(stored).toBeNull();
  expect(runtimeErrors).toEqual([]);
});

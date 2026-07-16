const path = require('path');
const { test, expect } = require('@playwright/test');
const {
  appHtmlPath,
  uniqueTitle,
  openCleanApp,
  createUniverse,
  archiveQuickRollCreation,
  createManualPartialCreation,
  createTwoArchivedCreations
} = require('../support/app');

test.describe('Wormholes core smoke tests', () => {
  test('app shell loads without duplicate ids or startup runtime errors', async ({ page }) => {
    const runtimeErrors = await openCleanApp(page);

    await expect(page).toHaveTitle(/Wormholes Beta \d+ — Universe Builder/);
    await expect(page.locator('#homeScreen')).toBeVisible();
    await expect(page.locator('#createUniverseBtn')).toBeVisible();

    const duplicateIds = await page.evaluate(() => {
      const counts = new Map();
      document.querySelectorAll('[id]').forEach(element => {
        counts.set(element.id, (counts.get(element.id) || 0) + 1);
      });
      return Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([id, count]) => `${id} (${count})`);
    });

    expect(duplicateIds).toEqual([]);
    expect(runtimeErrors).toEqual([]);
  });

  test('creates a universe and blocks duplicate universe titles', async ({ page }) => {
    await openCleanApp(page);
    const universeTitle = uniqueTitle('Duplicate Guard Universe');
    await createUniverse(page, universeTitle);

    await page.locator('#homeBtn').click();
    await page.locator('#createUniverseBtn').click();
    await page.locator('#universeTitleInput').fill(universeTitle);
    await page.locator('#saveUniverseTitleBtn').click();

    await expect(page.locator('#universeTitleModal')).toHaveClass(/open/);
    await expect(page.locator('#universeTitleError')).toContainText('already exists');
    await expect(page.locator('#currentUniverseLabel')).toHaveText(universeTitle);
  });

  test('quick roll can be archived and displayed in Archive & Connections', async ({ page }) => {
    await openCleanApp(page);
    await createUniverse(page);
    const creationTitle = await archiveQuickRollCreation(page);

    await expect(page.locator('#archiveCount')).toHaveText('1 creation saved');
    await page.locator('#archiveList .entry-title-main', { hasText: creationTitle }).click();
    await expect(page.locator('#archiveList .entry.open')).toBeVisible();
    await expect(page.locator('#archiveList .entry.open')).toContainText('What:');
    await expect(page.locator('#archiveList .entry.open')).toContainText('Story:');
  });

  test('manual partial creation saves, while duplicate manual attributes are blocked', async ({ page }) => {
    await openCleanApp(page);
    await createUniverse(page);
    const manualTitle = await createManualPartialCreation(page);

    await expect(page.locator('#archiveList .entry-title-main', { hasText: manualTitle })).toBeVisible();

    await page.locator('#createTabBtn').click();
    await page.locator('#manualTitle').fill(uniqueTitle('Duplicate Attribute Check'));
    await page.locator('#manualAttr1').selectOption('__custom__');
    await page.locator('#manualAttr1Custom').fill('Mirrored');
    await page.locator('#manualAttr2').selectOption('__custom__');
    await page.locator('#manualAttr2Custom').fill('Mirrored');

    await expect(page.locator('#manualError')).toContainText('Choose two different attributes.');
    await expect(page.locator('#saveManualBtn')).toBeDisabled();
  });

  test('literature upload saves a document and shows the browser-storage prompt', async ({ page }) => {
    await openCleanApp(page);
    await createUniverse(page);

    await page.locator('#literatureTabBtn').click();
    await expect(page.locator('#literatureStorageFootnote')).toHaveText(/Local folder (not connected|unavailable)/);
    await expect(page.locator('#literatureStorageFootnote')).not.toContainText(/\b(?:B|KB|MB|GB)\b/);

    await page.locator('#literatureFileInput').setInputFiles(path.join(__dirname, '..', 'fixtures', 'literature-sample.txt'));

    await expect(page.locator('#literatureCount')).toHaveText('1 doc saved');
    await expect(page.locator('#literatureList .entry-title-main', { hasText:'literature-sample' })).toBeVisible();
    await expect(page.locator('#literatureTab .browser-storage-upload-prompt')).toContainText('browser storage');
  });

  test('vision-board upload saves an image and shows the browser-storage prompt', async ({ page }) => {
    await openCleanApp(page);
    await createUniverse(page);

    await page.locator('#visionTabBtn').click();
    await expect(page.locator('#visionStorageFootnote')).toHaveText(/Local folder (not connected|unavailable)/);
    await expect(page.locator('#visionStorageFootnote')).not.toContainText(/\b(?:B|KB|MB|GB)\b/);

    await page.locator('#visionFileInput').setInputFiles(path.join(__dirname, '..', 'fixtures', 'vision-sample.png'));

    await expect(page.locator('#visionBoardCount')).toHaveText('1 image added');
    await expect(page.locator('#visionBoardGrid .vision-pin')).toHaveCount(1);
    await expect(page.locator('#visionTab .browser-storage-upload-prompt')).toContainText('browser storage');
  });

  test('creation-to-creation connections can be created from the archive menu', async ({ page }) => {
    await openCleanApp(page);
    await createUniverse(page);
    const { first, second, firstId } = await createTwoArchivedCreations(page);

    const sourceCard = page.locator(`#archiveList .entry[data-id="${firstId}"]`);
    await sourceCard.locator('.menu-button').click();
    await sourceCard.locator('.connect-action').click();

    await expect(page.locator('#connectPickerModal')).toHaveClass(/open/);
    await page.locator('#connectPickerList .nested-picker-select', { hasText:second }).click();
    await page.locator('#saveConnectPickerBtn').click();

    await expect(page.locator('#connectPickerModal')).not.toHaveClass(/open/);
    const updatedSourceCard = page.locator(`#archiveList .entry[data-id="${firstId}"]`);
    await updatedSourceCard.locator('.entry-title').click();
    await expect(updatedSourceCard.locator('.entry-details')).toContainText(second);
  });

  test('settings menu remains the only place with detailed storage byte usage', async ({ page }) => {
    await openCleanApp(page);
    await createUniverse(page);

    for(const tabId of ['archiveTabBtn', 'literatureTabBtn', 'visionTabBtn']){
      await page.locator(`#${tabId}`).click();
      const footnoteId = tabId === 'archiveTabBtn'
        ? 'archiveStorageFootnote'
        : tabId === 'literatureTabBtn'
          ? 'literatureStorageFootnote'
          : 'visionStorageFootnote';
      await expect(page.locator(`#${footnoteId}`)).toHaveText(/Local folder/);
      await expect(page.locator(`#${footnoteId}`)).not.toContainText(/\b(?:B|KB|MB|GB)\b/);
    }

    await page.locator('#settingsGearBtn').click();
    await page.locator('#settingsStorageToggle').click();
    await expect(page.locator('#settingsLocalFolderToggle')).toBeVisible();
    await expect(page.locator('#settingsStorageFootnote')).toContainText(/Total:/);
  });
});

// A light static sanity check to make sure the tests are pointed at the intended app file.
test('test harness resolves a Wormholes Beta html file', async () => {
  expect(appHtmlPath()).toMatch(/Wormholes_Beta_\d+\.html$/);
});

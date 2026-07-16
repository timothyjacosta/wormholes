const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

function appRoot(){
  return path.resolve(__dirname, '..', '..');
}

function appHtmlPath(){
  const root = appRoot();
  const candidates = fs.readdirSync(root)
    .filter(name => /^Wormholes_Beta_\d+\.html$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric:true }));

  if(candidates.length === 0){
    throw new Error(`No Wormholes_Beta_*.html file found in ${root}`);
  }

  return path.join(root, candidates[candidates.length - 1]);
}

function appUrl(){
  const baseUrl = process.env.WORMHOLES_TEST_BASE_URL || 'http://127.0.0.1:4173';
  return `${baseUrl.replace(/\/$/, '')}/${path.basename(appHtmlPath())}`;
}

function uniqueTitle(prefix){
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
}

async function resetBrowserStorage(page){
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();

    if(indexedDB.databases){
      const databases = await indexedDB.databases();
      await Promise.all(databases
        .map(db => db && db.name)
        .filter(Boolean)
        .filter(name => /wormholes/i.test(name))
        .map(name => new Promise(resolve => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = resolve;
          request.onerror = resolve;
          request.onblocked = resolve;
        })));
    }
  });
}

async function openCleanApp(page){
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if(message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto(appUrl(), { waitUntil:'domcontentloaded' });
  await resetBrowserStorage(page);
  await page.reload({ waitUntil:'domcontentloaded' });
  await expect(page.locator('#homeScreen')).toBeVisible();
  return runtimeErrors;
}

async function createUniverse(page, title = uniqueTitle('Smoke Universe')){
  await page.locator('#createUniverseBtn').click();
  await expect(page.locator('#universeTitleModal')).toHaveClass(/open/);
  await page.locator('#universeTitleInput').fill(title);
  await page.locator('#saveUniverseTitleBtn').click();
  await expect(page.locator('#appScreen')).toBeVisible();
  await expect(page.locator('#currentUniverseLabel')).toHaveText(title);
  return title;
}

async function archiveQuickRollCreation(page, title = uniqueTitle('Smoke Creation')){
  await page.locator('#skipRollAnimationToggle').check();
  await page.locator('#quickFullRollBtn').click();
  await expect(page.locator('#archiveBtn')).toBeEnabled();
  await page.locator('#archiveBtn').click();
  await expect(page.locator('#titleModal')).toHaveClass(/open/);
  await page.locator('#creationTitleInput').fill(title);
  await page.locator('#saveArchiveBtn').click();
  await expect(page.locator('#titleModal')).not.toHaveClass(/open/);
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', { hasText:title })).toBeVisible();
  return title;
}

async function createManualPartialCreation(page, title = uniqueTitle('Manual Partial')){
  await page.locator('#createTabBtn').click();
  await page.locator('#manualTitle').fill(title);
  await page.locator('#manualWhat').selectOption('__custom__');
  await page.locator('#manualWhatCustom').fill('Clockwork Orchard');
  await expect(page.locator('#saveManualBtn')).toBeEnabled();
  await page.locator('#saveManualBtn').click();
  await expect(page.locator('#manualError')).toContainText(`Archived partial creation "${title}"`);
  await page.locator('#archiveTabBtn').click();
  await expect(page.locator('#archiveList .entry-title-main', { hasText:title })).toBeVisible();
  return title;
}

async function archiveEntryIdByTitle(page, title){
  return page.evaluate(targetTitle => {
    const entry = archiveEntries.find(item => item && item.title === targetTitle);
    if(!entry?.id) throw new Error(`Archive entry not found for title: ${targetTitle}`);
    return entry.id;
  }, title);
}

async function createTwoArchivedCreations(page){
  const first = await archiveQuickRollCreation(page, uniqueTitle('Connection Source'));
  const firstId = await archiveEntryIdByTitle(page, first);
  await page.locator('#currentTabBtn').click();
  const second = await archiveQuickRollCreation(page, uniqueTitle('Connection Target'));
  const secondId = await archiveEntryIdByTitle(page, second);
  return { first, second, firstId, secondId };
}

module.exports = {
  appRoot,
  appHtmlPath,
  appUrl,
  uniqueTitle,
  openCleanApp,
  createUniverse,
  archiveQuickRollCreation,
  createManualPartialCreation,
  createTwoArchivedCreations
};

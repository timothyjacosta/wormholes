const { test, expect } = require('@playwright/test');
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

function literatureEntry(page, title){
  return page.locator('#literatureList .literature-entry').filter({hasText:title});
}

async function openLiteratureEntryMenu(page, title){
  const entry = literatureEntry(page, title);
  await expect(entry).toHaveCount(1);
  await entry.locator(':scope > .entry-top .menu-button').click();
  return entry;
}

test('Literature lifecycle preserves create, edit, reload, delete, undo, and final cleanup', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  const universeTitle = await createUniverse(page, uniqueTitle('Literature Lifecycle'));
  const originalTitle = uniqueTitle('Lifecycle Draft');
  const editedTitle = uniqueTitle('Lifecycle Edited');

  await page.locator('#literatureTabBtn').click();
  await page.locator('#createLiteratureBtn').click();
  await expect(page.locator('#literatureEditorScreen')).toHaveClass(/active/);
  await page.locator('#literatureTitleInput').fill(originalTitle);
  await page.locator('#literatureEditor').fill('Original lifecycle body');
  await page.locator('#saveLiteratureBtn').click();

  await expect(page.locator('#literatureListScreen')).toHaveClass(/active/);
  await expect(page.locator('#literatureCount')).toHaveText('1 doc saved');
  await expect(literatureEntry(page, originalTitle)).toBeVisible();

  let stored = await page.evaluate(title => {
    const key = Object.keys(localStorage).find(candidate => candidate.startsWith('wormholesUniverseLiterature:'));
    const envelope = key ? JSON.parse(localStorage.getItem(key)) : null;
    return envelope?.data?.find(doc => doc.title === title) || null;
  }, originalTitle);
  expect(stored?.content).toContain('Original lifecycle body');
  expect(stored?.kind).toBe('');
  expect(stored?.convertedFrom).toBe('');
  expect(stored?.contentStoreKey).toMatch(new RegExp(`^literature:.+:${stored.id}:content$`));

  let entry = await openLiteratureEntryMenu(page, originalTitle);
  await entry.locator(':scope > .entry-top .literature-edit-action').click();
  await expect(page.locator('#literatureEditorHeading')).toHaveText('Edit Document');
  await page.locator('#literatureTitleInput').fill(editedTitle);
  await page.locator('#literatureEditor').fill('Edited lifecycle body');
  await page.locator('#saveLiteratureBtn').click();

  await expect(literatureEntry(page, originalTitle)).toHaveCount(0);
  await expect(literatureEntry(page, editedTitle)).toBeVisible();

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await enterSavedUniverse(page, universeTitle);
  await page.locator('#literatureTabBtn').click();
  await expect(literatureEntry(page, editedTitle)).toBeVisible();

  entry = await openLiteratureEntryMenu(page, editedTitle);
  await entry.locator(':scope > .entry-top .literature-edit-action').click();
  await expect(page.locator('#literatureTitleInput')).toHaveValue(editedTitle);
  await expect(page.locator('#literatureEditor')).toContainText('Edited lifecycle body');
  await page.locator('#cancelLiteratureEditorBtn').click();
  await expect(page.locator('#literatureListScreen')).toHaveClass(/active/);

  entry = await openLiteratureEntryMenu(page, editedTitle);
  await entry.locator(':scope > .entry-top .literature-delete-action').click();
  await expect(page.locator('#literatureDeleteConfirmModal')).toHaveClass(/open/);
  await page.locator('#confirmLiteratureDeleteBtn').click();
  await expect(literatureEntry(page, editedTitle)).toHaveCount(0);
  await expect(page.locator('#savedToast .undo-toast-button')).toBeVisible();
  await page.locator('#savedToast .undo-toast-button').click();
  await expect(literatureEntry(page, editedTitle)).toBeVisible();

  entry = await openLiteratureEntryMenu(page, editedTitle);
  await entry.locator(':scope > .entry-top .literature-delete-action').click();
  await page.locator('#confirmLiteratureDeleteBtn').click();
  await page.evaluate(async () => { await window.WormholesUndo.commitActive({silent:true}); });
  await expect(literatureEntry(page, editedTitle)).toHaveCount(0);

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await enterSavedUniverse(page, universeTitle);
  await page.locator('#literatureTabBtn').click();
  await expect(literatureEntry(page, editedTitle)).toHaveCount(0);

  stored = await page.evaluate(title => {
    const key = Object.keys(localStorage).find(candidate => candidate.startsWith('wormholesUniverseLiterature:'));
    const envelope = key ? JSON.parse(localStorage.getItem(key)) : null;
    return envelope?.data?.find(doc => doc.title === title) || null;
  }, editedTitle);
  expect(stored).toBeNull();
  expect(runtimeErrors).toEqual([]);
});


test('Literature TXT, DOC, and DOCX uploads persist as canonical records across reload', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  const universeTitle = await createUniverse(page, uniqueTitle('Literature Upload Persistence'));
  const fixtures = [
    {name:'literature-sample.txt', title:'literature-sample'},
    {name:'literature-legacy.doc', title:'literature-legacy'},
    {name:'literature-modern.docx', title:'literature-modern'}
  ];

  await page.locator('#literatureTabBtn').click();
  for(let index = 0; index < fixtures.length; index += 1){
    const fixture = fixtures[index];
    await page.locator('#literatureFileInput').setInputFiles(
      require('path').join(__dirname, '..', 'fixtures', fixture.name)
    );
    await expect(page.locator('#literatureCount')).toHaveText(`${index + 1} ${index === 0 ? 'doc' : 'docs'} saved`);
    await expect(literatureEntry(page, fixture.title)).toBeVisible();
  }

  const canonicalBeforeReload = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(candidate => candidate.startsWith('wormholesUniverseLiterature:'));
    const envelope = key ? JSON.parse(localStorage.getItem(key)) : null;
    return envelope?.data || [];
  });
  expect(canonicalBeforeReload).toHaveLength(3);
  for(const doc of canonicalBeforeReload){
    for(const field of [
      'id','kind','title','content','sourceName','fileType','mimeType','fileData','convertedFrom',
      'storage','folderFileName','contentStoreKey','contentStored','createdAt','updatedAt'
    ]) expect(typeof doc[field], `${doc.title}.${field}`).toBe('string');
    expect(typeof doc.fileSize, `${doc.title}.fileSize`).toBe('number');
    expect(Array.isArray(doc.tags?.universes), `${doc.title}.tags.universes`).toBe(true);
    expect(Array.isArray(doc.tags?.entries), `${doc.title}.tags.entries`).toBe(true);
  }

  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#homeScreen')).toBeVisible();
  await enterSavedUniverse(page, universeTitle);
  await page.locator('#literatureTabBtn').click();
  await expect(page.locator('#literatureCount')).toHaveText('3 docs saved');
  for(const fixture of fixtures) await expect(literatureEntry(page, fixture.title)).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

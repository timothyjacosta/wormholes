const { test, expect } = require('@playwright/test');
const {
  openCleanApp,
  createUniverse,
  archiveQuickRollCreation,
  archiveEntryIdByTitle,
  uniqueTitle
} = require('../support/app');

function archiveEntry(page, id){
  return page.locator(`#archiveList .entry[data-id="${id}"]`).first();
}

function literatureEntry(page, id){
  return page.locator(`#literatureList .literature-entry[data-id="${id}"]`).first();
}

async function openDirectMenu(entry){
  await entry.locator(':scope > .entry-top .menu-button').click();
}

test('group and multi-item operations remain atomic across Archive and Literature', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  await createUniverse(page, uniqueTitle('Group Coverage'));

  const titleA = await archiveQuickRollCreation(page, uniqueTitle('Group A'));
  const idA = await archiveEntryIdByTitle(page, titleA);
  await page.locator('#currentTabBtn').click();
  const titleB = await archiveQuickRollCreation(page, uniqueTitle('Group B'));
  const idB = await archiveEntryIdByTitle(page, titleB);
  await page.locator('#currentTabBtn').click();
  const titleC = await archiveQuickRollCreation(page, uniqueTitle('Group C'));
  const idC = await archiveEntryIdByTitle(page, titleC);

  await openDirectMenu(archiveEntry(page, idA));
  await archiveEntry(page, idA).locator(':scope > .entry-top .group-action').click();
  await expect(page.locator('#groupModal')).toHaveClass(/open/);
  await page.locator(`#groupCreationList .group-choice[data-entry-id="${idB}"]`).click();
  await page.locator(`#groupCreationList .group-choice[data-entry-id="${idC}"]`).click();
  const archiveGroupTitle = uniqueTitle('Archive Group');
  await page.locator('#groupTitleInput').fill(archiveGroupTitle);
  await page.locator('#saveGroupBtn').click();

  let archiveGroupId = await page.evaluate(() => archiveEntries.find(entry => entry.kind === 'group')?.id || '');
  expect(archiveGroupId).not.toBe('');
  await expect(archiveEntry(page, archiveGroupId)).toBeVisible();
  expect(await page.evaluate(id => archiveEntries.find(entry => entry.id === id)?.groupIds, archiveGroupId)).toEqual([idA, idB, idC]);

  await openDirectMenu(archiveEntry(page, archiveGroupId));
  await archiveEntry(page, archiveGroupId).locator(':scope > .entry-top .edit-group-action').click();
  await page.locator(`#groupCreationList .group-choice[data-entry-id="${idC}"]`).click();
  await page.locator('#saveGroupBtn').click();
  expect(await page.evaluate(id => archiveEntries.find(entry => entry.id === id)?.groupIds, archiveGroupId)).toEqual([idA, idB]);
  await expect(page.locator('#savedToast .undo-toast-button')).toBeVisible();
  await page.locator('#savedToast .undo-toast-button').click();
  expect(await page.evaluate(id => archiveEntries.find(entry => entry.id === id)?.groupIds, archiveGroupId)).toEqual([idA, idB, idC]);

  await openDirectMenu(archiveEntry(page, archiveGroupId));
  await archiveEntry(page, archiveGroupId).locator(':scope > .entry-top .ungroup-action').click();
  expect(await page.evaluate(id => archiveEntries.some(entry => entry.id === id), archiveGroupId)).toBe(false);
  expect(await page.evaluate(ids => ids.every(id => archiveEntries.some(entry => entry.id === id)), [idA, idB, idC])).toBe(true);
  await page.evaluate(async () => { await window.WormholesUndo.commitActive({silent:true}); });

  await page.locator('#literatureTabBtn').click();
  await page.evaluate(() => {
    const now = new Date().toISOString();
    literatureEntries = ['lit-a', 'lit-b', 'lit-c'].map((id, index) => ({
      id,
      title:`Literature ${String.fromCharCode(65 + index)}`,
      content:`<p>Document ${index + 1}</p>`,
      sourceName:`${id}.txt`,
      fileType:'text',
      mimeType:'text/plain',
      fileData:'',
      fileSize:20,
      convertedFrom:'',
      storage:'',
      folderFileName:'',
      contentStoreKey:'',
      contentStored:'',
      tags:{universes:[currentUniverseId], entries:[]},
      createdAt:now,
      updatedAt:now
    }));
    saveLiteratureToStorage();
    renderLiteratureList();
  });

  await openDirectMenu(literatureEntry(page, 'lit-a'));
  await literatureEntry(page, 'lit-a').locator(':scope > .entry-top .literature-group-action').click();
  await page.locator('#groupCreationList .group-choice[data-entry-id="lit-b"]').click();
  await page.locator('#groupCreationList .group-choice[data-entry-id="lit-c"]').click();
  await page.locator('#groupTitleInput').fill(uniqueTitle('Literature Group'));
  await page.locator('#saveGroupBtn').click();

  const literatureGroupId = await page.evaluate(() => literatureEntries.find(doc => doc.kind === 'literatureGroup')?.id || '');
  expect(literatureGroupId).not.toBe('');
  expect(await page.evaluate(id => literatureEntries.find(doc => doc.id === id)?.groupIds, literatureGroupId)).toEqual(['lit-a', 'lit-b', 'lit-c']);

  await openDirectMenu(literatureEntry(page, literatureGroupId));
  await literatureEntry(page, literatureGroupId).locator(':scope > .entry-top .literature-edit-group-action').click();
  await page.locator('#groupCreationList .group-choice[data-entry-id="lit-c"]').click();
  await page.locator('#saveGroupBtn').click();
  await page.evaluate(async () => { await window.WormholesUndo.commitActive({silent:true}); });

  await openDirectMenu(literatureEntry(page, 'lit-a'));
  await literatureEntry(page, 'lit-a').locator(':scope > .entry-top .literature-delete-action').click();
  await page.locator('#confirmLiteratureDeleteBtn').click();
  expect(await page.evaluate(id => literatureEntries.some(doc => doc.id === id), literatureGroupId)).toBe(false);
  expect(await page.evaluate(() => literatureEntries.map(doc => doc.id))).toEqual(['lit-b', 'lit-c']);

  await expect(page.locator('#savedToast .undo-toast-button')).toBeVisible();
  await page.locator('#savedToast .undo-toast-button').click();
  expect(await page.evaluate(id => literatureEntries.find(doc => doc.id === id)?.groupIds, literatureGroupId)).toEqual(['lit-a', 'lit-b']);

  expect(runtimeErrors).toEqual([]);
});

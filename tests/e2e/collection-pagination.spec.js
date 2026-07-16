const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse } = require('../support/app');

test('Archive, Literature, and Vision Board pagination appears only after a second page exists', async ({ page }) => {
  const runtimeErrors = await openCleanApp(page);
  await createUniverse(page, 'Pagination Test Universe');

  await page.evaluate(() => {
    archiveEntries = Array.from({length:51}, (_, index) => ({
      id:`archive-${index + 1}`,
      title:`Archive ${String(index + 1).padStart(2, '0')}`,
      what:{val:'Character'},
      attr1:{val:'Generated'},
      attr2:{val:'Generated'},
      pressure:{val:'Generated'},
      connections:[],
      bridges:[],
      createdAt:new Date(2026, 0, index + 1).toISOString()
    }));
    renderArchive();
  });

  await expect(page.locator('#archivePagination')).toBeVisible();
  await expect(page.locator('#archivePagination .pagination-status')).toHaveText('Page 1 of 2');
  await expect(page.locator('#archiveList > .entry')).toHaveCount(50);
  await page.locator('#archivePagination button[data-page="2"]').last().click();
  await expect(page.locator('#archivePagination .pagination-status')).toHaveText('Page 2 of 2');
  await expect(page.locator('#archiveList > .entry')).toHaveCount(1);

  await page.locator('#literatureTabBtn').click();
  await page.evaluate(() => {
    literatureEntries = Array.from({length:41}, (_, index) => ({
      id:`literature-${index + 1}`,
      title:`Literature ${String(index + 1).padStart(2, '0')}`,
      fileType:'text',
      content:'<p>Generated test content.</p>',
      tags:{universes:[], entries:[]},
      createdAt:new Date(2026, 1, index + 1).toISOString(),
      updatedAt:new Date(2026, 1, index + 1).toISOString()
    }));
    renderLiteratureList();
  });
  await expect(page.locator('#literaturePagination')).toBeVisible();
  await expect(page.locator('#literatureList > .entry')).toHaveCount(40);
  await page.locator('#literaturePagination button[data-page="2"]').last().click();
  await expect(page.locator('#literatureList > .entry')).toHaveCount(1);

  await page.locator('#visionTabBtn').click();
  await page.evaluate(async () => {
    visionEntries = Array.from({length:49}, (_, index) => ({
      id:`vision-${index + 1}`,
      title:`Vision ${String(index + 1).padStart(2, '0')}`,
      sourceName:`vision-${index + 1}.jpg`,
      fileType:'image',
      mimeType:'image/jpeg',
      dataUrl:'',
      thumbnailDataUrl:'',
      storage:'',
      tags:{universes:[], entries:[]},
      createdAt:new Date(2026, 2, index + 1).toISOString()
    }));
    await renderVisionBoard();
  });
  await expect(page.locator('#visionPagination')).toBeVisible();
  await expect(page.locator('#visionBoardGrid > .vision-pin')).toHaveCount(48);
  await page.locator('#visionPagination button[data-page="2"]').last().click();
  await expect(page.locator('#visionBoardGrid > .vision-pin')).toHaveCount(1);

  expect(runtimeErrors).toEqual([]);
});

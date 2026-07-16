const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse } = require('../support/app');

function backupWithLiterature(content, extras = {}){
  const now = new Date().toISOString();
  return {
    format:'Wormholes App Data Export',
    schemaVersion:4,
    appVersion:'Beta 197',
    exportedAt:now,
    currentUniverseId:'url-universe',
    universes:[{id:'url-universe', title:'URL Test', summary:'', bridges:[], createdAt:now, ...extras}],
    bridgeNotes:{},
    universeData:{
      'url-universe':{
        archive:[],
        connectionNotes:{},
        literature:[{
          id:'url-doc',
          title:'References',
          content,
          fileType:'html',
          fileSize:content.length,
          tags:{universes:[], entries:[]},
          createdAt:now,
          updatedAt:now
        }],
        vision:[]
      }
    }
  };
}

test('unsafe imported links are rejected before the review step', async ({ page }) => {
  await openCleanApp(page);
  await createUniverse(page, 'Existing Work');
  const backup = backupWithLiterature('<p><a href="javascript:alert(1)">Unsafe</a></p>');

  await page.locator('#appDataImportInput').setInputFiles({
    name:'unsafe-link.json',
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(backup))
  });

  await expect(page.locator('#urlSafetyModal')).toHaveClass(/open/);
  await expect(page.locator('#urlSafetyTitle')).toHaveText('Unsafe link found');
  await expect(page.locator('#appDataImportConfirmModal')).not.toHaveClass(/open/);
  await expect(page.locator('#currentUniverseLabel')).toHaveText('Existing Work');
});

test('safe Literature links open with isolated external-link attributes', async ({ page }) => {
  await openCleanApp(page);
  await createUniverse(page, 'Existing Work');
  const backup = backupWithLiterature('<p><a href="https://Example.com/reference">Reference</a></p>');

  await page.locator('#appDataImportInput').setInputFiles({
    name:'safe-link.json',
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(backup))
  });
  await expect(page.locator('#appDataImportConfirmModal')).toHaveClass(/open/);
  await page.locator('#confirmAppDataImportBtn').click();
  await expect(page.locator('#homeScreen')).toBeVisible();
  await page.locator('#enterUniverseBtn').click();
  const importedUniverse = page.locator('#universeArchiveList .universe-entry').filter({hasText:'URL Test'});
  await expect(importedUniverse).toHaveCount(1);
  await importedUniverse.locator('.universe-entry-main').click();
  await expect(page.locator('#currentUniverseLabel')).toHaveText('URL Test');
  await page.locator('#literatureTabBtn').click();
  await page.locator('#literatureList .entry-title').click();

  const link = page.locator('#literatureViewerContent a');
  await expect(link).toHaveAttribute('href', 'https://example.com/reference');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
});

const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('all image preview surfaces use thumbnails and expanded Vision Board images use the full source', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  const seeded = await page.evaluate(async () => {
    function patternedPng(size, offset){
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      for(let y = 0; y < size; y += 8){
        for(let x = 0; x < size; x += 8){
          context.fillStyle = `rgb(${(x * 5 + offset) % 255}, ${(y * 7 + offset) % 255}, ${(x + y + offset) % 255})`;
          context.fillRect(x, y, 8, 8);
        }
      }
      return canvas.toDataURL('image/png');
    }

    const thumbnail = patternedPng(96, 21);
    const full = patternedPng(640, 113);
    const now = new Date().toISOString();
    const universe = {id:makeId(), title:'Thumbnail Audit Universe', summary:'', bridges:[], createdAt:now};
    universe.diskFolderName = stableUniverseFolderName(universe);
    universes.push(universe);
    saveUniversesToStorage();
    enterUniverse(universe.id);

    const entry = {
      id:makeId(),
      title:'Thumbnail Audit Creation',
      what:{val:'Place — Landmark'},
      attr1:{val:'A'}, attr2:{val:'B'}, pressure:{val:'C'},
      connections:[], bridges:[], notes:[], createdAt:now
    };
    archiveEntries = [normalizeSchemaArchiveEntry(entry)];
    saveArchiveToStorage();

    const image = {
      id:makeId(), title:'Thumbnail Audit Image', sourceName:'thumbnail-audit.png',
      fileType:'image', mimeType:'image/png', dataUrl:full, thumbnailDataUrl:thumbnail,
      storage:'', folderFileName:'', fileSize:full.length, tags:{universes:[], entries:[{universeId:universe.id, entryId:entry.id}]}, createdAt:now
    };
    visionEntries = [normalizeVisionEntry(image)];
    saveVisionBoardToStorage();

    switchTab('vision');
    await renderVisionBoard();
    return {thumbnail, full, universeId:universe.id, entryId:entry.id, imageId:image.id};
  });

  const pin = page.locator(`#visionBoardGrid .vision-pin.expandable[data-vision-id=\"${seeded.imageId}\"]`);
  const expandedPin = page.locator(`.vision-pin[data-vision-id=\"${seeded.imageId}\"]`);
  const pinImage = expandedPin.locator('img');
  await expect(pinImage).toHaveAttribute('src', seeded.thumbnail);
  await expect.poll(() => pinImage.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

  await pin.evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  await expect(expandedPin).toHaveClass(/expanded/);
  await expect(pinImage).toHaveAttribute('src', seeded.full);

  await page.locator('#visionEnlargeBackdrop').evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  await expect(expandedPin).not.toHaveClass(/expanded/);
  await expect(pinImage).toHaveAttribute('src', seeded.thumbnail);

  await page.evaluate(() => { switchTab('archive'); renderArchive(); });
  const archiveTitle = page.locator('#archiveList .entry-title-main').filter({hasText:'Thumbnail Audit Creation'}).first();
  await archiveTitle.evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  const archivePreview = page.locator('.archive-vision-thumb img').first();
  await expect(archivePreview).toHaveAttribute('src', seeded.thumbnail);

  await page.evaluate(() => showConnectionsScreen());
  const badge = page.locator(`#connectionsMapWrap .svg-vision-indicator[data-universe-id="${seeded.universeId}"][data-entry-id="${seeded.entryId}"]`).first();
  await badge.evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  const mapPreview = page.locator('#visionLinksList .vision-link-thumb img').first();
  await expect(mapPreview).toHaveAttribute('src', seeded.thumbnail);

  expect(runtimeErrors).toEqual([]);
});

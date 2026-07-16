const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

const FULL_WEBP = 'data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAADQAQCdASoEAAQAAUAmJaACdLoB+AADsAD+2O7/4s5GI7PN/8zRMcx+vQAAAA==';

async function openTaggedImageFromBadge(page, selector){
  const badge = page.locator(selector).first();
  await expect(badge).toHaveCount(1);
  await badge.evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  await expect(page.locator('#visionLinksModal')).toHaveClass(/open/);

  const thumb = page.locator('#visionLinksList .vision-link-thumb').first();
  await expect(thumb).toBeVisible();
  await expect(thumb.locator('img')).toHaveCount(1);
  const previewImage = thumb.locator('img');
  await expect(previewImage).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect.poll(() => previewImage.evaluate(image => image.naturalWidth)).toBeGreaterThan(0);

  await thumb.evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  await expect(page.locator('#visionImageViewerModal')).toHaveClass(/open/);
  await expect(page.locator('#visionImageViewerImg')).toHaveAttribute('src', /^data:image\/webp;base64,/);
  await expect(page.locator('#visionImageViewerFrame')).toHaveClass(/has-image/);

  await page.locator('#returnVisionImageViewerBtn').evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  await page.locator('#closeVisionLinksBtn').evaluate(element => element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true})));
  await expect(page.locator('#visionLinksModal')).not.toHaveClass(/open/);
}

test('camera badges show stored thumbnails in both map views before opening the full image', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  const seeded = await page.evaluate(full => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    for(let y = 0; y < canvas.height; y += 4){
      for(let x = 0; x < canvas.width; x += 4){
        const red = (x * 13 + y * 7) % 255;
        const green = (x * 5 + y * 17) % 255;
        const blue = (x * 19 + y * 3) % 255;
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(x, y, 4, 4);
      }
    }
    const thumbnail = canvas.toDataURL('image/png');
    if(thumbnail.length <= 8000) throw new Error('Thumbnail regression fixture is not large enough.');
    const now = new Date().toISOString();
    const universe = {
      id:makeId(),
      title:'Thumbnail Map Universe',
      summary:'Map thumbnail regression coverage',
      bridges:[],
      createdAt:now
    };
    universe.diskFolderName = stableUniverseFolderName(universe);
    universes.push(universe);
    saveUniversesToStorage();
    enterUniverse(universe.id);

    const first = {
      id:makeId(),
      title:'Thumbnail Target',
      what:{val:'Place — Landmark'},
      attr1:{val:'A'},
      attr2:{val:'B'},
      pressure:{val:'C'},
      connections:[],
      bridges:[],
      notes:[],
      createdAt:now
    };
    const second = {
      ...first,
      id:makeId(),
      title:'Connected Target',
      connections:[first.id]
    };
    first.connections = [second.id];
    archiveEntries = [first, second];
    saveArchiveToStorage();

    const image = {
      id:makeId(),
      title:'Map Preview Image',
      sourceName:'map-preview.webp',
      fileType:'image',
      mimeType:'image/webp',
      dataUrl:full,
      thumbnailDataUrl:thumbnail,
      storage:'',
      folderFileName:'',
      tags:{universes:[], entries:[{universeId:universe.id, entryId:first.id}]},
      createdAt:now
    };
    visionEntries = [image];
    saveVisionBoardToStorage();

    switchTab('archive');
    showConnectionsScreen();
    return {universeId:universe.id, entryId:first.id};
  }, FULL_WEBP);

  await openTaggedImageFromBadge(
    page,
    `#connectionsMapWrap .svg-vision-indicator[data-universe-id="${seeded.universeId}"][data-entry-id="${seeded.entryId}"]`
  );

  await page.evaluate(() => openWormholesModal());
  await expect(page.locator('#wormholesModal')).toHaveClass(/open/);
  await openTaggedImageFromBadge(
    page,
    `#wormholesMapWrap .svg-vision-indicator[data-universe-id="${seeded.universeId}"][data-entry-id="${seeded.entryId}"]`
  );

  expect(runtimeErrors).toEqual([]);
});

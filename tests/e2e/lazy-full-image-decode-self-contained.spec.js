const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('full images decode only after the user opens them', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {
    inlineStyles:true,
    beforeScripts:`
      window.__wormholesFullDecodeCalls = [];
      const nativeDecode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function(){
        window.__wormholesFullDecodeCalls.push(this.getAttribute('src') || '');
        return nativeDecode ? nativeDecode.call(this) : Promise.resolve();
      };
    `
  });

  const seeded = await page.evaluate(async () => {
    function png(size, offset){
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      for(let y = 0; y < size; y += 8){
        for(let x = 0; x < size; x += 8){
          context.fillStyle = `rgb(${(x + offset) % 255}, ${(y * 2 + offset) % 255}, ${(x + y * 3 + offset) % 255})`;
          context.fillRect(x, y, 8, 8);
        }
      }
      return canvas.toDataURL('image/png');
    }

    const thumbnail = png(96, 17);
    const full = png(720, 93);
    const now = new Date().toISOString();
    const universe = {id:makeId(), title:'Lazy Decode Universe', summary:'', bridges:[], createdAt:now};
    universe.diskFolderName = stableUniverseFolderName(universe);
    universes.push(universe);
    saveUniversesToStorage();
    enterUniverse(universe.id);

    const image = normalizeVisionEntry({
      id:makeId(), title:'Lazy Decode Image', sourceName:'lazy-decode.png',
      fileType:'image', mimeType:'image/png', dataUrl:full, thumbnailDataUrl:thumbnail,
      storage:'', folderFileName:'', fileSize:full.length, tags:{universes:[], entries:[]}, createdAt:now
    });
    visionEntries = [image];
    saveVisionBoardToStorage();
    switchTab('vision');
    await renderVisionBoard();
    return {imageId:image.id, thumbnail, full, universeId:universe.id};
  });

  const expandedPin = page.locator(`.vision-pin[data-vision-id="${seeded.imageId}"]`);
  const image = expandedPin.locator('img');
  await expect(image).toHaveAttribute('src', seeded.thumbnail);
  expect(await page.evaluate(() => window.__wormholesFullDecodeCalls.length)).toBe(0);

  await expandedPin.evaluate(element => {
    element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
  });
  await expect(expandedPin).toHaveClass(/expanded/);
  await expect(image).toHaveAttribute('src', seeded.full);
  await expect.poll(() => page.evaluate(() => window.__wormholesFullDecodeCalls.length)).toBe(1);

  await page.locator('#visionEnlargeBackdrop').evaluate(element => {
    element.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}));
  });
  await expect(image).toHaveAttribute('src', seeded.thumbnail);

  await page.evaluate(({universeId, imageId}) => openVisionImageViewer(universeId, imageId), seeded);
  await expect(page.locator('#visionImageViewerModal')).toHaveClass(/open/);
  await expect(page.locator('#visionImageViewerFrame')).toHaveClass(/has-image/);
  await expect.poll(() => page.evaluate(() => window.__wormholesFullDecodeCalls.length)).toBe(2);
  await expect(page.locator('#visionImageViewerImg')).toHaveAttribute('src', seeded.full);

  expect(runtimeErrors).toEqual([]);
});

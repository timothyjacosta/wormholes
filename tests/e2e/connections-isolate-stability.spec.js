const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse, createTwoArchivedCreations } = require('../support/app');

test('Connections isolate reaches its fitted state before the rebuilt map can paint', async ({ page }) => {
  await openCleanApp(page);
  await createUniverse(page, 'Isolation Stability Universe');
  const { second, firstId } = await createTwoArchivedCreations(page);

  const sourceCard = page.locator(`#archiveList .entry[data-id="${firstId}"]`);
  await sourceCard.locator('.menu-button').click();
  await sourceCard.locator('.connect-action').click();
  await page.locator('#connectPickerList .nested-picker-select', { hasText:second }).click();
  await page.locator('#saveConnectPickerBtn').click();

  await page.locator('#connectionsBtn').click();
  await expect(page.locator('#connectionsScreen')).toBeVisible();
  await page.locator(`.connection-node[data-id="${firstId}"]`).click();
  await expect(page.locator('#isolateConnectionsSubgraphBtn')).toBeVisible();

  await page.evaluate(() => {
    window.__isolateStageFrames = [];
    window.__isolateRafCallbacks = [];
    const wrap = document.getElementById('connectionsMapWrap');
    const originalRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      window.__isolateRafCallbacks.push(callback?.name || 'anonymous');
      return originalRaf(callback);
    };
    const observer = new MutationObserver(() => {
      const stage = document.getElementById('connectionsMapStage');
      if(stage){
        window.__isolateStageFrames.push({
          transform:stage.style.transform || '',
          visibility:stage.style.visibility || ''
        });
      }
    });
    observer.observe(wrap, {childList:true, subtree:true});
    window.__isolateObserver = observer;
  });

  await page.locator('#isolateConnectionsSubgraphBtn').click();
  await expect(page.locator('#connectionsMapStage')).toHaveClass(/isolated-subgraph-active/);

  const result = await page.evaluate(() => {
    window.__isolateObserver?.disconnect();
    return {
      frames:window.__isolateStageFrames || [],
      rafCallbacks:window.__isolateRafCallbacks || [],
      finalTransform:document.getElementById('connectionsMapStage')?.style.transform || '',
      finalVisibility:document.getElementById('connectionsMapStage')?.style.visibility || ''
    };
  });

  expect(result.frames.length).toBeGreaterThan(0);
  for(const frame of result.frames){
    expect(frame.transform.includes('scale(') || frame.visibility === 'hidden').toBeTruthy();
  }
  expect(result.rafCallbacks).not.toContain('fitConnectionsMapToViewport');
  expect(result.finalTransform).toContain('scale(');
  expect(result.finalVisibility).not.toBe('hidden');
});

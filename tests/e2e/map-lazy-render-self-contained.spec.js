const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

async function waitForLazyPass(page, stageSelector, requireDeferred = false){
  await page.waitForFunction(({selector, requireDeferred}) => {
    const stage = document.querySelector(selector);
    if(!stage || stage.dataset.mapLazyRenderedCount == null) return false;
    return !requireDeferred || Number(stage.dataset.mapLazyDeferredCount || 0) > 0;
  }, {selector:stageSelector, requireDeferred});
}

async function centerDeferredNode(page, options){
  return page.evaluate(({stageSelector, wrapSelector, nodeSelector, mapKind}) => {
    const stage = document.querySelector(stageSelector);
    const wrap = document.querySelector(wrapSelector);
    const svg = stage?.querySelector('svg');
    const candidates = Array.from(stage?.querySelectorAll(nodeSelector) || []);
    const node = candidates.find(item => item.dataset.mapLazyVisible === 'false');
    if(!stage || !wrap || !svg || !node) return null;
    const shape = node.querySelector(':scope > .wormhole-node-shape, :scope > rect');
    if(!shape) return null;
    const box = shape.getBBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const nextZoom = 1.6;
    const pan = mapPanForSvgPoint(wrap, svg, x, y, nextZoom);
    if(mapKind === 'connections'){
      connectionsMapAutoFitOnNextRender = false;
      connectionsMapZoom = nextZoom;
      connectionsMapPanX = pan.panX;
      connectionsMapPanY = pan.panY;
      applyConnectionsMapTransform();
    } else {
      wormholesMapAutoFitOnNextRender = false;
      wormholesMapZoom = nextZoom;
      wormholesMapPanX = pan.panX;
      wormholesMapPanY = pan.panY;
      applyWormholesMapTransform();
    }
    return mapKind === 'connections' ? node.dataset.id : `${node.dataset.universeId}:${node.dataset.creationId}`;
  }, options);
}

test('both map views defer off-screen labels and restore them before they enter view', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  const seeded = await page.evaluate(() => {
    const now = new Date().toISOString();
    const createdUniverses = [];
    for(let universeIndex = 0; universeIndex < 3; universeIndex += 1){
      const universe = {
        id:makeId(),
        title:`Lazy Map Universe ${universeIndex + 1}`,
        summary:'Lazy rendering coverage',
        bridges:[],
        createdAt:now
      };
      universe.diskFolderName = stableUniverseFolderName(universe);
      universes.push(universe);
      createdUniverses.push(universe);

      const entries = Array.from({length:28}, (_, index) => ({
        id:makeId(),
        title:`Entity ${universeIndex + 1}-${String(index + 1).padStart(2, '0')}`,
        what:{val:index % 2 ? 'Character — Explorer' : 'Place — Landmark'},
        attr1:{val:'A'},
        attr2:{val:'B'},
        pressure:{val:'C'},
        connections:[],
        bridges:[],
        notes:[],
        createdAt:now
      }));
      entries.forEach((entry, index) => {
        entry.connections = [entries[(index + 1) % entries.length].id];
      });
      saveArchiveForUniverse(universe.id, entries);
    }
    saveUniversesToStorage();
    enterUniverse(createdUniverses[0].id);
    switchTab('archive');
    showConnectionsScreen();
    return {firstUniverseId:createdUniverses[0].id};
  });

  await page.locator('#connectionsZoomSlider').evaluate(slider => {
    slider.value = '2.0';
    slider.dispatchEvent(new Event('input', {bubbles:true}));
  });
  await waitForLazyPass(page, '#connectionsMapStage', true);
  await expect(page.locator('#connectionsMapStage')).toHaveAttribute('data-map-lazy-eligible', 'true');
  const connectionDeferred = await page.locator('#connectionsMapStage').getAttribute('data-map-lazy-deferred-count');
  expect(Number(connectionDeferred)).toBeGreaterThan(0);

  const connectionId = await centerDeferredNode(page, {
    stageSelector:'#connectionsMapStage',
    wrapSelector:'#connectionsMapWrap',
    nodeSelector:'.connection-node',
    mapKind:'connections'
  });
  expect(connectionId).toBeTruthy();
  const connectionNode = page.locator(`#connectionsMapStage .connection-node[data-id="${connectionId}"]`);
  await expect(connectionNode).toHaveAttribute('data-map-lazy-visible', 'true');
  await expect(connectionNode.locator(':scope > text').first()).toBeVisible();

  await page.evaluate(() => openWormholesModal());
  await expect(page.locator('#wormholesModal')).toHaveClass(/open/);
  await page.locator('#wormholesZoomSlider').evaluate(slider => {
    slider.value = '2.0';
    slider.dispatchEvent(new Event('input', {bubbles:true}));
  });
  await waitForLazyPass(page, '#wormholesMapStage', true);
  await expect(page.locator('#wormholesMapStage')).toHaveAttribute('data-map-lazy-eligible', 'true');
  const bridgeDeferred = await page.locator('#wormholesMapStage').getAttribute('data-map-lazy-deferred-count');
  expect(Number(bridgeDeferred)).toBeGreaterThan(0);

  const bridgeKey = await centerDeferredNode(page, {
    stageSelector:'#wormholesMapStage',
    wrapSelector:'#wormholesMapWrap',
    nodeSelector:'.wormhole-creation',
    mapKind:'bridges'
  });
  expect(bridgeKey).toBeTruthy();
  const [universeId, creationId] = bridgeKey.split(':');
  const bridgeNode = page.locator(`#wormholesMapStage .wormhole-creation[data-universe-id="${universeId}"][data-creation-id="${creationId}"]`);
  await expect(bridgeNode).toHaveAttribute('data-map-lazy-visible', 'true');
  await expect(bridgeNode.locator(':scope > text, :scope > .wormhole-group-title-overlay').first()).toBeVisible();

  const preserved = await page.evaluate(universeId => readArchiveForUniverse(universeId).length, seeded.firstUniverseId);
  expect(preserved).toBe(28);
  expect(runtimeErrors).toEqual([]);
});

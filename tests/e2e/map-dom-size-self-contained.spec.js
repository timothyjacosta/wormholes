const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

async function waitForDomCompaction(page, stageSelector){
  await page.waitForFunction(selector => {
    const stage = document.querySelector(selector);
    return stage
      && stage.dataset.mapDomCompact === 'true'
      && stage.dataset.mapDomCompactionEligible === 'true'
      && Number(stage.dataset.mapDomDetachedCount || 0) > 0;
  }, stageSelector);
}

async function centerDeferredNode(page, {stageSelector, wrapSelector, nodeSelector, mapKind}){
  return page.evaluate(({stageSelector, wrapSelector, nodeSelector, mapKind}) => {
    const stage = document.querySelector(stageSelector);
    const wrap = document.querySelector(wrapSelector);
    const svg = stage?.querySelector('svg');
    const node = Array.from(stage?.querySelectorAll(nodeSelector) || [])
      .find(item => item.dataset.mapLazyVisible === 'false');
    if(!stage || !wrap || !svg || !node) return null;
    const shape = node.querySelector(':scope > .wormhole-node-shape, :scope > rect');
    if(!shape) return null;
    const box = shape.getBBox();
    const nextZoom = 1.65;
    const pan = mapPanForSvgPoint(wrap, svg, box.x + box.width / 2, box.y + box.height / 2, nextZoom);
    if(mapKind === 'connections'){
      connectionsMapAutoFitOnNextRender = false;
      connectionsMapZoom = nextZoom;
      connectionsMapPanX = pan.panX;
      connectionsMapPanY = pan.panY;
      applyConnectionsMapTransform();
      return node.dataset.id;
    }
    wormholesMapAutoFitOnNextRender = false;
    wormholesMapZoom = nextZoom;
    wormholesMapPanX = pan.panX;
    wormholesMapPanY = pan.panY;
    applyWormholesMapTransform();
    return `${node.dataset.universeId}:${node.dataset.creationId}`;
  }, {stageSelector, wrapSelector, nodeSelector, mapKind});
}

test('large maps reduce live SVG elements without changing map records or interactions', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  const seeded = await page.evaluate(() => {
    const now = new Date().toISOString();
    const created = [];
    for(let universeIndex = 0; universeIndex < 3; universeIndex += 1){
      const universe = {
        id:makeId(),
        title:`DOM Budget Universe ${universeIndex + 1}`,
        summary:'Large map DOM validation',
        bridges:[],
        createdAt:now
      };
      universe.diskFolderName = stableUniverseFolderName(universe);
      universes.push(universe);
      created.push(universe);

      const count = universeIndex === 0 ? 84 : 48;
      const entries = Array.from({length:count}, (_, index) => ({
        id:makeId(),
        title:`Entity ${universeIndex + 1}-${String(index + 1).padStart(3, '0')}`,
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
        entry.connections = [
          entries[(index + 1) % entries.length].id,
          entries[(index + 3) % entries.length].id
        ];
      });
      saveArchiveForUniverse(universe.id, entries);
    }
    saveUniversesToStorage();
    enterUniverse(created[0].id);
    switchTab('archive');
    showConnectionsScreen();
    return created.map(universe => ({id:universe.id, count:readArchiveForUniverse(universe.id).length}));
  });

  await page.locator('#connectionsZoomSlider').evaluate(slider => {
    slider.value = '2.0';
    slider.dispatchEvent(new Event('input', {bubbles:true}));
  });
  await waitForDomCompaction(page, '#connectionsMapStage');

  const connectionMetrics = await page.evaluate(() => {
    const stage = document.querySelector('#connectionsMapStage');
    return {
      nodes:stage.querySelectorAll('.connection-node').length,
      edgeGroups:stage.querySelectorAll('.connection-edge-group').length,
      glows:stage.querySelectorAll('.connection-edge-glow, .bridge-edge-glow').length,
      endpoints:stage.querySelectorAll('.map-edge-endpoint').length,
      detached:Number(stage.dataset.mapDomDetachedCount || 0),
      svgElements:stage.querySelectorAll('svg *').length
    };
  });
  expect(connectionMetrics.nodes).toBeGreaterThanOrEqual(80);
  expect(connectionMetrics.edgeGroups).toBeGreaterThan(70);
  expect(connectionMetrics.glows).toBeLessThan(connectionMetrics.edgeGroups);
  expect(connectionMetrics.endpoints).toBeLessThan(connectionMetrics.edgeGroups * 2);
  expect(connectionMetrics.detached).toBeGreaterThan(0);

  const connectionId = await centerDeferredNode(page, {
    stageSelector:'#connectionsMapStage',
    wrapSelector:'#connectionsMapWrap',
    nodeSelector:'.connection-node',
    mapKind:'connections'
  });
  expect(connectionId).toBeTruthy();
  const restoredConnectionNode = page.locator(`#connectionsMapStage .connection-node[data-id="${connectionId}"]`);
  await expect(restoredConnectionNode).toHaveAttribute('data-map-lazy-visible', 'true');
  await expect(restoredConnectionNode.locator(':scope > text').first()).toBeVisible();
  await restoredConnectionNode.click({position:{x:12, y:12}});
  await page.waitForFunction(() => document.querySelectorAll('#connectionsMapStage .connection-edge-group.highlighted .connection-edge-glow').length > 0);
  expect(await page.locator('#connectionsMapStage .connection-edge-group.highlighted .connection-edge-glow').count()).toBeGreaterThan(0);

  await page.evaluate(() => openWormholesModal());
  await page.locator('#wormholesZoomSlider').evaluate(slider => {
    slider.value = '2.0';
    slider.dispatchEvent(new Event('input', {bubbles:true}));
  });
  await waitForDomCompaction(page, '#wormholesMapStage');

  const bridgeMetrics = await page.evaluate(() => {
    const stage = document.querySelector('#wormholesMapStage');
    return {
      nodes:stage.querySelectorAll('.wormhole-creation').length,
      internalLines:stage.querySelectorAll('.wormhole-internal-line').length,
      endpoints:stage.querySelectorAll('.wormhole-endpoint').length,
      systemHalos:stage.querySelectorAll('.wormhole-system-halo').length,
      detached:Number(stage.dataset.mapDomDetachedCount || 0),
      svgElements:stage.querySelectorAll('svg *').length
    };
  });
  expect(bridgeMetrics.nodes).toBeGreaterThan(150);
  expect(bridgeMetrics.internalLines).toBeGreaterThan(100);
  expect(bridgeMetrics.endpoints).toBeLessThan(bridgeMetrics.internalLines * 2);
  expect(bridgeMetrics.systemHalos).toBe(0);
  expect(bridgeMetrics.detached).toBeGreaterThan(0);

  const bridgeKey = await centerDeferredNode(page, {
    stageSelector:'#wormholesMapStage',
    wrapSelector:'#wormholesMapWrap',
    nodeSelector:'.wormhole-creation',
    mapKind:'bridges'
  });
  expect(bridgeKey).toBeTruthy();
  const separator = bridgeKey.indexOf(':');
  const universeId = bridgeKey.slice(0, separator);
  const creationId = bridgeKey.slice(separator + 1);
  const restoredBridgeNode = page.locator(`#wormholesMapStage .wormhole-creation[data-universe-id="${universeId}"][data-creation-id="${creationId}"]`);
  await expect(restoredBridgeNode).toHaveAttribute('data-map-lazy-visible', 'true');
  await expect(restoredBridgeNode.locator(':scope > text, :scope > .wormhole-group-title-overlay').first()).toBeVisible();

  const preserved = await page.evaluate(rows => rows.map(row => readArchiveForUniverse(row.id).length), seeded);
  expect(preserved).toEqual(seeded.map(row => row.count));
  expect(runtimeErrors).toEqual([]);
});

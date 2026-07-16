const {test, expect} = require("@playwright/test");
const {openCleanApp, createUniverse} = require("../support/app");

async function seedRelationshipMap(page) {
  return page.evaluate(() => {
    const first = getCurrentUniverse();
    const now = new Date().toISOString();
    const second = {
      id: makeId(),
      title: "Far Universe",
      summary: "",
      bridges: [],
      createdAt: now,
    };
    second.diskFolderName = stableUniverseFolderName(second);
    universes.push(second);

    const source = {
      id: makeId(),
      title: "Lantern Keeper",
      what: {val: "Character — Keeper"},
      attr1: {val: "Patient"},
      attr2: {val: "Watchful"},
      pressure: {val: "The light is fading"},
      connections: [],
      bridges: [],
      notes: [],
      createdAt: now,
    };
    const target = {
      id: makeId(),
      title: "Glass Harbor",
      what: {val: "Place — Harbor"},
      attr1: {val: "Bright"},
      attr2: {val: "Fragile"},
      pressure: {val: "A storm is coming"},
      connections: [],
      bridges: [],
      notes: [],
      createdAt: now,
    };
    const remote = {
      id: makeId(),
      title: "Distant Beacon",
      what: {val: "Technology — Beacon"},
      attr1: {val: "Ancient"},
      attr2: {val: "Unstable"},
      pressure: {val: "It has begun to signal"},
      connections: [],
      bridges: [],
      notes: [],
      createdAt: now,
    };

    source.connections = [target.id];
    target.connections = [source.id];
    source.bridges = [{universeId: second.id, creationId: remote.id}];

    saveUniversesToStorage();
    saveArchiveForUniverse(first.id, [source, target]);
    saveArchiveForUniverse(second.id, [remote]);
    archiveEntries = [source, target];
    saveArchiveToStorage();
    switchTab("archive");
    showConnectionsScreen();

    return {
      firstId: first.id,
      secondId: second.id,
      sourceId: source.id,
      targetId: target.id,
      remoteId: remote.id,
    };
  });
}

async function expectSelectionFootnoteBelowMap(page, {statusId, mapWrapId, zoomSelector}) {
  const geometry = await page.evaluate(
    ({statusId, mapWrapId, zoomSelector}) => {
      const status = document.getElementById(statusId);
      const map = document.getElementById(mapWrapId);
      const zoom = document.querySelector(zoomSelector);
      if (!status || !map || !zoom) return null;
      const statusRect = status.getBoundingClientRect();
      const mapRect = map.getBoundingClientRect();
      const zoomRect = zoom.getBoundingClientRect();
      const overlaps = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        statusParentId: status.querySelector('.map-selection-guide')?.parentElement?.id || '',
        statusTop: statusRect.top,
        mapBottom: mapRect.bottom,
        overlapsMap: overlaps(statusRect, mapRect),
        overlapsZoom: overlaps(statusRect, zoomRect),
      };
    },
    {statusId, mapWrapId, zoomSelector},
  );
  expect(geometry).not.toBeNull();
  expect(geometry.statusParentId).toBe(statusId);
  expect(geometry.statusTop).toBeGreaterThanOrEqual(geometry.mapBottom - 1);
  expect(geometry.overlapsMap).toBe(false);
  expect(geometry.overlapsZoom).toBe(false);
}

test("selection help, clear selection, and removal confirmations work by keyboard", async ({
  page,
}) => {

  const runtimeErrors = await openCleanApp(page);
  await createUniverse(page, "Map Clarity Universe");
  const seeded = await seedRelationshipMap(page);

  const source = page.locator(`#connectionsMapWrap .connection-node[data-id="${seeded.sourceId}"]`);
  const target = page.locator(`#connectionsMapWrap .connection-node[data-id="${seeded.targetId}"]`);
  const remote = page.locator(
    `#connectionsMapWrap .connection-node[data-id="external:${seeded.secondId}:${seeded.remoteId}"]`,
  );

  await expect(page.locator("#archiveTab")).toBeVisible();
  await expect(page.locator("#connectionsScreen")).toHaveClass(/active/);
  await expect(source).toBeVisible();
  await source.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".connections-selection-guide")).toContainText(
    "Selected: Lantern Keeper",
  );
  await expect(page.locator("#connectionsSelectionHelpPanel")).toBeVisible();
  await expect(page.locator("#connectionsSelectionHelpPanel")).toContainText(
    "Select another item in this universe for a Connection",
  );
  await expect(page.locator("#clearMapSelectionBtn")).toHaveText("Clear selection");
  await expectSelectionFootnoteBelowMap(page, {
    statusId: "connectionsMapStatus",
    mapWrapId: "connectionsMapWrap",
    zoomSelector: "#connectionsMapWrap .connections-map-controls",
  });

  await page.locator("#connectionsSelectionHelpBtn").click();
  await expect(page.locator("#connectionsSelectionHelpPanel")).toBeHidden();
  await expect(page.locator("#connectionsSelectionHelpBtn")).toHaveText("What’s this?");
  expect(
    await page.evaluate(() => localStorage.getItem("wormholesConnectionsSelectionHelpSeen")),
  ).toBe("true");

  await page.locator("#clearMapSelectionBtn").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".connections-selection-guide")).toHaveCount(0);

  await source.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#connectionsSelectionHelpPanel")).toBeHidden();

  await target.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#relationshipRemovalConfirmModal")).toHaveClass(/open/);
  await expect(page.locator("#relationshipRemovalConfirmTitle")).toHaveText("Remove Connection?");
  await expect(page.locator("#relationshipRemovalConfirmText")).toContainText(
    "The items will not be deleted.",
  );
  await expect(page.locator("#cancelRelationshipRemovalBtn")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#relationshipRemovalConfirmModal")).not.toHaveClass(/open/);

  expect(
    await page.evaluate(
      ({sourceId, targetId}) => getEntry(sourceId).connections.includes(targetId),
      {sourceId: seeded.sourceId, targetId: seeded.targetId},
    ),
  ).toBe(true);

  await expect(page.locator("#clearMapSelectionBtn")).toBeVisible();
  await page.locator("#clearMapSelectionBtn").click();
  await expect(page.locator(".connections-selection-guide")).toHaveCount(0);
  await expect(source).toBeVisible();
  await source.focus();
  await page.keyboard.press("Enter");
  await expect(target).toBeVisible();
  await target.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#relationshipRemovalConfirmModal")).toHaveClass(/open/);
  await page.locator("#confirmRelationshipRemovalBtn").click();
  await expect(page.locator("#relationshipRemovalConfirmModal")).not.toHaveClass(/open/);
  expect(
    await page.evaluate(
      ({sourceId, targetId}) => getEntry(sourceId).connections.includes(targetId),
      {sourceId: seeded.sourceId, targetId: seeded.targetId},
    ),
  ).toBe(false);

  await expect(remote).toBeVisible();
  await page.waitForTimeout(100);
  await remote.focus();
  await expect(remote).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#relationshipRemovalConfirmModal")).toHaveClass(/open/);
  await expect(page.locator("#relationshipRemovalConfirmTitle")).toHaveText("Remove Bridge?");
  await expect(page.locator("#relationshipRemovalConfirmText")).toContainText("Lantern Keeper");
  await expect(page.locator("#relationshipRemovalConfirmText")).toContainText("Distant Beacon");
  await page.locator("#confirmRelationshipRemovalBtn").click();

  expect(
    await page.evaluate(({sourceId}) => getEntry(sourceId).bridges.length, {
      sourceId: seeded.sourceId,
    }),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

test("Manage Bridges selection help sits below the map", async ({page}) => {

  const runtimeErrors = await openCleanApp(page);
  await createUniverse(page, "Bridge Footnote Universe");
  const seeded = await seedRelationshipMap(page);

  await page.evaluate(() => openWormholesModal());
  await expect(page.locator("#wormholesModal")).toHaveClass(/open/);
  const source = page.locator(
    `#wormholesMapWrap .wormhole-creation[data-universe-id="${seeded.firstId}"][data-creation-id="${seeded.sourceId}"]`,
  );
  await expect(source).toBeVisible();
  await source.click();
  await expect(page.locator(".bridges-selection-guide")).toContainText(
    "Selected: Lantern Keeper",
  );
  await expectSelectionFootnoteBelowMap(page, {
    statusId: "wormholesMapStatus",
    mapWrapId: "wormholesMapWrap",
    zoomSelector: "#wormholesMapWrap .wormholes-map-controls",
  });
  expect(runtimeErrors).toEqual([]);
});

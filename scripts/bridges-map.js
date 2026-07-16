/* GENERATED from scripts/modules/bridges-map-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 110 bridges map module. Split from the original single-file build.
   Contains the Manage Bridges/Wormholes map renderer, viewport behavior, and list view. */

const BRIDGES_SELECTION_HELP_KEY = "wormholesBridgesSelectionHelpSeen";

function bridgesAutomaticTipsDisabled() {
  if (window.WormholesOnboarding?.automaticTipsDisabled?.()) return true;
  try {
    return window.localStorage?.getItem("wormholesOnboardingTipsDisabled") === "true";
  } catch {
    return false;
  }
}

function bridgesSelectionHelpWasSeen() {
  if (bridgesAutomaticTipsDisabled()) return true;
  try {
    return window.localStorage?.getItem(BRIDGES_SELECTION_HELP_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberBridgesSelectionHelp() {
  try {
    window.localStorage?.setItem(BRIDGES_SELECTION_HELP_KEY, "true");
  } catch {
    // Context help still works when browser storage is unavailable.
  }
}

function disableBridgesAutomaticTips() {
  if (window.WormholesOnboarding?.disableAutomaticTips) {
    window.WormholesOnboarding.disableAutomaticTips();
    return;
  }
  try {
    window.localStorage?.setItem("wormholesOnboardingTipsDisabled", "true");
  } catch {
    // The current help can still be dismissed without browser storage.
  }
}

function setBridgesSelectionHelpOpen(button, panel, open) {
  button.setAttribute("aria-expanded", open ? "true" : "false");
  button.textContent = open ? "Hide help" : "What’s this?";
  panel.hidden = !open;
}

function bindBridgesSelectionHelp() {
  const button = document.getElementById("bridgesSelectionHelpBtn");
  const panel = document.getElementById("bridgesSelectionHelpPanel");
  const checkbox = document.getElementById("bridgesSelectionHelpDisableTips");
  const hideButton = document.getElementById("hideBridgesSelectionHelpBtn");
  if (!button || !panel) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = button.getAttribute("aria-expanded") === "true";
    setBridgesSelectionHelpOpen(button, panel, !isOpen);
    if (isOpen) rememberBridgesSelectionHelp();
  });

  checkbox?.addEventListener("change", () => {
    if (checkbox.checked) disableBridgesAutomaticTips();
  });

  hideButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (checkbox?.checked) disableBridgesAutomaticTips();
    rememberBridgesSelectionHelp();
    setBridgesSelectionHelpOpen(button, panel, false);
    button.focus({preventScroll: true});
  });
}

function renderWormholesMapStatus(content = "") {
  const status = document.getElementById("wormholesMapStatus");
  if (!status) return;

  status.innerHTML = content;
  if (content) {
    status.classList.add("open", "map-selection-footnote");
  } else {
    status.classList.remove("open", "map-selection-footnote");
  }
}

function buildWormholesMapListViewHtml() {
  const bridgeLedger = mapInspectorAllBridgeLedger();
  const internalConnectionLedgers = universes.map((universe) => {
    const archive = readArchiveForUniverse(universe.id);
    return {
      universe,
      archive,
      rows: mapInspectorConnectionLedgerForArchive(archive),
    };
  });
  const totalInternalConnections = internalConnectionLedgers.reduce(
    (sum, item) => sum + item.rows.length,
    0,
  );
  const noteCount =
    bridgeLedger.filter((row) => row.note).length +
    internalConnectionLedgers.reduce(
      (sum, item) => sum + item.rows.filter((row) => row.note).length,
      0,
    );
  const totalGroups = universes.reduce((sum, universe) => {
    return (
      sum +
      (globalThis.controllerServices || globalThis).topLevelArchiveEntries(readArchiveForUniverse(universe.id))
        .filter((globalThis.controllerServices || globalThis).isGroupEntry).length
    );
  }, 0);
  const totalCreations = universes.reduce((sum, universe) => {
    return (
      sum +
      (globalThis.controllerServices || globalThis).topLevelArchiveEntries(readArchiveForUniverse(universe.id))
        .filter((entry) => !(globalThis.controllerServices || globalThis).isGroupEntry(entry)).length
    );
  }, 0);

  const universeSections = universes
    .map((universe) => {
      const archive = readArchiveForUniverse(universe.id);
      const topEntries = (globalThis.controllerServices || globalThis).topLevelArchiveEntries(archive);
      const mapGroups = topEntries.filter((globalThis.controllerServices || globalThis).isGroupEntry);
      const mapCreations = topEntries.filter((entry) => !(globalThis.controllerServices || globalThis).isGroupEntry(entry));
      const localConnections = mapInspectorConnectionLedgerForArchive(archive);
      const connectedEntityRows = mapInspectorConnectedEntityRowsForUniverse(universe.id);
      const bridgedEntityRows = mapInspectorBridgedEntityRowsForUniverse(universe.id);
      const connectedPanelKey = `connected:${universe.id}`;
      const bridgedPanelKey = `bridged:${universe.id}`;

      return `
      <details class="map-list-card" data-map-list-entity-key="${mapInspectorEscape(`U:${universe.id}`)}">
        <summary>
          <span><strong>${mapInspectorEscape(universe.title || "Untitled Universe")}</strong> <em>${mapGroups.length} group${mapGroups.length === 1 ? "" : "s"} · ${mapCreations.length} creation${mapCreations.length === 1 ? "" : "s"}</em></span>
        </summary>
        <div class="map-list-count-buttons map-list-count-buttons-below-summary" aria-label="Universe relationship counts">
          ${mapInspectorEntityCountButtonHtml(connectedPanelKey, "Connected Entities", connectedEntityRows)}
          ${mapInspectorEntityCountButtonHtml(bridgedPanelKey, "Bridged Entities", bridgedEntityRows)}
        </div>
        ${mapInspectorEntityPanelHtml(connectedPanelKey, connectedEntityRows, "No connected entities in this universe.")}
        ${mapInspectorEntityPanelHtml(bridgedPanelKey, bridgedEntityRows, "No bridged entities in this universe.")}
        ${
          localConnections.length
            ? `
          <div class="map-list-subsection">
            <b>Internal connections</b>
            <ul>${localConnections
              .slice(0, 6)
              .map(
                (row) =>
                  `<li>${mapInspectorEscape(row.aTitle)} ↔ ${mapInspectorEscape(row.bTitle)}${row.note ? ` <span class="map-list-pill">note</span>` : ""}</li>`,
              )
              .join(
                "",
              )}${localConnections.length > 6 ? `<li class="map-list-muted">+ ${localConnections.length - 6} more in ledger</li>` : ""}</ul>
          </div>
        `
            : ""
        }
        <div class="map-list-subsection">
          <b>Entity index</b>
          ${mapInspectorEntityIndexHtml(topEntries, archive, universe.id)}
        </div>
      </details>
    `;
    })
    .join("");

  return `
    <div class="map-list-summary-grid">
      <div><b>${universes.length}</b><span>universes</span></div>
      <div><b>${totalGroups}</b><span>groups</span></div>
      <div><b>${totalCreations}</b><span>creations</span></div>
      <div><b>${bridgeLedger.length}</b><span>bridges</span></div>
      <div><b>${totalInternalConnections}</b><span>connections</span></div>
    </div>

    <section class="map-list-section">
      <h3>Relationship Ledger</h3>
      <p class="map-list-muted">Every bridge and connection appears once here. Entity cards below summarize local links.</p>
      <div class="map-list-ledger-columns">
        <div>
          <h4>All Bridges</h4>
          ${mapInspectorLedgerListHtml(bridgeLedger, "No bridges yet.")}
        </div>
        <div>
          <h4>Internal connections</h4>
          ${
            internalConnectionLedgers.some((item) => item.rows.length)
              ? internalConnectionLedgers
                  .map((item) =>
                    item.rows.length
                      ? `
              <details class="map-list-mini-ledger">
                <summary>${mapInspectorEscape(item.universe.title || "Untitled Universe")} <span class="map-list-pill">${item.rows.length}</span></summary>
                ${mapInspectorLedgerListHtml(item.rows, "No connections.")}
              </details>
            `
                      : "",
                  )
                  .join("")
              : `<p class="map-list-muted">No internal connections.</p>`
          }
        </div>
      </div>
      ${noteCount ? `<p class="map-list-muted">${noteCount} relationship note${noteCount === 1 ? "" : "s"} attached.</p>` : ""}
    </section>

    <section class="map-list-section">
      <h3>Universe Index</h3>
      <p class="map-list-muted map-list-expand-hint">Click to expand a universe.</p>
      ${universeSections || `<p class="map-list-muted">No universes yet.</p>`}
    </section>
  `;
}

function bridgeMapShapeFromPosition(pos, fallbackR = 34) {
  const cx = Number.isFinite(pos?.cx) ? pos.cx : (pos?.x || 0) + (pos?.w || 0) / 2;
  const cy = Number.isFinite(pos?.cy) ? pos.cy : (pos?.y || 0) + (pos?.h || 0) / 2;
  const rx = Math.max(1, pos?.rx || (pos?.w || 0) / 2 || pos?.r || fallbackR);
  const ry = Math.max(1, pos?.ry || (pos?.h || 0) / 2 || pos?.r || fallbackR);
  return {
    type: "capsule",
    cx,
    cy,
    rx,
    ry,
    r: Math.max(rx, ry),
    x: cx - rx,
    y: cy - ry,
    w: rx * 2,
    h: ry * 2,
  };
}

function applyWormholesMapTransform() {
  const stage = document.getElementById("wormholesMapStage");
  if (!stage) return;

  stage.style.transform = `translate(${wormholesMapPanX}px, ${wormholesMapPanY}px) scale(${wormholesMapZoom})`;
  updateSvgMapBadgeScale(stage, wormholesMapZoom);
  updateMapReadabilityState(stage, wormholesMapZoom);
  if (typeof updateMapClusteringState === "function")
    updateMapClusteringState(stage, wormholesMapZoom);
  if (typeof scheduleMapLazyRender === "function")
    scheduleMapLazyRender(stage, document.getElementById("wormholesMapWrap"));

  const slider = document.getElementById("wormholesZoomSlider");
  const value = document.getElementById("wormholesZoomValue");
  if (slider) slider.value = String(wormholesMapZoom);
  if (value) value.textContent = `${Math.round(wormholesMapZoom * 100)}%`;
}

function fitWormholesMapToViewport() {
  const wrap = document.getElementById("wormholesMapWrap");
  const svg = document.querySelector("#wormholesMapStage svg");
  if (!wrap || !svg) return;

  const graphWidth = parseFloat(svg.dataset.graphWidth) || svg.viewBox?.baseVal?.width || 1;
  const graphHeight = parseFloat(svg.dataset.graphHeight) || svg.viewBox?.baseVal?.height || 1;
  const viewportInset = 34;
  const availableWidth = Math.max(180, wrap.clientWidth - viewportInset * 2);
  const availableHeight = Math.max(180, wrap.clientHeight - viewportInset * 2);
  const fitZoom = Math.min(1, availableWidth / graphWidth, availableHeight / graphHeight);

  wormholesMapZoom = Number(Math.max(0.08, Math.min(2.4, fitZoom)).toFixed(3));
  wormholesMapPanX = Math.round((wrap.clientWidth - graphWidth * wormholesMapZoom) / 2);
  wormholesMapPanY = Math.round((wrap.clientHeight - graphHeight * wormholesMapZoom) / 2);
  wormholesMapAutoFitOnNextRender = false;

  applyWormholesMapTransform();
}

function bindWormholesMapViewport() {
  const wrap = document.getElementById("wormholesMapWrap");
  const stage = document.getElementById("wormholesMapStage");
  const slider = document.getElementById("wormholesZoomSlider");
  if (!wrap || !stage) return;

  if (wormholesMapAutoFitOnNextRender) {
    requestAnimationFrame(fitWormholesMapToViewport);
  } else {
    applyWormholesMapTransform();
  }

  slider?.addEventListener("input", (event) => {
    wormholesMapAutoFitOnNextRender = false;
    const oldZoom = wormholesMapZoom;
    const nextZoom = Math.max(0.08, Math.min(2.4, parseFloat(event.target.value) || 1));
    const anchoredPan = mapPanForZoomAroundViewportCenter(
      wrap,
      oldZoom,
      nextZoom,
      wormholesMapPanX,
      wormholesMapPanY,
    );
    wormholesMapZoom = nextZoom;
    wormholesMapPanX = anchoredPan.panX;
    wormholesMapPanY = anchoredPan.panY;
    applyWormholesMapTransform();
  });

  if (wrap.dataset.viewportBound === "true") return;
  wrap.dataset.viewportBound = "true";

  const isInteractiveWormholesTarget = (event) =>
    !!event.target.closest?.(
      ".wormholes-map-controls, .map-filter-panel, .map-floating-actions, .map-search-control, .map-search-isolation, .app-button, input, .wormhole-cluster-title, .wormhole-creation, .wormhole-bridge-note-group, .connection-edge-click, .connection-note-dot, .svg-literature-indicator, .svg-vision-indicator, .literature-link-indicator, .map-edge-endpoint, .map-aggregate-cluster",
    );

  wrap.addEventListener("pointerdown", (event) => {
    if (isInteractiveWormholesTarget(event)) return;
    event.preventDefault();

    wormholesMapAutoFitOnNextRender = false;
    wormholesMapDragging = true;
    wormholesMapDragStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: wormholesMapPanX,
      panY: wormholesMapPanY,
    };

    wrap.classList.add("dragging");
    wrap.setPointerCapture?.(event.pointerId);
  });

  wrap.addEventListener("pointermove", (event) => {
    if (
      !wormholesMapDragging ||
      !wormholesMapDragStart ||
      wormholesMapDragStart.pointerId !== event.pointerId
    )
      return;
    event.preventDefault();

    wormholesMapPanX = wormholesMapDragStart.panX + (event.clientX - wormholesMapDragStart.x);
    wormholesMapPanY = wormholesMapDragStart.panY + (event.clientY - wormholesMapDragStart.y);
    applyWormholesMapTransform();
  });

  const stopDrag = (event) => {
    if (wormholesMapDragStart && wormholesMapDragStart.pointerId !== event.pointerId) return;
    wormholesMapDragging = false;
    wormholesMapDragStart = null;
    wrap.classList.remove("dragging");
    try {
      wrap.releasePointerCapture?.(event.pointerId);
    } catch (e) {}
  };

  wrap.addEventListener("pointerup", stopDrag);
  wrap.addEventListener("pointercancel", stopDrag);
  wrap.addEventListener("lostpointercapture", () => {
    wormholesMapDragging = false;
    wormholesMapDragStart = null;
    wrap.classList.remove("dragging");
  });
}

function renderWormholesMapView() {
  const wrap = document.getElementById("wormholesMapWrap");
  const mapSearchApi = window.WormholesMapSearch || null;

  if (
    !selectedWormholeCreation &&
    !wormholeFocusUniverseId &&
    typeof wormholesMapIsolatedSubgraph !== "undefined"
  )
    wormholesMapIsolatedSubgraph = false;
  (globalThis.controllerServices || globalThis).updateDestructiveClearButtons();
  renderWormholesMapStatus();

  const showWormholesConnections = wormholesMapFilters.connections !== false;
  const showWormholesBridges = wormholesMapFilters.bridges !== false;

  if (universes.length === 0) {
    wrap.innerHTML = `<div class="map-viewport-message connection-empty">No universes yet. Create one from Home.</div>`;
    refreshOpenMapListView("wormholes");
    return;
  }

  const universeCount = universes.length;
  const sizeFactor = Math.max(0.62, 1 - Math.max(0, universeCount - 1) * 0.045);
  const margin = 78;
  const creationBubbleGap = Math.max(24, 24 * sizeFactor);
  const interUniverseGap = Math.max(78, 90 * sizeFactor + Math.max(0, universeCount - 1) * 7);

  const systemBlueprints = universes.map((universe) => {
    const fullArchive = readArchiveForUniverse(universe.id);
    const archive = (globalThis.controllerServices || globalThis).mapArchiveEntries(fullArchive);

    const universeBubble = fitTextToCircle(
      universe.title,
      Math.max(136, 180 * sizeFactor),
      Math.max(12.5, 15.2 * sizeFactor + 1.5),
      10,
      4,
      Math.max(54, 62 * sizeFactor),
      Math.max(96, 134 * sizeFactor),
    );

    const creationFits = archive.map((entry) => {
      if ((globalThis.controllerServices || globalThis).isGroupEntry(entry)) {
        const childEntries = (globalThis.controllerServices || globalThis).groupChildIds(entry)
          .map((id) => fullArchive.find((item) => item.id === id))
          .filter(Boolean);
        return fitWormholeGroupCircle(entry, childEntries, sizeFactor);
      }

      const whatLabel = (entry.what?.val || "Creation").split("—")[0].trim();
      return fitCreationCircle(entry.title, whatLabel, sizeFactor);
    });

    const maxItemRadius = creationFits.length
      ? Math.max(...creationFits.map((fit) => fit.r))
      : Math.max(34, 40 * sizeFactor);

    const orbitRadiusBase =
      universeBubble.r + maxItemRadius + creationBubbleGap + Math.max(0, archive.length - 3) * 2;
    const orbitX = archive.length <= 2 ? orbitRadiusBase : orbitRadiusBase * 1.06;
    const orbitY = archive.length <= 2 ? orbitRadiusBase * 0.96 : orbitRadiusBase * 1.0;

    const estimatedVisualOuterRadius = archive.length
      ? Math.max(
          universeBubble.r + 24,
          ...creationFits.map((fit) => {
            const groupOrbitBoost = fit.isGroupFit ? Math.max(32, 34 * sizeFactor) : 0;
            const childGrowthBuffer = fit.isGroupFit ? Math.max(44, fit.r * 0.18 + 30) : 16;
            return Math.max(orbitX, orbitY) + groupOrbitBoost + fit.r + childGrowthBuffer;
          }),
        )
      : universeBubble.r + 24;

    const outerRadius = Math.max(universeBubble.r + 24, estimatedVisualOuterRadius);

    return {
      universe,
      archive,
      fullArchive,
      universeBubble,
      creationFits,
      maxItemRadius,
      orbitX,
      orbitY,
      outerRadius,
    };
  });

  const maxSystemOuterRadius = systemBlueprints.length
    ? Math.max(...systemBlueprints.map((system) => system.outerRadius))
    : 0;

  const neighborCountBuffer = Math.max(0, universeCount - 2) * 4;
  const minNeighborDistance = maxSystemOuterRadius * 2 + interUniverseGap + neighborCountBuffer;
  const safeSin = universeCount <= 1 ? 1 : Math.max(0.3, Math.sin(Math.PI / universeCount));
  const galaxyRadius = universeCount <= 1 ? 0 : Math.max(220, minNeighborDistance / (2 * safeSin));

  const width = Math.max(760, margin * 2 + (galaxyRadius + maxSystemOuterRadius + 18) * 2);
  const height = Math.max(560, margin * 2 + (galaxyRadius + maxSystemOuterRadius + 18) * 2);
  const mapClipPadding = Math.max(96, Math.min(220, maxSystemOuterRadius * 0.42 + 64));
  const galaxyCx = width / 2;
  const galaxyCy = height / 2;

  const systems = systemBlueprints.map((system, index) => {
    const angle =
      universeCount <= 1 ? -Math.PI / 2 : -Math.PI / 2 + (index / universeCount) * Math.PI * 2;
    const cx = universeCount <= 1 ? galaxyCx : galaxyCx + Math.cos(angle) * galaxyRadius;
    const cy = universeCount <= 1 ? galaxyCy : galaxyCy + Math.sin(angle) * galaxyRadius;
    const w = system.outerRadius * 2 + 20;
    const h = system.outerRadius * 2 + 20;

    return {
      ...system,
      x: cx - w / 2,
      y: cy - h / 2,
      cx,
      cy,
      w,
      h,
    };
  });

  const universeTitlePositions = new Map();
  const creationPositions = new Map();
  systems.forEach((system) => {
    universeTitlePositions.set(system.universe.id, {
      type: "rect",
      cx: system.cx,
      cy: system.cy,
      rx: system.universeBubble.rx || system.universeBubble.r,
      ry: system.universeBubble.ry || system.universeBubble.r,
      r: system.universeBubble.r,
      x: system.cx - (system.universeBubble.rx || system.universeBubble.r),
      y: system.cy - (system.universeBubble.ry || system.universeBubble.r),
      w: (system.universeBubble.rx || system.universeBubble.r) * 2,
      h: (system.universeBubble.ry || system.universeBubble.r) * 2,
    });

    const count = system.archive.length;
    system.archive.forEach((entry, index) => {
      const fit = system.creationFits[index];
      const angle = -Math.PI / 2 + (count === 1 ? 0 : (index / count) * Math.PI * 2);

      const groupOrbitBoost = fit.isGroupFit ? Math.max(32, 34 * sizeFactor) : 0;
      const radialX = Math.max(
        system.orbitX + groupOrbitBoost,
        system.universeBubble.r + fit.r + creationBubbleGap + groupOrbitBoost,
      );
      const radialY = Math.max(
        system.orbitY + groupOrbitBoost,
        system.universeBubble.r + fit.r + creationBubbleGap + groupOrbitBoost,
      );

      const cx = system.cx + Math.cos(angle) * radialX;
      const cy = system.cy + Math.sin(angle) * radialY;

      const fitRx = fit.rx || fit.r;
      const fitRy = fit.ry || fit.r;
      const entryPosition = {
        x: cx - fitRx,
        y: cy - fitRy,
        w: fitRx * 2,
        h: fitRy * 2,
        r: Math.max(fitRx, fitRy),
        rx: fitRx,
        ry: fitRy,
        cx,
        cy,
        fit,
      };

      if (fit.isGroupFit) {
        const childEntries = (globalThis.controllerServices || globalThis).groupChildIds(entry)
          .map((id) => system.fullArchive.find((item) => item.id === id))
          .filter(Boolean);
        const childFits = childEntries.map((childEntry) => {
          const childWhat = (childEntry.what?.val || "Creation").split("—")[0].trim();
          const childFit = fitCreationCircle(
            childEntry.title,
            childWhat,
            Math.max(0.64, sizeFactor * 0.64),
          );
          return {
            ...childFit,
            r: Math.max(childFit.rx || childFit.r || 58, childFit.ry || childFit.r || 24),
            rx: Math.max(58, Math.min(86, childFit.rx || childFit.r || 58)),
            ry: Math.max(22, Math.min(34, childFit.ry || childFit.r || 24)),
            titleFontSize: Math.min(10.5, childFit.titleFontSize || 10.5),
            subtitleFontSize: Math.min(8.5, childFit.subtitleFontSize || 8.5),
            titleLineHeight: childFit.titleLineHeight || 13,
            subtitleLineHeight: childFit.subtitleLineHeight || 11,
            subtitleGap: 5,
            titleStartY: 14,
            textPaddingX: 14,
            totalHeight: childFit.totalHeight || 44,
          };
        });

        const cols =
          childEntries.length <= 3 ? childEntries.length || 1 : childEntries.length <= 6 ? 3 : 4;
        const maxChildRx = childFits.length
          ? Math.max(...childFits.map((item) => item.rx || item.r))
          : 32;
        const maxChildRy = childFits.length
          ? Math.max(...childFits.map((item) => item.ry || item.r))
          : 24;
        const childGap = 12;
        const rowStep = maxChildRy * 2 + childGap;
        const rows = Math.max(1, Math.ceil(Math.max(childEntries.length, 1) / cols));
        const gridW = childEntries.length
          ? Math.min(cols, childEntries.length) * (maxChildRx * 2) +
            (Math.min(cols, childEntries.length) - 1) * childGap
          : maxChildRx * 2;
        const gridH = childEntries.length
          ? rows * (maxChildRy * 2) + (rows - 1) * childGap
          : maxChildRy * 2;
        const titleHeight = (fit.titleLines?.length || 1) * (fit.titleLineHeight || 12);
        const titleGap = Math.max(8, fit.dividerGap || 8);
        const requiredRx = Math.max(fit.rx || fit.r, Math.max(gridW, 116) / 2 + 16);
        const requiredRy = Math.max(
          fit.ry || fit.r * 0.66,
          (Math.max(48, fit.h || 48) + gridH) / 2 + 16,
        );
        const requiredR = Math.max(requiredRx, requiredRy);

        entryPosition.r = requiredR;
        entryPosition.rx = requiredRx;
        entryPosition.ry = requiredRy;
        entryPosition.x = cx - requiredRx;
        entryPosition.y = cy - requiredRy;
        entryPosition.w = requiredRx * 2;
        entryPosition.h = requiredRy * 2;

        const groupTitleLaneTopY = cy - requiredRy + Math.max(18, requiredRy * 0.13);
        const groupTitleY = groupTitleLaneTopY + titleHeight * 0.78;
        const titleClearance = Math.max(42, titleHeight * 2.1);
        const minFirstRowCenterY = groupTitleLaneTopY + titleClearance + maxChildRy;
        const desiredFirstRowCenterY =
          cy + Math.max(10, requiredRy * 0.18) - ((rows - 1) * rowStep) / 2;
        const maxFirstRowCenterY = cy + requiredRy - 14 - maxChildRy - (rows - 1) * rowStep;
        const firstRowCenterY = Math.max(
          minFirstRowCenterY,
          Math.min(desiredFirstRowCenterY, maxFirstRowCenterY),
        );
        entryPosition.groupTitleY = groupTitleY;
        entryPosition.groupTitleLaneTopY = groupTitleLaneTopY;

        entryPosition.childNodes = childEntries.map((childEntry, childIndex) => {
          const childFit = childFits[childIndex];
          const row = Math.floor(childIndex / cols);
          const rowItems = childEntries.slice(row * cols, row * cols + cols);
          const rowCount = rowItems.length;
          const colInRow = childIndex % cols;
          const rowWidth = rowCount * (maxChildRx * 2) + Math.max(0, rowCount - 1) * childGap;
          const rowStartX = cx - rowWidth / 2 + maxChildRx;
          const childCx = rowStartX + colInRow * (maxChildRx * 2 + childGap);
          const childCy = firstRowCenterY + row * rowStep;
          const childRx = childFit.rx || childFit.r;
          const childRy = childFit.ry || childFit.r;

          const childPos = {
            x: childCx - childRx,
            y: childCy - childRy,
            w: childRx * 2,
            h: childRy * 2,
            r: Math.max(childRx, childRy),
            rx: childRx,
            ry: childRy,
            cx: childCx,
            cy: childCy,
            fit: childFit,
            isGroupChild: true,
            parentGroupId: entry.id,
            entry: childEntry,
          };

          creationPositions.set(`${system.universe.id}:${childEntry.id}`, childPos);
          return childPos;
        });
      }

      creationPositions.set(`${system.universe.id}:${entry.id}`, entryPosition);
    });
  });

  const systemByUniverseId = new Map(systems.map((system) => [system.universe.id, system]));

  function resolveWormholesMapSearchRecord(record) {
    if (!mapSearchApi || !record) return null;
    const targets = mapSearchApi.targetsForRecord(record);
    const validUniverses = (targets.universes || []).filter((universeId) =>
      systemByUniverseId.has(universeId),
    );
    const validEntries = (targets.entries || []).filter((target) => {
      const system = systemByUniverseId.get(target.universeId);
      return !!system?.fullArchive?.some((entry) => entry.id === target.entryId);
    });
    if (!validUniverses.length && !validEntries.length) return null;
    return {
      targets: {universes: validUniverses, entries: validEntries},
      contextLabel: record.universeTitle || (globalThis.controllerServices || globalThis).getUniverseTitle(record.universeId),
      nativeKind:
        record.type === "universe"
          ? "universe"
          : record.type === "archive" || record.type === "archive-group"
            ? "creation"
            : "",
    };
  }

  const wormholeBridgeEntityKeys = new Set();

  function markWormholeBridgeEntry(universeId, entryId) {
    if (!universeId || !entryId) return;
    const system = systemByUniverseId.get(universeId);
    const fullArchive = system?.fullArchive || readArchiveForUniverse(universeId);
    const entry = fullArchive.find((item) => item.id === entryId);
    if (!entry) return;

    const group = (globalThis.controllerServices || globalThis).getGroupForEntryId(entryId, fullArchive);
    const displayId = getWormholeDisplayId(universeId, entryId, fullArchive) || entryId;

    wormholeBridgeEntityKeys.add(`${universeId}:${entryId}`);
    wormholeBridgeEntityKeys.add(`${universeId}:${displayId}`);

    if ((globalThis.controllerServices || globalThis).isGroupEntry(entry)) {
      (globalThis.controllerServices || globalThis).groupChildIds(entry)
        .forEach((childId) => wormholeBridgeEntityKeys.add(`${universeId}:${childId}`));
    }

    if (group) {
      wormholeBridgeEntityKeys.add(`${universeId}:${group.id}`);
    }
  }

  systems.forEach((system) => {
    system.fullArchive.forEach((entry) => {
      (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges).forEach((bridge) => {
        markWormholeBridgeEntry(system.universe.id, entry.id);
        if (bridge.creationId) markWormholeBridgeEntry(bridge.universeId, bridge.creationId);
      });
    });

    (globalThis.controllerServices || globalThis).normalizeUniverseBridges(system.universe).forEach((bridge) => {
      if (bridge.creationId) markWormholeBridgeEntry(bridge.universeId, bridge.creationId);
    });
  });

  function wormholeEntryFilterHidden(universeId, entryId) {
    if (showWormholesConnections) return false;
    if (!showWormholesBridges) return true;
    return !wormholeBridgeEntityKeys.has(`${universeId}:${entryId}`);
  }

  let wormholeIsolationActive = false;
  const isolatedWormholeUniverseIds = new Set();
  const isolatedWormholeCreationKeys = new Set();

  function calculateWormholeContentViewBox() {
    const bounds = {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity};

    function includeCircle(cx, cy, r) {
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const safeR = Number.isFinite(r) ? r : 0;
      bounds.minX = Math.min(bounds.minX, cx - safeR);
      bounds.minY = Math.min(bounds.minY, cy - safeR);
      bounds.maxX = Math.max(bounds.maxX, cx + safeR);
      bounds.maxY = Math.max(bounds.maxY, cy + safeR);
    }

    universeTitlePositions.forEach((pos) => {
      includeCircle(pos.cx, pos.cy, pos.r);
    });
    creationPositions.forEach((pos) => {
      includeCircle(pos.cx, pos.cy, pos.r);
    });

    if (!Number.isFinite(bounds.minX)) {
      return {x: 0, y: 0, width, height};
    }

    const headspace = 170;
    const sideSpace = 160;
    const bottomSpace = 166;

    return {
      x: bounds.minX - sideSpace,
      y: bounds.minY - headspace,
      width: Math.max(520, bounds.maxX - bounds.minX + sideSpace * 2),
      height: Math.max(520, bounds.maxY - bounds.minY + headspace + bottomSpace),
    };
  }

  let wormholeViewBox = null;

  function getWormholeDisplayId(universeId, entryId, fullArchive = null) {
    if (creationPositions.has(`${universeId}:${entryId}`)) {
      return entryId;
    }
    const archive = fullArchive || readArchiveForUniverse(universeId);
    const mapped = (globalThis.controllerServices || globalThis).mapEntryForIdInEntries(entryId, archive);
    return mapped ? mapped.id : entryId;
  }

  const occupiedWormholeRects = [];
  systems.forEach((system) => {
    occupiedWormholeRects.push({
      x: system.cx - system.universeBubble.r - 8,
      y: system.cy - system.universeBubble.r - 8,
      w: system.universeBubble.r * 2 + 16,
      h: system.universeBubble.r * 2 + 16,
    });

    system.archive.forEach((entry) => {
      const pos = creationPositions.get(`${system.universe.id}:${entry.id}`);
      if (!pos) return;
      occupiedWormholeRects.push({
        x: pos.cx - pos.r - 6,
        y: pos.cy - pos.r - 6,
        w: pos.r * 2 + 12,
        h: pos.r * 2 + 12,
      });

      if (pos.childNodes?.length) {
        pos.childNodes.forEach((childPos) => {
          occupiedWormholeRects.push({
            x: childPos.cx - childPos.r - 4,
            y: childPos.cy - childPos.r - 4,
            w: childPos.r * 2 + 8,
            h: childPos.r * 2 + 8,
          });
        });
      }
    });
  });

  const selectedKey = selectedWormholeCreation
    ? `${selectedWormholeCreation.universeId}:${selectedWormholeCreation.creationId}`
    : null;
  const selectedEntry = selectedWormholeCreation
    ? (globalThis.controllerServices || globalThis).getArchiveEntryFromUniverse(
        selectedWormholeCreation.universeId,
        selectedWormholeCreation.creationId,
      )
    : null;
  const selectedInternalConnections = new Set(
    showWormholesConnections && selectedEntry
      ? (selectedEntry.connections || []).map(
          (id) => `${selectedWormholeCreation.universeId}:${id}`,
        )
      : [],
  );
  const selectedBridgeCreationTargets =
    selectedWormholeCreation && showWormholesBridges
      ? (globalThis.controllerServices || globalThis).getCreationBridgeTargetsForCreation(
          selectedWormholeCreation.universeId,
          selectedWormholeCreation.creationId,
        )
      : new Set();
  const selectedBridgeUniverseTargets =
    selectedWormholeCreation && showWormholesBridges
      ? (globalThis.controllerServices || globalThis).getUniverseBridgeTargetsForCreation(
          selectedWormholeCreation.universeId,
          selectedWormholeCreation.creationId,
        )
      : new Set();

  const focusedCreationContext = showWormholesBridges
    ? (globalThis.controllerServices || globalThis).getCreationBridgeContextForUniverse(wormholeFocusUniverseId)
    : {externalTargets: new Set(), internalSources: new Set()};
  const focusedUniverseToCreationContext = showWormholesBridges
    ? (globalThis.controllerServices || globalThis).getUniverseToCreationBridgeContextForFocus(wormholeFocusUniverseId)
    : {externalTargets: new Set(), internalTargets: new Set()};
  const focusedUniverseCreationTargets = new Set([
    ...focusedCreationContext.externalTargets,
    ...focusedUniverseToCreationContext.externalTargets,
  ]);
  const focusedUniverseInternalSources = new Set([
    ...focusedCreationContext.internalSources,
    ...focusedUniverseToCreationContext.internalTargets,
  ]);
  const focusedUniverseTargets = showWormholesBridges
    ? (globalThis.controllerServices || globalThis).getUniverseBridgeTargetsForFocus(wormholeFocusUniverseId)
    : new Set();

  function splitWormholeEntityKey(key) {
    const separator = String(key || "").indexOf(":");
    if (separator < 0) return {universeId: "", creationId: ""};
    return {
      universeId: String(key).slice(0, separator),
      creationId: String(key).slice(separator + 1),
    };
  }

  function addIsolatedWormholeUniverse(universeId) {
    if (universeId && systemByUniverseId.has(universeId)) {
      isolatedWormholeUniverseIds.add(universeId);
    }
  }

  function addIsolatedWormholeCreation(universeId, creationId, options = {}) {
    if (!universeId || !creationId) return;
    const system = systemByUniverseId.get(universeId);
    if (!system) return;

    const fullArchive = system.fullArchive;
    const entry = fullArchive.find((item) => item.id === creationId);
    const group =
      entry && (globalThis.controllerServices || globalThis).isGroupEntry(entry)
        ? entry
        : (globalThis.controllerServices || globalThis).getGroupForEntryId(creationId, fullArchive);
    const displayEntry = group || entry;

    addIsolatedWormholeUniverse(universeId);
    isolatedWormholeCreationKeys.add(`${universeId}:${creationId}`);

    // Keep a containing group visible as context, but do not bring back every
    // sibling when only one child is selected or linked.
    if (displayEntry) {
      isolatedWormholeCreationKeys.add(`${universeId}:${displayEntry.id}`);
    }

    const includeGroupMembers =
      options.includeGroupMembers === true ||
      (entry &&
        (globalThis.controllerServices || globalThis).isGroupEntry(entry) &&
        selectedWormholeCreation?.universeId === universeId &&
        selectedWormholeCreation?.creationId === entry.id);
    if (group && includeGroupMembers) {
      (globalThis.controllerServices || globalThis).groupChildIds(group)
        .forEach((childId) => isolatedWormholeCreationKeys.add(`${universeId}:${childId}`));
    }
  }

  let activeWormholesMapSearch = mapSearchApi?.getActive("wormholes") || null;
  let activeWormholesMapSearchTargets = activeWormholesMapSearch
    ? resolveWormholesMapSearchRecord(activeWormholesMapSearch)?.targets || null
    : null;
  if (activeWormholesMapSearch && !activeWormholesMapSearchTargets) {
    mapSearchApi.clearActive("wormholes");
    activeWormholesMapSearch = null;
  }

  const wormholeSearchIsolationActive = !!activeWormholesMapSearch;
  wormholeIsolationActive =
    !!(wormholesMapIsolatedSubgraph && (selectedWormholeCreation || wormholeFocusUniverseId)) ||
    wormholeSearchIsolationActive;

  if (wormholesMapIsolatedSubgraph && selectedWormholeCreation) {
    addIsolatedWormholeCreation(
      selectedWormholeCreation.universeId,
      selectedWormholeCreation.creationId,
    );
    selectedInternalConnections.forEach((key) => {
      const target = splitWormholeEntityKey(key);
      addIsolatedWormholeCreation(target.universeId, target.creationId);
    });
    selectedBridgeCreationTargets.forEach((key) => {
      const target = splitWormholeEntityKey(key);
      addIsolatedWormholeCreation(target.universeId, target.creationId);
    });
    selectedBridgeUniverseTargets.forEach(addIsolatedWormholeUniverse);
  } else if (wormholesMapIsolatedSubgraph && wormholeFocusUniverseId) {
    addIsolatedWormholeUniverse(wormholeFocusUniverseId);
    const focusedSystem = systemByUniverseId.get(wormholeFocusUniverseId);
    (focusedSystem?.archive || []).forEach((entry) =>
      addIsolatedWormholeCreation(wormholeFocusUniverseId, entry.id, {includeGroupMembers: true}),
    );
    focusedUniverseTargets.forEach(addIsolatedWormholeUniverse);
    focusedUniverseCreationTargets.forEach((key) => {
      const target = splitWormholeEntityKey(key);
      addIsolatedWormholeCreation(target.universeId, target.creationId);
    });
    focusedUniverseInternalSources.forEach((key) => {
      const target = splitWormholeEntityKey(key);
      addIsolatedWormholeCreation(target.universeId, target.creationId);
    });
  } else if (wormholeSearchIsolationActive && activeWormholesMapSearchTargets) {
    activeWormholesMapSearchTargets.universes.forEach((universeId) => {
      addIsolatedWormholeUniverse(universeId);
      const system = systemByUniverseId.get(universeId);
      (system?.archive || []).forEach((entry) =>
        addIsolatedWormholeCreation(universeId, entry.id, {includeGroupMembers: true}),
      );
    });
    activeWormholesMapSearchTargets.entries.forEach((target) => {
      addIsolatedWormholeCreation(target.universeId, target.entryId);
    });
  }

  function wormholeUniverseVisibleInCurrentView(universeId) {
    return !wormholeIsolationActive || isolatedWormholeUniverseIds.has(universeId);
  }

  function wormholeCreationVisibleInCurrentView(universeId, creationId) {
    if (!wormholeIsolationActive) return true;
    return isolatedWormholeCreationKeys.has(`${universeId}:${creationId}`);
  }

  function wormholeNodeDescriptorVisible(node) {
    if (!wormholeIsolationActive || !node) return true;
    if (node.type === "creation")
      return wormholeCreationVisibleInCurrentView(node.universeId, node.creationId);
    return wormholeUniverseVisibleInCurrentView(node.universeId);
  }

  wormholeViewBox = calculateWormholeContentViewBox();

  const internalLines = [];
  const bridgeLines = [];
  const universeBridgeLines = [];
  const childSpecificOverlayLines = [];
  const childSpecificEndpointMarkers = [];
  const placedWormholeNotePoints = [];
  const wormholeSegments = [];
  const seenWormholeInternalSegments = new Set();
  const seenWormholeUniverseSegments = new Set();

  const visibleWormholeNodeCount = systems.reduce((sum, system) => {
    const universeCount = wormholeUniverseVisibleInCurrentView(system.universe.id) ? 1 : 0;
    const creationCount = system.fullArchive.reduce(
      (count, entry) =>
        count + (wormholeCreationVisibleInCurrentView(system.universe.id, entry.id) ? 1 : 0),
      0,
    );
    return sum + universeCount + creationCount;
  }, 0);
  const approximateWormholeEdgeCount = wormholeIsolationActive
    ? 0
    : Math.ceil(
        systems.reduce(
          (sum, system) =>
            sum +
            system.fullArchive.reduce(
              (entrySum, entry) => entrySum + (entry.connections || []).length,
              0,
            ),
          0,
        ) / 2,
      ) +
      systems.reduce(
        (sum, system) =>
          sum +
          system.fullArchive.reduce(
            (entrySum, entry) =>
              entrySum + (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges).length,
            0,
          ),
        0,
      ) +
      universes.reduce(
        (sum, universe) => sum + (globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe).length,
        0,
      );
  const wormholeMapDomProfile =
    typeof createMapDomProfile === "function"
      ? createMapDomProfile({
          nodes: visibleWormholeNodeCount,
          edges: approximateWormholeEdgeCount,
          details: systems.length,
        })
      : {
          nodes: visibleWormholeNodeCount,
          edges: approximateWormholeEdgeCount,
          details: 0,
          estimatedElements: 0,
          compact: false,
          aggressive: false,
        };
  const wormholeMapDomAttributes =
    typeof mapDomProfileAttributes === "function"
      ? mapDomProfileAttributes(wormholeMapDomProfile)
      : `data-map-dom-compact="${wormholeMapDomProfile.compact ? "true" : "false"}"`;

  systems.forEach((system) => {
    const visibleIds = new Set(system.archive.map((entry) => entry.id));

    system.fullArchive.forEach((entry) => {
      const mappedSource =
        (globalThis.controllerServices || globalThis).mapEntryForIdInEntries(entry.id, system.fullArchive) || entry;
      const sourceDisplayId = getWormholeDisplayId(
        system.universe.id,
        entry.id,
        system.fullArchive,
      );
      if (!visibleIds.has(mappedSource.id) && sourceDisplayId !== entry.id) return;

      const sourcePos = creationPositions.get(`${system.universe.id}:${sourceDisplayId}`);
      if (!sourcePos) return;

      (entry.connections || []).forEach((targetId) => {
        const mappedTarget = (globalThis.controllerServices || globalThis).mapEntryForIdInEntries(
          targetId,
          system.fullArchive,
        ) || {id: targetId};
        const targetDisplayId = getWormholeDisplayId(
          system.universe.id,
          targetId,
          system.fullArchive,
        );
        if (!visibleIds.has(mappedTarget.id) && targetDisplayId !== targetId) return;
        if (sourceDisplayId === targetDisplayId && entry.id === targetId) return;

        const pairKey = [entry.id, targetId].sort().join("::");
        const segmentId = `internal:${system.universe.id}:${pairKey}`;
        if (seenWormholeInternalSegments.has(segmentId)) return;
        seenWormholeInternalSegments.add(segmentId);

        const targetPos = creationPositions.get(`${system.universe.id}:${targetDisplayId}`);
        if (!targetPos) return;

        const clippedSegment = clippedLineBetweenShapes(
          bridgeMapShapeFromPosition(sourcePos),
          bridgeMapShapeFromPosition(targetPos),
        );

        wormholeSegments.push({
          id: segmentId,
          ax: clippedSegment.ax,
          ay: clippedSegment.ay,
          bx: clippedSegment.bx,
          by: clippedSegment.by,
        });
      });

      (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges).forEach((bridge) => {
        let targetPos = null;
        let targetNode = {type: "universe", universeId: bridge.universeId};

        if (bridge.creationId) {
          const targetSystem = systems.find((item) => item.universe.id === bridge.universeId);
          const targetDisplayId = targetSystem
            ? getWormholeDisplayId(bridge.universeId, bridge.creationId, targetSystem.fullArchive)
            : bridge.creationId;
          const creationTarget = targetDisplayId
            ? creationPositions.get(`${bridge.universeId}:${targetDisplayId}`)
            : null;

          if (creationTarget) {
            targetPos = {
              x: creationTarget.cx,
              y: creationTarget.cy,
              r: creationTarget.r,
              rx: creationTarget.rx,
              ry: creationTarget.ry,
            };
            targetNode = {
              type: "creation",
              universeId: bridge.universeId,
              creationId: bridge.creationId,
            };
          }
        }

        if (!targetPos) {
          const universeTarget = universeTitlePositions.get(bridge.universeId);
          if (universeTarget) {
            targetPos = universeTarget;
          }
        }

        if (!targetPos) return;

        const noteKey = (globalThis.controllerServices || globalThis).bridgeNoteKeyForNodes(
          {type: "creation", universeId: system.universe.id, creationId: entry.id},
          targetNode,
        );
        const clippedSegment = clippedLineBetweenShapes(
          bridgeMapShapeFromPosition(sourcePos),
          bridgeMapShapeFromPosition(targetPos),
        );

        wormholeSegments.push({
          id: `bridge:${noteKey}`,
          ax: clippedSegment.ax,
          ay: clippedSegment.ay,
          bx: clippedSegment.bx,
          by: clippedSegment.by,
        });
      });
    });
  });

  universes.forEach((universe) => {
    const sourcePos = universeTitlePositions.get(universe.id);
    if (!sourcePos) return;

    (globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe).forEach((bridge) => {
      let targetPos = null;
      let targetNode = {type: "universe", universeId: bridge.universeId};
      let targetLabel = (globalThis.controllerServices || globalThis).getUniverseTitle(bridge.universeId);

      if (bridge.creationId) {
        const targetSystem = systems.find((item) => item.universe.id === bridge.universeId);
        const targetDisplayId = targetSystem
          ? getWormholeDisplayId(bridge.universeId, bridge.creationId, targetSystem.fullArchive)
          : bridge.creationId;
        const creationTarget = targetDisplayId
          ? creationPositions.get(`${bridge.universeId}:${targetDisplayId}`)
          : null;
        if (creationTarget) {
          targetPos = {
            x: creationTarget.cx,
            y: creationTarget.cy,
            r: creationTarget.r,
            rx: creationTarget.rx,
            ry: creationTarget.ry,
          };
          targetNode = {
            type: "creation",
            universeId: bridge.universeId,
            creationId: bridge.creationId,
          };
          targetLabel = (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(
            bridge.universeId,
            bridge.creationId,
          );
        }
      }

      if (!targetPos) {
        const universeTarget = universeTitlePositions.get(bridge.universeId);
        if (universeTarget) {
          targetPos = universeTarget;
          targetNode = {type: "universe", universeId: bridge.universeId};
          targetLabel = (globalThis.controllerServices || globalThis).getUniverseTitle(bridge.universeId);
        }
      }

      if (!targetPos) return;

      const sourceNode = {type: "universe", universeId: universe.id};
      if (
        wormholeIsolationActive &&
        (!wormholeNodeDescriptorVisible(sourceNode) || !wormholeNodeDescriptorVisible(targetNode))
      )
        return;
      const noteKey = (globalThis.controllerServices || globalThis).bridgeNoteKeyForNodes(sourceNode, targetNode);
      const segmentId = `universe:${noteKey}`;
      if (seenWormholeUniverseSegments.has(segmentId)) return;
      seenWormholeUniverseSegments.add(segmentId);

      const clippedSegment = clippedLineBetweenShapes(
        bridgeMapShapeFromPosition(sourcePos),
        bridgeMapShapeFromPosition(targetPos),
      );

      wormholeSegments.push({
        id: segmentId,
        ax: clippedSegment.ax,
        ay: clippedSegment.ay,
        bx: clippedSegment.bx,
        by: clippedSegment.by,
      });

      const note = (globalThis.controllerServices || globalThis).getBridgeNote(noteKey);
      const safeNote = escapeHtml(truncatePreview(note, 34));
      const otherSegments = wormholeSegments.filter((segment) => segment.id !== segmentId);
      const {mx, my} = notePointAvoidingRects(
        clippedSegment.ax,
        clippedSegment.ay,
        clippedSegment.bx,
        clippedSegment.by,
        occupiedWormholeRects,
        placedWormholeNotePoints,
        otherSegments,
      );
      placedWormholeNotePoints.push({x: mx, y: my});

      const targetArchiveForLevel = bridge.creationId
        ? systems.find((item) => item.universe.id === bridge.universeId)?.fullArchive ||
          readArchiveForUniverse(bridge.universeId)
        : null;
      const targetEntryForLevel =
        bridge.creationId && targetArchiveForLevel
          ? targetArchiveForLevel.find((item) => item.id === bridge.creationId)
          : null;
      const targetIsGroupLevelBridge = !!(
        targetEntryForLevel && (globalThis.controllerServices || globalThis).isGroupEntry(targetEntryForLevel)
      );
      const targetIsChildLevelBridge = !!(
        bridge.creationId &&
        targetArchiveForLevel &&
        (globalThis.controllerServices || globalThis).getGroupForEntryId(bridge.creationId, targetArchiveForLevel)
      );
      const bridgeLevelClass =
        targetIsGroupLevelBridge && !targetIsChildLevelBridge
          ? "group-level-line"
          : targetIsChildLevelBridge
            ? "child-level-line"
            : "";

      const touchesFocusedUniverse =
        wormholeFocusUniverseId === universe.id ||
        wormholeFocusUniverseId === bridge.universeId ||
        (selectedWormholeCreation &&
          selectedWormholeCreation.universeId === bridge.universeId &&
          selectedWormholeCreation.creationId === bridge.creationId);

      const showUniverseBridgeDecorations =
        !wormholeMapDomProfile.compact || touchesFocusedUniverse;
      const universeBridgeVisibleSvg = `
        ${showUniverseBridgeDecorations ? `<line class="wormhole-bridge-glow ${bridgeLevelClass} ${touchesFocusedUniverse ? "highlighted" : ""}" x1="${clippedSegment.ax}" y1="${clippedSegment.ay}" x2="${clippedSegment.bx}" y2="${clippedSegment.by}"></line>` : ""}
        <line class="wormhole-universe-bridge-line ${bridgeLevelClass} ${touchesFocusedUniverse ? "highlighted" : ""}" x1="${clippedSegment.ax}" y1="${clippedSegment.ay}" x2="${clippedSegment.bx}" y2="${clippedSegment.by}"></line>
        ${showUniverseBridgeDecorations ? edgeEndpointDots(clippedSegment, `wormhole-endpoint ${bridgeLevelClass} bridge-endpoint`) : ""}
      `;

      if (bridgeLevelClass === "child-level-line") {
        childSpecificOverlayLines.push(universeBridgeVisibleSvg);
        childSpecificEndpointMarkers.push(
          `<circle class="wormhole-child-endpoint-marker bridge-marker" cx="${clippedSegment.bx}" cy="${clippedSegment.by}" r="5"></circle>`,
        );
      }

      universeBridgeLines.push(`
        <g class="wormhole-bridge-note-group" data-bridge-key="${escapeHtml(noteKey)}" data-label="${escapeHtml(`${(globalThis.controllerServices || globalThis).getUniverseTitle(universe.id)} ↔ ${targetLabel}`)}">
          ${universeBridgeVisibleSvg}
          <line class="connection-edge-click" x1="${clippedSegment.ax}" y1="${clippedSegment.ay}" x2="${clippedSegment.bx}" y2="${clippedSegment.by}"></line>
          <circle class="connection-note-dot ${note ? "" : "empty"}" cx="${mx}" cy="${my}" r="${note ? 8 : 6}"></circle>
          ${note ? `<text class="connection-note-hint" x="${mx}" y="${my + 4}" text-anchor="middle">•</text>` : ""}
          ${note ? `<text class="connection-note-preview" x="${mx}" y="${my - 13}" text-anchor="middle">${safeNote}</text>` : ""}
        </g>
      `);
    });
  });

  systems.forEach((system) => {
    const visibleIds = new Set(system.archive.map((entry) => entry.id));

    system.fullArchive.forEach((entry) => {
      const mappedSource =
        (globalThis.controllerServices || globalThis).mapEntryForIdInEntries(entry.id, system.fullArchive) || entry;
      const sourceDisplayId = getWormholeDisplayId(
        system.universe.id,
        entry.id,
        system.fullArchive,
      );
      if (!visibleIds.has(mappedSource.id) && sourceDisplayId !== entry.id) return;

      const sourcePos = creationPositions.get(`${system.universe.id}:${sourceDisplayId}`);
      if (!sourcePos) return;

      (entry.connections || []).forEach((targetId) => {
        const mappedTarget = (globalThis.controllerServices || globalThis).mapEntryForIdInEntries(
          targetId,
          system.fullArchive,
        ) || {id: targetId};
        const targetDisplayId = getWormholeDisplayId(
          system.universe.id,
          targetId,
          system.fullArchive,
        );
        if (!visibleIds.has(mappedTarget.id) && targetDisplayId !== targetId) return;
        if (sourceDisplayId === targetDisplayId && entry.id === targetId) return;

        const pairKey = [entry.id, targetId].sort().join("::");
        if (seenWormholeInternalSegments.has(`drawn:${system.universe.id}:${pairKey}`)) return;
        seenWormholeInternalSegments.add(`drawn:${system.universe.id}:${pairKey}`);

        const targetPos = creationPositions.get(`${system.universe.id}:${targetDisplayId}`);
        if (!targetPos) return;
        if (
          wormholeIsolationActive &&
          (!wormholeCreationVisibleInCurrentView(system.universe.id, sourceDisplayId) ||
            !wormholeCreationVisibleInCurrentView(system.universe.id, targetDisplayId))
        )
          return;

        const touchesSelected =
          selectedWormholeCreation &&
          selectedWormholeCreation.universeId === system.universe.id &&
          (selectedWormholeCreation.creationId === sourceDisplayId ||
            selectedWormholeCreation.creationId === targetDisplayId ||
            selectedWormholeCreation.creationId === entry.id ||
            selectedWormholeCreation.creationId === targetId);

        const sourceIsGroupLevel = (globalThis.controllerServices || globalThis).isGroupEntry(entry);
        const sourceIsChildLevel = !!(globalThis.controllerServices || globalThis).getGroupForEntryId(
          entry.id,
          system.fullArchive,
        );
        const targetEntryForLevel = system.fullArchive.find((item) => item.id === targetId);
        const targetIsGroupLevel = (globalThis.controllerServices || globalThis).isGroupEntry(targetEntryForLevel);
        const targetIsChildLevel = !!(globalThis.controllerServices || globalThis).getGroupForEntryId(
          targetId,
          system.fullArchive,
        );
        const levelClass =
          (sourceIsGroupLevel || targetIsGroupLevel) && !(sourceIsChildLevel || targetIsChildLevel)
            ? "group-level-line"
            : sourceIsChildLevel || targetIsChildLevel
              ? "child-level-line"
              : "";

        const clippedInternal = clippedLineBetweenShapes(
          bridgeMapShapeFromPosition(sourcePos),
          bridgeMapShapeFromPosition(targetPos),
        );
        const showInternalDecorations = !wormholeMapDomProfile.compact || touchesSelected;
        const internalLineSvg = `
          <line class="wormhole-internal-line ${levelClass} ${touchesSelected ? "highlighted" : ""}" x1="${clippedInternal.ax}" y1="${clippedInternal.ay}" x2="${clippedInternal.bx}" y2="${clippedInternal.by}"></line>
          ${showInternalDecorations ? edgeEndpointDots(clippedInternal, `wormhole-endpoint ${levelClass}`) : ""}
        `;

        if (levelClass === "child-level-line") {
          childSpecificOverlayLines.push(internalLineSvg);
          if (sourceIsChildLevel) {
            childSpecificEndpointMarkers.push(
              `<circle class="wormhole-child-endpoint-marker connection-marker" cx="${clippedInternal.ax}" cy="${clippedInternal.ay}" r="4.5"></circle>`,
            );
          }
          if (targetIsChildLevel) {
            childSpecificEndpointMarkers.push(
              `<circle class="wormhole-child-endpoint-marker connection-marker" cx="${clippedInternal.bx}" cy="${clippedInternal.by}" r="4.5"></circle>`,
            );
          }
        } else {
          internalLines.push(internalLineSvg);
        }
      });

      (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges).forEach((bridge) => {
        let targetPos = null;
        let targetNode = {type: "universe", universeId: bridge.universeId};

        if (bridge.creationId) {
          const targetSystem = systems.find((item) => item.universe.id === bridge.universeId);
          const targetDisplayId = targetSystem
            ? getWormholeDisplayId(bridge.universeId, bridge.creationId, targetSystem.fullArchive)
            : bridge.creationId;
          const creationTarget = targetDisplayId
            ? creationPositions.get(`${bridge.universeId}:${targetDisplayId}`)
            : null;

          if (creationTarget) {
            targetPos = {
              x: creationTarget.cx,
              y: creationTarget.cy,
              r: creationTarget.r,
              rx: creationTarget.rx,
              ry: creationTarget.ry,
            };
            targetNode = {
              type: "creation",
              universeId: bridge.universeId,
              creationId: bridge.creationId,
            };
          }
        }

        if (!targetPos) {
          const universeTarget = universeTitlePositions.get(bridge.universeId);
          if (universeTarget) {
            targetPos = universeTarget;
          }
        }

        if (!targetPos) return;

        const sourceNode = {
          type: "creation",
          universeId: system.universe.id,
          creationId: entry.id,
        };
        if (
          wormholeIsolationActive &&
          (!wormholeNodeDescriptorVisible(sourceNode) || !wormholeNodeDescriptorVisible(targetNode))
        )
          return;
        const noteKey = (globalThis.controllerServices || globalThis).bridgeNoteKeyForNodes(sourceNode, targetNode);
        const note = (globalThis.controllerServices || globalThis).getBridgeNote(noteKey);
        const safeNote = escapeHtml(truncatePreview(note, 34));
        const segmentId = `bridge:${noteKey}`;
        const clippedBridge = clippedLineBetweenShapes(
          bridgeMapShapeFromPosition(sourcePos),
          bridgeMapShapeFromPosition(targetPos),
        );
        const otherSegments = wormholeSegments.filter((segment) => segment.id !== segmentId);
        const {mx, my} = notePointAvoidingRects(
          clippedBridge.ax,
          clippedBridge.ay,
          clippedBridge.bx,
          clippedBridge.by,
          occupiedWormholeRects,
          placedWormholeNotePoints,
          otherSegments,
        );
        placedWormholeNotePoints.push({x: mx, y: my});

        const targetKey = bridge.creationId ? `${bridge.universeId}:${bridge.creationId}` : null;
        const mappedTargetKey = bridge.creationId
          ? `${bridge.universeId}:${(systems.find((item) => item.universe.id === bridge.universeId) ? (globalThis.controllerServices || globalThis).mapEntryForIdInEntries(bridge.creationId, systems.find((item) => item.universe.id === bridge.universeId).fullArchive)?.id : bridge.creationId) || bridge.creationId}`
          : null;
        const sourceKey = `${system.universe.id}:${mappedSource.id}`;
        const childSourceKey = `${system.universe.id}:${entry.id}`;
        const touchesSelected =
          selectedWormholeCreation &&
          (selectedKey === sourceKey ||
            selectedKey === childSourceKey ||
            (targetKey && selectedBridgeCreationTargets.has(targetKey)) ||
            (mappedTargetKey && selectedBridgeCreationTargets.has(mappedTargetKey)));

        const sourceIsGroupLevelBridge = (globalThis.controllerServices || globalThis).isGroupEntry(entry);
        const sourceIsChildLevelBridge = !!(globalThis.controllerServices || globalThis).getGroupForEntryId(
          entry.id,
          system.fullArchive,
        );
        const targetSystemForLevel = bridge.creationId
          ? systems.find((item) => item.universe.id === bridge.universeId)
          : null;
        const targetArchiveForLevel = targetSystemForLevel
          ? targetSystemForLevel.fullArchive
          : null;
        const targetIsChildLevelBridge = !!(
          bridge.creationId &&
          targetArchiveForLevel &&
          (globalThis.controllerServices || globalThis).getGroupForEntryId(bridge.creationId, targetArchiveForLevel)
        );
        const targetIsGroupLevelBridge = !!(
          bridge.creationId &&
          targetArchiveForLevel &&
          (globalThis.controllerServices || globalThis).isGroupEntry(
            targetArchiveForLevel.find((item) => item.id === bridge.creationId),
          )
        );
        const bridgeLevelClass =
          (sourceIsGroupLevelBridge || targetIsGroupLevelBridge) &&
          !(sourceIsChildLevelBridge || targetIsChildLevelBridge)
            ? "group-level-line"
            : sourceIsChildLevelBridge || targetIsChildLevelBridge
              ? "child-level-line"
              : "";

        const showBridgeDecorations = !wormholeMapDomProfile.compact || touchesSelected;
        const bridgeVisibleSvg = `
            ${showBridgeDecorations ? `<line class="wormhole-bridge-glow ${bridgeLevelClass} ${touchesSelected ? "highlighted" : ""}" x1="${clippedBridge.ax}" y1="${clippedBridge.ay}" x2="${clippedBridge.bx}" y2="${clippedBridge.by}"></line>` : ""}
            <line class="wormhole-bridge-line ${bridgeLevelClass} ${touchesSelected ? "highlighted" : ""}" x1="${clippedBridge.ax}" y1="${clippedBridge.ay}" x2="${clippedBridge.bx}" y2="${clippedBridge.by}"></line>
            ${showBridgeDecorations ? edgeEndpointDots(clippedBridge, `wormhole-endpoint ${bridgeLevelClass} bridge-endpoint`) : ""}
        `;

        if (bridgeLevelClass === "child-level-line") {
          childSpecificOverlayLines.push(bridgeVisibleSvg);
          if (sourceIsChildLevelBridge) {
            childSpecificEndpointMarkers.push(
              `<circle class="wormhole-child-endpoint-marker bridge-marker" cx="${clippedBridge.ax}" cy="${clippedBridge.ay}" r="5"></circle>`,
            );
          }
          if (targetIsChildLevelBridge) {
            childSpecificEndpointMarkers.push(
              `<circle class="wormhole-child-endpoint-marker bridge-marker" cx="${clippedBridge.bx}" cy="${clippedBridge.by}" r="5"></circle>`,
            );
          }
        }

        bridgeLines.push(`
          <g class="wormhole-bridge-note-group" data-bridge-key="${escapeHtml(noteKey)}" data-label="${escapeHtml(`${entry.title} ↔ ${bridge.creationId ? (globalThis.controllerServices || globalThis).getCreationTitleFromUniverse(bridge.universeId, bridge.creationId) : (globalThis.controllerServices || globalThis).getUniverseTitle(bridge.universeId)}`)}">
            ${bridgeVisibleSvg}
            <line class="connection-edge-click" x1="${clippedBridge.ax}" y1="${clippedBridge.ay}" x2="${clippedBridge.bx}" y2="${clippedBridge.by}"></line>
            <circle class="connection-note-dot ${note ? "" : "empty"}" cx="${mx}" cy="${my}" r="${note ? 8 : 6}"></circle>
            ${note ? `<text class="connection-note-hint" x="${mx}" y="${my + 4}" text-anchor="middle">•</text>` : ""}
            ${note ? `<text class="connection-note-preview" x="${mx}" y="${my - 13}" text-anchor="middle">${safeNote}</text>` : ""}
          </g>
        `);
      });
    });
  });

  const wormholeClusterEntityCount = systems.reduce(
    (sum, system) => sum + system.fullArchive.length,
    0,
  );
  const wormholeMapClusterEligible = wormholeClusterEntityCount >= 20 && systems.length > 0;
  const wormholeAggregateClusterSvg = wormholeMapClusterEligible
    ? systems
        .map((system) => {
          const entityCount = system.fullArchive.length;
          const title = truncateSvgText(system.universe.title || "Untitled Universe", 26);
          const countLabel = `${entityCount} ${entityCount === 1 ? "entity" : "entities"}`;
          const ariaLabel = `${system.universe.title || "Untitled Universe"}: ${countLabel}. Zoom in to view individual items.`;
          const width = 214;
          const height = 76;
          return `
        <g class="map-aggregate-cluster wormhole-aggregate-cluster" data-cluster-id="universe:${escapeHtml(system.universe.id)}" data-cluster-x="${system.cx}" data-cluster-y="${system.cy}" role="button" aria-label="${escapeHtml(ariaLabel)}" aria-hidden="true" tabindex="-1" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(system.universe.id)}">
          <rect class="map-aggregate-cluster-halo" x="${system.cx - width / 2 - 8}" y="${system.cy - height / 2 - 8}" width="${width + 16}" height="${height + 16}" rx="28" ry="28"></rect>
          <rect class="map-aggregate-cluster-shape" x="${system.cx - width / 2}" y="${system.cy - height / 2}" width="${width}" height="${height}" rx="22" ry="22"></rect>
          <text class="map-aggregate-cluster-title" x="${system.cx}" y="${system.cy - 7}" text-anchor="middle">${escapeHtml(title)}</text>
          <text class="map-aggregate-cluster-label" x="${system.cx}" y="${system.cy + 18}" text-anchor="middle">${escapeHtml(countLabel)}</text>
        </g>
      `;
        })
        .join("")
    : "";

  const systemsSvg = systems
    .map((system) => {
      const isFocusedUniverse = wormholeFocusUniverseId === system.universe.id;
      const isUniverseBridgeTarget = selectedBridgeUniverseTargets.has(system.universe.id);
      const isUniverseBridgeConnectedToFocus =
        wormholeFocusUniverseId && focusedUniverseTargets.has(system.universe.id);
      const isDimmedCluster =
        (wormholeFocusUniverseId || selectedWormholeCreation) &&
        !isFocusedUniverse &&
        !(selectedWormholeCreation && selectedWormholeCreation.universeId === system.universe.id) &&
        !isUniverseBridgeTarget &&
        !isUniverseBridgeConnectedToFocus &&
        !system.archive.some(
          (entry) =>
            selectedBridgeCreationTargets.has(`${system.universe.id}:${entry.id}`) ||
            focusedUniverseCreationTargets.has(`${system.universe.id}:${entry.id}`) ||
            focusedUniverseInternalSources.has(`${system.universe.id}:${entry.id}`),
        );

      const titleClass = [
        "wormhole-cluster-title",
        isFocusedUniverse ? "bridge-source" : "",
        isUniverseBridgeTarget || isUniverseBridgeConnectedToFocus ? "connected" : "",
        (wormholeFocusUniverseId &&
          !selectedWormholeCreation &&
          !isFocusedUniverse &&
          !isUniverseBridgeConnectedToFocus) ||
        (selectedWormholeCreation &&
          selectedWormholeCreation.universeId !== system.universe.id &&
          !isUniverseBridgeTarget)
          ? "connectable"
          : "",
        wormholeUniverseVisibleInCurrentView(system.universe.id) ? "" : "isolated-subgraph-hidden",
      ]
        .filter(Boolean)
        .join(" ");
      const titleBubble = system.universeBubble;

      const creations = system.archive
        .map((entry) => {
          const pos = creationPositions.get(`${system.universe.id}:${entry.id}`);
          const key = `${system.universe.id}:${entry.id}`;
          const isSelected = selectedKey === key;
          const isFocusMember =
            wormholeFocusUniverseId &&
            !selectedWormholeCreation &&
            system.universe.id === wormholeFocusUniverseId;
          const isFocusedInternalSource = focusedUniverseInternalSources.has(key);
          const isConnected =
            selectedInternalConnections.has(key) ||
            selectedBridgeCreationTargets.has(key) ||
            focusedUniverseCreationTargets.has(key) ||
            isFocusedInternalSource;
          const isConnectable =
            (selectedWormholeCreation && !isSelected) ||
            (wormholeFocusUniverseId &&
              !selectedWormholeCreation &&
              system.universe.id !== wormholeFocusUniverseId &&
              !isConnected);
          const isDimmedCreation =
            (selectedWormholeCreation || wormholeFocusUniverseId) &&
            !isSelected &&
            !isConnected &&
            !isConnectable &&
            !isFocusMember;

          const className = [
            "wormhole-creation",
            (globalThis.controllerServices || globalThis).isGroupEntry(entry) ? "wormhole-group-node" : "",
            isSelected ? "selected" : "",
            isFocusMember ? "focus-member" : "",
            isConnected ? "connected" : "",
            isConnectable ? "connectable" : "",
            isDimmedCreation ? "dimmed" : "",
            wormholeEntryFilterHidden(system.universe.id, entry.id) ? "map-filter-hidden" : "",
            wormholeCreationVisibleInCurrentView(system.universe.id, entry.id)
              ? ""
              : "isolated-subgraph-hidden",
          ]
            .filter(Boolean)
            .join(" ");
          const fit = pos.fit;

          if (fit.isGroupFit) {
            const textStartY = Number.isFinite(pos.groupTitleY)
              ? pos.groupTitleY
              : pos.cy - (pos.ry || pos.r) + Math.max(24, fit.titleFontSize * 1.45);
            const childNodesSvg = (pos.childNodes || [])
              .map((childPos) => {
                const childEntry = childPos.entry;
                const childKey = `${system.universe.id}:${childEntry.id}`;
                const childIsSelected = selectedKey === childKey;
                const childIsFocusMember =
                  wormholeFocusUniverseId &&
                  !selectedWormholeCreation &&
                  system.universe.id === wormholeFocusUniverseId;
                const childIsFocusedInternalSource = focusedUniverseInternalSources.has(childKey);
                const childIsConnected =
                  selectedInternalConnections.has(childKey) ||
                  selectedBridgeCreationTargets.has(childKey) ||
                  focusedUniverseCreationTargets.has(childKey) ||
                  childIsFocusedInternalSource;
                const childIsConnectable =
                  (selectedWormholeCreation && !childIsSelected) ||
                  (wormholeFocusUniverseId &&
                    !selectedWormholeCreation &&
                    system.universe.id !== wormholeFocusUniverseId &&
                    !childIsConnected);
                const childIsDimmed =
                  (selectedWormholeCreation || wormholeFocusUniverseId) &&
                  !childIsSelected &&
                  !childIsConnected &&
                  !childIsConnectable &&
                  !childIsFocusMember;

                const childClassName = [
                  "wormhole-creation",
                  "wormhole-group-child-node",
                  childIsSelected ? "selected" : "",
                  childIsFocusMember ? "focus-member" : "",
                  childIsConnected ? "connected" : "",
                  childIsConnectable ? "connectable" : "",
                  childIsDimmed ? "dimmed" : "",
                  wormholeEntryFilterHidden(system.universe.id, childEntry.id)
                    ? "map-filter-hidden"
                    : "",
                  wormholeCreationVisibleInCurrentView(system.universe.id, childEntry.id)
                    ? ""
                    : "isolated-subgraph-hidden",
                ]
                  .filter(Boolean)
                  .join(" ");

                const childFit = childPos.fit;
                const childTextStartY =
                  childPos.cy - childFit.totalHeight / 2 + childFit.titleFontSize * 0.82;

                return `
            <g class="${childClassName}" data-universe-id="${escapeHtml(system.universe.id)}" data-creation-id="${escapeHtml(childEntry.id)}">
              ${capsuleRectSvg(childPos.cx, childPos.cy, childPos.rx || childPos.r, childPos.ry || childPos.r, "wormhole-node-shape", "fill:var(--map-creation-fill);stroke:var(--map-creation-stroke);")}
              <text class="wormhole-creation-text wormhole-node-left-text" x="${wormholeNodeTextX(childPos, 18)}" y="${childTextStartY}" text-anchor="start">
                ${childFit.titleLines.map((line, index) => `<tspan class="wormhole-creation-title-line" x="${wormholeNodeTextX(childPos, 18)}" dy="${index === 0 ? 0 : childFit.titleLineHeight}" font-size="${childFit.titleFontSize}">${escapeHtml(line)}</tspan>`).join("")}
                ${childFit.subtitleLines.map((line, index) => `<tspan class="wormhole-creation-subtitle-line wormhole-group-child-subtitle-line" x="${wormholeNodeTextX(childPos, 18)}" dy="${index === 0 ? (childFit.titleLines.length ? childFit.subtitleGap + childFit.subtitleLineHeight : 0) : childFit.subtitleLineHeight}" font-size="${childFit.subtitleFontSize}">${escapeHtml(line)}</tspan>`).join("")}
              </text>
              ${capsuleBadgeStackSvg("entry", system.universe.id, childEntry.id, childPos.cx, childPos.cy, childPos.rx || childPos.r, childPos.ry || childPos.r, {angle: Math.atan2(childPos.cy - pos.cy, childPos.cx - pos.cx), offsetX: 14})}
            </g>
          `;
              })
              .join("");

            return `
          <g class="${className} wormhole-group-shell" data-universe-id="${escapeHtml(system.universe.id)}" data-creation-id="${escapeHtml(entry.id)}">
            ${capsuleRectSvg(pos.cx, pos.cy, pos.rx || pos.r, pos.ry || pos.r, "wormhole-node-shape", "fill:var(--map-group-fill);stroke:var(--map-group-stroke);")}
            ${capsuleBadgeStackSvg("entry", system.universe.id, entry.id, pos.cx, pos.cy, pos.rx || pos.r, pos.ry || pos.r, {angle: Math.atan2(pos.cy - system.cy, pos.cx - system.cx), offsetX: 18})}
            ${childNodesSvg}
            <g class="wormhole-group-title-overlay">
              <text class="wormhole-group-text wormhole-group-text-top-layer wormhole-node-left-text" x="${wormholeNodeTextX(pos, 20)}" y="${textStartY}" text-anchor="start">
                ${fit.titleLines.map((line, index) => `<tspan class="wormhole-group-title-line" x="${wormholeNodeTextX(pos, 20)}" dy="${index === 0 ? 0 : fit.titleLineHeight}" font-size="${fit.titleFontSize}">${escapeHtml(line)}</tspan>`).join("")}
              </text>
            </g>
          </g>
        `;
          }

          const textStartY = pos.cy - fit.totalHeight / 2 + fit.titleFontSize * 0.82;

          return `
        <g class="${className}" data-universe-id="${escapeHtml(system.universe.id)}" data-creation-id="${escapeHtml(entry.id)}">
          ${capsuleRectSvg(pos.cx, pos.cy, pos.rx || pos.r, pos.ry || pos.r, "wormhole-node-shape", "fill:var(--map-creation-fill);stroke:var(--map-creation-stroke);")}
          <text class="wormhole-creation-text wormhole-node-left-text" x="${wormholeNodeTextX(pos, 20)}" y="${textStartY}" text-anchor="start">
            ${fit.titleLines.map((line, index) => `<tspan class="wormhole-creation-title-line" x="${wormholeNodeTextX(pos, 20)}" dy="${index === 0 ? 0 : fit.titleLineHeight}" font-size="${fit.titleFontSize}">${escapeHtml(line)}</tspan>`).join("")}
            ${fit.subtitleLines.map((line, index) => `<tspan class="wormhole-creation-subtitle-line" x="${wormholeNodeTextX(pos, 20)}" dy="${index === 0 ? (fit.titleLines.length ? fit.subtitleGap + fit.subtitleLineHeight : 0) : fit.subtitleLineHeight}" font-size="${fit.subtitleFontSize}">${escapeHtml(line)}</tspan>`).join("")}
          </text>
          ${capsuleBadgeStackSvg("entry", system.universe.id, entry.id, pos.cx, pos.cy, pos.rx || pos.r, pos.ry || pos.r, {angle: Math.atan2(pos.cy - system.cy, pos.cx - system.cx), offsetX: 18})}
        </g>
      `;
        })
        .join("");

      const clusterClass = [
        "wormhole-cluster",
        wormholeMapClusterEligible ? "map-cluster-member" : "",
        isFocusedUniverse ? "focused" : "",
        isDimmedCluster ? "dimmed" : "",
        wormholeUniverseVisibleInCurrentView(system.universe.id) ? "" : "isolated-subgraph-hidden",
      ]
        .filter(Boolean)
        .join(" ");
      const universeContentClass = wormholeUniverseVisibleInCurrentView(system.universe.id)
        ? ""
        : "isolated-subgraph-hidden";

      return `
      <g class="${clusterClass}" data-id="${escapeHtml(system.universe.id)}" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(system.universe.id)}">
        ${wormholeMapDomProfile.compact ? "" : orbitCapsuleRectSvg(system.cx, system.cy, system.orbitX + system.maxItemRadius + 30, system.orbitY + system.maxItemRadius + 24, "wormhole-system-halo")}
        ${orbitCapsuleRectSvg(system.cx, system.cy, system.orbitX + system.maxItemRadius + 12, system.orbitY + system.maxItemRadius + 10, "wormhole-system-bg")}
        ${orbitCapsuleRectSvg(system.cx, system.cy, system.orbitX, system.orbitY, "wormhole-orbit")}
        <g class="wormhole-universe-content ${universeContentClass}" data-universe-id="${escapeHtml(system.universe.id)}">
          <g class="${titleClass}" data-id="${escapeHtml(system.universe.id)}">
            ${capsuleRectSvg(system.cx, system.cy, titleBubble.rx || titleBubble.r, titleBubble.ry || titleBubble.r, "wormhole-node-shape", "fill:var(--map-universe-fill);stroke:var(--map-universe-stroke);")}
            <text class="wormhole-node-left-text" x="${system.cx - (titleBubble.rx || titleBubble.r) + 20}" y="${system.cy - ((titleBubble.lines.length - 1) * titleBubble.lineHeight) / 2 + titleBubble.fontSize * 0.35}" text-anchor="start" font-size="${titleBubble.fontSize}">
              ${titleBubble.lines.map((line, index) => `<tspan x="${system.cx - (titleBubble.rx || titleBubble.r) + 20}" dy="${index === 0 ? 0 : titleBubble.lineHeight}">${escapeHtml(line)}</tspan>`).join("")}
            </text>
          </g>
          ${capsuleBadgeStackSvg("universe", system.universe.id, "", system.cx, system.cy, titleBubble.rx || titleBubble.r, titleBubble.ry || titleBubble.r, {angle: -Math.PI / 4, offsetX: 18})}
        </g>
        ${creations}
      </g>
    `;
    })
    .join("");

  const hasWormholeSelection = !!(selectedWormholeCreation || wormholeFocusUniverseId);
  const wormholeSelectionTitle = selectedWormholeCreation
    ? selectedEntry?.title || "Selected item"
    : wormholeFocusUniverseId
      ? (globalThis.controllerServices || globalThis).getUniverseTitle(wormholeFocusUniverseId)
      : "";
  const bridgesSelectionHelpDisabled = bridgesAutomaticTipsDisabled();
  const wormholeSelectionHelpOpen = hasWormholeSelection && !bridgesSelectionHelpWasSeen();
  const wormholeSelectionInstruction = selectedWormholeCreation
    ? `Select an item in another universe to add or remove a Bridge. Select another item in ${escapeHtml((globalThis.controllerServices || globalThis).getUniverseTitle(selectedWormholeCreation.universeId))} to add or remove a Connection.`
    : "Select an item in another universe to add or remove a Bridge.";
  const wormholeSelectionGuide = hasWormholeSelection
    ? `
      <div class="map-selection-guide bridges-selection-guide" aria-live="polite">
        <div class="map-selection-guide-summary">
          <p><strong>Selected:</strong> ${escapeHtml(wormholeSelectionTitle)}</p>
          <button id="bridgesSelectionHelpBtn" type="button" data-app-button="true" class="app-button map-selection-help-toggle" aria-controls="bridgesSelectionHelpPanel" aria-expanded="${wormholeSelectionHelpOpen ? "true" : "false"}">${wormholeSelectionHelpOpen ? "Hide help" : "What’s this?"}</button>
        </div>
        <div id="bridgesSelectionHelpPanel" class="map-selection-help-panel" ${wormholeSelectionHelpOpen ? "" : "hidden"}>
          <p>${wormholeSelectionInstruction}</p>
          <p>Selecting an existing link will ask before removing it. Clear selection leaves every link unchanged.</p>
          <div class="map-selection-help-actions">
            <label class="map-selection-help-disable"><input id="bridgesSelectionHelpDisableTips" type="checkbox" ${bridgesSelectionHelpDisabled ? "checked" : ""}> <span>Don’t show any more tips</span></label>
            <button id="hideBridgesSelectionHelpBtn" type="button" data-app-button="true" class="app-button map-selection-help-hide">Hide help</button>
          </div>
        </div>
      </div>
    `
    : "";
  const wormholesFloatingActions = hasWormholeSelection
    ? `
      <div class="map-floating-actions wormholes-floating-actions ${wormholeIsolationActive ? "isolated-subgraph-actions" : ""}">
        ${
          wormholeIsolationActive
            ? `<button id="backToFocusedWormholeItemBtn" type="button" data-app-button="true" class="app-button map-floating-button">Back to item</button>`
            : `<button id="isolateWormholeSubgraphBtn" type="button" data-app-button="true" class="app-button map-floating-button">Isolate</button>`
        }
        <button id="clearWormholeFocusBtn" type="button" data-app-button="true" class="app-button map-floating-button">Clear selection</button>
      </div>
    `
    : "";
  const wormholesSearchBanner = mapSearchApi?.activeBannerHtml("wormholes") || "";
  const wormholesMapSearchControl = mapSearchApi?.controlHtml("wormholes") || "";

  renderWormholesMapStatus(wormholeSelectionGuide);

  wrap.innerHTML = `
    <div class="wormholes-map-controls compact-map-controls">
      <div class="map-zoom-row">
        <label class="wormholes-zoom-label">
          Zoom
          <input id="wormholesZoomSlider" class="wormholes-zoom-slider" type="range" min="0.08" max="2.4" step="0.05" value="${wormholesMapZoom}">
        </label>
        <span id="wormholesZoomValue" class="wormholes-zoom-value">${Math.round(wormholesMapZoom * 100)}%</span>
      </div>
    </div>
    ${wormholesFloatingActions}
    ${wormholesSearchBanner}
    <div id="wormholesMapStage" class="wormholes-map-stage ${mapFilterClass(wormholesMapFilters)} ${wormholeIsolationActive ? "isolated-subgraph-active" : ""}" data-map-cluster-eligible="${wormholeMapClusterEligible ? "true" : "false"}" data-map-cluster-blocked="${wormholeIsolationActive || !!selectedWormholeCreation || !!wormholeFocusUniverseId ? "true" : "false"}" data-map-cluster-threshold="0.42" ${wormholeMapDomAttributes}>
      <svg class="connections-map wormholes-map" viewBox="${wormholeViewBox.x} ${wormholeViewBox.y} ${wormholeViewBox.width} ${wormholeViewBox.height}" width="${wormholeViewBox.width}" height="${wormholeViewBox.height}" data-graph-width="${wormholeViewBox.width}" data-graph-height="${wormholeViewBox.height}" role="group" aria-label="Universe wormhole galaxy map" draggable="false">
        <defs>
          <radialGradient id="wormholeBg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="rgba(143,186,208,.13)"></stop>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"></stop>
          </radialGradient>
        </defs>
        <rect x="${wormholeViewBox.x}" y="${wormholeViewBox.y}" width="${wormholeViewBox.width}" height="${wormholeViewBox.height}" fill="url(#wormholeBg)"></rect>
        ${universeCount > 1 ? `<circle cx="${galaxyCx}" cy="${galaxyCy}" r="${galaxyRadius}" fill="none" stroke="rgba(242,231,208,.08)" stroke-width="1.5"></circle>` : ""}
        ${internalLines.join("")}
        ${universeBridgeLines.join("")}
        ${bridgeLines.join("")}
        <g class="wormhole-child-specific-overlays">
          ${childSpecificOverlayLines.join("")}
          ${childSpecificEndpointMarkers.join("")}
        </g>
        ${systemsSvg}
        <g class="map-aggregate-cluster-layer">${wormholeAggregateClusterSvg}</g>
      </svg>
    </div>
    ${mapFilterControlsHtml("wormholes", wormholesMapFilters)}
    ${wormholesMapSearchControl}
  `;

  const wormholeSvg = wrap.querySelector("svg");
  if (typeof prepareMapLazyRender === "function")
    prepareMapLazyRender(document.getElementById("wormholesMapStage"), {wrap});
  bindWormholesMapViewport();
  bindBridgesSelectionHelp();

  function zoomToWormholeAggregateCluster(cluster) {
    if (!wormholeSvg || typeof mapPanForSvgPoint !== "function") return;
    const nextZoom = Math.max(0.82, wormholesMapZoom);
    const pan = mapPanForSvgPoint(wrap, wormholeSvg, cluster.x, cluster.y, nextZoom);
    wormholesMapAutoFitOnNextRender = false;
    wormholesMapZoom = nextZoom;
    wormholesMapPanX = pan.panX;
    wormholesMapPanY = pan.panY;
    applyWormholesMapTransform();
  }

  if (typeof bindMapClusterControls === "function") {
    bindMapClusterControls(wrap, zoomToWormholeAggregateCluster);
  }

  bindMapFilterControls("wormholes");
  mapSearchApi?.bind("wormholes", {
    resolve: resolveWormholesMapSearchRecord,
    onSelect: (record, descriptor) => {
      mapSearchApi.clearActive("wormholes");
      selectedWormholeCreation = null;
      wormholeFocusUniverseId = null;
      wormholesMapIsolatedSubgraph = false;

      if (descriptor?.nativeKind === "universe") {
        wormholeFocusUniverseId = record.universeId;
        wormholesMapIsolatedSubgraph = true;
      } else if (descriptor?.nativeKind === "creation") {
        selectedWormholeCreation = {universeId: record.universeId, creationId: record.id};
        wormholesMapIsolatedSubgraph = true;
      } else {
        mapSearchApi.setActive("wormholes", record);
      }

      wormholesMapAutoFitOnNextRender = true;
      renderWormholesMap();
    },
  });
  mapSearchApi?.bindActiveClear("wormholes", () => {
    wormholesMapAutoFitOnNextRender = true;
    renderWormholesMap();
  });

  document.getElementById("isolateWormholeSubgraphBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    wormholesMapIsolatedSubgraph = true;
    wormholesMapAutoFitOnNextRender = true;
    renderWormholesMap();
  });

  document.getElementById("backToFocusedWormholeItemBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    wormholesMapIsolatedSubgraph = false;
    wormholesMapAutoFitOnNextRender = true;
    renderWormholesMap();
  });

  document.getElementById("clearWormholeFocusBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    (globalThis.controllerServices || globalThis).clearWormholeFocus();
  });

  function svgPointFromEvent(event) {
    if (!wormholeSvg) return null;
    const point = wormholeSvg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(wormholeSvg.getScreenCTM().inverse());
  }

  function nearestWormholeClickTarget(point) {
    if (!point) return null;

    let best = null;

    universeTitlePositions.forEach((pos, universeId) => {
      const r = Math.max(34, (pos.r || 34) * 1.28);
      const distance = Math.hypot(point.x - pos.x, point.y - pos.y);
      if (distance <= r && (!best || distance < best.distance)) {
        best = {type: "universe", universeId, distance};
      }
    });

    creationPositions.forEach((pos, key) => {
      const [keyUniverseId, ...keyEntryParts] = key.split(":");
      const keyEntryId = keyEntryParts.join(":");
      if (wormholeEntryFilterHidden(keyUniverseId, keyEntryId)) return;
      const r = Math.max(24, (pos.r || 24) * 1.12);
      const distance = Math.hypot(point.x - pos.cx, point.y - pos.cy);
      if (distance <= r && (!best || distance < best.distance)) {
        best = {type: "creation", universeId: keyUniverseId, creationId: keyEntryId, distance};
      }
    });

    return best;
  }

  function handleWormholeSvgClick(event) {
    if (event.__wormholeMapHandled) return;

    const directAggregateCluster = event.target.closest?.(".map-aggregate-cluster");
    if (directAggregateCluster && directAggregateCluster.getAttribute("aria-hidden") !== "true") {
      event.__wormholeMapHandled = true;
      (globalThis.controllerServices || globalThis).swallowDownloadBehavior(event);
      zoomToWormholeAggregateCluster({
        x: parseFloat(directAggregateCluster.dataset.clusterX) || 0,
        y: parseFloat(directAggregateCluster.dataset.clusterY) || 0,
      });
      return false;
    }

    if (
      event.target.closest?.(
        ".svg-literature-indicator, .svg-vision-indicator, .wormhole-bridge-note-group, .map-edge-endpoint",
      )
    )
      return;
    if (wormholeIsolationActive) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      return false;
    }

    const directCreation = event.target.closest?.(".wormhole-creation");
    if (directCreation) {
      event.__wormholeMapHandled = true;
      (globalThis.controllerServices || globalThis).swallowDownloadBehavior(event);
      (globalThis.controllerServices || globalThis).handleWormholeCreationClick(
        directCreation.dataset.universeId,
        directCreation.dataset.creationId,
      );
      return false;
    }

    const directUniverse = event.target.closest?.(".wormhole-cluster-title");
    if (directUniverse) {
      event.__wormholeMapHandled = true;
      (globalThis.controllerServices || globalThis).swallowDownloadBehavior(event);
      (globalThis.controllerServices || globalThis).handleWormholeUniverseClick(directUniverse.dataset.id);
      return false;
    }

    const target = nearestWormholeClickTarget(svgPointFromEvent(event));
    if (!target) return;

    event.__wormholeMapHandled = true;
    (globalThis.controllerServices || globalThis).swallowDownloadBehavior(event);

    if (target.type === "universe") {
      (globalThis.controllerServices || globalThis).handleWormholeUniverseClick(target.universeId);
    } else {
      (globalThis.controllerServices || globalThis).handleWormholeCreationClick(target.universeId, target.creationId);
    }
    return false;
  }

  wormholeSvg?.addEventListener("click", handleWormholeSvgClick, true);

  document.querySelectorAll(".svg-literature-indicator").forEach((badge) => {
    badge.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      (globalThis.controllerServices || globalThis).openLiteratureLinksModal(
        badge.dataset.literatureLinkType,
        badge.dataset.universeId,
        badge.dataset.entryId || "",
      );
      return false;
    });
  });

  document.querySelectorAll(".wormhole-cluster-title").forEach((node) => {
    (globalThis.controllerServices || globalThis).installSafeControl(node, () => {
      if (!node.isConnected || wormholeIsolationActive) return;
      (globalThis.controllerServices || globalThis).handleWormholeUniverseClick(node.dataset.id);
    });
  });

  function installWormholeCreationControl(node) {
    const isLiteratureIndicatorClick = (event) =>
      !!event.target.closest?.(".svg-literature-indicator, .svg-vision-indicator");
    const isChildClickInsideGroupShell = (event) =>
      node.classList.contains("wormhole-group-shell") &&
      event.target.closest?.(".wormhole-group-child-node");

    ["pointerdown", "mousedown", "mouseup", "touchstart", "touchend"].forEach((type) => {
      node.addEventListener(
        type,
        (event) => {
          if (isLiteratureIndicatorClick(event) || isChildClickInsideGroupShell(event)) return;
          (globalThis.controllerServices || globalThis).swallowDownloadBehavior(event);
        },
        true,
      );
    });

    node.addEventListener(
      "click",
      (event) => {
        if (event.__wormholeMapHandled) return;
        if (isLiteratureIndicatorClick(event) || isChildClickInsideGroupShell(event)) return;
        if (wormholeIsolationActive) return;
        (globalThis.controllerServices || globalThis).swallowDownloadBehavior(event);
        (globalThis.controllerServices || globalThis).handleWormholeCreationClick(
          node.dataset.universeId,
          node.dataset.creationId,
        );
        return false;
      },
      true,
    );

    node.addEventListener(
      "keydown",
      (event) => {
        if ((event.key === "Enter" || event.key === " ") && !wormholeIsolationActive) {
          (globalThis.controllerServices || globalThis).swallowDownloadBehavior(event);
          (globalThis.controllerServices || globalThis).handleWormholeCreationClick(
            node.dataset.universeId,
            node.dataset.creationId,
          );
          return false;
        }
      },
      true,
    );
  }

  document.querySelectorAll(".wormhole-creation").forEach((node) => {
    installWormholeCreationControl(node);
  });

  document.querySelectorAll(".wormhole-bridge-note-group").forEach((group) => {
    group.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      (globalThis.controllerServices || globalThis).openBridgeNoteModal(group.dataset.bridgeKey, group.dataset.label);
      return false;
    });
  });

  improveSvgMapAccessibility(wrap);
  refreshOpenMapListView("wormholes");
}

/* Rendering boundary: callers request a named view; DOM implementation stays behind the coordinator. */
window.WormholesRendering?.register?.("bridges-map", renderWormholesMapView, {
  domains: ["universes", "archive", "bridgeNotes", "literature", "vision"],
});
function renderWormholesMap() {
  const coordinator = window.WormholesRendering;
  if (coordinator?.has?.("bridges-map")) return coordinator.render("bridges-map");
  return renderWormholesMapView();
}

/* Public controller surface for served ES-module builds. */
const BRIDGES_MAP_CONTROLLER_API = Object.freeze({
  renderWormholesMapStatus,
  buildWormholesMapListViewHtml,
  bridgeMapShapeFromPosition,
  applyWormholesMapTransform,
  fitWormholesMapToViewport,
  bindWormholesMapViewport,
  renderWormholesMapView,
  renderWormholesMap,
});
(globalThis.registerControllerServices || (() => {}))(BRIDGES_MAP_CONTROLLER_API);

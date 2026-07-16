/* GENERATED from scripts/modules/connections-map-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 110 connections map module. Split from the original single-file build.
   Keeps the Connections map renderer and viewport behavior globally callable for the app core. */

const CONNECTIONS_SELECTION_HELP_KEY = "wormholesConnectionsSelectionHelpSeen";

function connectionsAutomaticTipsDisabled() {
  if (window.WormholesOnboarding?.automaticTipsDisabled?.()) return true;
  try {
    return window.localStorage?.getItem("wormholesOnboardingTipsDisabled") === "true";
  } catch {
    return false;
  }
}

function connectionsSelectionHelpWasSeen() {
  if (connectionsAutomaticTipsDisabled()) return true;
  try {
    return window.localStorage?.getItem(CONNECTIONS_SELECTION_HELP_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberConnectionsSelectionHelp() {
  try {
    window.localStorage?.setItem(CONNECTIONS_SELECTION_HELP_KEY, "true");
  } catch {
    // Context help still works when browser storage is unavailable.
  }
}

function disableConnectionsAutomaticTips() {
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

function setConnectionsSelectionHelpOpen(button, panel, open) {
  button.setAttribute("aria-expanded", open ? "true" : "false");
  button.textContent = open ? "Hide help" : "What’s this?";
  panel.hidden = !open;
}

function bindConnectionsSelectionHelp() {
  const button = document.getElementById("connectionsSelectionHelpBtn");
  const panel = document.getElementById("connectionsSelectionHelpPanel");
  const checkbox = document.getElementById("connectionsSelectionHelpDisableTips");
  const hideButton = document.getElementById("hideConnectionsSelectionHelpBtn");
  if (!button || !panel) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = button.getAttribute("aria-expanded") === "true";
    setConnectionsSelectionHelpOpen(button, panel, !isOpen);
    if (isOpen) rememberConnectionsSelectionHelp();
  });

  checkbox?.addEventListener("change", () => {
    if (checkbox.checked) disableConnectionsAutomaticTips();
  });

  hideButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (checkbox?.checked) disableConnectionsAutomaticTips();
    rememberConnectionsSelectionHelp();
    setConnectionsSelectionHelpOpen(button, panel, false);
    button.focus({preventScroll: true});
  });
}

function renderConnectionsMapStatus(content = "") {
  const status = document.getElementById("connectionsMapStatus");
  if (!status) return;

  status.innerHTML = content;
  if (content) {
    status.classList.add("open", "map-selection-footnote");
  } else {
    status.classList.remove("open", "map-selection-footnote");
  }
}

function applyConnectionsMapTransform() {
  const stage = document.getElementById("connectionsMapStage");
  if (!stage) return;

  stage.style.transform = `translate(${connectionsMapPanX}px, ${connectionsMapPanY}px) scale(${connectionsMapZoom})`;
  updateSvgMapBadgeScale(stage, connectionsMapZoom);
  updateMapReadabilityState(stage, connectionsMapZoom);
  if (typeof updateMapClusteringState === "function")
    updateMapClusteringState(stage, connectionsMapZoom);
  if (typeof scheduleMapLazyRender === "function")
    scheduleMapLazyRender(stage, document.getElementById("connectionsMapWrap"));

  const slider = document.getElementById("connectionsZoomSlider");
  const value = document.getElementById("connectionsZoomValue");
  if (slider) slider.value = String(connectionsMapZoom);
  if (value) value.textContent = `${Math.round(connectionsMapZoom * 100)}%`;
}

function fitConnectionsMapToViewport() {
  const wrap = document.getElementById("connectionsMapWrap");
  const svg = document.querySelector("#connectionsMapStage svg");
  if (!wrap || !svg) return;

  const graphWidth = parseFloat(svg.dataset.graphWidth) || svg.viewBox?.baseVal?.width || 1;
  const graphHeight = parseFloat(svg.dataset.graphHeight) || svg.viewBox?.baseVal?.height || 1;
  const viewportInset = 34;
  const availableWidth = Math.max(180, wrap.clientWidth - viewportInset * 2);
  const availableHeight = Math.max(180, wrap.clientHeight - viewportInset * 2);
  const fitZoom = Math.min(1, availableWidth / graphWidth, availableHeight / graphHeight);

  connectionsMapZoom = Number(Math.max(0.08, Math.min(2.4, fitZoom)).toFixed(3));
  connectionsMapPanX = Math.round((wrap.clientWidth - graphWidth * connectionsMapZoom) / 2);
  connectionsMapPanY = Math.round((wrap.clientHeight - graphHeight * connectionsMapZoom) / 2);
  connectionsMapAutoFitOnNextRender = false;

  applyConnectionsMapTransform();
}

function bindConnectionsMapViewport() {
  const wrap = document.getElementById("connectionsMapWrap");
  const stage = document.getElementById("connectionsMapStage");
  const slider = document.getElementById("connectionsZoomSlider");
  if (!wrap || !stage) return;

  if (connectionsMapAutoFitOnNextRender) {
    // Fit synchronously whenever the open map already has measurable bounds.
    // Deferring a rebuilt isolated map until the next animation frame briefly
    // exposed its unscaled SVG and counter-scaled labels, which looked like a
    // graphics/text stutter before the isolated view settled.
    if (wrap.clientWidth > 0 && wrap.clientHeight > 0) {
      fitConnectionsMapToViewport();
    } else {
      // A newly opened/hidden dialog may not have layout yet. Keep the stage
      // invisible for that single frame so an unfitted map is never painted.
      stage.style.visibility = "hidden";
      requestAnimationFrame(() => {
        fitConnectionsMapToViewport();
        const currentStage = document.getElementById("connectionsMapStage");
        if (currentStage) currentStage.style.visibility = "";
      });
    }
  } else {
    applyConnectionsMapTransform();
  }

  slider?.addEventListener("input", (event) => {
    connectionsMapAutoFitOnNextRender = false;
    const oldZoom = connectionsMapZoom;
    const nextZoom = Math.max(0.08, Math.min(2.4, parseFloat(event.target.value) || 1));
    const anchoredPan = mapPanForZoomAroundViewportCenter(
      wrap,
      oldZoom,
      nextZoom,
      connectionsMapPanX,
      connectionsMapPanY,
    );
    connectionsMapZoom = nextZoom;
    connectionsMapPanX = anchoredPan.panX;
    connectionsMapPanY = anchoredPan.panY;
    applyConnectionsMapTransform();
  });

  if (wrap.dataset.viewportBound === "true") return;
  wrap.dataset.viewportBound = "true";

  const isInteractiveMapTarget = (event) =>
    !!event.target.closest?.(
      ".connections-map-controls, .map-filter-panel, .map-floating-actions, .map-search-control, .map-search-isolation, .app-button, input, .connection-node, .connection-edge-group, .connection-edge-click, .connection-note-dot, .svg-literature-indicator, .svg-vision-indicator, .literature-link-indicator, .map-aggregate-cluster",
    );

  wrap.addEventListener("pointerdown", (event) => {
    if (isInteractiveMapTarget(event)) return;
    event.preventDefault();

    connectionsMapAutoFitOnNextRender = false;
    connectionsMapDragging = true;
    connectionsMapDragStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: connectionsMapPanX,
      panY: connectionsMapPanY,
    };

    wrap.classList.add("dragging");
    wrap.setPointerCapture?.(event.pointerId);
  });

  wrap.addEventListener("pointermove", (event) => {
    if (
      !connectionsMapDragging ||
      !connectionsMapDragStart ||
      connectionsMapDragStart.pointerId !== event.pointerId
    )
      return;
    event.preventDefault();

    connectionsMapPanX = connectionsMapDragStart.panX + (event.clientX - connectionsMapDragStart.x);
    connectionsMapPanY = connectionsMapDragStart.panY + (event.clientY - connectionsMapDragStart.y);
    applyConnectionsMapTransform();
  });

  const stopDrag = (event) => {
    if (connectionsMapDragStart && connectionsMapDragStart.pointerId !== event.pointerId) return;
    connectionsMapDragging = false;
    connectionsMapDragStart = null;
    wrap.classList.remove("dragging");
    try {
      wrap.releasePointerCapture?.(event.pointerId);
    } catch (e) {}
  };

  wrap.addEventListener("pointerup", stopDrag);
  wrap.addEventListener("pointercancel", stopDrag);
  wrap.addEventListener("lostpointercapture", () => {
    connectionsMapDragging = false;
    connectionsMapDragStart = null;
    wrap.classList.remove("dragging");
  });
}

function renderConnectionsMapView() {
  const wrap = document.getElementById("connectionsMapWrap");
  const focusedMapNodeId = document.activeElement?.closest?.(".connection-node")?.dataset.id || "";
  const mapSearchApi = window.WormholesMapSearch || null;

  if (!selectedMapNodeId && typeof connectionsMapIsolatedSubgraph !== "undefined")
    connectionsMapIsolatedSubgraph = false;
  (globalThis.controllerServices || globalThis).updateDestructiveClearButtons();

  if (
    selectedMapNodeId &&
    !(globalThis.controllerServices || globalThis).isSelectableConnectionsMapNodeId(selectedMapNodeId)
  ) {
    selectedMapNodeId = null;
    connectionsMapIsolatedSubgraph = false;
  }

  renderConnectionsMapStatus();

  const currentUniverse = (globalThis.controllerServices || globalThis).getCurrentUniverse();
  const topEntries = (globalThis.controllerServices || globalThis).topLevelArchiveEntries(archiveEntries);
  const currentUniverseNodeId = `universe:${currentUniverseId}`;
  const nodesById = new Map();
  const nodeShapes = new Map();
  const normalEdges = [];
  const bridgeEdges = [];
  const seenInternal = new Set();
  const seenBridgeEdges = new Set();

  function addNode(node) {
    if (!node || nodesById.has(node.id)) return;
    nodesById.set(node.id, node);
  }

  function addCurrentUniverseNode() {
    if (!currentUniverseId) return;
    addNode({
      type: "current-universe",
      id: currentUniverseNodeId,
      universeId: currentUniverseId,
      title: (globalThis.controllerServices || globalThis).getUniverseTitle(currentUniverseId),
      subtitle: "Working Universe",
      selectable: false,
      external: false,
    });
  }

  function addExternalUniverseNode(universeId) {
    if (!universeId || universeId === currentUniverseId) return `universe:${universeId}`;
    const id = `universe:${universeId}`;
    addNode({
      type: "external-universe",
      id,
      universeId,
      title: (globalThis.controllerServices || globalThis).getUniverseTitle(universeId),
      subtitle: "Linked Universe",
      selectable: false,
      external: true,
    });
    return id;
  }

  function addExternalCreationNode(universeId, creationId) {
    if (!universeId || !creationId) return null;

    if (universeId === currentUniverseId && nodeShapes.has(creationId)) {
      return creationId;
    }

    const archive = (globalThis.controllerServices || globalThis).archiveForUniverseLinkCheck(universeId);
    const entry = archive.find((item) => item.id === creationId);
    const groupEntry =
      entry && (globalThis.controllerServices || globalThis).isGroupEntry(entry)
        ? entry
        : (globalThis.controllerServices || globalThis).getGroupForEntryId(creationId, archive);

    if (groupEntry) {
      const groupNodeId = `external:${universeId}:${groupEntry.id}`;
      const children = (globalThis.controllerServices || globalThis).groupChildIds(groupEntry)
        .map((id) => archive.find((item) => item.id === id))
        .filter(Boolean);

      addNode({
        type: "external-group",
        id: groupNodeId,
        universeId,
        creationId: groupEntry.id,
        entry: groupEntry,
        children,
        title: groupEntry.title,
        subtitle: (globalThis.controllerServices || globalThis).getUniverseTitle(universeId),
        selectable: false,
        external: true,
        externalGroupParent: true,
      });

      children.forEach((child) => {
        addNode({
          type: "external-group-child",
          id: `external:${universeId}:${child.id}`,
          universeId,
          creationId: child.id,
          entry: child,
          parentGroupId: groupEntry.id,
          parentGroupNodeId: groupNodeId,
          title: child.title,
          subtitle: child.what?.val ? child.what.val.split("—")[0].trim() : "Creation",
          selectable: false,
          external: true,
          externalGroupChild: true,
        });
      });

      if (entry && (globalThis.controllerServices || globalThis).isGroupEntry(entry)) {
        return groupNodeId;
      }

      if (entry && (globalThis.controllerServices || globalThis).groupChildIds(groupEntry).includes(entry.id)) {
        return `external:${universeId}:${entry.id}`;
      }

      return groupNodeId;
    }

    const id = `external:${universeId}:${creationId}`;
    addNode({
      type: "external-creation",
      id,
      universeId,
      creationId,
      entry,
      title: entry
        ? entry.title
        : (globalThis.controllerServices || globalThis).getCreationTitleFromUniverse(universeId, creationId),
      subtitle: (globalThis.controllerServices || globalThis).getUniverseTitle(universeId),
      selectable: false,
      external: true,
    });
    return id;
  }

  function nodeDescriptorForId(nodeId, fallbackUniverseId = null, fallbackCreationId = null) {
    if (nodeId === currentUniverseNodeId) {
      return {type: "universe", universeId: currentUniverseId};
    }

    if (nodeShapes.has(nodeId) && (globalThis.controllerServices || globalThis).getEntry(nodeId)) {
      return {type: "creation", universeId: currentUniverseId, creationId: nodeId};
    }

    if (nodeId.startsWith("universe:")) {
      return {type: "universe", universeId: nodeId.slice("universe:".length)};
    }

    if (nodeId.startsWith("external:")) {
      const parts = nodeId.split(":");
      return {type: "creation", universeId: parts[1], creationId: parts.slice(2).join(":")};
    }

    if (fallbackCreationId) {
      return {type: "creation", universeId: fallbackUniverseId, creationId: fallbackCreationId};
    }

    return {type: "universe", universeId: fallbackUniverseId};
  }

  function addBridgeEdge(
    sourceNodeId,
    targetNodeId,
    sourceNode,
    targetNode,
    sourceLabel,
    targetLabel,
  ) {
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return;

    const noteKey = (globalThis.controllerServices || globalThis).bridgeNoteKeyForNodes(sourceNode, targetNode);
    if (seenBridgeEdges.has(noteKey)) return;
    seenBridgeEdges.add(noteKey);

    bridgeEdges.push({
      sourceNodeId,
      targetNodeId,
      sourceNode,
      targetNode,
      sourceLabel,
      targetLabel,
    });
  }

  const connectionNodeFits = new Map();

  function fitConnectionHeaderBox(title, subtitle = "", options = {}) {
    const minWidth = options.minWidth || 184;
    const maxWidth = options.maxWidth || 360;
    const titleFontSize = options.titleFontSize || 13;
    const subtitleFontSize = options.subtitleFontSize || 10;
    const horizontalPadding = options.horizontalPadding || 28;
    const verticalPadding = options.verticalPadding || 18;
    const titleLineHeight = Math.max(13, titleFontSize * 1.12);
    const subtitleLineHeight = Math.max(11, subtitleFontSize * 1.12);
    const titleText = String(title || "Untitled");
    const subtitleText = String(subtitle || "").trim();
    const titleMaxLines = options.titleMaxLines || 5;
    const subtitleMaxLines = options.subtitleMaxLines || 3;

    let best = null;

    for (let width = minWidth; width <= maxWidth; width += 12) {
      const innerWidth = width - horizontalPadding;
      const titleLines = wrapTextToLines(titleText, innerWidth, titleFontSize).slice(
        0,
        titleMaxLines,
      );
      const subtitleLines = subtitleText
        ? wrapTextToLines(subtitleText, innerWidth, subtitleFontSize).slice(0, subtitleMaxLines)
        : [];

      const titleFits =
        wrapTextToLines(titleText, innerWidth, titleFontSize).length <= titleMaxLines;
      const subtitleFits =
        !subtitleText ||
        wrapTextToLines(subtitleText, innerWidth, subtitleFontSize).length <= subtitleMaxLines;

      const titleWidth = Math.max(
        ...titleLines.map((line) => approximateTextWidth(line, titleFontSize)),
        0,
      );
      const subtitleWidth = Math.max(
        ...subtitleLines.map((line) => approximateTextWidth(line, subtitleFontSize)),
        0,
      );
      const height =
        verticalPadding +
        titleLines.length * titleLineHeight +
        (subtitleLines.length ? 4 + subtitleLines.length * subtitleLineHeight : 0);

      best = {
        w: width,
        h: Math.max(options.minHeight || 48, Math.ceil(height)),
        titleLines,
        subtitleLines,
        titleFontSize,
        subtitleFontSize,
        titleLineHeight,
        subtitleLineHeight,
        titleWidth,
        subtitleWidth,
      };

      if (titleFits && subtitleFits) break;
    }

    return best;
  }

  function connectionWrappedTextSvg(fit, x, y, options = {}) {
    const titleX = x + (options.paddingX || 14);
    const titleStartY = y + (options.titleStartY || 18);
    const titleWeight = options.titleWeight || "bold";
    const subtitleGap = options.subtitleGap || 5;

    const titleSvg = `
      <text class="connection-node-title" x="${titleX}" y="${titleStartY}" font-size="${fit.titleFontSize}" font-weight="${titleWeight}">
        ${fit.titleLines.map((line, index) => `<tspan x="${titleX}" dy="${index === 0 ? 0 : fit.titleLineHeight}">${escapeHtml(line)}</tspan>`).join("")}
      </text>
    `;

    if (!fit.subtitleLines.length) return titleSvg;

    const subtitleY =
      titleStartY +
      (fit.titleLines.length - 1) * fit.titleLineHeight +
      fit.titleLineHeight +
      subtitleGap;
    return `
      ${titleSvg}
      <text class="node-subtitle" x="${titleX}" y="${subtitleY}" font-size="${fit.subtitleFontSize}">
        ${fit.subtitleLines.map((line, index) => `<tspan x="${titleX}" dy="${index === 0 ? 0 : fit.subtitleLineHeight}">${escapeHtml(line)}</tspan>`).join("")}
      </text>
    `;
  }

  function groupLayout(entry) {
    const children = (globalThis.controllerServices || globalThis).groupChildIds(entry)
      .map((id) => (globalThis.controllerServices || globalThis).getEntry(id))
      .filter(Boolean);
    const groupFit = fitConnectionHeaderBox(entry.title, "", {
      minWidth: 180,
      maxWidth: 300,
      minHeight: 48,
      titleFontSize: 13.5,
      titleMaxLines: 4,
      verticalPadding: 17,
    });
    connectionNodeFits.set(entry.id, groupFit);

    const childFits = children.map((child) => {
      const childSubtitle = child.what?.val ? child.what.val.split("—")[0].trim() : "Creation";
      const fit = fitConnectionHeaderBox(child.title, childSubtitle, {
        minWidth: 116,
        maxWidth: 172,
        minHeight: 44,
        titleFontSize: 10.5,
        subtitleFontSize: 8.5,
        titleMaxLines: 3,
        subtitleMaxLines: 2,
        horizontalPadding: 18,
        verticalPadding: 13,
      });
      connectionNodeFits.set(child.id, fit);
      return fit;
    });

    const childW = Math.max(116, ...childFits.map((fit) => fit.w));
    const childH = Math.max(44, ...childFits.map((fit) => fit.h));
    const gap = 12;
    const cols = Math.min(2, Math.max(1, children.length || 1));
    const rows = Math.max(1, Math.ceil(Math.max(children.length, 1) / cols));
    const headerH = Math.max(48, groupFit.h + 8);
    const width = Math.max(groupFit.w + 32, cols * childW + (cols - 1) * gap + 32);
    const height = Math.max(headerH + rows * childH + (rows - 1) * gap + 22, headerH + 52);
    return {children, childW, childH, gap, cols, rows, width, height, groupFit, headerH};
  }

  function externalGroupLayout(node) {
    const children = node.children || [];
    const groupFit = fitConnectionHeaderBox(
      node.title,
      node.subtitle || (globalThis.controllerServices || globalThis).getUniverseTitle(node.universeId),
      {
        minWidth: 218,
        maxWidth: 350,
        minHeight: 58,
        titleFontSize: 13.5,
        subtitleFontSize: 9.6,
        titleMaxLines: 4,
        subtitleMaxLines: 1,
        verticalPadding: 20,
      },
    );
    connectionNodeFits.set(node.id, groupFit);

    const childFits = children.map((child) => {
      const childNodeId = `external:${node.universeId}:${child.id}`;
      const childSubtitle = child.what?.val ? child.what.val.split("—")[0].trim() : "Creation";
      const fit = fitConnectionHeaderBox(child.title, childSubtitle, {
        minWidth: 116,
        maxWidth: 174,
        minHeight: 44,
        titleFontSize: 10.5,
        subtitleFontSize: 8.5,
        titleMaxLines: 3,
        subtitleMaxLines: 2,
        horizontalPadding: 18,
        verticalPadding: 13,
      });
      connectionNodeFits.set(childNodeId, fit);
      return fit;
    });

    const childW = Math.max(116, ...childFits.map((fit) => fit.w));
    const childH = Math.max(44, ...childFits.map((fit) => fit.h));
    const gap = 12;
    const cols = Math.min(2, Math.max(1, children.length || 1));
    const rows = Math.max(1, Math.ceil(Math.max(children.length, 1) / cols));
    const headerH = Math.max(56, groupFit.h + 8);
    const width = Math.max(groupFit.w + 32, cols * childW + (cols - 1) * gap + 32);
    const height = Math.max(headerH + rows * childH + (rows - 1) * gap + 22, headerH + 52);
    return {children, childW, childH, gap, cols, rows, width, height, groupFit, headerH};
  }

  const currentItems = [];
  topEntries.forEach((entry) => {
    if ((globalThis.controllerServices || globalThis).isGroupEntry(entry)) {
      const layout = groupLayout(entry);
      currentItems.push({kind: "group", entry, ...layout});
      addNode({
        type: "group",
        id: entry.id,
        entry,
        title: entry.title,
        subtitle: "",
        selectable: true,
        current: true,
      });
      layout.children.forEach((child) => {
        addNode({
          type: "group-child",
          id: child.id,
          entry: child,
          parentGroupId: entry.id,
          title: child.title,
          subtitle: child.what?.val ? child.what.val.split("—")[0].trim() : "Creation",
          selectable: true,
          current: true,
        });
      });
    } else {
      const subtitle = entry.what?.val ? entry.what.val.split("—")[0].trim() : "Creation";
      const fit = fitConnectionHeaderBox(entry.title, subtitle, {
        minWidth: 172,
        maxWidth: 286,
        minHeight: 56,
        titleFontSize: 13,
        subtitleFontSize: 10,
        titleMaxLines: 4,
        subtitleMaxLines: 2,
      });
      connectionNodeFits.set(entry.id, fit);
      currentItems.push({kind: "creation", entry, width: fit.w, height: fit.h});
      addNode({
        type: "creation",
        id: entry.id,
        entry,
        title: entry.title,
        subtitle,
        selectable: true,
        current: true,
      });
    }
  });

  const noCurrentItemsMessage =
    currentItems.length === 0
      ? `<div class="map-viewport-message connection-empty">No archived creations yet. Save a creation first.</div>`
      : "";

  const clusterCenterX = 520;
  const clusterCenterY = 360;
  const placedCurrentRects = [];

  function rectsOverlap(a, b, gap = 22) {
    return !(
      a.x + a.w + gap < b.x ||
      b.x + b.w + gap < a.x ||
      a.y + a.h + gap < b.y ||
      b.y + b.h + gap < a.y
    );
  }

  function buildCurrentOrbitAssignments(count) {
    if (count <= 0) {
      return [];
    }

    if (count === 1) {
      return [{ring: 0, slot: 0, ringCount: 1}];
    }

    if (count <= 10) {
      return Array.from({length: count}, (_, slot) => ({
        ring: 0,
        slot,
        ringCount: count,
      }));
    }

    const ringCapacities = [10, 14, 18, 22, 26];
    const ringCounts = [];
    let remaining = count;
    let ring = 0;

    while (remaining > 0) {
      const capacity = ringCapacities[ring] || 26 + (ring - 4) * 4;
      let ringCount = Math.min(capacity, remaining);
      const leftover = remaining - ringCount;

      if (leftover > 0 && leftover < 3 && ringCount > 5) {
        const movedToNextRing = 3 - leftover;
        ringCount -= movedToNextRing;
      }

      ringCounts.push(ringCount);
      remaining -= ringCount;
      ring += 1;
    }

    return ringCounts.flatMap((ringCount, ringIndex) =>
      Array.from({length: ringCount}, (_, slot) => ({
        ring: ringIndex,
        slot,
        ringCount,
      })),
    );
  }

  const currentOrbitAssignments = buildCurrentOrbitAssignments(currentItems.length);
  const maxCurrentOrbitRing = currentOrbitAssignments.reduce(
    (max, item) => Math.max(max, item.ring),
    0,
  );

  function placeCurrentItem(item, index) {
    if (currentItems.length === 1) {
      const candidate = {
        x: clusterCenterX - item.width / 2,
        y: clusterCenterY - 176 - item.height / 2,
        w: item.width,
        h: item.height,
      };
      placedCurrentRects.push(candidate);
      return {x: candidate.x, y: candidate.y, ring: 0};
    }

    const {ring, slot, ringCount} = currentOrbitAssignments[index];
    const radiusX = 184 + ring * 158 + Math.max(0, ringCount - 6) * 7;
    const radiusY = 124 + ring * 112 + Math.max(0, ringCount - 6) * 4;
    const angleStep = (Math.PI * 2) / Math.max(1, ringCount);
    const ringOffset = ring % 2 ? angleStep / 2 : 0;
    const angle = -Math.PI / 2 + slot * angleStep + ringOffset;

    let candidate = {
      x: clusterCenterX + Math.cos(angle) * radiusX - item.width / 2,
      y: clusterCenterY + Math.sin(angle) * radiusY - item.height / 2,
      w: item.width,
      h: item.height,
    };

    for (let attempt = 0; attempt < 10; attempt++) {
      if (!placedCurrentRects.some((rect) => rectsOverlap(candidate, rect, 14))) {
        break;
      }

      const extra = (attempt + 1) * 22;
      const tangent = attempt % 2 === 0 ? (attempt + 1) * 7 : -(attempt + 1) * 7;
      candidate = {
        x:
          clusterCenterX +
          Math.cos(angle) * (radiusX + extra) -
          item.width / 2 +
          Math.cos(angle + Math.PI / 2) * tangent,
        y:
          clusterCenterY +
          Math.sin(angle) * (radiusY + extra * 0.72) -
          item.height / 2 +
          Math.sin(angle + Math.PI / 2) * tangent,
        w: item.width,
        h: item.height,
      };
    }

    placedCurrentRects.push(candidate);
    return {x: candidate.x, y: candidate.y, ring};
  }

  addCurrentUniverseNode();
  const currentUniverseFit = fitConnectionHeaderBox(
    (globalThis.controllerServices || globalThis).getUniverseTitle(currentUniverseId),
    "Working Universe",
    {
      minWidth: 220,
      maxWidth: 360,
      minHeight: 62,
      titleFontSize: 15,
      subtitleFontSize: 10.5,
      titleMaxLines: 4,
      subtitleMaxLines: 1,
      verticalPadding: 20,
    },
  );
  connectionNodeFits.set(currentUniverseNodeId, currentUniverseFit);
  const currentUniverseShape = {
    type: "rect",
    x: clusterCenterX - currentUniverseFit.w / 2,
    y: clusterCenterY - currentUniverseFit.h / 2,
    w: currentUniverseFit.w,
    h: currentUniverseFit.h,
  };
  nodeShapes.set(currentUniverseNodeId, currentUniverseShape);
  placedCurrentRects.push(currentUniverseShape);

  currentItems.forEach((item, index) => {
    const {x, y} = placeCurrentItem(item, index);

    if (item.kind === "group") {
      const groupShape = {type: "rect", x, y, w: item.width, h: item.height};
      nodeShapes.set(item.entry.id, groupShape);

      item.children.forEach((child, childIndex) => {
        const childRow = Math.floor(childIndex / item.cols);
        const childCol = childIndex % item.cols;
        const childCountInRow =
          item.children.slice(childRow * item.cols, childRow * item.cols + item.cols).length || 1;
        const rowWidth =
          childCountInRow * item.childW + Math.max(0, childCountInRow - 1) * item.gap;
        const childStartX = x + (item.width - rowWidth) / 2;
        const childX = childStartX + childCol * (item.childW + item.gap);
        const childY = y + item.headerH + childRow * (item.childH + item.gap);
        nodeShapes.set(child.id, {
          type: "rect",
          x: childX,
          y: childY,
          w: item.childW,
          h: item.childH,
          parentGroupId: item.entry.id,
        });
      });
    } else {
      nodeShapes.set(item.entry.id, {type: "rect", x, y, w: item.width, h: item.height});
    }
  });

  const currentEntryIds = new Set(Array.from(nodeShapes.keys()));

  archiveEntries.forEach((entry) => {
    if (!nodeShapes.has(entry.id)) return;

    (entry.connections || []).forEach((targetId) => {
      if (!nodeShapes.has(targetId)) return;
      if (entry.id === targetId) return;

      const pair = [entry.id, targetId].sort().join("::");
      if (seenInternal.has(pair)) return;
      seenInternal.add(pair);
      normalEdges.push([entry.id, targetId]);
    });

    (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges).forEach((bridge) => {
      const targetNodeId = bridge.creationId
        ? addExternalCreationNode(bridge.universeId, bridge.creationId)
        : addExternalUniverseNode(bridge.universeId);

      addBridgeEdge(
        entry.id,
        targetNodeId,
        {type: "creation", universeId: currentUniverseId, creationId: entry.id},
        bridge.creationId
          ? {type: "creation", universeId: bridge.universeId, creationId: bridge.creationId}
          : {type: "universe", universeId: bridge.universeId},
        entry.title,
        bridge.creationId
          ? (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(
              bridge.universeId,
              bridge.creationId,
            )
          : (globalThis.controllerServices || globalThis).getUniverseTitle(bridge.universeId),
      );
    });
  });

  (globalThis.controllerServices || globalThis).normalizeUniverseBridges(currentUniverse).forEach((bridge) => {
    addCurrentUniverseNode();
    const targetNodeId = bridge.creationId
      ? addExternalCreationNode(bridge.universeId, bridge.creationId)
      : addExternalUniverseNode(bridge.universeId);

    addBridgeEdge(
      currentUniverseNodeId,
      targetNodeId,
      {type: "universe", universeId: currentUniverseId},
      bridge.creationId
        ? {type: "creation", universeId: bridge.universeId, creationId: bridge.creationId}
        : {type: "universe", universeId: bridge.universeId},
      (globalThis.controllerServices || globalThis).getUniverseTitle(currentUniverseId),
      bridge.creationId
        ? (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(bridge.universeId, bridge.creationId)
        : (globalThis.controllerServices || globalThis).getUniverseTitle(bridge.universeId),
    );
  });

  universes.forEach((universe) => {
    if (universe.id === currentUniverseId) return;

    (globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe).forEach((bridge) => {
      if (bridge.universeId !== currentUniverseId) return;

      const sourceNodeId = addExternalUniverseNode(universe.id);
      const targetNodeId =
        bridge.creationId && nodeShapes.has(bridge.creationId)
          ? bridge.creationId
          : currentUniverseNodeId;

      if (targetNodeId === currentUniverseNodeId) addCurrentUniverseNode();

      addBridgeEdge(
        sourceNodeId,
        targetNodeId,
        {type: "universe", universeId: universe.id},
        bridge.creationId && nodeShapes.has(bridge.creationId)
          ? {type: "creation", universeId: currentUniverseId, creationId: bridge.creationId}
          : {type: "universe", universeId: currentUniverseId},
        (globalThis.controllerServices || globalThis).getUniverseTitle(universe.id),
        bridge.creationId && nodeShapes.has(bridge.creationId)
          ? (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(
              currentUniverseId,
              bridge.creationId,
            )
          : (globalThis.controllerServices || globalThis).getUniverseTitle(currentUniverseId),
      );
    });

    readArchiveForUniverse(universe.id).forEach((externalEntry) => {
      (globalThis.controllerServices || globalThis).normalizeBridges(externalEntry.bridges).forEach((bridge) => {
        if (bridge.universeId !== currentUniverseId) return;

        const sourceNodeId = addExternalCreationNode(universe.id, externalEntry.id);
        const targetNodeId =
          bridge.creationId && nodeShapes.has(bridge.creationId)
            ? bridge.creationId
            : currentUniverseNodeId;

        if (targetNodeId === currentUniverseNodeId) addCurrentUniverseNode();

        addBridgeEdge(
          sourceNodeId,
          targetNodeId,
          {type: "creation", universeId: universe.id, creationId: externalEntry.id},
          bridge.creationId && nodeShapes.has(bridge.creationId)
            ? {type: "creation", universeId: currentUniverseId, creationId: bridge.creationId}
            : {type: "universe", universeId: currentUniverseId},
          (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(universe.id, externalEntry.id),
          bridge.creationId && nodeShapes.has(bridge.creationId)
            ? (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(
                currentUniverseId,
                bridge.creationId,
              )
            : (globalThis.controllerServices || globalThis).getUniverseTitle(currentUniverseId),
        );
      });
    });
  });

  const externalNodes = Array.from(nodesById.values()).filter((node) => node.external);
  const externalPlaceNodes = externalNodes.filter((node) => !node.externalGroupChild);
  const externalGroupLayouts = new Map();

  const currentBounds = Array.from(nodeShapes.values()).reduce(
    (bounds, shape) => ({
      minX: Math.min(bounds.minX, shape.x),
      minY: Math.min(bounds.minY, shape.y),
      maxX: Math.max(bounds.maxX, shape.x + shape.w),
      maxY: Math.max(bounds.maxY, shape.y + shape.h),
    }),
    {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity},
  );

  const externalCenterX = clusterCenterX;
  const externalCenterY = clusterCenterY;
  const outerRadiusX = Math.max(430, (currentBounds.maxX - currentBounds.minX) / 2 + 300);
  const outerRadiusY = Math.max(320, (currentBounds.maxY - currentBounds.minY) / 2 + 240);
  const placedExternalRects = [];
  const externalAngleCounts = new Map();

  function shapeCenterPoint(shape) {
    return {
      x: shape.x + shape.w / 2,
      y: shape.y + shape.h / 2,
    };
  }

  function externalGroupChildNodeIds(groupNodeId) {
    const layout = externalGroupLayouts.get(groupNodeId);
    if (!layout) return [];
    const groupNode = nodesById.get(groupNodeId);
    return (layout.children || []).map((child) => `external:${groupNode.universeId}:${child.id}`);
  }

  function anchorPointForExternalNode(nodeId, fallbackIndex) {
    const anchors = [];
    const relatedNodeIds = new Set([nodeId, ...externalGroupChildNodeIds(nodeId)]);

    bridgeEdges.forEach((edge) => {
      if (relatedNodeIds.has(edge.sourceNodeId) && nodeShapes.has(edge.targetNodeId)) {
        anchors.push(shapeCenterPoint(nodeShapes.get(edge.targetNodeId)));
      }
      if (relatedNodeIds.has(edge.targetNodeId) && nodeShapes.has(edge.sourceNodeId)) {
        anchors.push(shapeCenterPoint(nodeShapes.get(edge.sourceNodeId)));
      }
    });

    if (anchors.length) {
      return anchors.reduce(
        (point, anchor) => ({
          x: point.x + anchor.x / anchors.length,
          y: point.y + anchor.y / anchors.length,
        }),
        {x: 0, y: 0},
      );
    }

    const angle =
      -Math.PI / 2 + fallbackIndex * ((Math.PI * 2) / Math.max(1, externalPlaceNodes.length));
    return {
      x: externalCenterX + Math.cos(angle) * 100,
      y: externalCenterY + Math.sin(angle) * 100,
    };
  }

  externalPlaceNodes.forEach((node) => {
    if (node.type === "external-group") {
      const layout = externalGroupLayout(node);
      externalGroupLayouts.set(node.id, layout);
      connectionNodeFits.set(node.id, {...layout.groupFit, w: layout.width, h: layout.headerH});
      return;
    }

    const fit = fitConnectionHeaderBox(node.title || "Universe", node.subtitle || "Linked", {
      minWidth: 176,
      maxWidth: 310,
      minHeight: 56,
      titleFontSize: 13,
      subtitleFontSize: 10,
      titleMaxLines: 4,
      subtitleMaxLines: 2,
    });
    connectionNodeFits.set(node.id, fit);
  });

  externalPlaceNodes.forEach((node, index) => {
    const groupLayout = externalGroupLayouts.get(node.id);
    const nodeFit = groupLayout
      ? {w: groupLayout.width, h: groupLayout.height}
      : connectionNodeFits.get(node.id) || {w: 176, h: 56};
    const anchor = anchorPointForExternalNode(node.id, index);
    let angle = Math.atan2(anchor.y - externalCenterY, anchor.x - externalCenterX);

    if (!Number.isFinite(angle)) {
      angle = -Math.PI / 2 + index * ((Math.PI * 2) / Math.max(1, externalPlaceNodes.length));
    }

    const bucket = Math.round((angle * 8) / Math.PI);
    const bucketCount = externalAngleCounts.get(bucket) || 0;
    externalAngleCounts.set(bucket, bucketCount + 1);

    const fanOffset = (bucketCount - 1.5) * 0.18;
    const orbitAngle = angle + fanOffset;
    const ringOffset = Math.floor(bucketCount / 4);
    const radiusX = outerRadiusX + ringOffset * 90;
    const radiusY = outerRadiusY + ringOffset * 66;

    let candidate = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const push = attempt * 28;
      const tangent = attempt % 2 === 0 ? attempt * 10 : -attempt * 10;
      const tx = Math.cos(orbitAngle + Math.PI / 2);
      const ty = Math.sin(orbitAngle + Math.PI / 2);
      const cx = externalCenterX + Math.cos(orbitAngle) * (radiusX + push) + tx * tangent;
      const cy = externalCenterY + Math.sin(orbitAngle) * (radiusY + push * 0.72) + ty * tangent;

      candidate = {
        type: "rect",
        x: cx - nodeFit.w / 2,
        y: cy - nodeFit.h / 2,
        w: nodeFit.w,
        h: nodeFit.h,
      };

      if (!placedExternalRects.some((rect) => rectsOverlap(candidate, rect, 18))) {
        break;
      }
    }

    placedExternalRects.push(candidate);
    nodeShapes.set(node.id, candidate);

    if (groupLayout) {
      groupLayout.children.forEach((child, childIndex) => {
        const childRow = Math.floor(childIndex / groupLayout.cols);
        const childCol = childIndex % groupLayout.cols;
        const childCountInRow =
          groupLayout.children.slice(
            childRow * groupLayout.cols,
            childRow * groupLayout.cols + groupLayout.cols,
          ).length || 1;
        const rowWidth =
          childCountInRow * groupLayout.childW + Math.max(0, childCountInRow - 1) * groupLayout.gap;
        const childStartX = candidate.x + (groupLayout.width - rowWidth) / 2;
        const childX = childStartX + childCol * (groupLayout.childW + groupLayout.gap);
        const childY =
          candidate.y + groupLayout.headerH + childRow * (groupLayout.childH + groupLayout.gap);
        const childNodeId = `external:${node.universeId}:${child.id}`;
        nodeShapes.set(childNodeId, {
          type: "rect",
          x: childX,
          y: childY,
          w: groupLayout.childW,
          h: groupLayout.childH,
          parentGroupId: node.creationId,
          parentGroupNodeId: node.id,
        });
      });
    }
  });

  if (selectedMapNodeId && !nodeShapes.has(selectedMapNodeId)) {
    selectedMapNodeId = null;
    connectionsMapIsolatedSubgraph = false;
    renderConnectionsMapStatus();
  }

  const allNodes = Array.from(nodesById.values());
  const selectedEntry = selectedMapNodeId ? (globalThis.controllerServices || globalThis).getEntry(selectedMapNodeId) : null;
  const selectedConnections = new Set(
    connectionsMapFilters.connections !== false && selectedEntry
      ? (selectedEntry.connections || []).filter((id) => nodeShapes.has(id))
      : [],
  );
  const selectedLinkedNodeIds = new Set(selectedConnections);

  if (connectionsMapFilters.bridges !== false)
    bridgeEdges.forEach((edge) => {
      if (edge.sourceNodeId === selectedMapNodeId) {
        selectedLinkedNodeIds.add(edge.targetNodeId);
      }
      if (edge.targetNodeId === selectedMapNodeId) {
        selectedLinkedNodeIds.add(edge.sourceNodeId);
      }
    });

  function connectionsMapNodeIdsForTargets(targets) {
    const ids = new Set();
    const safeTargets = targets || {universes: [], entries: []};

    (safeTargets.entries || []).forEach((target) => {
      nodesById.forEach((node) => {
        if (node?.universeId !== target.universeId) return;
        if (node?.creationId === target.entryId || node?.entry?.id === target.entryId) {
          if (nodeShapes.has(node.id)) ids.add(node.id);
          return;
        }
        if (
          Array.isArray(node?.children) &&
          node.children.some((child) => child?.id === target.entryId)
        ) {
          const childId = `external:${target.universeId}:${target.entryId}`;
          if (nodeShapes.has(childId)) ids.add(childId);
        }
      });

      if (target.universeId === currentUniverseId) {
        if (nodeShapes.has(target.entryId)) ids.add(target.entryId);
        const group =
          typeof (globalThis.controllerServices || globalThis).getGroupForEntryId === "function"
            ? (globalThis.controllerServices || globalThis).getGroupForEntryId(target.entryId, archiveEntries)
            : null;
        if (group && nodeShapes.has(group.id)) ids.add(group.id);
      }
    });

    (safeTargets.universes || []).forEach((universeId) => {
      const universeNodeId = `universe:${universeId}`;
      if (nodeShapes.has(universeNodeId)) ids.add(universeNodeId);

      nodesById.forEach((node) => {
        if (!nodeShapes.has(node.id)) return;
        if (universeId === currentUniverseId && node.current) {
          ids.add(node.id);
          return;
        }
        if (node?.universeId === universeId && node.external) ids.add(node.id);
      });
    });

    return ids;
  }

  function resolveConnectionsMapSearchRecord(record) {
    if (!mapSearchApi || !record) return null;
    const targets = mapSearchApi.targetsForRecord(record);
    const nodeIds = Array.from(connectionsMapNodeIdsForTargets(targets));
    if (!nodeIds.length) return null;
    let nativeNodeId = "";
    if (record.type === "archive" || record.type === "archive-group") {
      const exactId =
        record.universeId === currentUniverseId
          ? record.id
          : `external:${record.universeId}:${record.id}`;
      if (nodeShapes.has(exactId)) nativeNodeId = exactId;
    } else if (record.type === "universe") {
      const exactId = `universe:${record.universeId}`;
      if (nodeShapes.has(exactId)) nativeNodeId = exactId;
    }

    return {
      nodeIds,
      targets,
      contextLabel: record.universeTitle || (globalThis.controllerServices || globalThis).getUniverseTitle(record.universeId),
      nativeNodeId,
    };
  }

  let activeConnectionsMapSearch = mapSearchApi?.getActive("connections") || null;
  let connectionsSearchNodeIds = activeConnectionsMapSearch
    ? connectionsMapNodeIdsForTargets(mapSearchApi.targetsForRecord(activeConnectionsMapSearch))
    : new Set();
  if (activeConnectionsMapSearch && !connectionsSearchNodeIds.size) {
    mapSearchApi.clearActive("connections");
    activeConnectionsMapSearch = null;
    connectionsSearchNodeIds = new Set();
  }

  const connectionsSearchIsolationActive = !!(
    activeConnectionsMapSearch && connectionsSearchNodeIds.size
  );
  const connectionsIsolationActive =
    !!(connectionsMapIsolatedSubgraph && selectedMapNodeId) || connectionsSearchIsolationActive;
  const isolatedConnectionNodeIds = new Set();

  function addConnectionNodeWithGroupContext(nodeId) {
    if (!nodeId || !nodeShapes.has(nodeId)) return;
    isolatedConnectionNodeIds.add(nodeId);

    const node = nodesById.get(nodeId);
    const shape = nodeShapes.get(nodeId);
    const localParentId = shape?.parentGroupId;
    const externalParentId = shape?.parentGroupNodeId;
    const parentId = externalParentId || localParentId;

    // Keep only the group shell needed to identify a selected or linked child.
    // Unrelated siblings are intentionally omitted from the isolated subgraph.
    if (parentId && nodeShapes.has(parentId)) {
      isolatedConnectionNodeIds.add(parentId);
    }

    // Preserve the universe context for visible creations without restoring
    // unrelated creations from the same universe.
    if (node?.current && nodeShapes.has(currentUniverseNodeId)) {
      isolatedConnectionNodeIds.add(currentUniverseNodeId);
    }
    if (node?.external && node.universeId) {
      const externalUniverseNodeId = `universe:${node.universeId}`;
      if (nodeShapes.has(externalUniverseNodeId))
        isolatedConnectionNodeIds.add(externalUniverseNodeId);
    }

    // When the group itself is the selected item, its membership is the
    // selected relationship context. Linked groups otherwise remain collapsed
    // to their shell so unlinked members still disappear.
    if (nodeId === selectedMapNodeId && node?.type === "group") {
      (globalThis.controllerServices || globalThis).groupChildIds(node.entry).forEach((childId) => {
        if (nodeShapes.has(childId)) isolatedConnectionNodeIds.add(childId);
      });
    }
    if (nodeId === selectedMapNodeId && node?.type === "external-group") {
      (node.children || []).forEach((child) => {
        const childId = `external:${node.universeId}:${child.id}`;
        if (nodeShapes.has(childId)) isolatedConnectionNodeIds.add(childId);
      });
    }
  }

  if (connectionsMapIsolatedSubgraph && selectedMapNodeId) {
    addConnectionNodeWithGroupContext(selectedMapNodeId);
    selectedLinkedNodeIds.forEach(addConnectionNodeWithGroupContext);
  }
  if (connectionsSearchIsolationActive) {
    connectionsSearchNodeIds.forEach(addConnectionNodeWithGroupContext);
  }

  function connectionNodeVisibleInCurrentView(nodeId) {
    return !connectionsIsolationActive || isolatedConnectionNodeIds.has(nodeId);
  }

  const connectionClusterCandidates = [
    ...currentItems.map((item) => {
      const shape = nodeShapes.get(item.entry.id);
      if (!shape || !connectionNodeVisibleInCurrentView(item.entry.id)) return null;
      return {
        id: item.entry.id,
        x: shape.x + shape.w / 2,
        y: shape.y + shape.h / 2,
        weight: item.kind === "group" ? Math.max(1, 1 + item.children.length) : 1,
        groupKey: "current",
        groupLabel: "Current universe",
      };
    }),
    ...externalPlaceNodes.map((node) => {
      const shape = nodeShapes.get(node.id);
      if (!shape || !connectionNodeVisibleInCurrentView(node.id)) return null;
      const layout = externalGroupLayouts.get(node.id);
      return {
        id: node.id,
        x: shape.x + shape.w / 2,
        y: shape.y + shape.h / 2,
        weight: layout ? Math.max(1, 1 + layout.children.length) : 1,
        groupKey: `external:${node.universeId || "linked"}`,
        groupLabel: (globalThis.controllerServices || globalThis).getUniverseTitle(node.universeId),
      };
    }),
  ].filter(Boolean);

  const connectionMapClusters =
    typeof buildMapClusters === "function"
      ? buildMapClusters(connectionClusterCandidates, {
          minimumItems: 8,
          minimumWeight: 20,
          targetSize: 4,
          minimumClusterSize: 3,
          defaultLabel: "Map items",
        })
      : [];
  const connectionClusterIdByMember = new Map();
  connectionMapClusters.forEach((cluster) => {
    cluster.memberIds.forEach((memberId) => connectionClusterIdByMember.set(memberId, cluster.id));
  });

  function wrapConnectionClusterMember(memberId, html) {
    const clusterId = connectionClusterIdByMember.get(memberId);
    if (!clusterId) return html;
    return `<g class="map-cluster-member" data-map-cluster-id="${escapeHtml(clusterId)}">${html}</g>`;
  }

  const connectedIds = new Set();
  normalEdges.forEach(([a, b]) => {
    connectedIds.add(a);
    connectedIds.add(b);
  });
  bridgeEdges.forEach((edge) => {
    connectedIds.add(edge.sourceNodeId);
    connectedIds.add(edge.targetNodeId);
  });

  function shapeForNode(nodeId) {
    return nodeShapes.get(nodeId);
  }

  const occupiedConnectionRects = Array.from(nodeShapes.entries())
    .filter(([nodeId]) => connectionNodeVisibleInCurrentView(nodeId))
    .map(([, shape]) => ({
      x: shape.x - 4,
      y: shape.y - 4,
      w: shape.w + 8,
      h: shape.h + 8,
    }));

  const placedConnectionNotePoints = [];
  const connectionSegments = [];

  const normalEdgeData = normalEdges
    .map(([sourceId, targetId]) => {
      if (
        !connectionNodeVisibleInCurrentView(sourceId) ||
        !connectionNodeVisibleInCurrentView(targetId)
      )
        return null;
      const a = shapeForNode(sourceId);
      const b = shapeForNode(targetId);
      if (!a || !b) return null;

      const clipped = clippedLineBetweenShapes(a, b);

      return {
        sourceId,
        targetId,
        ax: clipped.ax,
        ay: clipped.ay,
        bx: clipped.bx,
        by: clipped.by,
        segmentId: `normal:${[sourceId, targetId].sort().join("::")}`,
      };
    })
    .filter(Boolean);

  const bridgeEdgeData = bridgeEdges
    .map((edge) => {
      if (
        !connectionNodeVisibleInCurrentView(edge.sourceNodeId) ||
        !connectionNodeVisibleInCurrentView(edge.targetNodeId)
      )
        return null;
      const a = shapeForNode(edge.sourceNodeId);
      const b = shapeForNode(edge.targetNodeId);
      if (!a || !b) return null;

      const clipped = clippedLineBetweenShapes(a, b);

      return {
        ...edge,
        ax: clipped.ax,
        ay: clipped.ay,
        bx: clipped.bx,
        by: clipped.by,
        segmentId: `bridge:${(globalThis.controllerServices || globalThis).bridgeNoteKeyForNodes(edge.sourceNode, edge.targetNode)}`,
      };
    })
    .filter(Boolean);

  const visibleConnectionNodeCount = Array.from(nodeShapes.keys()).filter(
    connectionNodeVisibleInCurrentView,
  ).length;
  const connectionMapDomProfile =
    typeof createMapDomProfile === "function"
      ? createMapDomProfile({
          nodes: visibleConnectionNodeCount,
          edges: normalEdgeData.length + bridgeEdgeData.length,
          details: connectionClusterCandidates.length,
        })
      : {
          nodes: visibleConnectionNodeCount,
          edges: normalEdgeData.length + bridgeEdgeData.length,
          details: 0,
          estimatedElements: 0,
          compact: false,
          aggressive: false,
        };
  const connectionMapDomAttributes =
    typeof mapDomProfileAttributes === "function"
      ? mapDomProfileAttributes(connectionMapDomProfile)
      : `data-map-dom-compact="${connectionMapDomProfile.compact ? "true" : "false"}"`;

  normalEdgeData.forEach((edge) => {
    connectionSegments.push({
      id: edge.segmentId,
      ax: edge.ax,
      ay: edge.ay,
      bx: edge.bx,
      by: edge.by,
    });
  });

  bridgeEdgeData.forEach((edge) => {
    connectionSegments.push({
      id: edge.segmentId,
      ax: edge.ax,
      ay: edge.ay,
      bx: edge.bx,
      by: edge.by,
    });
  });

  const normalEdgeSvg = normalEdgeData
    .map((edge) => {
      const {sourceId, targetId, ax, ay, bx, by, segmentId} = edge;
      const otherSegments = connectionSegments.filter((segment) => segment.id !== segmentId);
      const {mx, my} = notePointAvoidingRects(
        ax,
        ay,
        bx,
        by,
        occupiedConnectionRects,
        placedConnectionNotePoints,
        otherSegments,
      );
      placedConnectionNotePoints.push({x: mx, y: my});
      const note = (globalThis.controllerServices || globalThis).getConnectionNote(sourceId, targetId);
      const safeNote = escapeHtml(truncatePreview(note, 34));
      const touchesSelected =
        selectedMapNodeId && (sourceId === selectedMapNodeId || targetId === selectedMapNodeId);
      const edgeClass = selectedMapNodeId ? (touchesSelected ? "highlighted" : "dimmed") : "";
      const showDecorations = !connectionMapDomProfile.compact || touchesSelected;

      return `
      <g class="connection-edge-group ${edgeClass}" data-source="${escapeHtml(sourceId)}" data-target="${escapeHtml(targetId)}">
        ${showDecorations ? `<line class="connection-edge-glow" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"></line>` : ""}
        <line class="connection-edge" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"></line>
        <line class="connection-edge-click" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"></line>
        ${showDecorations ? edgeEndpointDots(edge, "connection-endpoint") : ""}
        <circle class="connection-note-dot ${note ? "" : "empty"}" cx="${mx}" cy="${my}" r="${note ? 9 : 6}"></circle>
        ${note ? `<text class="connection-note-hint" x="${mx}" y="${my + 4}" text-anchor="middle">•</text>` : ""}
        ${note ? `<text class="connection-note-preview" x="${mx}" y="${my - 14}" text-anchor="middle">${safeNote}</text>` : ""}
      </g>
    `;
    })
    .join("");

  const bridgeEdgeSvg = bridgeEdgeData
    .map((edge) => {
      const {
        sourceNodeId,
        targetNodeId,
        sourceNode,
        targetNode,
        sourceLabel,
        targetLabel,
        ax,
        ay,
        bx,
        by,
        segmentId,
      } = edge;
      const otherSegments = connectionSegments.filter((segment) => segment.id !== segmentId);
      const {mx, my} = notePointAvoidingRects(
        ax,
        ay,
        bx,
        by,
        occupiedConnectionRects,
        placedConnectionNotePoints,
        otherSegments,
      );
      placedConnectionNotePoints.push({x: mx, y: my});
      const touchesSelected =
        selectedMapNodeId &&
        (sourceNodeId === selectedMapNodeId || targetNodeId === selectedMapNodeId);
      const edgeClass = selectedMapNodeId ? (touchesSelected ? "highlighted" : "dimmed") : "";
      const bridgeNoteKey = (globalThis.controllerServices || globalThis).bridgeNoteKeyForNodes(sourceNode, targetNode);
      const note = (globalThis.controllerServices || globalThis).getBridgeNote(bridgeNoteKey);
      const safeNote = escapeHtml(truncatePreview(note, 34));
      const noteLabel = `${sourceLabel || "Universe"} ↔ ${targetLabel || "Bridge Target"}`;
      const label =
        targetNode.type === "creation" ? truncateSvgText(targetLabel || "Creation", 22) : "";
      const showDecorations = !connectionMapDomProfile.compact || touchesSelected;

      return `
      <g class="connection-edge-group ${edgeClass} bridge-note-edge" data-bridge-key="${escapeHtml(bridgeNoteKey)}" data-label="${escapeHtml(noteLabel)}">
        ${showDecorations ? `<line class="bridge-edge-glow" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"></line>` : ""}
        <line class="bridge-edge" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"></line>
        <line class="connection-edge-click" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"></line>
        ${showDecorations ? edgeEndpointDots(edge, "bridge-endpoint") : ""}
        <circle class="connection-note-dot ${note ? "" : "empty"}" cx="${mx}" cy="${my}" r="${note ? 8 : 6}"></circle>
        ${note ? `<text class="connection-note-hint" x="${mx}" y="${my + 4}" text-anchor="middle">•</text>` : ""}
        ${note ? `<text class="connection-note-preview" x="${mx}" y="${my - 13}" text-anchor="middle">${safeNote}</text>` : label ? `<text class="connection-note-preview" x="${mx}" y="${my - 8}" text-anchor="middle">${escapeHtml(label)}</text>` : ""}
      </g>
    `;
    })
    .join("");

  const currentOrbitGuideSvg = Array.from({length: maxCurrentOrbitRing + 1}, (_, ring) => {
    if (currentItems.length === 1 && ring === 0) return "";
    const ringCount = currentOrbitAssignments.filter((item) => item.ring === ring).length;
    const rx = 184 + ring * 158 + Math.max(0, ringCount - 6) * 7;
    const ry = 124 + ring * 112 + Math.max(0, ringCount - 6) * 4;
    return `<ellipse cx="${clusterCenterX}" cy="${clusterCenterY}" rx="${rx}" ry="${ry}"></ellipse>`;
  }).join("");

  const orbitGuideSvg = `
    <g class="connections-orbit-guides">
      ${currentOrbitGuideSvg}
      ${externalNodes.length ? `<ellipse class="outer-orbit" cx="${externalCenterX}" cy="${externalCenterY}" rx="${outerRadiusX}" ry="${outerRadiusY}"></ellipse>` : ""}
    </g>
  `;

  function nodeStateClasses(node) {
    const isExternalNode = node.type === "external-universe" || node.type === "external-creation";
    const isCurrentUniverseNode = node.type === "current-universe";
    const isSelectableCreation = !!node.selectable;
    const isSelectableMapNode = isSelectableCreation || isExternalNode || isCurrentUniverseNode;
    const isIsolated = !connectedIds.has(node.id);
    const isSelected = isSelectableMapNode && selectedMapNodeId === node.id;
    const isConnectedToSelected = selectedLinkedNodeIds.has(node.id);
    const isDimmed = selectedMapNodeId && !isSelected && !isConnectedToSelected;
    const isConnectable =
      selectedMapNodeId &&
      isSelectableCreation &&
      !(globalThis.controllerServices || globalThis).isExternalConnectionsMapNodeId(selectedMapNodeId) &&
      !(globalThis.controllerServices || globalThis).isCurrentUniverseConnectionsMapNodeId(selectedMapNodeId) &&
      !isSelected &&
      !isConnectedToSelected;

    return {
      isSelectableCreation,
      className: [
        isExternalNode ? "external-node selectable-external-node" : "",
        node.type === "external-universe" ? "external-universe-node" : "",
        node.type === "external-creation" ? "external-creation-node" : "",
        node.type === "external-group"
          ? "external-creation-node external-group-node connection-group-node"
          : "",
        node.type === "external-group-child"
          ? "external-creation-node external-group-child-node connection-group-child-node"
          : "",
        node.type === "current-universe" ? "current-universe-node" : "",
        node.type === "group" ? "connection-group-node" : "",
        node.type === "group-child" ? "connection-group-child-node" : "",
        isIsolated ? "isolated" : "",
        isSelected ? "selected" : "",
        isConnectedToSelected ? "connected" : "",
        isDimmed ? "dimmed" : "",
        isConnectable ? "connectable" : "",
        connectionNodeVisibleInCurrentView(node.id) ? "" : "isolated-subgraph-hidden",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  function renderNodeBadge(node, shape) {
    if (!connectionNodeVisibleInCurrentView(node.id)) return "";
    const badgeType =
      node.type === "current-universe" || node.type === "external-universe" ? "universe" : "entry";
    const badgeUniverseId =
      node.type === "current-universe" ? currentUniverseId : node.universeId || currentUniverseId;
    const badgeEntryId = badgeType === "entry" ? node.creationId || node.id : "";
    const badgeCount =
      badgeType === "universe"
        ? (globalThis.controllerServices || globalThis).literatureCountForUniverseTag(badgeUniverseId)
        : (globalThis.controllerServices || globalThis).literatureCountForEntryTag(badgeUniverseId, badgeEntryId);

    const visionBadgeCount =
      badgeType === "universe"
        ? (globalThis.controllerServices || globalThis).visionCountForUniverseTag(badgeUniverseId)
        : (globalThis.controllerServices || globalThis).visionCountForEntryTag(badgeUniverseId, badgeEntryId);

    return rectangleBadgeStackSvg(badgeType, badgeUniverseId, badgeEntryId, shape, {
      count: badgeCount,
      visionCount: visionBadgeCount,
    });
  }

  const currentUniverseNode = nodesById.get(currentUniverseNodeId);
  const currentUniverseShapeForRender = nodeShapes.get(currentUniverseNodeId);
  const currentUniverseNodeSvg =
    currentUniverseNode &&
    currentUniverseShapeForRender &&
    connectionNodeVisibleInCurrentView(currentUniverseNodeId)
      ? (() => {
          const state = nodeStateClasses(currentUniverseNode);
          return `
        <g class="connection-node ${state.className} current-universe-center-node" data-id="${escapeHtml(currentUniverseNodeId)}" data-type="current-universe" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(currentUniverseId)}">
          <rect x="${currentUniverseShapeForRender.x}" y="${currentUniverseShapeForRender.y}" width="${currentUniverseShapeForRender.w}" height="${currentUniverseShapeForRender.h}" rx="18" ry="18"></rect>
          ${connectionWrappedTextSvg(connectionNodeFits.get(currentUniverseNodeId) || {titleLines: [(globalThis.controllerServices || globalThis).getUniverseTitle(currentUniverseId)], subtitleLines: ["Working Universe"], titleFontSize: 15, subtitleFontSize: 10.5, titleLineHeight: 16, subtitleLineHeight: 12}, currentUniverseShapeForRender.x, currentUniverseShapeForRender.y, {paddingX: 14, titleStartY: 24, titleWeight: "bold"})}
        </g>
        ${renderNodeBadge(currentUniverseNode, currentUniverseShapeForRender)}
      `;
        })()
      : "";

  const topNodeSvg = currentItems
    .map((item) => {
      const node = nodesById.get(item.entry.id);
      const shape = nodeShapes.get(item.entry.id);
      const groupVisible = connectionNodeVisibleInCurrentView(item.entry.id);

      if (item.kind === "group") {
        const visibleChildren = item.children.filter((child) =>
          connectionNodeVisibleInCurrentView(child.id),
        );
        if (!groupVisible && !visibleChildren.length) return "";
        const state = nodeStateClasses(node);
        const childrenSvg = visibleChildren
          .map((child) => {
            const childNode = nodesById.get(child.id);
            const childShape = nodeShapes.get(child.id);
            const childState = nodeStateClasses(childNode);
            return `
          <g class="connection-node ${childState.className}" data-id="${escapeHtml(child.id)}" data-type="creation" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(currentUniverseId)}">
            <rect x="${childShape.x}" y="${childShape.y}" width="${childShape.w}" height="${childShape.h}" rx="12" ry="12"></rect>
            ${connectionWrappedTextSvg(connectionNodeFits.get(child.id) || {titleLines: [child.title], subtitleLines: [], titleFontSize: 10.5, subtitleFontSize: 8.5, titleLineHeight: 12, subtitleLineHeight: 10}, childShape.x, childShape.y, {paddingX: 9, titleStartY: 18, subtitleGap: 4})}
          </g>
          ${renderNodeBadge(childNode, childShape)}
        `;
          })
          .join("");

        return wrapConnectionClusterMember(
          item.entry.id,
          `
        <g class="connection-node ${state.className}" data-id="${escapeHtml(item.entry.id)}" data-type="creation" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(currentUniverseId)}">
          <rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="18" ry="18"></rect>
          ${connectionWrappedTextSvg(connectionNodeFits.get(item.entry.id) || {titleLines: [item.entry.title], subtitleLines: [], titleFontSize: 14, subtitleFontSize: 10, titleLineHeight: 15, subtitleLineHeight: 11}, shape.x, shape.y, {paddingX: 14, titleStartY: 24, titleWeight: "bold"})}
        </g>
        ${renderNodeBadge(node, shape)}
        ${childrenSvg}
      `,
        );
      }

      if (!groupVisible) return "";
      const state = nodeStateClasses(node);
      return wrapConnectionClusterMember(
        item.entry.id,
        `
      <g class="connection-node ${state.className}" data-id="${escapeHtml(item.entry.id)}" data-type="creation" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(currentUniverseId)}">
        <rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="14" ry="14"></rect>
        ${connectionWrappedTextSvg(connectionNodeFits.get(item.entry.id) || {titleLines: [item.entry.title], subtitleLines: [], titleFontSize: 13, subtitleFontSize: 10, titleLineHeight: 14, subtitleLineHeight: 11}, shape.x, shape.y, {paddingX: 14, titleStartY: 22})}
      </g>
      ${renderNodeBadge(node, shape)}
    `,
      );
    })
    .join("");

  const externalNodeSvg = externalPlaceNodes
    .map((node) => {
      const shape = nodeShapes.get(node.id);
      const nodeVisible = connectionNodeVisibleInCurrentView(node.id);

      if (node.type === "external-group") {
        const layout = externalGroupLayouts.get(node.id);
        const visibleChildren = (layout?.children || []).filter((child) =>
          connectionNodeVisibleInCurrentView(`external:${node.universeId}:${child.id}`),
        );
        if (!nodeVisible && !visibleChildren.length) return "";
        const state = nodeStateClasses(node);
        const childrenSvg = visibleChildren
          .map((child) => {
            const childNodeId = `external:${node.universeId}:${child.id}`;
            const childNode = nodesById.get(childNodeId);
            const childShape = nodeShapes.get(childNodeId);
            if (!childNode || !childShape) return "";

            const childState = nodeStateClasses(childNode);
            return `
          <g class="connection-node ${childState.className}" data-id="${escapeHtml(childNodeId)}" data-type="external" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(node.universeId || currentUniverseId)}">
            <rect x="${childShape.x}" y="${childShape.y}" width="${childShape.w}" height="${childShape.h}" rx="12" ry="12"></rect>
            ${connectionWrappedTextSvg(connectionNodeFits.get(childNodeId) || {titleLines: [child.title], subtitleLines: [], titleFontSize: 10.5, subtitleFontSize: 8.5, titleLineHeight: 12, subtitleLineHeight: 10}, childShape.x, childShape.y, {paddingX: 9, titleStartY: 18, subtitleGap: 4})}
          </g>
          ${renderNodeBadge(childNode, childShape)}
        `;
          })
          .join("");

        return wrapConnectionClusterMember(
          node.id,
          `
        <g class="connection-node ${state.className}" data-id="${escapeHtml(node.id)}" data-type="external" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(node.universeId || currentUniverseId)}">
          <rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="18" ry="18"></rect>
          ${connectionWrappedTextSvg(connectionNodeFits.get(node.id) || {titleLines: [node.title || "Group"], subtitleLines: [node.subtitle || (globalThis.controllerServices || globalThis).getUniverseTitle(node.universeId)], titleFontSize: 13.5, subtitleFontSize: 9.6, titleLineHeight: 15, subtitleLineHeight: 11}, shape.x, shape.y, {paddingX: 14, titleStartY: 24, titleWeight: "bold"})}
        </g>
        ${renderNodeBadge(node, shape)}
        ${childrenSvg}
      `,
        );
      }

      if (!nodeVisible) return "";
      const state = nodeStateClasses(node);
      return wrapConnectionClusterMember(
        node.id,
        `
      <g class="connection-node ${state.className}" data-id="${escapeHtml(node.id)}" data-type="external" style="${(globalThis.controllerServices || globalThis).mapUniversePaletteStyle(node.universeId || currentUniverseId)}">
        <rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="14" ry="14"></rect>
        ${connectionWrappedTextSvg(connectionNodeFits.get(node.id) || {titleLines: [node.title || "Universe"], subtitleLines: [], titleFontSize: 13, subtitleFontSize: 10, titleLineHeight: 14, subtitleLineHeight: 11}, shape.x, shape.y, {paddingX: 14, titleStartY: 22})}
      </g>
      ${renderNodeBadge(node, shape)}
    `,
      );
    })
    .join("");

  const connectionClusterSvg = connectionMapClusters
    .map((cluster) => {
      const countLabel = `${cluster.weight} ${cluster.weight === 1 ? "entity" : "entities"}`;
      const ariaLabel = `${cluster.label}: ${countLabel}. Zoom in to view individual items.`;
      return `
      <g class="map-aggregate-cluster connections-aggregate-cluster" data-cluster-id="${escapeHtml(cluster.id)}" data-cluster-x="${cluster.x}" data-cluster-y="${cluster.y}" role="button" aria-label="${escapeHtml(ariaLabel)}" aria-hidden="true" tabindex="-1">
        <circle class="map-aggregate-cluster-halo" cx="${cluster.x}" cy="${cluster.y}" r="58"></circle>
        <circle class="map-aggregate-cluster-shape" cx="${cluster.x}" cy="${cluster.y}" r="47"></circle>
        <text class="map-aggregate-cluster-count" x="${cluster.x}" y="${cluster.y - 3}" text-anchor="middle">${cluster.weight}</text>
        <text class="map-aggregate-cluster-label" x="${cluster.x}" y="${cluster.y + 18}" text-anchor="middle">entities</text>
      </g>
    `;
    })
    .join("");

  const bounds = Array.from(nodeShapes.entries())
    .filter(([nodeId]) => connectionsIsolationActive || connectionNodeVisibleInCurrentView(nodeId))
    .reduce(
      (box, [, shape]) => ({
        minX: Math.min(box.minX, shape.x),
        minY: Math.min(box.minY, shape.y),
        maxX: Math.max(box.maxX, shape.x + shape.w),
        maxY: Math.max(box.maxY, shape.y + shape.h),
      }),
      {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity},
    );
  const pad = 132;
  const viewBox = Number.isFinite(bounds.minX)
    ? {
        x: bounds.minX - pad,
        y: bounds.minY - pad,
        width: bounds.maxX - bounds.minX + pad * 2,
        height: bounds.maxY - bounds.minY + pad * 2,
      }
    : {x: -132, y: -132, width: 1204, height: 824};

  const summary =
    noCurrentItemsMessage ||
    (normalEdges.length + bridgeEdges.length === 0
      ? `<div class="map-viewport-message connection-empty">No connections yet. Use the ⋮ menu on archived creations and choose Connect or Bridge, or use Manage Bridges from Home.</div>`
      : "");

  const selectedLocalMapEntry = selectedMapNodeId
    ? (globalThis.controllerServices || globalThis).getEntry(selectedMapNodeId)
    : null;
  const selectedExternalMapNode = selectedMapNodeId
    ? (globalThis.controllerServices || globalThis).isExternalConnectionsMapNodeId(selectedMapNodeId)
    : false;
  const selectedCurrentUniverseMapNode = selectedMapNodeId
    ? (globalThis.controllerServices || globalThis).isCurrentUniverseConnectionsMapNodeId(selectedMapNodeId)
    : false;
  const hasConnectionsSelection =
    selectedMapNodeId &&
    (selectedLocalMapEntry || selectedExternalMapNode || selectedCurrentUniverseMapNode);
  const connectionsSelectionTitle = selectedLocalMapEntry
    ? selectedLocalMapEntry.title || "Selected item"
    : selectedCurrentUniverseMapNode
      ? (globalThis.controllerServices || globalThis).getUniverseTitle(currentUniverseId)
      : selectedExternalMapNode
        ? nodesById.get(selectedMapNodeId)?.title || "Selected item"
        : "";
  const connectionsSelectionHelpDisabled = connectionsAutomaticTipsDisabled();
  const connectionsSelectionHelpOpen =
    hasConnectionsSelection && !connectionsSelectionHelpWasSeen();
  const connectionsSelectionInstruction = selectedCurrentUniverseMapNode
    ? "Select an item in another universe to add or remove a Bridge."
    : selectedExternalMapNode
      ? "Select an item in this universe to add or remove a Bridge."
      : "Select another item in this universe for a Connection, or an item in another universe for a Bridge.";
  const connectionsSelectionGuide = hasConnectionsSelection
    ? `
      <div class="map-selection-guide connections-selection-guide" aria-live="polite">
        <div class="map-selection-guide-summary">
          <p><strong>Selected:</strong> ${escapeHtml(connectionsSelectionTitle)}</p>
          <button id="connectionsSelectionHelpBtn" type="button" data-app-button="true" class="app-button map-selection-help-toggle" aria-controls="connectionsSelectionHelpPanel" aria-expanded="${connectionsSelectionHelpOpen ? "true" : "false"}">${connectionsSelectionHelpOpen ? "Hide help" : "What’s this?"}</button>
        </div>
        <div id="connectionsSelectionHelpPanel" class="map-selection-help-panel" ${connectionsSelectionHelpOpen ? "" : "hidden"}>
          <p>${connectionsSelectionInstruction}</p>
          <p>Selecting an existing link will ask before removing it. Clear selection leaves every link unchanged.</p>
          <div class="map-selection-help-actions">
            <label class="map-selection-help-disable"><input id="connectionsSelectionHelpDisableTips" type="checkbox" ${connectionsSelectionHelpDisabled ? "checked" : ""}> <span>Don’t show any more tips</span></label>
            <button id="hideConnectionsSelectionHelpBtn" type="button" data-app-button="true" class="app-button map-selection-help-hide">Hide help</button>
          </div>
        </div>
      </div>
    `
    : "";
  const connectionsFloatingActions = hasConnectionsSelection
    ? `
      <div class="map-floating-actions connections-floating-actions ${connectionsIsolationActive ? "isolated-subgraph-actions" : ""}">
        ${
          connectionsIsolationActive
            ? `<button id="backToFocusedMapItemBtn" type="button" data-app-button="true" class="app-button map-floating-button">Back to item</button>`
            : `${selectedLocalMapEntry || selectedCurrentUniverseMapNode ? `<button id="mapBridgeBtn" type="button" data-app-button="true" class="app-button map-floating-button">Bridge</button>` : ""}<button id="isolateConnectionsSubgraphBtn" type="button" data-app-button="true" class="app-button map-floating-button">Isolate</button>`
        }
        <button id="clearMapSelectionBtn" type="button" data-app-button="true" class="app-button map-floating-button">Clear selection</button>
      </div>
    `
    : "";
  const connectionsSearchBanner = mapSearchApi?.activeBannerHtml("connections") || "";
  const connectionsMapSearchControl = mapSearchApi?.controlHtml("connections") || "";

  renderConnectionsMapStatus(connectionsSelectionGuide);

  wrap.innerHTML = `
    ${summary}
    <div class="connections-map-controls compact-map-controls">
      <div class="map-zoom-row">
        <label class="connections-zoom-label">
          Zoom
          <input id="connectionsZoomSlider" class="connections-zoom-slider" type="range" min="0.08" max="2.4" step="0.05" value="${connectionsMapZoom}">
        </label>
        <span id="connectionsZoomValue" class="connections-zoom-value">${Math.round(connectionsMapZoom * 100)}%</span>
      </div>
    </div>
    ${connectionsFloatingActions}
    ${connectionsSearchBanner}
    <div id="connectionsMapStage" class="connections-map-stage ${mapFilterClass(connectionsMapFilters)} ${connectionsIsolationActive ? "isolated-subgraph-active" : ""}" data-map-cluster-eligible="${connectionMapClusters.length ? "true" : "false"}" data-map-cluster-blocked="${connectionsIsolationActive || !!selectedMapNodeId ? "true" : "false"}" data-map-cluster-threshold="0.42" ${connectionMapDomAttributes}>
      <svg class="connections-map expanded-group-connections-map" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" width="${viewBox.width}" height="${viewBox.height}" data-graph-width="${viewBox.width}" data-graph-height="${viewBox.height}" role="group" aria-label="Archived creation connections map">
        <defs>
          <radialGradient id="connectionBg" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stop-color="rgba(143,186,208,.12)"></stop>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"></stop>
          </radialGradient>
        </defs>
        <rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="url(#connectionBg)"></rect>
        ${orbitGuideSvg}
        ${normalEdgeSvg}
        ${bridgeEdgeSvg}
        ${topNodeSvg}
        ${currentUniverseNodeSvg}
        ${externalNodeSvg}
        <g class="map-aggregate-cluster-layer">${connectionClusterSvg}</g>
      </svg>
    </div>
    ${mapFilterControlsHtml("connections", connectionsMapFilters)}
    ${connectionsMapSearchControl}
  `;

  if (typeof prepareMapLazyRender === "function")
    prepareMapLazyRender(document.getElementById("connectionsMapStage"), {wrap});
  bindConnectionsMapViewport();
  bindConnectionsSelectionHelp();
  if (typeof bindMapClusterControls === "function") {
    bindMapClusterControls(wrap, (cluster) => {
      const svg = wrap.querySelector("svg");
      if (!svg || typeof mapPanForSvgPoint !== "function") return;
      const nextZoom = Math.max(0.82, connectionsMapZoom);
      const pan = mapPanForSvgPoint(wrap, svg, cluster.x, cluster.y, nextZoom);
      connectionsMapAutoFitOnNextRender = false;
      connectionsMapZoom = nextZoom;
      connectionsMapPanX = pan.panX;
      connectionsMapPanY = pan.panY;
      applyConnectionsMapTransform();
    });
  }
  bindMapFilterControls("connections");
  mapSearchApi?.bind("connections", {
    resolve: resolveConnectionsMapSearchRecord,
    onSelect: (record, descriptor) => {
      mapSearchApi.clearActive("connections");
      selectedMapNodeId = null;
      connectionsMapIsolatedSubgraph = false;

      if (
        descriptor?.nativeNodeId &&
        (globalThis.controllerServices || globalThis).isSelectableConnectionsMapNodeId(descriptor.nativeNodeId)
      ) {
        selectedMapNodeId = descriptor.nativeNodeId;
        connectionsMapIsolatedSubgraph = true;
      } else {
        mapSearchApi.setActive("connections", record);
      }

      connectionsMapAutoFitOnNextRender = true;
      renderConnectionsMap();
    },
  });
  mapSearchApi?.bindActiveClear("connections", () => {
    connectionsMapAutoFitOnNextRender = true;
    renderConnectionsMap();
  });
  improveSvgMapAccessibility(document.getElementById("connectionsMapWrap"));
  refreshOpenMapListView("connections");

  document.getElementById("isolateConnectionsSubgraphBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    connectionsMapIsolatedSubgraph = true;
    connectionsMapAutoFitOnNextRender = true;
    renderConnectionsMap();
  });

  document.getElementById("backToFocusedMapItemBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    connectionsMapIsolatedSubgraph = false;
    connectionsMapAutoFitOnNextRender = true;
    renderConnectionsMap();
  });

  document.getElementById("mapBridgeBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    if ((globalThis.controllerServices || globalThis).isCurrentUniverseConnectionsMapNodeId(selectedMapNodeId)) {
      (globalThis.controllerServices || globalThis).openUniverseBridgeModal(currentUniverseId);
      return;
    }
    if (selectedMapNodeId) (globalThis.controllerServices || globalThis).openBridgeModal(selectedMapNodeId);
  });

  document.getElementById("clearMapSelectionBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    (globalThis.controllerServices || globalThis).clearMapSelection();
  });

  document.querySelectorAll(".connection-edge-group[data-source]").forEach((group) => {
    group.addEventListener("click", (event) => {
      event.stopPropagation();
      (globalThis.controllerServices || globalThis).openConnectionModal(group.dataset.source, group.dataset.target);
    });
  });

  document.querySelectorAll(".bridge-note-edge").forEach((group) => {
    group.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      (globalThis.controllerServices || globalThis).openBridgeNoteModal(group.dataset.bridgeKey, group.dataset.label);
    });
  });

  document
    .querySelectorAll(
      "#connectionsMapWrap .literature-link-indicator, #connectionsMapWrap .svg-literature-indicator",
    )
    .forEach((badge) => {
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

  (globalThis.controllerServices || globalThis).bindVisionBadgeClickHandlers(document.getElementById("connectionsMapWrap"));

  document.querySelectorAll(".connection-node").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      if (connectionsIsolationActive) return;

      const nodeId = node.dataset.id;
      const clickedExternal = node.dataset.type === "external";
      const clickedCurrentUniverse = node.dataset.type === "current-universe";
      const selectedExternal = (globalThis.controllerServices || globalThis).isExternalConnectionsMapNodeId(selectedMapNodeId);
      const selectedCurrentUniverse =
        (globalThis.controllerServices || globalThis).isCurrentUniverseConnectionsMapNodeId(selectedMapNodeId);

      if (clickedCurrentUniverse) {
        if (selectedMapNodeId === nodeId) {
          (globalThis.controllerServices || globalThis).clearMapSelection();
          return;
        }

        selectedMapNodeId = nodeId;
        renderConnectionsMap();
        return;
      }

      if (clickedExternal) {
        if (!selectedMapNodeId) {
          selectedMapNodeId = nodeId;
          renderConnectionsMap();
          return;
        }

        if (selectedMapNodeId === nodeId) {
          (globalThis.controllerServices || globalThis).clearMapSelection();
          return;
        }

        if (selectedCurrentUniverse) {
          (globalThis.controllerServices || globalThis).toggleUniverseBridgeToExternalNode(currentUniverseId, nodeId);
          return;
        }

        if ((globalThis.controllerServices || globalThis).getEntry(selectedMapNodeId)) {
          (globalThis.controllerServices || globalThis).toggleEntryBridgeToExternalNode(selectedMapNodeId, nodeId);
          return;
        }

        selectedMapNodeId = nodeId;
        renderConnectionsMap();
        return;
      }

      if (node.dataset.type !== "creation") return;

      if (selectedExternal) {
        (globalThis.controllerServices || globalThis).toggleEntryBridgeToExternalNode(nodeId, selectedMapNodeId);
        return;
      }

      if (!selectedMapNodeId) {
        selectedMapNodeId = nodeId;
        renderConnectionsMap();
        return;
      }

      if (selectedMapNodeId === nodeId) {
        (globalThis.controllerServices || globalThis).clearMapSelection();
        return;
      }

      (globalThis.controllerServices || globalThis).toggleMapConnection(selectedMapNodeId, nodeId);
    });
  });

  (globalThis.controllerServices || globalThis).bindVisionBadgeClickHandlers(document.getElementById("connectionsMapWrap"));
  (globalThis.controllerServices || globalThis).protectAllControls();

  if (focusedMapNodeId) {
    const restoredNode = Array.from(wrap.querySelectorAll(".connection-node")).find(
      (node) => node.dataset.id === focusedMapNodeId,
    );
    restoredNode?.focus({preventScroll: true});
  }
}

/* Rendering boundary: callers request a named view; DOM implementation stays behind the coordinator. */
window.WormholesRendering?.register?.("connections-map", renderConnectionsMapView, {
  domains: ["archive", "connectionNotes", "literature", "vision"],
});
function renderConnectionsMap() {
  const coordinator = window.WormholesRendering;
  if (coordinator?.has?.("connections-map")) return coordinator.render("connections-map");
  return renderConnectionsMapView();
}

/* Public controller surface for served ES-module builds. */
const CONNECTIONS_MAP_CONTROLLER_API = Object.freeze({
  renderConnectionsMapStatus,
  applyConnectionsMapTransform,
  fitConnectionsMapToViewport,
  bindConnectionsMapViewport,
  renderConnectionsMapView,
  renderConnectionsMap,
});
(globalThis.registerControllerServices || (() => {}))(CONNECTIONS_MAP_CONTROLLER_API);

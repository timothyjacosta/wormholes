/* Wormholes Beta 248 large-map visual clustering.
   This layer never merges or rewrites stored entities, connections, or bridges. */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;

  ("use strict");

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function balancedChunks(items, targetSize = 4, minimumSize = 3) {
    const list = Array.isArray(items) ? items.slice() : [];
    if (list.length < minimumSize) return [];

    let chunkCount = Math.max(1, Math.ceil(list.length / Math.max(minimumSize, targetSize)));
    while (chunkCount > 1 && Math.floor(list.length / chunkCount) < minimumSize) {
      chunkCount -= 1;
    }

    if (chunkCount === 1 && list.length < minimumSize) return [];

    const baseSize = Math.floor(list.length / chunkCount);
    let remainder = list.length % chunkCount;
    const chunks = [];
    let cursor = 0;

    for (let index = 0; index < chunkCount; index += 1) {
      const size = baseSize + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      const chunk = list.slice(cursor, cursor + size);
      cursor += size;
      if (chunk.length >= minimumSize) chunks.push(chunk);
    }

    return chunks;
  }

  function buildMapClusters(items, options = {}) {
    const validItems = (Array.isArray(items) ? items : [])
      .filter(
        (item) =>
          item &&
          item.id != null &&
          Number.isFinite(Number(item.x)) &&
          Number.isFinite(Number(item.y)),
      )
      .map((item) => ({
        ...item,
        id: String(item.id),
        x: finiteNumber(item.x),
        y: finiteNumber(item.y),
        weight: Math.max(1, finiteNumber(item.weight, 1)),
        groupKey: String(item.groupKey || "map"),
      }));

    const minimumItems = Math.max(2, finiteNumber(options.minimumItems, 8));
    const minimumWeight = Math.max(minimumItems, finiteNumber(options.minimumWeight, 20));
    const targetSize = Math.max(3, finiteNumber(options.targetSize, 4));
    const minimumClusterSize = Math.max(2, finiteNumber(options.minimumClusterSize, 3));
    const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);

    if (validItems.length < minimumItems || totalWeight < minimumWeight) return [];

    const groups = new Map();
    validItems.forEach((item) => {
      if (!groups.has(item.groupKey)) groups.set(item.groupKey, []);
      groups.get(item.groupKey).push(item);
    });

    const clusters = [];
    let clusterIndex = 0;

    groups.forEach((groupItems, groupKey) => {
      if (groupItems.length < minimumClusterSize) return;

      const center = groupItems.reduce(
        (point, item) => ({
          x: point.x + item.x / groupItems.length,
          y: point.y + item.y / groupItems.length,
        }),
        {x: 0, y: 0},
      );

      const ordered = groupItems.slice().sort((a, b) => {
        const angleA = Math.atan2(a.y - center.y, a.x - center.x);
        const angleB = Math.atan2(b.y - center.y, b.x - center.x);
        if (angleA !== angleB) return angleA - angleB;
        return a.id.localeCompare(b.id);
      });

      balancedChunks(ordered, targetSize, minimumClusterSize).forEach((chunk) => {
        const weight = chunk.reduce((sum, item) => sum + item.weight, 0);
        const weightedCenter = chunk.reduce(
          (point, item) => ({
            x: point.x + (item.x * item.weight) / weight,
            y: point.y + (item.y * item.weight) / weight,
          }),
          {x: 0, y: 0},
        );

        clusters.push({
          id: `map-cluster-${(clusterIndex += 1)}`,
          groupKey,
          memberIds: chunk.map((item) => item.id),
          weight,
          x: weightedCenter.x,
          y: weightedCenter.y,
          label: chunk[0]?.groupLabel || options.defaultLabel || "Map items",
        });
      });
    });

    return clusters;
  }

  function updateMapClusteringState(stage, zoom) {
    if (!stage) return false;

    const threshold = Math.max(0.08, finiteNumber(stage.dataset.mapClusterThreshold, 0.42));
    const eligible = stage.dataset.mapClusterEligible === "true";
    const blocked = stage.dataset.mapClusterBlocked === "true";
    const active = eligible && !blocked && finiteNumber(zoom, 1) <= threshold;

    stage.classList.toggle("map-clusters-active", active);
    stage.dataset.mapClustersActive = active ? "true" : "false";

    stage.querySelectorAll?.(".map-aggregate-cluster").forEach((cluster) => {
      cluster.setAttribute("aria-hidden", active ? "false" : "true");
      cluster.setAttribute("tabindex", active ? "0" : "-1");
    });

    return active;
  }

  function mapPanForSvgPoint(wrap, svg, x, y, zoom) {
    const viewBox = svg?.viewBox?.baseVal;
    const width = finiteNumber(svg?.width?.baseVal?.value, viewBox?.width || 1);
    const height = finiteNumber(svg?.height?.baseVal?.value, viewBox?.height || 1);
    const viewWidth = Math.max(1, finiteNumber(viewBox?.width, width));
    const viewHeight = Math.max(1, finiteNumber(viewBox?.height, height));
    const contentX = (finiteNumber(x) - finiteNumber(viewBox?.x)) * (width / viewWidth);
    const contentY = (finiteNumber(y) - finiteNumber(viewBox?.y)) * (height / viewHeight);
    const safeZoom = Math.max(0.08, finiteNumber(zoom, 0.82));

    return {
      panX: finiteNumber(wrap?.clientWidth) / 2 - contentX * safeZoom,
      panY: finiteNumber(wrap?.clientHeight) / 2 - contentY * safeZoom,
    };
  }

  function bindMapClusterControls(root, activate) {
    if (!root || typeof activate !== "function") return;

    root.querySelectorAll(".map-aggregate-cluster").forEach((cluster) => {
      const invoke = (event) => {
        if (cluster.getAttribute("aria-hidden") === "true") return;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (event?.stopImmediatePropagation) event.stopImmediatePropagation();
        activate({
          element: cluster,
          x: finiteNumber(cluster.dataset.clusterX),
          y: finiteNumber(cluster.dataset.clusterY),
          id: cluster.dataset.clusterId || "",
        });
      };

      cluster.addEventListener("click", invoke);
      cluster.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") invoke(event);
      });
    });
  }

  global.buildMapClusters = buildMapClusters;
  global.updateMapClusteringState = updateMapClusteringState;
  global.mapPanForSvgPoint = mapPanForSvgPoint;
  global.bindMapClusterControls = bindMapClusterControls;

  const moduleApi = Object.freeze({
    buildMapClusters,
    updateMapClusteringState,
    mapPanForSvgPoint,
    bindMapClusterControls,
  });
  global.WormholesMapClustering = moduleApi;
  return global.WormholesMapClustering;
}

export const api = install(globalThis);
export default api;

/* GENERATED from scripts/modules/app-state-map.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 map-state ownership boundary.
   Viewport, focus, isolation, drag, and filter state are grouped separately from
   domain data and modal workflow state. */

let selectedWormholeCreation = null;
let wormholeFocusUniverseId = null;
let selectedMapNodeId = null;
let connectionsMapIsolatedSubgraph = false;
let wormholesMapIsolatedSubgraph = false;
let connectionsMapZoom = 1;
let connectionsMapAutoFitOnNextRender = true;
let connectionsMapPanX = 0;
let connectionsMapPanY = 0;
let connectionsMapDragging = false;
let connectionsMapDragStart = null;
let connectionsMapFilters = loadMapFilters("connections");
let wormholesMapZoom = 0.9;
let wormholesMapAutoFitOnNextRender = true;
let wormholesMapPanX = 0;
let wormholesMapPanY = 0;
let wormholesMapDragging = false;
let wormholesMapDragStart = null;
let wormholesMapFilters = loadMapFilters("wormholes");
let connectSourceId = null;

function defineBinding(target, name, getter, setter) {
  const existing = Object.getOwnPropertyDescriptor(target, name);
  if (existing && existing.configurable === false) return false;
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: false,
    get: getter,
    set: setter,
  });
  return true;
}

function installLegacyMapStateBindings(target = globalThis) {
  const bind = (name, getter, setter) => defineBinding(target, name, getter, setter);
  bind(
    "selectedWormholeCreation",
    () => selectedWormholeCreation,
    (value) => {
      selectedWormholeCreation = value ?? null;
    },
  );
  bind(
    "wormholeFocusUniverseId",
    () => wormholeFocusUniverseId,
    (value) => {
      wormholeFocusUniverseId = value ?? null;
    },
  );
  bind(
    "selectedMapNodeId",
    () => selectedMapNodeId,
    (value) => {
      selectedMapNodeId = value ?? null;
    },
  );
  bind(
    "connectionsMapIsolatedSubgraph",
    () => connectionsMapIsolatedSubgraph,
    (value) => {
      connectionsMapIsolatedSubgraph = value === true;
    },
  );
  bind(
    "wormholesMapIsolatedSubgraph",
    () => wormholesMapIsolatedSubgraph,
    (value) => {
      wormholesMapIsolatedSubgraph = value === true;
    },
  );
  bind(
    "connectionsMapZoom",
    () => connectionsMapZoom,
    (value) => {
      connectionsMapZoom = Number(value) || 1;
    },
  );
  bind(
    "connectionsMapAutoFitOnNextRender",
    () => connectionsMapAutoFitOnNextRender,
    (value) => {
      connectionsMapAutoFitOnNextRender = value !== false;
    },
  );
  bind(
    "connectionsMapPanX",
    () => connectionsMapPanX,
    (value) => {
      connectionsMapPanX = Number(value) || 0;
    },
  );
  bind(
    "connectionsMapPanY",
    () => connectionsMapPanY,
    (value) => {
      connectionsMapPanY = Number(value) || 0;
    },
  );
  bind(
    "connectionsMapDragging",
    () => connectionsMapDragging,
    (value) => {
      connectionsMapDragging = value === true;
    },
  );
  bind(
    "connectionsMapDragStart",
    () => connectionsMapDragStart,
    (value) => {
      connectionsMapDragStart = value ?? null;
    },
  );
  bind(
    "connectionsMapFilters",
    () => connectionsMapFilters,
    (value) => {
      connectionsMapFilters =
        value && typeof value === "object" ? value : loadMapFilters("connections");
    },
  );
  bind(
    "wormholesMapZoom",
    () => wormholesMapZoom,
    (value) => {
      wormholesMapZoom = Number(value) || 0.9;
    },
  );
  bind(
    "wormholesMapAutoFitOnNextRender",
    () => wormholesMapAutoFitOnNextRender,
    (value) => {
      wormholesMapAutoFitOnNextRender = value !== false;
    },
  );
  bind(
    "wormholesMapPanX",
    () => wormholesMapPanX,
    (value) => {
      wormholesMapPanX = Number(value) || 0;
    },
  );
  bind(
    "wormholesMapPanY",
    () => wormholesMapPanY,
    (value) => {
      wormholesMapPanY = Number(value) || 0;
    },
  );
  bind(
    "wormholesMapDragging",
    () => wormholesMapDragging,
    (value) => {
      wormholesMapDragging = value === true;
    },
  );
  bind(
    "wormholesMapDragStart",
    () => wormholesMapDragStart,
    (value) => {
      wormholesMapDragStart = value ?? null;
    },
  );
  bind(
    "wormholesMapFilters",
    () => wormholesMapFilters,
    (value) => {
      wormholesMapFilters =
        value && typeof value === "object" ? value : loadMapFilters("wormholes");
    },
  );
  bind(
    "connectSourceId",
    () => connectSourceId,
    (value) => {
      connectSourceId = value ?? null;
    },
  );
  return target;
}

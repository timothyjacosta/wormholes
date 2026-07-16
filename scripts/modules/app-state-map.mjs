/* Wormholes Beta 248 map-state ownership boundary.
   Viewport, focus, isolation, drag, and filter state are grouped separately from
   domain data and modal workflow state. */

import {loadMapFilters} from "./storage-facade.mjs";

export let selectedWormholeCreation = null;
export let wormholeFocusUniverseId = null;
export let selectedMapNodeId = null;
export let connectionsMapIsolatedSubgraph = false;
export let wormholesMapIsolatedSubgraph = false;
export let connectionsMapZoom = 1;
export let connectionsMapAutoFitOnNextRender = true;
export let connectionsMapPanX = 0;
export let connectionsMapPanY = 0;
export let connectionsMapDragging = false;
export let connectionsMapDragStart = null;
export let connectionsMapFilters = loadMapFilters("connections");
export let wormholesMapZoom = 0.9;
export let wormholesMapAutoFitOnNextRender = true;
export let wormholesMapPanX = 0;
export let wormholesMapPanY = 0;
export let wormholesMapDragging = false;
export let wormholesMapDragStart = null;
export let wormholesMapFilters = loadMapFilters("wormholes");
export let connectSourceId = null;

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

export function installLegacyMapStateBindings(target = globalThis) {
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

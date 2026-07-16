/* Wormholes Beta 261 — Vision Board pagination, filtering, sorting, and list-action presentation.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";

const visionFilterStatesByUniverse = new Map();
const visionSortStatesByUniverse = new Map();
const visionPageStatesByUniverse = new Map();
const VISION_PAGE_SIZE = 48;
const VISION_SORT_MODES = new Set([
  "board",
  "title-asc",
  "title-desc",
  "newest",
  "oldest",
  "filename",
]);
let visionFilterPanelOpen = false;
let visionSortPanelOpen = false;

function getVisionPage(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  return Math.max(1, Number.parseInt(visionPageStatesByUniverse.get(key), 10) || 1);
}

function setVisionPage(page, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  visionPageStatesByUniverse.set(key, Math.max(1, Number.parseInt(page, 10) || 1));
}

function resetVisionPage() {
  setVisionPage(1);
}

function scrollVisionPageToTop() {
  const target =
    document.getElementById("visionBoardCount") || document.getElementById("visionTab");
  target?.scrollIntoView?.({
    behavior:
      typeof controllerServices.prefersReducedMotion === "function" &&
      controllerServices.prefersReducedMotion()
        ? "auto"
        : "smooth",
    block: "start",
  });
}

function renderVisionPagination(totalPages, currentPage) {
  window.WormholesPagination?.renderControls?.(document.getElementById("visionPagination"), {
    label: "Vision Board",
    totalPages,
    page: currentPage,
    onPageChange(nextPage) {
      setVisionPage(nextPage);
      renderVisionBoard();
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(scrollVisionPageToTop);
    },
  });
}

function defaultVisionFilterState() {
  return {
    tags: "all",
    storage: "all",
    format: "all",
  };
}

function getVisionFilterState(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  if (!visionFilterStatesByUniverse.has(key)) {
    visionFilterStatesByUniverse.set(key, defaultVisionFilterState());
  }
  return visionFilterStatesByUniverse.get(key);
}

function visionFilterActiveCount(state = getVisionFilterState()) {
  return (
    Number(state.tags !== "all") + Number(state.storage !== "all") + Number(state.format !== "all")
  );
}

function getVisionSortMode(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  const mode = visionSortStatesByUniverse.get(key) || "board";
  if (!VISION_SORT_MODES.has(mode)) {
    visionSortStatesByUniverse.set(key, "board");
    return "board";
  }
  return mode;
}

function setVisionSortMode(mode, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  visionSortStatesByUniverse.set(key, VISION_SORT_MODES.has(mode) ? mode : "board");
}

function visionSortModeLabel(mode = getVisionSortMode()) {
  return (
    {
      "title-asc": "A–Z",
      "title-desc": "Z–A",
      newest: "Newest",
      oldest: "Oldest",
      filename: "Filename",
    }[mode] || ""
  );
}

function sanitizeVisionFilterState(state = getVisionFilterState()) {
  const clean = {
    ...defaultVisionFilterState(),
    ...(state || {}),
  };
  if (!["all", "tagged", "untagged", "universe", "creation"].includes(clean.tags))
    clean.tags = "all";
  if (!["all", "app", "folder"].includes(clean.storage)) clean.storage = "all";
  if (!["all", "png", "jpeg"].includes(clean.format)) clean.format = "all";
  return clean;
}

function visionItemFormat(item) {
  const mime = String(item?.mimeType || "").toLowerCase();
  const name = String(item?.folderFileName || item?.sourceName || "").toLowerCase();
  if (mime === "image/png" || name.endsWith(".png")) return "png";
  return "jpeg";
}

function visionItemMatchesFilters(item, state = getVisionFilterState()) {
  const clean = sanitizeVisionFilterState(state);
  const universeTags = item?.tags?.universes || [];
  const creationTags = item?.tags?.entries || [];
  const tagged = universeTags.length > 0 || creationTags.length > 0;

  if (clean.tags === "tagged" && !tagged) return false;
  if (clean.tags === "untagged" && tagged) return false;
  if (clean.tags === "universe" && universeTags.length === 0) return false;
  if (clean.tags === "creation" && creationTags.length === 0) return false;
  if (clean.storage === "folder" && item?.storage !== "folder") return false;
  if (clean.storage === "app" && item?.storage === "folder") return false;
  if (clean.format !== "all" && visionItemFormat(item) !== clean.format) return false;
  return true;
}

function visionSortComparator(mode = getVisionSortMode()) {
  return (a, b) => {
    const titleA = String(a?.title || a?.sourceName || "").trim();
    const titleB = String(b?.title || b?.sourceName || "").trim();
    const titleCompare = titleA.localeCompare(titleB, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    const createdA = Date.parse(a?.createdAt || "") || 0;
    const createdB = Date.parse(b?.createdAt || "") || 0;

    if (mode === "title-asc") return titleCompare;
    if (mode === "title-desc") return -titleCompare;
    if (mode === "newest") return createdB - createdA || titleCompare;
    if (mode === "oldest") return createdA - createdB || titleCompare;
    if (mode === "filename") {
      const fileA = String(a?.sourceName || a?.folderFileName || a?.title || "");
      const fileB = String(b?.sourceName || b?.folderFileName || b?.title || "");
      return (
        fileA.localeCompare(fileB, undefined, {sensitivity: "base", numeric: true}) || titleCompare
      );
    }
    return 0;
  };
}

function buildVisionViewRows(
  entries = visionEntries,
  state = getVisionFilterState(),
  mode = getVisionSortMode(),
) {
  const rows = (entries || [])
    .map((item, index) => ({item, index}))
    .filter((row) => visionItemMatchesFilters(row.item, state));
  if (mode !== "board") {
    const compare = visionSortComparator(mode);
    rows.sort((a, b) => compare(a.item, b.item));
  }
  return rows;
}

function syncVisionViewControls() {
  const state = sanitizeVisionFilterState(getVisionFilterState());
  visionFilterStatesByUniverse.set(currentUniverseId || "__none__", state);
  const tags = document.getElementById("visionFilterTags");
  const storage = document.getElementById("visionFilterStorage");
  const format = document.getElementById("visionFilterFormat");
  if (tags) tags.value = state.tags;
  if (storage) storage.value = state.storage;
  if (format) format.value = state.format;

  const filterPanel = document.getElementById("visionFilterPanel");
  const filterButton = document.getElementById("visionFilterBtn");
  const activeCount = visionFilterActiveCount(state);
  if (filterPanel) filterPanel.hidden = !visionFilterPanelOpen;
  if (filterButton) {
    filterButton.textContent = activeCount ? `Filter (${activeCount})` : "Filter";
    filterButton.classList.toggle("filter-active", activeCount > 0);
    filterButton.setAttribute("aria-expanded", visionFilterPanelOpen ? "true" : "false");
  }

  const sortPanel = document.getElementById("visionSortPanel");
  const sortButton = document.getElementById("visionSortBtn");
  const sortSelect = document.getElementById("visionSortOrder");
  const sortMode = getVisionSortMode();
  if (sortPanel) sortPanel.hidden = !visionSortPanelOpen;
  if (sortSelect) sortSelect.value = sortMode;
  if (sortButton) {
    const label = visionSortModeLabel(sortMode);
    sortButton.textContent = sortMode === "board" ? "Sort" : `Sort (${label})`;
    sortButton.classList.toggle("sort-active", sortMode !== "board");
    sortButton.setAttribute("aria-expanded", visionSortPanelOpen ? "true" : "false");
  }
}

function setVisionFilterPanelOpen(open) {
  visionFilterPanelOpen = !!open;
  if (visionFilterPanelOpen) visionSortPanelOpen = false;
  syncVisionViewControls();
  if (visionFilterPanelOpen) {
    setTimeout(() => document.getElementById("visionFilterTags")?.focus(), 0);
  }
}

function toggleVisionFilterPanel() {
  setVisionFilterPanelOpen(!visionFilterPanelOpen);
}

function closeVisionFilterPanel() {
  visionFilterPanelOpen = false;
  syncVisionViewControls();
  setTimeout(() => document.getElementById("visionFilterBtn")?.focus(), 0);
}

function applyVisionFiltersFromControls() {
  const state = getVisionFilterState();
  state.tags = document.getElementById("visionFilterTags")?.value || "all";
  state.storage = document.getElementById("visionFilterStorage")?.value || "all";
  state.format = document.getElementById("visionFilterFormat")?.value || "all";
  resetVisionPage();
  renderVisionBoard();
}

function resetVisionFilters() {
  visionFilterStatesByUniverse.set(currentUniverseId || "__none__", defaultVisionFilterState());
  resetVisionPage();
  renderVisionBoard();
}

function setVisionSortPanelOpen(open) {
  visionSortPanelOpen = !!open;
  if (visionSortPanelOpen) visionFilterPanelOpen = false;
  syncVisionViewControls();
  if (visionSortPanelOpen) {
    setTimeout(() => document.getElementById("visionSortOrder")?.focus(), 0);
  }
}

function toggleVisionSortPanel() {
  setVisionSortPanelOpen(!visionSortPanelOpen);
}

function closeVisionSortPanel() {
  visionSortPanelOpen = false;
  syncVisionViewControls();
  setTimeout(() => document.getElementById("visionSortBtn")?.focus(), 0);
}

function applyVisionSortFromControl() {
  setVisionSortMode(document.getElementById("visionSortOrder")?.value || "board");
  resetVisionPage();
  renderVisionBoard();
}

function resetVisionSort() {
  setVisionSortMode("board");
  resetVisionPage();
  renderVisionBoard();
}

function resetVisionViewForMoving() {
  const hadViewChanges =
    visionFilterActiveCount(getVisionFilterState()) > 0 || getVisionSortMode() !== "board";
  if (!hadViewChanges) return false;
  visionFilterStatesByUniverse.set(currentUniverseId || "__none__", defaultVisionFilterState());
  setVisionSortMode("board");
  resetVisionPage();
  visionFilterPanelOpen = false;
  visionSortPanelOpen = false;
  return true;
}

function applyVisionPinActionLabels(pin) {
  const title = compactText(
    pin?.querySelector?.(".vision-pin-label")?.textContent ||
      pin?.getAttribute?.("title") ||
      "Vision board item",
  );
  const type = "vision board item";

  setContextualAriaLabel(
    pin,
    ".vision-pin-menu-button",
    `Open image actions for ${type}: ${title}`,
  );
  setContextualAriaLabel(pin, ".vision-rename-action", `Rename ${type}: ${title}`);
  setContextualAriaLabel(pin, ".vision-tag-action", `Edit tags for ${type}: ${title}`);
  setContextualAriaLabel(pin, ".vision-move-action", `Move ${type}: ${title}`);
  setContextualAriaLabel(
    pin,
    ".vision-copy-universe-action",
    `Copy ${type} to another universe: ${title}`,
  );
  setContextualAriaLabel(pin, ".vision-delete-action", `Delete ${type}: ${title}`);
}

const VISION_BOARD_VIEW_HELPERS_API = Object.freeze({
  VISION_PAGE_SIZE,
  getVisionPage,
  setVisionPage,
  resetVisionPage,
  scrollVisionPageToTop,
  renderVisionPagination,
  defaultVisionFilterState,
  getVisionFilterState,
  visionFilterActiveCount,
  getVisionSortMode,
  setVisionSortMode,
  visionSortModeLabel,
  sanitizeVisionFilterState,
  visionItemFormat,
  visionItemMatchesFilters,
  visionSortComparator,
  buildVisionViewRows,
  syncVisionViewControls,
  setVisionFilterPanelOpen,
  toggleVisionFilterPanel,
  closeVisionFilterPanel,
  applyVisionFiltersFromControls,
  resetVisionFilters,
  setVisionSortPanelOpen,
  toggleVisionSortPanel,
  closeVisionSortPanel,
  applyVisionSortFromControl,
  resetVisionSort,
  resetVisionViewForMoving,
  applyVisionPinActionLabels,
});

export function installLegacyVisionBoardViewHelpersBindings(target = globalThis) {
  Object.assign(target, VISION_BOARD_VIEW_HELPERS_API);
  target.WormholesVisionBoardViewHelpers = VISION_BOARD_VIEW_HELPERS_API;
  return VISION_BOARD_VIEW_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyVisionBoardViewHelpersBindings(window);

export {
  VISION_PAGE_SIZE,
  getVisionPage,
  setVisionPage,
  resetVisionPage,
  scrollVisionPageToTop,
  renderVisionPagination,
  defaultVisionFilterState,
  getVisionFilterState,
  visionFilterActiveCount,
  getVisionSortMode,
  setVisionSortMode,
  visionSortModeLabel,
  sanitizeVisionFilterState,
  visionItemFormat,
  visionItemMatchesFilters,
  visionSortComparator,
  buildVisionViewRows,
  syncVisionViewControls,
  setVisionFilterPanelOpen,
  toggleVisionFilterPanel,
  closeVisionFilterPanel,
  applyVisionFiltersFromControls,
  resetVisionFilters,
  setVisionSortPanelOpen,
  toggleVisionSortPanel,
  closeVisionSortPanel,
  applyVisionSortFromControl,
  resetVisionSort,
  resetVisionViewForMoving,
  applyVisionPinActionLabels,
};

/* Wormholes Beta 261 — Archive pagination, filtering, and sorting state.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";

const archiveFilterStatesByUniverse = new Map();
let archiveFilterPanelOpen = false;
const archiveSortStatesByUniverse = new Map();
let archiveSortPanelOpen = false;
const archivePageStatesByUniverse = new Map();
const ARCHIVE_PAGE_SIZE = 50;

const ARCHIVE_SORT_MODES = new Set([
  "archive",
  "title-asc",
  "title-desc",
  "type-asc",
  "newest",
  "oldest",
]);

function getArchivePage(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  return (
    window.WormholesPagination?.clampPage?.(
      archivePageStatesByUniverse.get(key) || 1,
      Number.MAX_SAFE_INTEGER,
    ) || 1
  );
}

function setArchivePage(page, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  archivePageStatesByUniverse.set(key, Math.max(1, Number.parseInt(page, 10) || 1));
}

function resetArchivePage() {
  setArchivePage(1);
}

function scrollArchivePageToTop() {
  const target =
    document.getElementById("archiveCount") || document.getElementById("archiveListScreen");
  target?.scrollIntoView?.({
    behavior:
      typeof controllerServices.prefersReducedMotion === "function" &&
      controllerServices.prefersReducedMotion()
        ? "auto"
        : "smooth",
    block: "start",
  });
}

function renderArchivePagination(totalPages, currentPage) {
  window.WormholesPagination?.renderControls?.(document.getElementById("archivePagination"), {
    label: "Archive",
    totalPages,
    page: currentPage,
    onPageChange(nextPage) {
      setArchivePage(nextPage);
      renderArchive();
      if (typeof requestAnimationFrame === "function")
        requestAnimationFrame(scrollArchivePageToTop);
    },
  });
}

function getArchiveSortMode(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  const mode = archiveSortStatesByUniverse.get(key) || "archive";
  if (!ARCHIVE_SORT_MODES.has(mode)) {
    archiveSortStatesByUniverse.set(key, "archive");
    return "archive";
  }
  return mode;
}

function setArchiveSortMode(mode, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  archiveSortStatesByUniverse.set(key, ARCHIVE_SORT_MODES.has(mode) ? mode : "archive");
}

function archiveSortModeLabel(mode = getArchiveSortMode()) {
  return (
    {
      archive: "Custom Order",
      "title-asc": "A–Z",
      "title-desc": "Z–A",
      "type-asc": "Type",
      newest: "Newest",
      oldest: "Oldest",
    }[mode] || "Custom Order"
  );
}

function archiveEntryCreatedTime(entry) {
  const parsed = Date.parse(String(entry?.createdAt || ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function archiveEntrySortComparator(mode = getArchiveSortMode(), entries = archiveEntries) {
  const originalIndex = new Map(entries.map((entry, index) => [entry.id, index]));
  const stableIndex = (entry) =>
    originalIndex.has(entry?.id) ? originalIndex.get(entry.id) : Number.MAX_SAFE_INTEGER;
  const compareText = (a, b) =>
    String(a || "").localeCompare(String(b || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    });

  return (a, b) => {
    let result = 0;
    if (mode === "title-asc" || mode === "title-desc") {
      result = compareText(a?.title, b?.title);
      if (mode === "title-desc") result *= -1;
    } else if (mode === "type-asc") {
      result =
        compareText(archiveEntryTypeLabel(a), archiveEntryTypeLabel(b)) ||
        compareText(a?.title, b?.title);
    } else if (mode === "newest" || mode === "oldest") {
      const aTime = archiveEntryCreatedTime(a);
      const bTime = archiveEntryCreatedTime(b);
      if (aTime !== null && bTime !== null && aTime !== bTime) {
        result = mode === "newest" ? bTime - aTime : aTime - bTime;
      } else if (aTime !== null && bTime === null) {
        result = -1;
      } else if (aTime === null && bTime !== null) {
        result = 1;
      }
    }
    return result || stableIndex(a) - stableIndex(b);
  };
}

function sortArchiveFilterPlan(plan, mode = getArchiveSortMode(), entries = archiveEntries) {
  if (mode === "archive") return plan;
  const compare = archiveEntrySortComparator(mode, entries);
  return plan
    .map((row) => ({...row, childEntries: row.childEntries.slice().sort(compare)}))
    .sort((a, b) => compare(a.entry, b.entry));
}

function defaultArchiveFilterState() {
  return {
    type: "all",
    group: "all",
    hasConnections: false,
    hasNotes: false,
    hasSummary: false,
  };
}

function getArchiveFilterState(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  if (!archiveFilterStatesByUniverse.has(key)) {
    archiveFilterStatesByUniverse.set(key, defaultArchiveFilterState());
  }
  return archiveFilterStatesByUniverse.get(key);
}

function archiveFilterActiveCount(state = getArchiveFilterState()) {
  return [
    state.type !== "all",
    state.group !== "all",
    !!state.hasConnections,
    !!state.hasNotes,
    !!state.hasSummary,
  ].filter(Boolean).length;
}

function archiveEntryTypeLabel(entry) {
  if (isGroupEntry(entry)) return "Group";
  const raw = typeof entry?.what === "string" ? entry.what : String(entry?.what?.val || "").trim();
  if (!raw) return "Unspecified";
  const separator = raw.indexOf(" — ");
  return separator > 0 ? raw.slice(0, separator).trim() : raw;
}

function archiveEntryHasConnections(entry) {
  return Array.isArray(entry?.connections) && entry.connections.length > 0;
}

function archiveEntryHasNotes(entry) {
  return Array.isArray(entry?.notes) && entry.notes.some((note) => String(note || "").trim());
}

function archiveEntryHasSummary(entry) {
  return !!String(entry?.summary || "").trim();
}

function archiveEntryMatchesFilters(
  entry,
  state = getArchiveFilterState(),
  entries = archiveEntries,
) {
  if (!entry) return false;
  const groupForEntry = isGroupEntry(entry) ? entry : getGroupForEntryId(entry.id, entries);

  if (state.type !== "all") {
    if (state.type === "__groups__") {
      if (!isGroupEntry(entry)) return false;
    } else if (isGroupEntry(entry) || archiveEntryTypeLabel(entry) !== state.type) {
      return false;
    }
  }

  if (state.group === "grouped") {
    if (!groupForEntry) return false;
  } else if (state.group === "ungrouped") {
    if (isGroupEntry(entry) || groupForEntry) return false;
  } else if (state.group.startsWith("group:")) {
    const wantedGroupId = state.group.slice(6);
    if (
      !(isGroupEntry(entry) && entry.id === wantedGroupId) &&
      groupForEntry?.id !== wantedGroupId
    ) {
      return false;
    }
  }

  if (state.hasConnections && !archiveEntryHasConnections(entry)) return false;
  if (state.hasNotes && !archiveEntryHasNotes(entry)) return false;
  if (state.hasSummary && !archiveEntryHasSummary(entry)) return false;
  return true;
}

function buildArchiveFilterPlan(entries = archiveEntries, state = getArchiveFilterState()) {
  const active = archiveFilterActiveCount(state) > 0;
  const plan = [];

  topLevelArchiveEntries(entries).forEach((entry) => {
    if (!isGroupEntry(entry)) {
      if (!active || archiveEntryMatchesFilters(entry, state, entries)) {
        plan.push({entry, childEntries: [], directMatch: true});
      }
      return;
    }

    const allChildren = groupChildIds(entry)
      .map((id) => entries.find((row) => row.id === id))
      .filter(Boolean);
    if (!active) {
      plan.push({entry, childEntries: allChildren, directMatch: true});
      return;
    }

    const directMatch = archiveEntryMatchesFilters(entry, state, entries);
    const matchingChildren = allChildren.filter((child) =>
      archiveEntryMatchesFilters(child, state, entries),
    );
    if (!directMatch && matchingChildren.length === 0) return;

    const childEntries =
      state.type === "__groups__" && directMatch ? allChildren : matchingChildren;
    plan.push({entry, childEntries, directMatch});
  });

  return plan;
}

function archiveFilterOptions(entries = archiveEntries) {
  const types = Array.from(
    new Set(
      entries
        .filter((entry) => !isGroupEntry(entry))
        .map(archiveEntryTypeLabel)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const groups = entries
    .filter(isGroupEntry)
    .slice()
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  return {types, groups};
}

function sanitizeArchiveFilterState(state = getArchiveFilterState(), entries = archiveEntries) {
  const {types, groups} = archiveFilterOptions(entries);
  if (state.type !== "all" && state.type !== "__groups__" && !types.includes(state.type))
    state.type = "all";
  if (
    state.group.startsWith("group:") &&
    !groups.some((group) => `group:${group.id}` === state.group)
  )
    state.group = "all";
  return state;
}

function archiveFilterPlanContainsEntry(plan, entryId) {
  if (!entryId) return false;
  return plan.some(
    (row) => row.entry.id === entryId || row.childEntries.some((child) => child.id === entryId),
  );
}

function updateArchiveFilterControls() {
  const typeSelect = document.getElementById("archiveFilterType");
  const groupSelect = document.getElementById("archiveFilterGroup");
  const connections = document.getElementById("archiveFilterConnections");
  const notes = document.getElementById("archiveFilterNotes");
  const summary = document.getElementById("archiveFilterSummary");
  if (!typeSelect || !groupSelect) return;

  const state = sanitizeArchiveFilterState(getArchiveFilterState());
  const {types, groups} = archiveFilterOptions();

  typeSelect.innerHTML = [
    `<option value="all">All types</option>`,
    `<option value="__groups__">Groups</option>`,
    ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`),
  ].join("");

  groupSelect.innerHTML = [
    `<option value="all">All items</option>`,
    `<option value="grouped">Grouped items</option>`,
    `<option value="ungrouped">Ungrouped items</option>`,
    ...groups.map(
      (group) =>
        `<option value="group:${escapeHtml(group.id)}">${escapeHtml(group.title || "Untitled group")}</option>`,
    ),
  ].join("");

  typeSelect.value = state.type;
  groupSelect.value = state.group;
  if (connections) connections.checked = !!state.hasConnections;
  if (notes) notes.checked = !!state.hasNotes;
  if (summary) summary.checked = !!state.hasSummary;

  const panel = document.getElementById("archiveFilterPanel");
  const button = document.getElementById("archiveFilterBtn");
  const activeCount = archiveFilterActiveCount(state);
  if (panel) panel.hidden = !archiveFilterPanelOpen;
  if (button) {
    button.textContent = activeCount ? `Filter (${activeCount})` : "Filter";
    button.setAttribute("aria-expanded", archiveFilterPanelOpen ? "true" : "false");
    button.classList.toggle("filter-active", activeCount > 0);
  }
}

function setArchiveFilterPanelOpen(open) {
  archiveFilterPanelOpen = !!open;
  if (archiveFilterPanelOpen) archiveSortPanelOpen = false;
  updateArchiveFilterControls();
  updateArchiveSortControls();
  if (archiveFilterPanelOpen) {
    setTimeout(() => document.getElementById("archiveFilterType")?.focus(), 0);
  }
}

function closeArchiveFilterPanel() {
  setArchiveFilterPanelOpen(false);
  setTimeout(() => document.getElementById("archiveFilterBtn")?.focus(), 0);
}

function toggleArchiveFilterPanel() {
  if (archiveFilterPanelOpen) closeArchiveFilterPanel();
  else setArchiveFilterPanelOpen(true);
}

function applyArchiveFiltersFromControls() {
  const state = getArchiveFilterState();
  state.type = document.getElementById("archiveFilterType")?.value || "all";
  state.group = document.getElementById("archiveFilterGroup")?.value || "all";
  state.hasConnections = !!document.getElementById("archiveFilterConnections")?.checked;
  state.hasNotes = !!document.getElementById("archiveFilterNotes")?.checked;
  state.hasSummary = !!document.getElementById("archiveFilterSummary")?.checked;
  resetArchivePage();
  renderArchive();
}

function resetArchiveFilters() {
  archiveFilterStatesByUniverse.set(currentUniverseId || "__none__", defaultArchiveFilterState());
  resetArchivePage();
  renderArchive();
}

function updateArchiveSortControls() {
  const panel = document.getElementById("archiveSortPanel");
  const button = document.getElementById("archiveSortBtn");
  const select = document.getElementById("archiveSortOrder");
  const mode = getArchiveSortMode();
  if (panel) panel.hidden = !archiveSortPanelOpen;
  if (select) select.value = mode;
  if (button) {
    button.textContent = mode === "archive" ? "Sort" : `Sort (${archiveSortModeLabel(mode)})`;
    button.setAttribute("aria-expanded", archiveSortPanelOpen ? "true" : "false");
    button.setAttribute(
      "aria-label",
      mode === "archive" ? "Sort Archive" : `Sort Archive: ${archiveSortModeLabel(mode)}`,
    );
    button.classList.toggle("sort-active", mode !== "archive");
  }
}

function setArchiveSortPanelOpen(open) {
  archiveSortPanelOpen = !!open;
  if (archiveSortPanelOpen) archiveFilterPanelOpen = false;
  updateArchiveFilterControls();
  updateArchiveSortControls();
  if (archiveSortPanelOpen) {
    setTimeout(() => document.getElementById("archiveSortOrder")?.focus(), 0);
  }
}

function closeArchiveSortPanel() {
  setArchiveSortPanelOpen(false);
  setTimeout(() => document.getElementById("archiveSortBtn")?.focus(), 0);
}

function toggleArchiveSortPanel() {
  if (archiveSortPanelOpen) closeArchiveSortPanel();
  else setArchiveSortPanelOpen(true);
}

function applyArchiveSortFromControl() {
  setArchiveSortMode(document.getElementById("archiveSortOrder")?.value || "archive");
  resetArchivePage();
  renderArchive();
}

function resetArchiveSort() {
  setArchiveSortMode("archive");
  resetArchivePage();
  renderArchive();
}

const ARCHIVE_VIEW_HELPERS_API = Object.freeze({
  ARCHIVE_PAGE_SIZE,
  getArchivePage,
  setArchivePage,
  resetArchivePage,
  scrollArchivePageToTop,
  renderArchivePagination,
  getArchiveSortMode,
  setArchiveSortMode,
  archiveSortModeLabel,
  archiveEntryCreatedTime,
  archiveEntrySortComparator,
  sortArchiveFilterPlan,
  defaultArchiveFilterState,
  getArchiveFilterState,
  archiveFilterActiveCount,
  archiveEntryTypeLabel,
  archiveEntryHasConnections,
  archiveEntryHasNotes,
  archiveEntryHasSummary,
  archiveEntryMatchesFilters,
  buildArchiveFilterPlan,
  archiveFilterOptions,
  sanitizeArchiveFilterState,
  archiveFilterPlanContainsEntry,
  updateArchiveFilterControls,
  setArchiveFilterPanelOpen,
  closeArchiveFilterPanel,
  toggleArchiveFilterPanel,
  applyArchiveFiltersFromControls,
  resetArchiveFilters,
  updateArchiveSortControls,
  setArchiveSortPanelOpen,
  closeArchiveSortPanel,
  toggleArchiveSortPanel,
  applyArchiveSortFromControl,
  resetArchiveSort,
});

export function installLegacyArchiveViewHelpersBindings(target = globalThis) {
  Object.assign(target, ARCHIVE_VIEW_HELPERS_API);
  target.WormholesArchiveViewHelpers = ARCHIVE_VIEW_HELPERS_API;
  return ARCHIVE_VIEW_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyArchiveViewHelpersBindings(window);

export {
  ARCHIVE_PAGE_SIZE,
  getArchivePage,
  setArchivePage,
  resetArchivePage,
  scrollArchivePageToTop,
  renderArchivePagination,
  getArchiveSortMode,
  setArchiveSortMode,
  archiveSortModeLabel,
  archiveEntryCreatedTime,
  archiveEntrySortComparator,
  sortArchiveFilterPlan,
  defaultArchiveFilterState,
  getArchiveFilterState,
  archiveFilterActiveCount,
  archiveEntryTypeLabel,
  archiveEntryHasConnections,
  archiveEntryHasNotes,
  archiveEntryHasSummary,
  archiveEntryMatchesFilters,
  buildArchiveFilterPlan,
  archiveFilterOptions,
  sanitizeArchiveFilterState,
  archiveFilterPlanContainsEntry,
  updateArchiveFilterControls,
  setArchiveFilterPanelOpen,
  closeArchiveFilterPanel,
  toggleArchiveFilterPanel,
  applyArchiveFiltersFromControls,
  resetArchiveFilters,
  updateArchiveSortControls,
  setArchiveSortPanelOpen,
  closeArchiveSortPanel,
  toggleArchiveSortPanel,
  applyArchiveSortFromControl,
  resetArchiveSort,
};

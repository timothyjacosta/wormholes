/* GENERATED from scripts/modules/archive-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* EMBEDDED from scripts/modules/archive-view-helpers.mjs for direct-file compatibility. */
/* Wormholes Beta 261 — Archive pagination, filtering, and sorting state.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

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
      typeof (globalThis.controllerServices || globalThis).prefersReducedMotion === "function" &&
      (globalThis.controllerServices || globalThis).prefersReducedMotion()
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

function installLegacyArchiveViewHelpersBindings(target = globalThis) {
  Object.assign(target, ARCHIVE_VIEW_HELPERS_API);
  target.WormholesArchiveViewHelpers = ARCHIVE_VIEW_HELPERS_API;
  return ARCHIVE_VIEW_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyArchiveViewHelpersBindings(window);

/* EMBEDDED from scripts/modules/archive-integrity-helpers.mjs for direct-file compatibility. */
/* Wormholes Beta 261 — Archive link cleanup, schema normalization, and migration remapping.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

function archiveForUniverseLinkCheck(universeId) {
  return universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
}

function entityExistsInUniverse(universeId, entityId, archiveOverride = null) {
  if (!universeId || !entityId) return false;
  const archive = archiveOverride || archiveForUniverseLinkCheck(universeId);
  return archive.some((entry) => entry.id === entityId);
}

function linkBridgeTargetStillExists(bridge, archiveByUniverse = null) {
  if (!bridge || !bridge.universeId) return false;
  if (!universes.some((universe) => universe.id === bridge.universeId)) return false;
  if (!bridge.creationId) return true;

  const targetArchive =
    archiveByUniverse?.get?.(bridge.universeId) || archiveForUniverseLinkCheck(bridge.universeId);
  return entityExistsInUniverse(bridge.universeId, bridge.creationId, targetArchive);
}

function uniqueList(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function cleanupConnectionNotesForArchive(universeId, archive) {
  const ids = new Set(archive.map((entry) => entry.id));
  const notes =
    universeId === currentUniverseId ? connectionNotes : readConnectionNotesForUniverse(universeId);
  let changed = false;

  Object.keys(notes).forEach((key) => {
    const [a, b] = key.split("::");
    if (!ids.has(a) || !ids.has(b)) {
      delete notes[key];
      changed = true;
    }
  });

  if (changed) {
    saveConnectionNotesForUniverse(universeId, notes);
    if (universeId === currentUniverseId) {
      connectionNotes = notes;
    }
  }

  return changed;
}

function bridgeNoteNodeStillExists(nodeKey, archiveByUniverse = null) {
  if (nodeKey.startsWith("U:")) {
    const universeId = nodeKey.slice(2);
    return universes.some((universe) => universe.id === universeId);
  }

  if (nodeKey.startsWith("C:")) {
    const parts = nodeKey.split(":");
    const universeId = parts[1];
    const entityId = parts.slice(2).join(":");
    const archive = archiveByUniverse?.get?.(universeId) || archiveForUniverseLinkCheck(universeId);
    return entityExistsInUniverse(universeId, entityId, archive);
  }

  return false;
}

function cleanupBridgeNotes(archiveByUniverse = null) {
  let changed = false;

  Object.keys(bridgeNotes).forEach((key) => {
    const nodes = key.split("||").filter(Boolean);
    if (
      nodes.length !== 2 ||
      !nodes.every((nodeKey) => bridgeNoteNodeStillExists(nodeKey, archiveByUniverse))
    ) {
      delete bridgeNotes[key];
      changed = true;
    }
  });

  if (changed) saveBridgeNotesToStorage();
  return changed;
}

function cleanupLinksInArchive(universeId, archive, archiveByUniverse = null) {
  const ids = new Set(archive.map((entry) => entry.id));
  let changed = false;

  const cleaned = archive.map((entry) => {
    const oldConnections = entry.connections || [];
    const newConnections = uniqueList(oldConnections).filter(
      (connectionId) => connectionId !== entry.id && ids.has(connectionId),
    );

    const rawBridges = entry.bridges || [];
    const newBridges = rawBridges
      .map((globalThis.controllerServices || globalThis).normalizeBridge)
      .filter((bridge) => linkBridgeTargetStillExists(bridge, archiveByUniverse));

    const oldGroupIds = groupChildIds(entry);
    const newGroupIds = isGroupEntry(entry)
      ? uniqueList(oldGroupIds).filter((childId) => childId !== entry.id && ids.has(childId))
      : entry.groupIds;

    if (
      JSON.stringify(newConnections) !== JSON.stringify(oldConnections) ||
      JSON.stringify(newBridges) !==
        JSON.stringify((globalThis.controllerServices || globalThis).normalizeBridges(rawBridges)) ||
      (isGroupEntry(entry) && JSON.stringify(newGroupIds) !== JSON.stringify(oldGroupIds))
    ) {
      changed = true;
    }

    return {
      ...entry,
      connections: newConnections,
      bridges: newBridges,
      ...(isGroupEntry(entry) ? {groupIds: newGroupIds} : {}),
    };
  });

  return {archive: cleaned, changed};
}

function cleanupAllStaleLinks() {
  const archiveByUniverse = new Map();
  universes.forEach((universe) => {
    archiveByUniverse.set(
      universe.id,
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id),
    );
  });

  universes.forEach((universe) => {
    const archive = archiveByUniverse.get(universe.id) || [];
    const result = cleanupLinksInArchive(universe.id, archive, archiveByUniverse);
    cleanupConnectionNotesForArchive(universe.id, result.archive);

    if (result.changed) {
      archiveByUniverse.set(universe.id, result.archive);
      if (universe.id === currentUniverseId) {
        archiveEntries = result.archive;
        saveArchiveToStorage();
      } else {
        saveArchiveForUniverse(universe.id, result.archive);
      }
    }
  });

  let universesChanged = false;
  universes.forEach((universe) => {
    const oldBridges = universe.bridges || [];
    const newBridges = oldBridges
      .map((bridge) => (globalThis.controllerServices || globalThis).normalizeUniverseBridge(bridge, universe.id))
      .filter(
        (bridge) =>
          bridge &&
          bridge.universeId !== universe.id &&
          linkBridgeTargetStillExists(bridge, archiveByUniverse),
      );

    if (
      JSON.stringify(newBridges) !==
      JSON.stringify((globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe))
    ) {
      universesChanged = true;
    }

    universe.bridges = newBridges;
  });

  cleanupBridgeNotes(archiveByUniverse);
  if (universesChanged) saveUniversesToStorage();
}

function cleanupLinksToDeletedEntity(deletedUniverseId, deletedEntityId) {
  if (!deletedUniverseId || !deletedEntityId) return;

  const archiveByUniverse = new Map();
  universes.forEach((universe) => {
    archiveByUniverse.set(
      universe.id,
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id),
    );
  });

  universes.forEach((universe) => {
    const archive = archiveByUniverse.get(universe.id) || [];
    let archiveChanged = false;
    const ids = new Set(archive.map((entry) => entry.id));

    const cleanedArchive = archive.map((entry) => {
      const oldConnections = entry.connections || [];
      const newConnections = uniqueList(oldConnections).filter(
        (connectionId) =>
          connectionId !== entry.id &&
          ids.has(connectionId) &&
          !(universe.id === deletedUniverseId && connectionId === deletedEntityId),
      );

      const rawBridges = entry.bridges || [];
      const newBridges = rawBridges
        .map((globalThis.controllerServices || globalThis).normalizeBridge)
        .filter(
          (bridge) =>
            bridge &&
            !(bridge.universeId === deletedUniverseId && bridge.creationId === deletedEntityId) &&
            linkBridgeTargetStillExists(bridge, archiveByUniverse),
        );

      const oldGroupIds = groupChildIds(entry);
      const newGroupIds = isGroupEntry(entry)
        ? uniqueList(oldGroupIds).filter(
            (childId) => childId !== deletedEntityId && childId !== entry.id && ids.has(childId),
          )
        : entry.groupIds;

      if (
        JSON.stringify(newConnections) !== JSON.stringify(oldConnections) ||
        JSON.stringify(newBridges) !==
          JSON.stringify((globalThis.controllerServices || globalThis).normalizeBridges(rawBridges)) ||
        (isGroupEntry(entry) && JSON.stringify(newGroupIds) !== JSON.stringify(oldGroupIds))
      ) {
        archiveChanged = true;
      }

      return {
        ...entry,
        connections: newConnections,
        bridges: newBridges,
        ...(isGroupEntry(entry) ? {groupIds: newGroupIds} : {}),
      };
    });

    cleanupConnectionNotesForArchive(universe.id, cleanedArchive);

    if (archiveChanged) {
      archiveByUniverse.set(universe.id, cleanedArchive);
      if (universe.id === currentUniverseId) {
        archiveEntries = cleanedArchive;
        saveArchiveToStorage();
      } else {
        saveArchiveForUniverse(universe.id, cleanedArchive);
      }
    }
  });

  let universesChanged = false;
  universes.forEach((universe) => {
    const rawBridges = universe.bridges || [];
    const newBridges = rawBridges
      .map((bridge) => (globalThis.controllerServices || globalThis).normalizeUniverseBridge(bridge, universe.id))
      .filter(
        (bridge) =>
          bridge &&
          !(bridge.universeId === deletedUniverseId && bridge.creationId === deletedEntityId) &&
          linkBridgeTargetStillExists(bridge, archiveByUniverse),
      );

    if (
      JSON.stringify(newBridges) !==
      JSON.stringify((globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe))
    ) {
      universesChanged = true;
    }

    universe.bridges = newBridges;
  });

  Object.keys(bridgeNotes).forEach((key) => {
    if (key.split("||").includes(`C:${deletedUniverseId}:${deletedEntityId}`)) {
      delete bridgeNotes[key];
    }
  });
  cleanupBridgeNotes(archiveByUniverse);

  if (universesChanged) saveUniversesToStorage();
}

function normalizeGenerationDiagnostics(metadata) {
  const sharedNormalizer = globalThis.WormholesGenerationVersioning?.normalizeDiagnostic;
  if (typeof sharedNormalizer === "function") return sharedNormalizer(metadata);

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const version = Number(metadata.version);
  if (version !== 1 && version !== 2) return null;
  const seed = String(metadata.seed || "")
    .trim()
    .toLowerCase();
  const algorithm = String(metadata.algorithm || "").trim();
  const seedBehaviorVersion = String(
    metadata.seedBehaviorVersion || (version === 1 ? "xorshift32-inclusive-int-v1" : ""),
  ).trim();
  const generatorVersion = String(metadata.generatorVersion || "").trim();
  const tableVersion = String(metadata.tableVersion || "").trim();
  const tableFingerprint = String(metadata.tableFingerprint || "")
    .trim()
    .toLowerCase();
  const draws = Number(metadata.draws);

  if (!/^[0-9a-f]{8}$/.test(seed) || algorithm !== "xorshift32-v1") return null;
  if (!seedBehaviorVersion || seedBehaviorVersion.length > 80) return null;
  if (!generatorVersion || generatorVersion.length > 40) return null;
  if (!tableVersion || tableVersion.length > 80) return null;
  if (version === 2 && !/^[0-9a-f]{8}$/.test(tableFingerprint)) return null;
  if (tableFingerprint && !/^[0-9a-f]{8}$/.test(tableFingerprint)) return null;
  if (!Number.isInteger(draws) || draws < 0 || draws > 10000) return null;

  const actions = Array.isArray(metadata.actions)
    ? metadata.actions
        .slice(0, 100)
        .map((action) => {
          if (!action || typeof action !== "object" || Array.isArray(action)) return null;
          const kind = String(action.kind || "").trim();
          if (!["what", "attribute", "story", "quick-full"].includes(kind)) return null;
          const rolls = {};
          if (action.rolls && typeof action.rolls === "object" && !Array.isArray(action.rolls)) {
            Object.entries(action.rolls)
              .slice(0, 8)
              .forEach(([key, value]) => {
                const cleanKey = String(key || "").trim();
                if (!/^[a-z][a-z0-9]{0,19}$/i.test(cleanKey)) return;
                if (Number.isInteger(value) && value >= 1 && value <= 40) rolls[cleanKey] = value;
              });
          }
          return {kind, rolls};
        })
        .filter(Boolean)
    : [];

  return {
    version,
    seed,
    algorithm,
    seedBehaviorVersion,
    generatorVersion,
    tableVersion,
    ...(tableFingerprint ? {tableFingerprint} : {}),
    draws,
    actions,
    ...(metadata.authoredChanges === true ? {authoredChanges: true} : {}),
  };
}

function normalizeSchemaArchiveEntry(entry, options = {}) {
  const validUniverseIds =
    options.validUniverseIds instanceof Set ? options.validUniverseIds : null;
  const canonicalBuilder = window.WormholesCanonicalPersistence?.builders?.archive;
  if (canonicalBuilder) {
    const canonical = canonicalBuilder(entry || {}, {
      idFactory: makeId,
      validUniverseIds,
      dropInvalidReferences: !!validUniverseIds,
      normalizeGeneration:
        typeof normalizeGenerationDiagnostics === "function"
          ? normalizeGenerationDiagnostics
          : undefined,
    });
    return {
      ...canonical,
      connections: [...canonical.connections],
      bridges: canonical.bridges.map((bridge) => ({...bridge})),
      ...(canonical.notes ? {notes: [...canonical.notes]} : {}),
      ...(canonical.groupIds ? {groupIds: [...canonical.groupIds]} : {}),
      ...(canonical._generation
        ? {_generation: JSON.parse(JSON.stringify(canonical._generation))}
        : {}),
    };
  }
  const isGroup =
    entry?.kind === "group" || Array.isArray(entry?.groupIds) || Array.isArray(entry?.children);
  const normalized = {
    ...entry,
    id: entry?.id || makeId(),
    title: entry?.title || (isGroup ? "Untitled Group" : "Untitled Creation"),
    connections: Array.isArray(entry?.connections)
      ? Array.from(new Set(entry.connections.filter(Boolean)))
      : [],
    bridges: validUniverseIds
      ? (globalThis.controllerServices || globalThis).normalizeBridgeListForImport(entry?.bridges, "", validUniverseIds)
      : (globalThis.controllerServices || globalThis).normalizeBridges(entry?.bridges),
    createdAt: entry?.createdAt || new Date().toISOString(),
  };
  if (isGroup) {
    normalized.kind = "group";
    normalized.groupIds = Array.isArray(entry?.groupIds)
      ? entry.groupIds
      : Array.isArray(entry?.children)
        ? entry.children
        : [];
    delete normalized.children;
    normalized.what = normalized.what || {val: "Group"};
  }
  if (normalized.notes) normalized.notes = cleanNotesArray(normalized.notes);
  if (!normalized.notes?.length) delete normalized.notes;
  const generationMetadata =
    typeof normalizeGenerationDiagnostics === "function"
      ? normalizeGenerationDiagnostics(entry?._generation)
      : entry?._generation &&
          typeof entry._generation === "object" &&
          !Array.isArray(entry._generation)
        ? JSON.parse(JSON.stringify(entry._generation))
        : null;
  if (generationMetadata) normalized._generation = generationMetadata;
  else delete normalized._generation;
  return normalized;
}

function entryHasArchivableCreationData(values) {
  return !!(values.what || values.attr1 || values.attr2 || values.pressure);
}

function cloneMigratedArchiveEntries(
  sourceArchive,
  idsToMigrate,
  sourceUniverse,
  targetUniverseId,
) {
  const wanted = new Set(idsToMigrate || []);
  const idMap = {};

  sourceArchive.forEach((entry) => {
    if (wanted.has(entry.id)) idMap[entry.id] = makeId();
  });

  const migratedEntries = sourceArchive
    .filter((entry) => wanted.has(entry.id))
    .map((entry) => {
      const clone = JSON.parse(JSON.stringify(entry));
      const oldId = clone.id;
      clone.id = idMap[oldId];
      clone.connections = (clone.connections || [])
        .filter((connectionId) => idMap[connectionId])
        .map((connectionId) => idMap[connectionId]);

      if (isGroupEntry(clone)) {
        clone.groupIds = groupChildIds(clone)
          .filter((childId) => idMap[childId])
          .map((childId) => idMap[childId]);
        delete clone.children;
        clone.attr2 = {
          val: `${clone.groupIds.length} grouped item${clone.groupIds.length === 1 ? "" : "s"}`,
        };
      }

      clone.bridges = (globalThis.controllerServices || globalThis).normalizeBridges(clone.bridges)
        .filter((bridge) => bridge.universeId !== sourceUniverse?.id);
      clone.storage = "";
      clone.folderFileName = "";
      clone.migratedAt = new Date().toISOString();
      clone.migratedFromUniverse = sourceUniverse ? sourceUniverse.title : "";
      return clone;
    });

  return {idMap, migratedEntries};
}

function remapBridgeNotesForMigratedEntries(sourceUniverseId, targetUniverseId, idMap) {
  let changed = false;
  Object.entries({...bridgeNotes}).forEach(([key, note]) => {
    const parts = key.split("||");
    const nextParts = parts.map((part) => {
      const prefix = `C:${sourceUniverseId}:`;
      if (part.startsWith(prefix)) {
        const oldId = part.slice(prefix.length);
        if (idMap[oldId]) return `C:${targetUniverseId}:${idMap[oldId]}`;
      }
      return part;
    });

    const nextKey = nextParts.sort().join("||");
    if (nextKey !== key) {
      bridgeNotes[nextKey] = note;
      delete bridgeNotes[key];
      changed = true;
    }
  });

  if (changed) saveBridgeNotesToStorage();
}

function remapIncomingBridgesForMigration(sourceUniverseId, targetUniverseId, idMap) {
  let universesChanged = false;

  universes.forEach((universe) => {
    let universeBridgeChanged = false;
    const nextUniverseBridges = (globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe)
      .map((bridge) => {
        if (
          bridge.universeId === sourceUniverseId &&
          bridge.creationId &&
          idMap[bridge.creationId]
        ) {
          universeBridgeChanged = true;
          return {universeId: targetUniverseId, creationId: idMap[bridge.creationId]};
        }
        return bridge;
      });

    if (universeBridgeChanged) {
      universe.bridges = nextUniverseBridges;
      universesChanged = true;
    }

    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    let archiveChanged = false;
    archive.forEach((entry) => {
      const nextBridges = (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges).map((bridge) => {
        if (
          bridge.universeId === sourceUniverseId &&
          bridge.creationId &&
          idMap[bridge.creationId]
        ) {
          archiveChanged = true;
          return {universeId: targetUniverseId, creationId: idMap[bridge.creationId]};
        }
        return bridge;
      });
      entry.bridges = (globalThis.controllerServices || globalThis).normalizeBridges(nextBridges);
    });

    if (archiveChanged) {
      if (universe.id === currentUniverseId) saveArchiveToStorage();
      else saveArchiveForUniverse(universe.id, archive);
    }
  });

  if (universesChanged) saveUniversesToStorage();
}

function cleanupConnectionsForRemovedEntries(ids) {
  const removeSet = new Set(ids || []);
  if (removeSet.size === 0) return;

  archiveEntries = archiveEntries
    .filter((item) => !removeSet.has(item.id))
    .map((item) => ({
      ...item,
      connections: (item.connections || []).filter((connectionId) => !removeSet.has(connectionId)),
      ...(isGroupEntry(item)
        ? {groupIds: groupChildIds(item).filter((childId) => !removeSet.has(childId))}
        : {}),
      bridges: (globalThis.controllerServices || globalThis).normalizeBridges(item.bridges)
        .filter(
          (bridge) =>
            !(bridge.universeId === currentUniverseId && removeSet.has(bridge.creationId)),
        ),
    }));

  removeSet.forEach((id) => {
    if (connectSourceId === id) connectSourceId = null;
    if (selectedMapNodeId === id) selectedMapNodeId = null;
    if (
      selectedWormholeCreation?.universeId === currentUniverseId &&
      selectedWormholeCreation?.creationId === id
    ) {
      selectedWormholeCreation = null;
    }
    Object.keys(connectionNotes).forEach((key) => {
      if (key.split("::").includes(id)) delete connectionNotes[key];
    });
    cleanupLinksToDeletedEntity(currentUniverseId, id);
  });

  normalizeArchiveGroups();
}

const ARCHIVE_INTEGRITY_HELPERS_API = Object.freeze({
  archiveForUniverseLinkCheck,
  entityExistsInUniverse,
  linkBridgeTargetStillExists,
  uniqueList,
  cleanupConnectionNotesForArchive,
  bridgeNoteNodeStillExists,
  cleanupBridgeNotes,
  cleanupLinksInArchive,
  cleanupAllStaleLinks,
  cleanupLinksToDeletedEntity,
  normalizeGenerationDiagnostics,
  normalizeSchemaArchiveEntry,
  entryHasArchivableCreationData,
  cloneMigratedArchiveEntries,
  remapBridgeNotesForMigratedEntries,
  remapIncomingBridgesForMigration,
  cleanupConnectionsForRemovedEntries,
});

function installLegacyArchiveIntegrityHelpersBindings(target = globalThis) {
  Object.assign(target, ARCHIVE_INTEGRITY_HELPERS_API);
  target.WormholesArchiveIntegrityHelpers = ARCHIVE_INTEGRITY_HELPERS_API;
  return ARCHIVE_INTEGRITY_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyArchiveIntegrityHelpersBindings(window);
/* Wormholes Beta 110 archive module.
   Archive helpers, entry rendering, grouping, deletion, migration, and creation-folder sync extracted from wormholes-app.js.
   Loaded before wormholes-app.js so existing global functions remain available to the app core. */



function getEntry(id) {
  return (
    window.WormholesAppModel?.collections?.findById?.(archiveEntries, id) ||
    archiveEntries.find((entry) => entry.id === id)
  );
}

function getTitle(id) {
  const entry = getEntry(id);
  return entry ? entry.title : "Missing creation";
}

function isGroupEntry(entry) {
  return !!entry && entry.kind === "group";
}

function groupChildIds(entry) {
  if (!isGroupEntry(entry)) return [];
  return (
    window.WormholesAppModel?.collections?.groupChildIds?.(entry) ||
    (Array.isArray(entry.groupIds)
      ? entry.groupIds
      : Array.isArray(entry.children)
        ? entry.children
        : [])
  );
}

function getGroupForEntryId(entryId, entries = archiveEntries) {
  return (
    window.WormholesAppModel?.collections?.groupForChild?.(entries, entryId, isGroupEntry) ||
    entries.find((entry) => isGroupEntry(entry) && groupChildIds(entry).includes(entryId)) ||
    null
  );
}

function topLevelArchiveEntries(entries = archiveEntries) {
  return (
    window.WormholesAppModel?.collections?.topLevelItems?.(entries, isGroupEntry) ||
    (() => {
      const groupedIds = new Set();
      entries.forEach((entry) => {
        if (isGroupEntry(entry)) groupChildIds(entry).forEach((id) => groupedIds.add(id));
      });
      return entries.filter((entry) => !groupedIds.has(entry.id));
    })()
  );
}

function mapArchiveEntries(entries = archiveEntries) {
  return topLevelArchiveEntries(entries);
}

function mapEntryForIdInEntries(entryId, entries = archiveEntries) {
  const group = getGroupForEntryId(entryId, entries);
  if (group) return group;
  return entries.find((entry) => entry.id === entryId) || null;
}

function getMapArchiveEntryFromUniverse(universeId, creationId) {
  const archive = readArchiveForUniverse(universeId);
  return mapEntryForIdInEntries(creationId, archive);
}

function visibleEntryIdForUniverseEntry(universeId, creationId) {
  const archive =
    universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
  const mapped = mapEntryForIdInEntries(creationId, archive);
  return mapped ? mapped.id : creationId;
}

function visibleEntryTitleForUniverseEntry(universeId, creationId) {
  const archive =
    universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
  const mapped = mapEntryForIdInEntries(creationId, archive);
  return mapped
    ? mapped.title
    : (globalThis.controllerServices || globalThis).getCreationTitleFromUniverse(universeId, creationId);
}

function isGroupedChildInUniverse(universeId, creationId) {
  const archive =
    universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
  return !!getGroupForEntryId(creationId, archive);
}

function displayEntryWhat(entry) {
  if (isGroupEntry(entry)) {
    const count = groupChildIds(entry).length;
    return `Group — ${count} creation${count === 1 ? "" : "s"}`;
  }
  return displayValue(entry.what);
}

function cleanupRemovedArchiveGroups(removedGroupIds = []) {
  removedGroupIds.forEach((groupId) => {
    removeExternalReferencesToGroup(groupId);
    removeGroupRelationshipNotes(groupId);
    if (connectSourceId === groupId) connectSourceId = null;
    if (selectedMapNodeId === groupId) selectedMapNodeId = null;
  });
}

function normalizeArchiveGroups(options = {}) {
  const existingIds = new Set(archiveEntries.map((entry) => entry.id));
  const removedGroupIds = [];
  let changed = false;

  archiveEntries = archiveEntries
    .map((entry) => {
      if (!isGroupEntry(entry)) return entry;

      const oldIds = groupChildIds(entry);
      const groupIds = oldIds.filter((id) => existingIds.has(id) && id !== entry.id);
      if (groupIds.length < 2) {
        removedGroupIds.push(entry.id);
        changed = true;
        return null;
      }

      if (
        JSON.stringify(groupIds) !== JSON.stringify(oldIds) ||
        !entry.groupIds ||
        entry.children
      ) {
        changed = true;
      }

      return {
        ...entry,
        kind: "group",
        groupIds,
        what: entry.what || {val: "Group"},
        attr1: entry.attr1 || {val: "Grouped creations"},
        attr2: {val: `${groupIds.length} grouped item${groupIds.length === 1 ? "" : "s"}`},
        pressure: entry.pressure || {val: "A gathered set of creations within this universe."},
        connections: (entry.connections || []).filter(
          (id) => existingIds.has(id) && id !== entry.id,
        ),
        bridges: (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges),
      };
    })
    .filter(Boolean);

  if (removedGroupIds.length) {
    archiveEntries = archiveEntries.map((entry) => ({
      ...entry,
      connections: (entry.connections || []).filter((id) => !removedGroupIds.includes(id)),
      bridges: (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges)
        .filter(
          (bridge) =>
            !(
              bridge.universeId === currentUniverseId && removedGroupIds.includes(bridge.creationId)
            ),
        ),
    }));

    if (options.cleanup !== false) {
      cleanupRemovedArchiveGroups(removedGroupIds);
    }
  }

  if (changed && options.persist !== false) {
    saveArchiveToStorage();
  }

  return {changed, removedGroupIds};
}

function renderSummary(entry) {
  if (!entry.summary || !entry.summary.trim()) {
    return "";
  }

  return `
    <div class="summary-block">
      <h4>Summary</h4>
      <p>${escapeHtml(entry.summary)}</p>
    </div>
  `;
}

function openSummaryModal(entryId) {
  const entry = getEntry(entryId);
  if (!entry) return;

  activeSummaryEntryId = entryId;
  document.getElementById("summaryError").classList.remove("show");
  document.getElementById("summaryModalSubtitle").textContent = entry.title;
  document.getElementById("summaryTextInput").value = entry.summary || "";
  setDestructiveButtonVisibility("deleteSummaryBtn", !!(entry.summary && entry.summary.trim()));
  document.getElementById("summaryModal").classList.add("open");
  setTimeout(() => document.getElementById("summaryTextInput").focus(), 0);
}

function closeSummaryModal() {
  document.getElementById("summaryModal").classList.remove("open");
  activeSummaryEntryId = null;
}

function saveSummaryText() {
  if (!activeSummaryEntryId) return;

  const entry = getEntry(activeSummaryEntryId);
  if (!entry) return;

  const text = document.getElementById("summaryTextInput").value.trim();
  if (!text) {
    document.getElementById("summaryError").classList.add("show");
    document.getElementById("summaryTextInput").focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("note", text, {
      previousValue: entry.summary || "",
      fieldName: "summary",
      context: entry.title || "",
      operation: "save this summary",
    }).ok
  )
    return;
  entry.summary = text;
  if (!saveArchiveToStorage()) return;
  closeSummaryModal();
  renderArchive();
  showSavedToast("Summary saved");
}

function deleteSummaryText() {
  if (!activeSummaryEntryId) return;

  const entry = getEntry(activeSummaryEntryId);
  if (!entry) return;
  const undoState = window.WormholesUndo?.captureState?.();

  delete entry.summary;
  if (!saveArchiveToStorage()) return;
  closeSummaryModal();
  renderArchive();
  if (window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Summary deleted",
      restoredMessage: "Summary restored",
      state: undoState,
    });
  } else {
    showSavedToast("Summary deleted");
  }
}

function cleanNoteText(note) {
  return String(note || "")
    .replace(/^(\s*[•*-]\s*)+/, "")
    .trim();
}

function cleanNotesArray(notes) {
  return (notes || []).map(cleanNoteText).filter(Boolean);
}

function normalizeArchiveNotes() {
  let changed = false;

  archiveEntries.forEach((entry) => {
    if (!entry.notes) return;

    const cleaned = cleanNotesArray(entry.notes);
    const original = JSON.stringify(entry.notes);
    const updated = JSON.stringify(cleaned);

    if (original !== updated) {
      changed = true;
      if (cleaned.length) {
        entry.notes = cleaned;
      } else {
        delete entry.notes;
      }
    }
  });

  if (changed) {
    saveArchiveToStorage();
  }
}

function renderEditNotesList(notes) {
  const list = document.getElementById("editNotesList");
  const cleaned = cleanNotesArray(notes);

  if (cleaned.length === 0) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = cleaned
    .map(
      (note) => `
    <div class="edit-note-row">
      <span class="edit-note-bullet">•</span>
      <textarea class="edit-note-input" maxlength="250000" rows="2">${escapeHtml(note)}</textarea>
    </div>
  `,
    )
    .join("");
}

function getEditNotesFromList() {
  return cleanNotesArray(
    Array.from(document.querySelectorAll("#editNotesList .edit-note-input")).map(
      (input) => input.value,
    ),
  );
}

function saveEditNotesOnly() {
  if (!activeEditEntryId) return;

  const entry = getEntry(activeEditEntryId);
  if (!entry) return;

  const notes = getEditNotesFromList();
  const previousNotes = cleanNotesArray(entry.notes);
  for (let index = 0; index < notes.length; index += 1) {
    if (
      window.WormholesContentLimits &&
      !window.WormholesContentLimits.ensureString("note", notes[index], {
        previousValue: previousNotes[index] || "",
        fieldName: "note",
        context: entry.title || "",
        operation: "save these notes",
      }).ok
    )
      return;
  }
  const previousNoteCount = previousNotes.length;
  if (
    notes.length > previousNoteCount &&
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure(
      "notes",
      previousNoteCount,
      notes.length - previousNoteCount,
      {context: entry.title || "", operation: "add these notes"},
    ).ok
  )
    return;
  if (notes.length) {
    entry.notes = notes;
  } else {
    delete entry.notes;
  }

  saveArchiveToStorage();
}

function openEditAddNoteModal() {
  if (!activeEditEntryId) return;

  saveEditNotesOnly();
  openNoteModal(activeEditEntryId);
}

function renderNotes(entry) {
  const notes = cleanNotesArray(entry.notes);

  if (notes.length === 0) {
    return "";
  }

  return `
    <div class="notes-block">
      <h4>Notes</h4>
      <ul class="notes-list">
        ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function openNoteModal(entryId) {
  const entry = getEntry(entryId);
  if (!entry) return;

  activeNoteEntryId = entryId;
  document.getElementById("noteError").classList.remove("show");
  document.getElementById("noteModalSubtitle").textContent = entry.title;
  document.getElementById("noteTextInput").value = "";
  document.getElementById("noteModal").classList.add("open");
  setTimeout(() => document.getElementById("noteTextInput").focus(), 0);
}

function closeNoteModal() {
  document.getElementById("noteModal").classList.remove("open");
  activeNoteEntryId = null;
}

function saveNoteText() {
  if (!activeNoteEntryId) return;

  const entry = getEntry(activeNoteEntryId);
  if (!entry) return;

  const text = cleanNoteText(document.getElementById("noteTextInput").value);
  if (!text) {
    document.getElementById("noteError").classList.add("show");
    document.getElementById("noteTextInput").focus();
    return;
  }

  entry.notes = cleanNotesArray(entry.notes);
  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("note", text, {
      fieldName: "note",
      context: entry.title || "",
      operation: "save this note",
    }).ok
  )
    return;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("notes", entry.notes.length, 1, {
      context: entry.title || "",
      operation: "add another note",
    }).ok
  )
    return;
  entry.notes.push(text);

  const savedEntryId = activeNoteEntryId;

  if (!saveArchiveToStorage()) return;
  closeNoteModal();

  if (
    activeEditEntryId === savedEntryId &&
    document.getElementById("editModal").classList.contains("open")
  ) {
    renderEditNotesList(entry.notes);
  }

  renderArchive();
  showSavedToast("Note saved");
}

function renderBridges(entry) {
  const bridges = (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges);
  if (bridges.length === 0) {
    return "";
  }

  return `
    <p><b>Bridges:</b></p>
    <ul class="connection-list">
      ${bridges
        .map((bridge) => {
          const universeTitle = (globalThis.controllerServices || globalThis).getUniverseTitle(bridge.universeId);
          const creationTitle = bridge.creationId
            ? (globalThis.controllerServices || globalThis).getCreationTitleFromUniverse(bridge.universeId, bridge.creationId)
            : "";
          return `<li>${escapeHtml(creationTitle ? `${universeTitle} → ${creationTitle}` : universeTitle)}</li>`;
        })
        .join("")}
    </ul>
  `;
}

function renderConnections(entry) {
  const connections = (entry.connections || []).filter((id) => getEntry(id));
  if (connections.length === 0) {
    return `<p><b>Connections:</b> —</p>`;
  }

  return `
    <p><b>Connections:</b></p>
    <ul class="connection-list">
      ${connections.map((id) => `<li>${escapeHtml(getTitle(id))}</li>`).join("")}
    </ul>
  `;
}

function renderGroupChoiceList(candidates, selectedIds = new Set(), lockedIds = new Set()) {
  const list = document.getElementById("groupCreationList");

  list.innerHTML = candidates.length
    ? candidates
        .map((entry) => {
          const isSelected = selectedIds.has(entry.id);
          const isLocked = lockedIds.has(entry.id);
          const whatLabel =
            activeGroupContext === "literature"
              ? (globalThis.controllerServices || globalThis).literatureFileTypeLabel(entry)
              : entry.what?.val
                ? entry.what.val.split("—")[0].trim()
                : "Creation";
          return `
          <div class="group-choice ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""}" data-entry-id="${escapeHtml(entry.id)}" tabindex="0" role="checkbox" aria-checked="${isSelected ? "true" : "false"}" ${isLocked ? `aria-disabled="true"` : ""} aria-label="${escapeHtml(`${isSelected ? "Selected" : "Select"} ${activeGroupContext === "literature" ? "literature" : "creation"} for group: ${entry.title}. ${whatLabel}${isLocked ? ". Starting item" : ""}`)}">
            <span>
              <span class="group-choice-title">${escapeHtml(entry.title)}${isLocked ? " (starting item)" : ""}</span>
              <span class="group-choice-meta">${escapeHtml(whatLabel)}</span>
            </span>
          </div>
        `;
        })
        .join("")
    : `<div class="universe-empty">There are no eligible ${activeGroupContext === "literature" ? "literature documents" : "creations"} available for this group.</div>`;

  list.querySelectorAll(".group-choice").forEach((choice) => {
    const toggleChoice = () => {
      if (choice.classList.contains("locked")) return;
      choice.classList.toggle("selected");
      const checked = choice.classList.contains("selected") ? "true" : "false";
      choice.setAttribute("aria-checked", checked);
    };

    choice.addEventListener("click", toggleChoice);
    choice.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleChoice();
      }
    });
  });
}

function openGroupModal(entryId) {
  const source = getEntry(entryId);
  if (!source || isGroupEntry(source) || getGroupForEntryId(entryId)) return;

  activeGroupEntryId = entryId;
  activeGroupMode = "create";
  activeGroupContext = "creation";
  document.getElementById("groupModalTitle").textContent = "Group Creations";
  document.getElementById("saveGroupBtn").textContent = "Create Group";
  document.getElementById("groupError").classList.remove("show");
  document.getElementById("groupError").textContent =
    "Enter a group title and choose at least two creations.";
  document.getElementById("groupTitleInput").value = "";
  document.getElementById("groupModalSubtitle").textContent =
    `Group "${source.title}" with other creations in this universe.`;

  const candidates = archiveEntries.filter(
    (entry) => !isGroupEntry(entry) && (!getGroupForEntryId(entry.id) || entry.id === entryId),
  );

  if (candidates.length <= 1) {
    document.getElementById("groupCreationList").innerHTML =
      `<div class="universe-empty">There are no other ungrouped creations available to group with this item.</div>`;
  } else {
    renderGroupChoiceList(candidates, new Set([entryId]), new Set([entryId]));
  }

  document.getElementById("groupModal").classList.add("open");
  setTimeout(() => document.getElementById("groupTitleInput").focus(), 0);
}

function openEditGroupModal(groupId) {
  const group = getEntry(groupId);
  if (!isGroupEntry(group)) return;

  activeGroupEntryId = groupId;
  activeGroupMode = "edit";
  activeGroupContext = "creation";
  document.getElementById("groupModalTitle").textContent = "Edit Group";
  document.getElementById("saveGroupBtn").textContent = "Save Group";
  document.getElementById("groupError").classList.remove("show");
  document.getElementById("groupError").textContent =
    "Enter a group title and choose at least two creations.";
  document.getElementById("groupTitleInput").value = group.title || "";
  document.getElementById("groupModalSubtitle").textContent =
    `Add or remove creations from "${group.title}". Child connections and bridges are preserved.`;

  const currentChildIds = new Set(groupChildIds(group));
  const candidates = archiveEntries.filter((entry) => {
    if (isGroupEntry(entry)) return false;
    const existingGroup = getGroupForEntryId(entry.id);
    return !existingGroup || existingGroup.id === group.id || currentChildIds.has(entry.id);
  });

  renderGroupChoiceList(candidates, currentChildIds, new Set());

  document.getElementById("groupModal").classList.add("open");
  setTimeout(() => document.getElementById("groupTitleInput").focus(), 0);
}

function closeGroupModal() {
  document.getElementById("groupModal")?.classList.remove("open");
  activeGroupEntryId = null;
  activeGroupMode = "create";
  activeGroupContext = "creation";
  document.getElementById("groupModalTitle").textContent = "Group Creations";
  document.getElementById("saveGroupBtn").textContent = "Create Group";
}

function selectedGroupChoiceIds() {
  return Array.from(document.querySelectorAll("#groupCreationList .group-choice.selected"))
    .map((choice) => choice.dataset.entryId)
    .filter(Boolean);
}

function saveGroupModal() {
  if (activeGroupContext === "literature") {
    if (activeGroupMode === "edit") {
      (globalThis.controllerServices || globalThis).saveEditedLiteratureGroupFromModal();
    } else {
      (globalThis.controllerServices || globalThis).createLiteratureGroupFromModal();
    }
    return;
  }

  if (activeGroupMode === "edit") {
    saveEditedGroupFromModal();
  } else {
    createGroupFromModal();
  }
}

async function createGroupFromModal() {
  const source = getEntry(activeGroupEntryId);
  const titleInput = document.getElementById("groupTitleInput");
  const title = titleInput.value.trim();
  const selectedChoiceIds = selectedGroupChoiceIds();

  const selectedIds = Array.from(
    new Set([activeGroupEntryId, ...selectedChoiceIds].filter(Boolean)),
  ).filter((id) => {
    const entry = getEntry(id);
    return entry && !isGroupEntry(entry);
  });

  if (!source || !title || selectedIds.length < 2) {
    document.getElementById("groupError").classList.add("show");
    if (!title) titleInput.focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      fieldName: "group title",
      operation: "create this group",
    }).ok
  )
    return;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("archive", archiveEntries.length, 1, {
      context: (globalThis.controllerServices || globalThis).getCurrentUniverse()?.title || "",
      operation: "create another Archive item",
    }).ok
  )
    return;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("groupMembers", 0, selectedIds.length, {
      context: title,
      operation: "create this group",
    }).ok
  )
    return;

  const previousArchiveEntries = JSON.parse(JSON.stringify(archiveEntries));

  archiveEntries.forEach((entry) => {
    if (isGroupEntry(entry)) {
      entry.groupIds = groupChildIds(entry).filter((id) => !selectedIds.includes(id));
    }
  });

  const groupEntry = {
    id: makeId(),
    kind: "group",
    title,
    what: {val: "Group"},
    attr1: {val: "Grouped creations"},
    attr2: {val: `${selectedIds.length} grouped item${selectedIds.length === 1 ? "" : "s"}`},
    pressure: {val: "A gathered set of creations within this universe."},
    groupIds: selectedIds,
    connections: [],
    bridges: [],
    notes: [],
    createdAt: new Date().toISOString(),
  };

  const firstIndex = archiveEntries.findIndex((entry) => selectedIds.includes(entry.id));
  archiveEntries.splice(firstIndex >= 0 ? firstIndex : 0, 0, groupEntry);
  const normalization = normalizeArchiveGroups({persist: false, cleanup: false});

  if (!saveArchiveToStorage()) {
    archiveEntries = previousArchiveEntries;
    return;
  }

  cleanupRemovedArchiveGroups(normalization.removedGroupIds);
  await writeArchiveEntryToFolderIfNeeded(groupEntry);
  closeGroupModal();
  renderArchive();
  (globalThis.controllerServices || globalThis).renderWormholesMap();
  showSavedToast("Group created");
}

function saveEditedGroupFromModal() {
  const group = getEntry(activeGroupEntryId);
  const titleInput = document.getElementById("groupTitleInput");
  const title = titleInput.value.trim();
  const selectedIds = Array.from(new Set(selectedGroupChoiceIds())).filter((id) => {
    const entry = getEntry(id);
    return entry && !isGroupEntry(entry);
  });

  if (!isGroupEntry(group) || !title || selectedIds.length < 2) {
    document.getElementById("groupError").classList.add("show");
    if (!title) titleInput.focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      previousValue: group.title || "",
      fieldName: "group title",
      operation: "save this group",
    }).ok
  )
    return;
  const previousIds = new Set(groupChildIds(group));
  if (
    selectedIds.length > previousIds.size &&
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure(
      "groupMembers",
      previousIds.size,
      selectedIds.length - previousIds.size,
      {context: title, operation: "add these group members"},
    ).ok
  )
    return;
  const removesCurrentMembers = Array.from(previousIds).some((id) => !selectedIds.includes(id));
  const pullsFromOtherGroups = archiveEntries.some(
    (entry) =>
      isGroupEntry(entry) &&
      entry.id !== group.id &&
      groupChildIds(entry).some((id) => selectedIds.includes(id)),
  );
  const destructiveMembershipChange = removesCurrentMembers || pullsFromOtherGroups;
  const undoState = destructiveMembershipChange ? window.WormholesUndo?.captureState?.() : null;
  const previousArchiveEntries = JSON.parse(JSON.stringify(archiveEntries));

  archiveEntries.forEach((entry) => {
    if (isGroupEntry(entry) && entry.id !== group.id) {
      entry.groupIds = groupChildIds(entry).filter((id) => !selectedIds.includes(id));
    }
  });

  group.title = title;
  group.groupIds = selectedIds;
  group.attr2 = {val: `${selectedIds.length} grouped item${selectedIds.length === 1 ? "" : "s"}`};
  group.what = group.what || {val: "Group"};
  group.attr1 = group.attr1 || {val: "Grouped creations"};
  group.pressure = group.pressure || {val: "A gathered set of creations within this universe."};
  group.connections = group.connections || [];
  group.bridges = (globalThis.controllerServices || globalThis).normalizeBridges(group.bridges);
  group.notes = group.notes || [];

  const normalization = normalizeArchiveGroups({persist: false, cleanup: false});
  if (!saveArchiveToStorage()) {
    archiveEntries = previousArchiveEntries;
    return;
  }
  cleanupRemovedArchiveGroups(normalization.removedGroupIds);
  closeGroupModal();
  renderArchive();
  (globalThis.controllerServices || globalThis).renderWormholesMap();

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    (globalThis.controllerServices || globalThis).renderConnectionsMap();
  }
  if (destructiveMembershipChange && window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Group memberships updated",
      restoredMessage: "Group memberships restored",
      state: undoState,
    });
  } else {
    showSavedToast("Group updated");
  }
}

function removeExternalReferencesToGroup(groupId) {
  if (!groupId || !currentUniverseId) return;

  let universesChanged = false;
  universes.forEach((universe) => {
    const filteredUniverseBridges = (globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe)
      .filter(
        (bridge) => !(bridge.universeId === currentUniverseId && bridge.creationId === groupId),
      );

    if (
      JSON.stringify(filteredUniverseBridges) !==
      JSON.stringify((globalThis.controllerServices || globalThis).normalizeUniverseBridges(universe))
    ) {
      universe.bridges = filteredUniverseBridges;
      universesChanged = true;
    }

    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    let archiveChanged = false;

    archive.forEach((entry) => {
      const filteredBridges = (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges)
        .filter(
          (bridge) => !(bridge.universeId === currentUniverseId && bridge.creationId === groupId),
        );

      if (
        JSON.stringify(filteredBridges) !==
        JSON.stringify((globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges))
      ) {
        entry.bridges = filteredBridges;
        archiveChanged = true;
      }
    });

    if (archiveChanged && universe.id !== currentUniverseId) {
      saveArchiveForUniverse(universe.id, archive);
    }
  });

  if (universesChanged) {
    saveUniversesToStorage();
  }
}

function removeGroupRelationshipNotes(groupId) {
  Object.keys(connectionNotes).forEach((key) => {
    if (key.split("::").includes(groupId)) {
      delete connectionNotes[key];
    }
  });

  if (currentUniverseId) {
    const groupBridgeNodeKey = `C:${currentUniverseId}:${groupId}`;
    Object.keys(bridgeNotes).forEach((key) => {
      if (key.split("||").includes(groupBridgeNodeKey)) {
        delete bridgeNotes[key];
      }
    });
  }

  saveConnectionNotesToStorage();
  saveBridgeNotesToStorage();
}

function ungroupEntry(groupId) {
  const group = getEntry(groupId);
  if (!isGroupEntry(group)) return;
  const undoState = window.WormholesUndo?.captureState?.();
  const previousArchiveEntries = JSON.parse(JSON.stringify(archiveEntries));
  const previousConnectSourceId = connectSourceId;
  const previousSelectedMapNodeId = selectedMapNodeId;

  archiveEntries = archiveEntries
    .filter((entry) => entry.id !== groupId)
    .map((entry) => ({
      ...entry,
      connections: (entry.connections || []).filter((connectionId) => connectionId !== groupId),
      bridges: (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges)
        .filter(
          (bridge) => !(bridge.universeId === currentUniverseId && bridge.creationId === groupId),
        ),
      ...(isGroupEntry(entry)
        ? {groupIds: groupChildIds(entry).filter((childId) => childId !== groupId)}
        : {}),
    }));

  if (connectSourceId === groupId) connectSourceId = null;
  if (selectedMapNodeId === groupId) selectedMapNodeId = null;

  if (!saveArchiveToStorage()) {
    archiveEntries = previousArchiveEntries;
    connectSourceId = previousConnectSourceId;
    selectedMapNodeId = previousSelectedMapNodeId;
    return;
  }
  removeExternalReferencesToGroup(groupId);
  removeGroupRelationshipNotes(groupId);
  renderArchive();
  (globalThis.controllerServices || globalThis).renderWormholesMap();

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    (globalThis.controllerServices || globalThis).renderConnectionsMap();
  }
  if (window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Group removed",
      restoredMessage: "Group restored",
      state: undoState,
    });
  } else {
    showSavedToast("Group removed");
  }
}

function openGroupConnectionModal(sourceId, targetId) {
  const source = getEntry(sourceId);
  const target = getEntry(targetId);
  if (!source || !target) return;

  const targetIsGroup = isGroupEntry(target);
  const sourceIsGroup = isGroupEntry(source);
  const group = targetIsGroup ? target : sourceIsGroup ? source : null;
  const other = targetIsGroup ? source : target;

  if (!group) {
    (globalThis.controllerServices || globalThis).toggleMapConnection(sourceId, targetId);
    return;
  }

  activeGroupConnection = {
    sourceId,
    targetId,
    groupId: group.id,
    groupRole: targetIsGroup ? "target" : "source",
    otherId: other.id,
  };

  document.getElementById("groupConnectionSubtitle").textContent =
    `Choose whether "${other.title}" links to "${group.title}" as a whole, or to a specific creation inside that group.`;

  const children = groupChildIds(group)
    .map((id) => getEntry(id))
    .filter(Boolean);
  const list = document.getElementById("groupConnectionList");

  const choices = [
    {
      id: group.id,
      title: group.title,
      meta: "Group — general link",
      isGroupChoice: true,
    },
    ...children.map((child) => ({
      id: child.id,
      title: child.title,
      meta: child.what?.val ? child.what.val.split("—")[0].trim() : "Creation",
      isGroupChoice: false,
    })),
  ];

  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Choose group connection target");
  list.innerHTML = choices
    .map(
      (choice) => `
    <div class="group-choice group-connection-choice" data-entry-id="${escapeHtml(choice.id)}" tabindex="0" role="option" aria-selected="false" aria-label="${escapeHtml(`Connect to ${choice.isGroupChoice ? "group" : "creation"}: ${choice.title}. ${choice.meta}`)}">
      <span>
        <span class="group-choice-title">${escapeHtml(choice.title)}</span>
        <span class="group-choice-meta">${escapeHtml(choice.meta)}</span>
      </span>
    </div>
  `,
    )
    .join("");

  list.querySelectorAll(".group-connection-choice").forEach((choice) => {
    const choose = () => applyGroupConnectionChoice(choice.dataset.entryId);
    choice.addEventListener("click", choose);
    choice.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose();
      }
    });
  });

  document.getElementById("groupConnectionModal").classList.add("open");
}

function closeGroupConnectionModal() {
  document.getElementById("groupConnectionModal")?.classList.remove("open");
  activeGroupConnection = null;
}

function applyGroupConnectionChoice(choiceId) {
  if (!activeGroupConnection || !choiceId) return;

  const {sourceId, targetId, groupId, groupRole} = activeGroupConnection;
  const source = groupRole === "source" ? choiceId : sourceId;
  const target = groupRole === "target" ? choiceId : targetId;

  if (source && target && source !== target) {
    connectEntries(source, target, {silentToast: true});
  }

  selectedMapNodeId = sourceId;
  if (groupRole === "source") {
    selectedMapNodeId = groupId;
  }

  closeGroupConnectionModal();
  (globalThis.controllerServices || globalThis).renderConnectionsMap();
}

function archiveLiteratureBadgeHtml(entry) {
  if (!isGroupEntry(entry)) {
    return (globalThis.controllerServices || globalThis).literatureBadgeHtml("entry", currentUniverseId, entry.id);
  }

  const groupBadge = (globalThis.controllerServices || globalThis).literatureBadgeHtml("entry", currentUniverseId, entry.id);
  const childrenBadge = (globalThis.controllerServices || globalThis).literatureBadgeHtml(
    "groupChildren",
    currentUniverseId,
    entry.id,
    null,
    "small",
  );
  if (!groupBadge && !childrenBadge) return "";

  return `
    <span class="group-literature-badge-stack">
      ${groupBadge}
      ${childrenBadge}
    </span>
  `;
}

function archiveVisionThumbnailsHtml(entry) {
  const directRows = (globalThis.controllerServices || globalThis).visionItemsForEntryTag(currentUniverseId, entry.id);
  const childRows = isGroupEntry(entry)
    ? (globalThis.controllerServices || globalThis).visionItemsForGroupChildrenTag(currentUniverseId, entry.id)
    : [];
  const rows = [];
  const seen = new Set();

  [...directRows, ...childRows].forEach((row) => {
    const key = `${row.homeUniverseId}:${row.item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  });

  if (!rows.length) return "";

  return `
    <div class="archive-vision-thumbnails">
      <div class="archive-vision-title">Tagged images</div>
      <div class="archive-vision-grid">
        ${rows
          .map(
            (row) => `
          <button class="archive-vision-thumb" type="button" title="${escapeHtml(row.item.title || row.item.sourceName || "Image")}" data-home-universe-id="${escapeHtml(row.homeUniverseId)}" data-vision-id="${escapeHtml(row.item.id)}" aria-label="Open expanded view of ${escapeHtml(row.item.title || row.item.sourceName || "image")}">
            <span>${row.item.fileType === "pdf" ? "PDF" : "Image"}</span>
          </button>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function markArchiveEntryOpen(entryId) {
  if (!entryId) return null;

  const group = getGroupForEntryId(entryId);
  if (group) {
    const groupEl = document.querySelector(
      `#archiveList .entry[data-id="${cssEscapeValue(group.id)}"]`,
    );
    groupEl?.classList.add("open");
    groupEl
      ?.querySelector(":scope > .entry-top .entry-title")
      ?.setAttribute("aria-expanded", "true");
  }

  const entryEl = document.querySelector(
    `#archiveList .entry[data-id="${cssEscapeValue(entryId)}"]`,
  );
  if (entryEl) {
    entryEl.classList.add("open");
    entryEl
      .querySelector(":scope > .entry-top .entry-title")
      ?.setAttribute("aria-expanded", "true");
  }

  return entryEl;
}

function applyPendingArchiveReveal() {
  const request = pendingArchiveRevealRequest;
  if (!request) return false;

  if (request.expiresAt && Date.now() > request.expiresAt) {
    pendingArchiveRevealRequest = null;
    return false;
  }

  const archiveScreen = document.getElementById("archiveListScreen");
  if (!archiveScreen?.classList.contains("active")) return false;

  if (!request.entryId) {
    if (!request.scrolled) {
      archiveScreen.scrollIntoView({
        behavior: (globalThis.controllerServices || globalThis).prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
      request.scrolled = true;
    }
    return true;
  }

  const entryEl = markArchiveEntryOpen(request.entryId);
  if (!entryEl) return false;

  entryEl.classList.add("tag-jump-highlight");

  if (!request.scrolled) {
    request.scrolled = true;
    setTimeout(() => {
      const targetEl = markArchiveEntryOpen(request.entryId);
      targetEl?.scrollIntoView({
        behavior: (globalThis.controllerServices || globalThis).prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
    }, 40);
  }

  clearTimeout(request.clearHighlightTimer);
  request.clearHighlightTimer = setTimeout(() => {
    document
      .querySelectorAll("#archiveList .tag-jump-highlight")
      .forEach((el) => el.classList.remove("tag-jump-highlight"));
  }, 2400);

  return true;
}

function revealArchiveEntryForTag(entryId) {
  const filterState = sanitizeArchiveFilterState(getArchiveFilterState(), archiveEntries);
  if (entryId && archiveFilterActiveCount(filterState) > 0) {
    const currentPlan = buildArchiveFilterPlan(archiveEntries, filterState);
    if (!archiveFilterPlanContainsEntry(currentPlan, entryId)) {
      archiveFilterStatesByUniverse.set(
        currentUniverseId || "__none__",
        defaultArchiveFilterState(),
      );
    }
  }

  pendingArchiveRevealRequest = {
    entryId: entryId || "",
    scrolled: false,
    expiresAt: Date.now() + 2600,
    clearHighlightTimer: null,
  };

  showArchiveListScreen();
  renderArchive();
  applyPendingArchiveReveal();
  setTimeout(applyPendingArchiveReveal, 80);
  setTimeout(applyPendingArchiveReveal, 350);
  setTimeout(applyPendingArchiveReveal, 900);
  setTimeout(() => {
    if (pendingArchiveRevealRequest && Date.now() >= pendingArchiveRevealRequest.expiresAt) {
      pendingArchiveRevealRequest = null;
    }
  }, 2700);
}

function renderArchiveView() {
  archiveEntries =
    window.WormholesRenderValidation?.validateArchive?.(archiveEntries, {
      storageKey: archiveStorageKey(),
      universeId: currentUniverseId,
      report: false,
    })?.value || archiveEntries;
  const list = document.getElementById("archiveList");
  const count = document.getElementById("archiveCount");
  const resultCount = document.getElementById("archiveFilterResultCount");
  const creationCount = archiveEntries.filter((entry) => !isGroupEntry(entry)).length;
  const filterState = sanitizeArchiveFilterState(getArchiveFilterState(), archiveEntries);
  const activeFilterCount = archiveFilterActiveCount(filterState);
  const filterPlan = sortArchiveFilterPlan(
    buildArchiveFilterPlan(archiveEntries, filterState),
    getArchiveSortMode(),
    archiveEntries,
  );
  const visibleItemCount = filterPlan.reduce(
    (total, row) => total + 1 + row.childEntries.length,
    0,
  );
  const archivePages = window.WormholesPagination?.paginateGroupedPlan?.(
    filterPlan,
    ARCHIVE_PAGE_SIZE,
    (entry) => isGroupEntry(entry),
  ) || [filterPlan];
  if (pendingArchiveRevealRequest?.entryId && !pendingArchiveRevealRequest.scrolled) {
    setArchivePage(
      window.WormholesPagination?.pageContainingEntry?.(
        archivePages,
        pendingArchiveRevealRequest.entryId,
      ) || 1,
    );
  }
  const currentArchivePage =
    window.WormholesPagination?.clampPage?.(getArchivePage(), archivePages.length) || 1;
  setArchivePage(currentArchivePage);
  const pagePlan = archivePages[currentArchivePage - 1] || [];
  count.textContent = activeFilterCount
    ? `${visibleItemCount} item${visibleItemCount === 1 ? "" : "s"} shown · ${creationCount} creation${creationCount === 1 ? "" : "s"} saved`
    : `${creationCount} creation${creationCount === 1 ? "" : "s"} saved`;
  if (resultCount) {
    resultCount.textContent = activeFilterCount
      ? `${visibleItemCount} matching item${visibleItemCount === 1 ? "" : "s"}`
      : "Showing all Archive items";
  }
  updateArchiveFilterControls();
  updateArchiveSortControls();

  (globalThis.controllerServices || globalThis).renderConnectStatus();

  if (archiveEntries.length === 0) {
    renderArchivePagination(1, 1);
    list.innerHTML = `<p class="empty-archive">No saved creations yet. Roll or create one, then choose Archive Creation.</p>`;
    return;
  }

  function renderEntryCard(entry, isSubentry = false, filteredChildEntries = null) {
    const isSource = connectSourceId === entry.id;
    const isConnected =
      connectSourceId && getEntry(connectSourceId)?.connections?.includes(entry.id);
    const isGroup = isGroupEntry(entry);
    const childEntries = isGroup
      ? Array.isArray(filteredChildEntries)
        ? filteredChildEntries
        : groupChildIds(entry)
            .map((id) => getEntry(id))
            .filter(Boolean)
      : [];
    const canGroup = !isGroup && !isSubentry && !getGroupForEntryId(entry.id);

    const details = isGroup
      ? `
          ${renderSummary(entry)}
          ${renderNotes(entry)}
          ${renderConnections(entry)}
          ${renderBridges(entry)}
          ${archiveVisionThumbnailsHtml(entry)}
          <div class="group-children">
            <div class="group-children-title">Grouped creations</div>
            ${childEntries.length ? childEntries.map((child) => renderEntryCard(child, true)).join("") : `<p class="empty-archive">This group is empty.</p>`}
          </div>
        `
      : `
          <p><b>What:</b> ${displayValue(entry.what)}</p>
          <p><b>Attribute:</b> ${displayValue(entry.attr1)}</p>
          <p><b>Attribute:</b> ${displayValue(entry.attr2)}</p>
          <p><b>Story:</b> ${displayValue(entry.pressure)}</p>
          ${renderSummary(entry)}
          ${renderNotes(entry)}
          ${renderConnections(entry)}
          ${renderBridges(entry)}
          ${archiveVisionThumbnailsHtml(entry)}
        `;

    return `
      <div class="entry ${isGroup ? "group-entry" : ""} ${isSubentry ? "group-subentry" : ""} ${connectSourceId && !isSource ? "connectable" : ""} ${isConnected ? "connected-target" : ""}" data-id="${escapeHtml(entry.id)}">
        <div class="entry-top ellipsis-row">
          <button class="entry-title ellipsis-row-main app-button" type="button" data-app-button="true">
            <span class="entry-title-text">
              <span class="entry-title-main">${escapeHtml(entry.title)}</span>
              <span class="entry-title-what">${escapeHtml(displayEntryWhat(entry))}</span>
            </span>
          </button>
          ${archiveLiteratureBadgeHtml(entry)}
          <div class="menu-wrap ellipsis-row-actions">
            <button class="menu-button app-button" type="button" aria-label="Open archive menu" data-app-button="true">⋮</button>
            <div class="menu">
              <button class="edit-action app-button" type="button" data-app-button="true">Edit</button>
              <button class="summarize-action app-button" type="button" data-app-button="true">Add Summary</button>
              <button class="note-action app-button" type="button" data-app-button="true">Add Note</button>
              ${canGroup ? `<button class="group-action app-button" type="button" data-app-button="true">Group</button>` : ""}
              ${isGroup ? `<button class="edit-group-action app-button" type="button" data-app-button="true">Edit Group</button>` : ""}
              ${isGroup ? `<button class="ungroup-action app-button" type="button" data-app-button="true">Ungroup Creations</button>` : ""}
              <button class="move-universe-action app-button" type="button" data-app-button="true">Move to Universe</button>
              <button class="copy-universe-action app-button" type="button" data-app-button="true">Copy to Universe</button>
              <button class="connect-action app-button" type="button" data-app-button="true">Connect</button>
              <button class="bridge-action app-button" type="button" data-app-button="true">Bridge</button>
              <button class="delete-action app-button" type="button" data-app-button="true">${isGroup ? "Delete Group" : "Delete Creation"}</button>
            </div>
          </div>
        </div>
        <div class="entry-details">
          ${details}
        </div>
      </div>
    `;
  }

  if (filterPlan.length === 0) {
    renderArchivePagination(1, 1);
    list.innerHTML = `
      <div class="archive-filter-empty">
        <p>No Archive items match these filters.</p>
        <button class="small-archive-button app-button" data-app-button="true" id="resetArchiveFiltersInlineBtn" type="button">Reset filters</button>
      </div>
    `;
    document
      .getElementById("resetArchiveFiltersInlineBtn")
      ?.addEventListener("click", resetArchiveFilters);
    return;
  }

  list.innerHTML = pagePlan
    .map((row) => renderEntryCard(row.entry, false, row.childEntries))
    .join("");
  renderArchivePagination(archivePages.length, currentArchivePage);

  applyContextualActionAriaLabels(list);

  document.querySelectorAll(".entry-title").forEach((button) => {
    button.addEventListener("click", () => {
      const entryEl = button.closest(".entry");
      const targetId = entryEl.dataset.id;

      if (connectSourceId) {
        connectEntries(connectSourceId, targetId);
        return;
      }

      entryEl.classList.toggle("open");
    });
  });

  document.querySelectorAll("#archiveList .literature-link-indicator").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      (globalThis.controllerServices || globalThis).openLiteratureLinksModal(
        button.dataset.literatureLinkType,
        button.dataset.universeId,
        button.dataset.entryId || "",
      );
    });
  });

  document.querySelectorAll(".menu-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const menu = button.nextElementSibling;
      (globalThis.controllerServices || globalThis).togglePositionedMenu(menu);
    });
  });

  document.querySelectorAll(".edit-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openEditModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".summarize-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openSummaryModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".note-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openNoteModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".group-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openGroupModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".edit-group-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openEditGroupModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".ungroup-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      ungroupEntry(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".move-universe-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      (globalThis.controllerServices || globalThis).openMigrateModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll("#archiveList .copy-universe-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openCopyToUniverseModal("archive", entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".connect-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      (globalThis.controllerServices || globalThis).openConnectPickerModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".bridge-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      (globalThis.controllerServices || globalThis).openBridgeModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".delete-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      (globalThis.controllerServices || globalThis).closeMenus();
      openDeleteEntryConfirm(entryEl.dataset.id);
    });
  });

  populateArchiveVisionThumbnails();
  applyPendingArchiveReveal();

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    (globalThis.controllerServices || globalThis).renderConnectionsMap();
  }
}

async function populateArchiveVisionThumbnails() {
  archiveVisionObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  archiveVisionObjectUrls = [];

  const thumbs = Array.from(document.querySelectorAll(".archive-vision-thumb"));
  for (const thumb of thumbs) {
    const item = (globalThis.controllerServices || globalThis).getVisionItemFromUniverse(
      thumb.dataset.homeUniverseId,
      thumb.dataset.visionId,
    );
    if (!item) continue;

    if (item.fileType === "pdf") {
      thumb.innerHTML = `<span>PDF</span>`;
      thumb.disabled = true;
      thumb.setAttribute("aria-disabled", "true");
      thumb.setAttribute(
        "aria-label",
        `${item.title || item.sourceName || "PDF"} cannot be expanded as an image preview`,
      );
      continue;
    }

    thumb.disabled = false;
    thumb.removeAttribute("aria-disabled");
    thumb.setAttribute(
      "aria-label",
      `Open expanded view of ${item.title || item.sourceName || "image"}`,
    );

    await (globalThis.controllerServices || globalThis).populateVisionThumbnailButton(
      thumb,
      item,
      thumb.dataset.homeUniverseId,
      archiveVisionObjectUrls,
    );
  }
}

function connectEntries(sourceId, targetId, options = {}) {
  if (sourceId === targetId) return;

  cleanupAllStaleLinks();
  const source = getEntry(sourceId);
  const target = getEntry(targetId);
  if (!source || !target) return;

  source.connections = source.connections || [];
  target.connections = target.connections || [];

  const alreadyConnected = source.connections.includes(targetId);
  const undoState = alreadyConnected ? window.WormholesUndo?.captureState?.() : null;

  if (!alreadyConnected) {
    const limitResult = window.WormholesEntityLimits?.ensureConnectionPlan(
      archiveEntries,
      sourceId,
      [targetId],
      {sourceTitle: source.title || ""},
    );
    if (limitResult && !limitResult.ok) return;
  }

  if (alreadyConnected) {
    source.connections = source.connections.filter((id) => id !== targetId);
    target.connections = target.connections.filter((id) => id !== sourceId);
    delete connectionNotes[(globalThis.controllerServices || globalThis).connectionKey(sourceId, targetId)];
    saveConnectionNotesToStorage();
  } else {
    source.connections.push(targetId);
    target.connections.push(sourceId);
  }

  saveArchiveToStorage();
  renderArchive();

  if (!alreadyConnected) {
    if (options.openRelationshipModal) {
      (globalThis.controllerServices || globalThis).openConnectionModal(sourceId, targetId);
    } else if (!(globalThis.controllerServices || globalThis).shouldSuppressRelationshipToast(options)) {
      showSavedToast("Connected");
    }
  } else if (!(globalThis.controllerServices || globalThis).shouldSuppressRelationshipToast(options)) {
    if (window.WormholesUndo && undoState) {
      window.WormholesUndo.offer({
        message: "Connection removed",
        restoredMessage: "Connection restored",
        state: undoState,
      });
    } else {
      showSavedToast("Connection removed");
    }
  }
}

async function deleteEntry(id) {
  const entry = getEntry(id);
  if (!entry) return;
  const undoState = window.WormholesUndo?.captureState?.();
  const deletedEntry = JSON.parse(JSON.stringify(entry));
  const deletedUniverse = (globalThis.controllerServices || globalThis).getCurrentUniverse();
  const deletedCreationFolderHandle = creationFolderHandle;

  archiveEntries = archiveEntries
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      connections: (item.connections || []).filter((connectionId) => connectionId !== id),
      ...(isGroupEntry(item)
        ? {groupIds: groupChildIds(item).filter((childId) => childId !== id)}
        : {}),
    }));

  if (connectSourceId === id) connectSourceId = null;
  if (selectedMapNodeId === id) selectedMapNodeId = null;
  if (
    selectedWormholeCreation?.universeId === currentUniverseId &&
    selectedWormholeCreation?.creationId === id
  ) {
    selectedWormholeCreation = null;
  }

  cleanupLinksToDeletedEntity(currentUniverseId, id);
  normalizeArchiveGroups();
  saveArchiveToStorage();
  saveConnectionNotesToStorage();
  saveUniversesToStorage();
  saveBridgeNotesToStorage();
  renderArchive();

  const finalize = async () => {
    if (localFoldersEnabled) {
      await (globalThis.controllerServices || globalThis).ensureWormholesFolderReadyForDestructiveSync();
      let folderHandle = deletedCreationFolderHandle;
      if (!folderHandle) {
        const folders = deletedUniverse ? await ensureUniverseFolders(deletedUniverse) : null;
        folderHandle = folders?.creations || null;
      }
      await (globalThis.controllerServices || globalThis).deleteFolderBackedRecordFile(deletedEntry, folderHandle);
    }
    await (globalThis.controllerServices || globalThis).pruneWormholesFolderToAppState();
  };

  const deletedMessage = isGroupEntry(deletedEntry) ? "Group deleted" : "Creation deleted";
  const restoredMessage = isGroupEntry(deletedEntry) ? "Group restored" : "Creation restored";
  if (window.WormholesUndo && undoState) {
    await window.WormholesUndo.offer({
      message: deletedMessage,
      restoredMessage,
      state: undoState,
      finalize,
    });
  } else {
    await finalize();
    showSavedToast(deletedMessage);
  }

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    (globalThis.controllerServices || globalThis).renderConnectionsMap();
  }
  if (document.getElementById("wormholesModal")?.classList.contains("open")) {
    (globalThis.controllerServices || globalThis).renderWormholesMap();
  }
}

function archiveEntryDisplayWhat(entry) {
  if (isGroupEntry(entry)) {
    const count = groupChildIds(entry).length;
    return `Group — ${count} creation${count === 1 ? "" : "s"}`;
  }
  return entry?.what?.val || "Creation";
}

function creationFileText(entry, universe = (globalThis.controllerServices || globalThis).getCurrentUniverse(), options = {}) {
  const universeId = universe?.id || currentUniverseId;
  const archive =
    universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);

  const lines = [
    entry.title || "Creation",
    "",
    `Universe: ${universe?.title || ""}`,
    `Type: ${archiveEntryDisplayWhat(entry)}`,
    `What: ${entry.what?.val || ""}`,
    `Attribute: ${entry.attr1?.val || ""}`,
    `Attribute: ${entry.attr2?.val || ""}`,
    `Story: ${entry.pressure?.val || ""}`,
  ];

  if (entry.summary) {
    lines.push("", "Summary:", htmlToPlainText(entry.summary));
  } else {
    lines.push("", "Summary:", "—");
  }

  if ((entry.notes || []).length) {
    lines.push("", "Notes:");
    (entry.notes || []).forEach((note) => {
      lines.push("", note.title || "Note", htmlToPlainText(note.body || ""));
    });
  } else {
    lines.push("", "Notes:", "—");
  }

  const connectionTitles = (entry.connections || [])
    .map((id) => archive.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => item.title || "Untitled");

  lines.push("", "Connections:");
  if (connectionTitles.length) {
    connectionTitles.forEach((title) => lines.push(`- ${title}`));
  } else {
    lines.push("—");
  }

  const bridges = (globalThis.controllerServices || globalThis).normalizeBridges(entry.bridges);
  lines.push("", "Bridges:");
  if (bridges.length) {
    bridges.forEach((bridge) => {
      const universeTitle = (globalThis.controllerServices || globalThis).getUniverseTitle(bridge.universeId);
      const creationTitle = bridge.creationId
        ? (globalThis.controllerServices || globalThis).getCreationTitleFromUniverse(bridge.universeId, bridge.creationId)
        : "";
      lines.push(`- ${creationTitle ? `${universeTitle} → ${creationTitle}` : universeTitle}`);
    });
  } else {
    lines.push("—");
  }

  if (isGroupEntry(entry)) {
    lines.push("", "Grouped Creations:");
    const childTitles = groupChildIds(entry)
      .map((id) => archive.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => item.title || "Untitled");
    if (childTitles.length) {
      childTitles.forEach((title) => lines.push(`- ${title}`));
    } else {
      lines.push("—");
    }
  }

  const linkedImageRows = options.linkedImageRows || [];
  const unavailableImages = options.unavailableImages || [];
  lines.push("", "Linked Images:");
  if (linkedImageRows.length) {
    linkedImageRows.forEach((row) => {
      const label = row.item?.title || row.item?.sourceName || "Image";
      lines.push(
        `- ${label}${row.homeUniverseId ? ` (${(globalThis.controllerServices || globalThis).getUniverseTitle(row.homeUniverseId)})` : ""}`,
      );
    });
    if (options.embeddedImageCount !== undefined) {
      lines.push(`Embedded image thumbnails below: ${options.embeddedImageCount}`);
    }
    unavailableImages.forEach((text) => lines.push(`- ${text}`));
  } else {
    lines.push("—");
  }

  return (
    lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

async function createCreationDocxBlob(entry, universe = (globalThis.controllerServices || globalThis).getCurrentUniverse()) {
  const linkedImageRows = (globalThis.controllerServices || globalThis).linkedVisionRowsForCreationDocx(
    entry,
    universe?.id || currentUniverseId,
  );
  const {images, unavailable} = await (globalThis.controllerServices || globalThis).docxImagesFromVisionRows(linkedImageRows);
  const text = creationFileText(entry, universe, {
    linkedImageRows,
    unavailableImages: unavailable,
    embeddedImageCount: images.length,
  });

  return createDocxBlobFromTextAndImages(text, images);
}

async function writeArchiveEntryToFolder(
  entry,
  folderHandle = creationFolderHandle,
  universe = (globalThis.controllerServices || globalThis).getCurrentUniverse(),
  options = {},
) {
  if (!entry || !localFoldersEnabled || !folderHandle) return entry;

  if (!(await (globalThis.controllerServices || globalThis).requestFolderPermission(folderHandle))) return entry;

  const blob = await createCreationDocxBlob(entry, universe);

  if (options.forceTitleFileName || !entry.folderFileName) {
    await (globalThis.controllerServices || globalThis).renameFolderBackedRecordFile(
      entry,
      folderHandle,
      entry.title || "creation",
      ".docx",
      blob,
    );
  } else {
    await (globalThis.controllerServices || globalThis).writeBlobToFolder(folderHandle, entry.folderFileName, blob);
    entry.storage = "folder";
  }

  return entry;
}

async function writeArchiveEntryToFolderIfNeeded(entry, options = {}) {
  if (!localFoldersEnabled || !creationFolderHandle || !entry) return true;

  try {
    await writeArchiveEntryToFolder(
      entry,
      creationFolderHandle,
      (globalThis.controllerServices || globalThis).getCurrentUniverse(),
      options,
    );
    saveArchiveToStorage();
    return true;
  } catch (e) {
    rememberFolderSaveFailure("Creation saved in app, but could not sync to local folder", e);
    return false;
  }
}

async function migrateArchiveEntriesToFolder() {
  if (
    !localFoldersEnabled ||
    !creationFolderHandle ||
    !(await (globalThis.controllerServices || globalThis).requestFolderPermission(creationFolderHandle))
  )
    return;

  let changed = false;
  for (const entry of archiveEntries) {
    if (entry.storage === "folder") continue;
    await writeArchiveEntryToFolder(
      entry,
      creationFolderHandle,
      (globalThis.controllerServices || globalThis).getCurrentUniverse(),
    );
    changed = true;
  }

  if (changed) saveArchiveToStorage();
}

async function migrateAllArchiveEntriesToFolder(options = false) {
  const migrationOptions = (globalThis.controllerServices || globalThis).normalizeFolderMigrationOptions(options);
  const force = migrationOptions.force;
  if (!localFoldersEnabled || !wormholesCreationsRootHandle) return;

  for (const universe of universes) {
    const folders = await ensureUniverseFolders(universe);
    if (
      !folders?.creations ||
      !(await (globalThis.controllerServices || globalThis).requestFolderPermission(folders.creations))
    )
      continue;

    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    let changed = false;

    for (const entry of archive) {
      if (entry.storage === "folder" && !force) continue;

      const folderFileName = await (globalThis.controllerServices || globalThis).folderMigrationFileName(
        entry,
        folders.creations,
        entry.title || "creation",
        ".docx",
        migrationOptions,
      );

      entry.folderFileName = folderFileName;
      await (globalThis.controllerServices || globalThis).writeBlobToFolder(
        folders.creations,
        folderFileName,
        await createCreationDocxBlob(entry, universe),
      );
      entry.storage = "folder";
      changed = true;
    }

    if (changed) {
      if (universe.id === currentUniverseId) {
        archiveEntries = archive;
        saveArchiveToStorage();
      } else {
        saveArchiveForUniverse(universe.id, archive);
      }
    }
  }
}

async function syncArchiveFolderEntries() {
  // Intentionally no-op: the app is authoritative. Folder contents are cleaned by pruneWormholesFolderToAppState(); missing folder files do not delete app metadata.
  return;
}

async function syncAllArchiveFolderEntries() {
  // Intentionally no-op: archive metadata stays in the app; strict folder cleanup happens in pruneWormholesFolderToAppState().
  return;
}

function openDeleteEntryConfirm(id) {
  const entry = getEntry(id);
  if (!entry) return;

  activeDeleteEntryId = id;
  const isGroup = isGroupEntry(entry);
  document.getElementById("deleteEntryConfirmTitle").textContent = isGroup
    ? `Delete group “${entry.title}”?`
    : `Delete “${entry.title}”?`;
  document.getElementById("deleteEntryConfirmText").textContent = isGroup
    ? "The grouped creations will stay in the Archive. You can restore the group from the notification or Recent Activity for two minutes."
    : "This removes the creation and its links. You can restore it from the notification or Recent Activity for two minutes.";
  document.getElementById("cancelDeleteEntryBtn").textContent = isGroup
    ? "Keep Group"
    : "Keep Creation";
  document.getElementById("confirmDeleteEntryBtn").textContent = isGroup
    ? "Delete Group"
    : "Delete Creation";
  document.getElementById("deleteEntryConfirmModal").classList.add("open");
}

function closeDeleteEntryConfirm() {
  document.getElementById("deleteEntryConfirmModal").classList.remove("open");
  activeDeleteEntryId = null;
}

async function confirmDeleteEntry() {
  if (!activeDeleteEntryId) return;
  const id = activeDeleteEntryId;
  closeDeleteEntryConfirm();
  await deleteEntry(id);
}

function cleanupConnectionsForRemovedEntry(id) {
  cleanupConnectionsForRemovedEntries([id]);
}

async function migrateEntryToUniverse(targetUniverseId) {
  if (!activeMigrateEntryId || !targetUniverseId || targetUniverseId === currentUniverseId) return;

  const sourceEntry = getEntry(activeMigrateEntryId);
  const targetUniverse = universes.find((universe) => universe.id === targetUniverseId);
  const sourceUniverse = (globalThis.controllerServices || globalThis).getCurrentUniverse();

  if (!sourceEntry || !targetUniverse || !sourceUniverse) return;

  const idsToMigrate = new Set([sourceEntry.id]);
  if (isGroupEntry(sourceEntry)) {
    groupChildIds(sourceEntry).forEach((id) => idsToMigrate.add(id));
  }

  const {idMap, migratedEntries} = cloneMigratedArchiveEntries(
    archiveEntries,
    idsToMigrate,
    sourceUniverse,
    targetUniverseId,
  );
  const targetArchive = readArchiveForUniverse(targetUniverseId);
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("archive", targetArchive.length, migratedEntries.length, {
      context: targetUniverse.title || "",
      operation: "move these Archive items",
    }).ok
  )
    return;
  if (window.WormholesDuplicateCreations?.reviewBatch) {
    const duplicateReview = await window.WormholesDuplicateCreations.reviewBatch(
      migratedEntries,
      targetArchive,
      {
        actionLabel: "Move Anyway",
        actionKind: "move",
        opener: document.getElementById("saveMigrateBtn"),
      },
    );
    if (duplicateReview.decision === "view") {
      (globalThis.controllerServices || globalThis).closeMigrateModal();
      (globalThis.controllerServices || globalThis).enterUniverse(targetUniverseId);
      switchTab("archive");
      revealArchiveEntryForTag(duplicateReview.match?.existing?.id || "");
      return;
    }
    if (duplicateReview.decision !== "proceed") return;
  }
  const nextTargetArchive = [...migratedEntries, ...targetArchive];
  saveArchiveForUniverse(targetUniverseId, nextTargetArchive);

  if (localFoldersEnabled && wormholesCreationsRootHandle) {
    try {
      const targetFolders = await ensureUniverseFolders(targetUniverse);
      if (
        targetFolders?.creations &&
        (await (globalThis.controllerServices || globalThis).requestFolderPermission(targetFolders.creations))
      ) {
        for (const migratedEntry of migratedEntries) {
          await writeArchiveEntryToFolder(migratedEntry, targetFolders.creations, targetUniverse);
        }
        saveArchiveForUniverse(targetUniverseId, nextTargetArchive);
      }
    } catch (e) {
      rememberFolderSaveFailure(
        "Moved creation saved in app, but could not sync to the target local folder",
        e,
      );
    }
  }

  const targetNotes = readConnectionNotesForUniverse(targetUniverseId);
  Object.entries(connectionNotes).forEach(([key, note]) => {
    const [a, b] = key.split("::");
    if (idMap[a] && idMap[b]) {
      targetNotes[(globalThis.controllerServices || globalThis).makeConnectionKeyFromIds(idMap[a], idMap[b])] = note;
    }
  });
  saveConnectionNotesForUniverse(targetUniverseId, targetNotes);

  remapIncomingBridgesForMigration(currentUniverseId, targetUniverseId, idMap);
  remapBridgeNotesForMigratedEntries(currentUniverseId, targetUniverseId, idMap);

  cleanupConnectionsForRemovedEntries(Array.from(idsToMigrate));

  saveArchiveToStorage();
  saveConnectionNotesToStorage();
  saveUniversesToStorage();
  saveBridgeNotesToStorage();
  await (globalThis.controllerServices || globalThis).pruneWormholesFolderToAppState();
  (globalThis.controllerServices || globalThis).closeMigrateModal();
  (globalThis.controllerServices || globalThis).closeMenus();
  renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active"))
    (globalThis.controllerServices || globalThis).renderConnectionsMap();
  if (document.getElementById("wormholesModal")?.classList.contains("open"))
    (globalThis.controllerServices || globalThis).renderWormholesMap();
  showSavedToast("Creation moved");
}

async function saveCurrentToArchive() {
  const input = document.getElementById("creationTitleInput");
  const title = input.value.trim();

  if (!title) {
    document.getElementById("titleError").classList.add("show");
    input.focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      fieldName: "creation title",
      operation: "archive this creation",
    }).ok
  )
    return;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("archive", archiveEntries.length, 1, {
      context: (globalThis.controllerServices || globalThis).getCurrentUniverse()?.title || "",
      operation: "archive another creation",
    }).ok
  )
    return;

  const generationMetadata =
    typeof (globalThis.controllerServices || globalThis).currentGenerationMetadata === "function"
      ? (globalThis.controllerServices || globalThis).currentGenerationMetadata()
      : null;
  const rollHistoryId = typeof currentRollHistoryId !== "undefined" ? currentRollHistoryId : null;
  const entry = {
    id: makeId(),
    title,
    what: current.what,
    attr1: current.attr1,
    attr2: current.attr2,
    pressure: current.pressure,
    connections: [],
    bridges: [],
    createdAt: new Date().toISOString(),
    ...(generationMetadata ? {source: "generated", _generation: generationMetadata} : {}),
  };

  if (window.WormholesDuplicateCreations?.review) {
    const duplicateReview = await window.WormholesDuplicateCreations.review(entry, archiveEntries, {
      actionLabel: "Save Anyway",
      actionKind: "save",
      opener: document.getElementById("saveArchiveBtn"),
    });
    if (duplicateReview.decision === "view") {
      (globalThis.controllerServices || globalThis).closeTitleModal();
      switchTab("archive");
      revealArchiveEntryForTag(duplicateReview.match?.existing?.id || "");
      return;
    }
    if (duplicateReview.decision !== "proceed") return;
  }

  archiveEntries.unshift(entry);

  if (!saveArchiveToStorage()) {
    archiveEntries = archiveEntries.filter((item) => item.id !== entry.id);
    return;
  }

  await writeArchiveEntryToFolderIfNeeded(entry);
  renderArchive();
  (globalThis.controllerServices || globalThis).closeTitleModal();
  if (rollHistoryId) {
    window.WormholesRecentRollHistory?.markArchived?.(rollHistoryId, {
      entryId: entry.id,
      title: entry.title,
    });
  }
  showSavedToast("Creation archived");

  current = {what: null, attr1: null, attr2: null, pressure: null};
  if (typeof (globalThis.controllerServices || globalThis).resetCurrentGenerationDiagnostics === "function")
    (globalThis.controllerServices || globalThis).resetCurrentGenerationDiagnostics();
  renderCurrent();
}

/* Rendering boundary: callers request a named view; DOM implementation stays behind the coordinator. */
window.WormholesRendering?.register?.("archive", renderArchiveView, {
  domains: ["archive", "connectionNotes"],
});
function renderArchive() {
  const coordinator = window.WormholesRendering;
  if (coordinator?.has?.("archive")) return coordinator.render("archive");
  return renderArchiveView();
}

/* Public controller surface for served ES-module builds. */
const ARCHIVE_CONTROLLER_API = Object.freeze({
  getEntry,
  getTitle,
  isGroupEntry,
  groupChildIds,
  getGroupForEntryId,
  topLevelArchiveEntries,
  mapArchiveEntries,
  mapEntryForIdInEntries,
  getMapArchiveEntryFromUniverse,
  visibleEntryIdForUniverseEntry,
  visibleEntryTitleForUniverseEntry,
  isGroupedChildInUniverse,
  displayEntryWhat,
  cleanupRemovedArchiveGroups,
  normalizeArchiveGroups,
  renderSummary,
  openSummaryModal,
  closeSummaryModal,
  saveSummaryText,
  deleteSummaryText,
  cleanNoteText,
  cleanNotesArray,
  normalizeArchiveNotes,
  renderEditNotesList,
  getEditNotesFromList,
  saveEditNotesOnly,
  openEditAddNoteModal,
  renderNotes,
  openNoteModal,
  closeNoteModal,
  saveNoteText,
  renderBridges,
  renderConnections,
  renderGroupChoiceList,
  openGroupModal,
  openEditGroupModal,
  closeGroupModal,
  selectedGroupChoiceIds,
  saveGroupModal,
  createGroupFromModal,
  saveEditedGroupFromModal,
  removeExternalReferencesToGroup,
  removeGroupRelationshipNotes,
  ungroupEntry,
  openGroupConnectionModal,
  closeGroupConnectionModal,
  applyGroupConnectionChoice,
  archiveLiteratureBadgeHtml,
  archiveVisionThumbnailsHtml,
  markArchiveEntryOpen,
  applyPendingArchiveReveal,
  revealArchiveEntryForTag,
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
  renderArchiveView,
  populateArchiveVisionThumbnails,
  connectEntries,
  deleteEntry,
  archiveForUniverseLinkCheck,
  entityExistsInUniverse,
  linkBridgeTargetStillExists,
  uniqueList,
  cleanupConnectionNotesForArchive,
  bridgeNoteNodeStillExists,
  cleanupBridgeNotes,
  cleanupLinksInArchive,
  cleanupAllStaleLinks,
  cleanupLinksToDeletedEntity,
  normalizeGenerationDiagnostics,
  normalizeSchemaArchiveEntry,
  entryHasArchivableCreationData,
  cloneMigratedArchiveEntries,
  remapBridgeNotesForMigratedEntries,
  remapIncomingBridgesForMigration,
  cleanupConnectionsForRemovedEntries,
  archiveEntryDisplayWhat,
  creationFileText,
  createCreationDocxBlob,
  writeArchiveEntryToFolder,
  writeArchiveEntryToFolderIfNeeded,
  migrateArchiveEntriesToFolder,
  migrateAllArchiveEntriesToFolder,
  syncArchiveFolderEntries,
  syncAllArchiveFolderEntries,
  openDeleteEntryConfirm,
  closeDeleteEntryConfirm,
  confirmDeleteEntry,
  cleanupConnectionsForRemovedEntry,
  migrateEntryToUniverse,
  saveCurrentToArchive,
  renderArchive,
});
(globalThis.registerControllerServices || (() => {}))(ARCHIVE_CONTROLLER_API);

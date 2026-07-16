/* Wormholes Beta 261 — Literature pagination, filtering, sorting, and list-action presentation.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";

const literatureFilterStatesByUniverse = new Map();
const literatureSortStatesByUniverse = new Map();
const literaturePageStatesByUniverse = new Map();
const LITERATURE_PAGE_SIZE = 40;
const LITERATURE_SORT_MODES = new Set([
  "literature",
  "title-asc",
  "title-desc",
  "updated-newest",
  "updated-oldest",
  "created-newest",
  "created-oldest",
]);
let literatureFilterPanelOpen = false;
let literatureSortPanelOpen = false;

function getLiteraturePage(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  return Math.max(1, Number.parseInt(literaturePageStatesByUniverse.get(key), 10) || 1);
}

function setLiteraturePage(page, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  literaturePageStatesByUniverse.set(key, Math.max(1, Number.parseInt(page, 10) || 1));
}

function resetLiteraturePage() {
  setLiteraturePage(1);
}

function scrollLiteraturePageToTop() {
  const target =
    document.getElementById("literatureCount") || document.getElementById("literatureListScreen");
  target?.scrollIntoView?.({
    behavior:
      typeof controllerServices.prefersReducedMotion === "function" &&
      controllerServices.prefersReducedMotion()
        ? "auto"
        : "smooth",
    block: "start",
  });
}

function renderLiteraturePagination(totalPages, currentPage) {
  window.WormholesPagination?.renderControls?.(document.getElementById("literaturePagination"), {
    label: "Literature",
    totalPages,
    page: currentPage,
    onPageChange(nextPage) {
      setLiteraturePage(nextPage);
      renderLiteratureList();
      if (typeof requestAnimationFrame === "function")
        requestAnimationFrame(scrollLiteraturePageToTop);
    },
  });
}

function defaultLiteratureFilterState() {
  return {
    type: "all",
    group: "all",
    hasTags: false,
    hasContent: false,
  };
}

function getLiteratureFilterState(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  if (!literatureFilterStatesByUniverse.has(key)) {
    literatureFilterStatesByUniverse.set(key, defaultLiteratureFilterState());
  }
  return literatureFilterStatesByUniverse.get(key);
}

function literatureFilterActiveCount(state = getLiteratureFilterState()) {
  return (
    Number(state.type !== "all") +
    Number(state.group !== "all") +
    Number(!!state.hasTags) +
    Number(!!state.hasContent)
  );
}

function getLiteratureSortMode(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  const mode = literatureSortStatesByUniverse.get(key) || "literature";
  if (!LITERATURE_SORT_MODES.has(mode)) {
    literatureSortStatesByUniverse.set(key, "literature");
    return "literature";
  }
  return mode;
}

function setLiteratureSortMode(mode, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  literatureSortStatesByUniverse.set(key, LITERATURE_SORT_MODES.has(mode) ? mode : "literature");
}

function literatureSortModeLabel(mode = getLiteratureSortMode()) {
  return (
    {
      "title-asc": "A–Z",
      "title-desc": "Z–A",
      "updated-newest": "Recent",
      "updated-oldest": "Oldest edit",
      "created-newest": "Newest",
      "created-oldest": "Oldest",
    }[mode] || ""
  );
}

function literatureItemHasTags(doc) {
  return !!((doc?.tags?.universes || []).length || (doc?.tags?.entries || []).length);
}

function literatureItemHasContent(doc, docs = literatureEntries) {
  if (isLiteratureGroup(doc)) {
    return literatureGroupChildDocs(doc, docs).some((child) =>
      literatureItemHasContent(child, docs),
    );
  }
  const raw = String(doc?.content || "");
  const plain = raw
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return !!plain;
}

function literatureItemMatchesStatus(doc, state, docs = literatureEntries) {
  if (state.hasTags && !literatureItemHasTags(doc)) return false;
  if (state.hasContent && !literatureItemHasContent(doc, docs)) return false;
  return true;
}

function literatureGroupOptions(docs = literatureEntries) {
  return (docs || [])
    .filter(isLiteratureGroup)
    .map((group) => ({id: group.id, title: group.title || "Untitled group"}));
}

function sanitizeLiteratureFilterState(
  state = getLiteratureFilterState(),
  docs = literatureEntries,
) {
  const clean = {
    ...defaultLiteratureFilterState(),
    ...(state || {}),
  };
  if (!["all", "groups"].includes(clean.type)) clean.type = "all";
  const groupIds = new Set(literatureGroupOptions(docs).map((group) => `group:${group.id}`));
  if (!["all", "grouped", "ungrouped"].includes(clean.group) && !groupIds.has(clean.group)) {
    clean.group = "all";
  }
  clean.hasTags = !!clean.hasTags;
  clean.hasContent = !!clean.hasContent;
  return clean;
}

function buildLiteratureViewPlan(docs = literatureEntries, state = getLiteratureFilterState()) {
  const clean = sanitizeLiteratureFilterState(state, docs);
  const rows = [];

  topLevelLiteratureEntries(docs).forEach((entry) => {
    if (isLiteratureGroup(entry)) {
      if (clean.group === "ungrouped") return;
      if (clean.group.startsWith("group:") && clean.group !== `group:${entry.id}`) return;

      const children = literatureGroupChildDocs(entry, docs);
      if (clean.type === "groups") {
        if (literatureItemMatchesStatus(entry, clean, docs)) {
          rows.push({entry, childEntries: children});
        }
        return;
      }

      const matchingChildren = children.filter((child) =>
        literatureItemMatchesStatus(child, clean, docs),
      );
      if (matchingChildren.length) {
        rows.push({entry, childEntries: matchingChildren});
      }
      return;
    }

    if (clean.group === "grouped" || clean.group.startsWith("group:")) return;
    if (clean.type === "groups") return;
    if (literatureItemMatchesStatus(entry, clean, docs)) {
      rows.push({entry, childEntries: []});
    }
  });

  return rows;
}

function literatureSortTimestamp(doc, field) {
  const raw = field === "created" ? doc?.createdAt : doc?.updatedAt || doc?.createdAt;
  const value = Date.parse(raw || "");
  return Number.isFinite(value) ? value : 0;
}

function literatureSortComparator(mode = getLiteratureSortMode()) {
  return (a, b) => {
    const titleA = String(a?.title || "").trim();
    const titleB = String(b?.title || "").trim();
    const titleCompare = titleA.localeCompare(titleB, undefined, {
      sensitivity: "base",
      numeric: true,
    });

    if (mode === "title-asc") return titleCompare;
    if (mode === "title-desc") return -titleCompare;
    if (mode === "updated-newest")
      return (
        literatureSortTimestamp(b, "updated") - literatureSortTimestamp(a, "updated") ||
        titleCompare
      );
    if (mode === "updated-oldest")
      return (
        literatureSortTimestamp(a, "updated") - literatureSortTimestamp(b, "updated") ||
        titleCompare
      );
    if (mode === "created-newest")
      return (
        literatureSortTimestamp(b, "created") - literatureSortTimestamp(a, "created") ||
        titleCompare
      );
    if (mode === "created-oldest")
      return (
        literatureSortTimestamp(a, "created") - literatureSortTimestamp(b, "created") ||
        titleCompare
      );
    return 0;
  };
}

function sortLiteratureViewPlan(plan, mode = getLiteratureSortMode()) {
  if (mode === "literature")
    return (plan || []).map((row) => ({...row, childEntries: [...(row.childEntries || [])]}));
  const compare = literatureSortComparator(mode);
  return (plan || [])
    .map((row) => ({...row, childEntries: [...(row.childEntries || [])].sort(compare)}))
    .sort((a, b) => compare(a.entry, b.entry));
}

function syncLiteratureViewControls(docs = literatureEntries) {
  const state = sanitizeLiteratureFilterState(getLiteratureFilterState(), docs);
  literatureFilterStatesByUniverse.set(currentUniverseId || "__none__", state);

  const typeSelect = document.getElementById("literatureFilterType");
  const groupSelect = document.getElementById("literatureFilterGroup");
  const tags = document.getElementById("literatureFilterTags");
  const content = document.getElementById("literatureFilterContent");
  if (typeSelect) typeSelect.value = state.type;
  if (groupSelect) {
    groupSelect.innerHTML = `
      <option value="all">All items</option>
      <option value="grouped">Grouped documents</option>
      <option value="ungrouped">Ungrouped documents</option>
      ${literatureGroupOptions(docs)
        .map(
          (group) =>
            `<option value="group:${escapeHtml(group.id)}">${escapeHtml(group.title)}</option>`,
        )
        .join("")}
    `;
    groupSelect.value = state.group;
  }
  if (tags) tags.checked = state.hasTags;
  if (content) content.checked = state.hasContent;

  const filterPanel = document.getElementById("literatureFilterPanel");
  const filterButton = document.getElementById("literatureFilterBtn");
  const activeCount = literatureFilterActiveCount(state);
  if (filterPanel) filterPanel.hidden = !literatureFilterPanelOpen;
  if (filterButton) {
    filterButton.textContent = activeCount ? `Filter (${activeCount})` : "Filter";
    filterButton.classList.toggle("filter-active", activeCount > 0);
    filterButton.setAttribute("aria-expanded", literatureFilterPanelOpen ? "true" : "false");
  }

  const sortPanel = document.getElementById("literatureSortPanel");
  const sortButton = document.getElementById("literatureSortBtn");
  const sortSelect = document.getElementById("literatureSortOrder");
  const sortMode = getLiteratureSortMode();
  if (sortPanel) sortPanel.hidden = !literatureSortPanelOpen;
  if (sortSelect) sortSelect.value = sortMode;
  if (sortButton) {
    const label = literatureSortModeLabel(sortMode);
    sortButton.textContent = sortMode === "literature" ? "Sort" : `Sort (${label})`;
    sortButton.classList.toggle("sort-active", sortMode !== "literature");
    sortButton.setAttribute("aria-expanded", literatureSortPanelOpen ? "true" : "false");
  }
}

function setLiteratureFilterPanelOpen(open) {
  literatureFilterPanelOpen = !!open;
  if (literatureFilterPanelOpen) literatureSortPanelOpen = false;
  syncLiteratureViewControls();
  if (literatureFilterPanelOpen) {
    setTimeout(() => document.getElementById("literatureFilterType")?.focus(), 0);
  }
}

function toggleLiteratureFilterPanel() {
  setLiteratureFilterPanelOpen(!literatureFilterPanelOpen);
}

function closeLiteratureFilterPanel() {
  literatureFilterPanelOpen = false;
  syncLiteratureViewControls();
  setTimeout(() => document.getElementById("literatureFilterBtn")?.focus(), 0);
}

function applyLiteratureFiltersFromControls() {
  const state = getLiteratureFilterState();
  state.type = document.getElementById("literatureFilterType")?.value || "all";
  state.group = document.getElementById("literatureFilterGroup")?.value || "all";
  state.hasTags = !!document.getElementById("literatureFilterTags")?.checked;
  state.hasContent = !!document.getElementById("literatureFilterContent")?.checked;
  resetLiteraturePage();
  renderLiteratureList();
}

function resetLiteratureFilters() {
  literatureFilterStatesByUniverse.set(
    currentUniverseId || "__none__",
    defaultLiteratureFilterState(),
  );
  resetLiteraturePage();
  renderLiteratureList();
}

function setLiteratureSortPanelOpen(open) {
  literatureSortPanelOpen = !!open;
  if (literatureSortPanelOpen) literatureFilterPanelOpen = false;
  syncLiteratureViewControls();
  if (literatureSortPanelOpen) {
    setTimeout(() => document.getElementById("literatureSortOrder")?.focus(), 0);
  }
}

function toggleLiteratureSortPanel() {
  setLiteratureSortPanelOpen(!literatureSortPanelOpen);
}

function closeLiteratureSortPanel() {
  literatureSortPanelOpen = false;
  syncLiteratureViewControls();
  setTimeout(() => document.getElementById("literatureSortBtn")?.focus(), 0);
}

function applyLiteratureSortFromControl() {
  setLiteratureSortMode(document.getElementById("literatureSortOrder")?.value || "literature");
  resetLiteraturePage();
  renderLiteratureList();
}

function resetLiteratureSort() {
  setLiteratureSortMode("literature");
  resetLiteraturePage();
  renderLiteratureList();
}

function applyLiteratureEntryActionLabels(entryEl) {
  const top = directChildWithClass(entryEl, "entry-top");
  if (!top) return;

  const title = firstCompactText(top, ".entry-title-main", "Untitled literature");
  const type = entryEl.classList.contains("literature-group-entry")
    ? "literature group"
    : "literature document";
  const openLabel = entryEl.classList.contains("literature-group-entry")
    ? `Open or collapse ${type}: ${title}`
    : `Open ${type}: ${title}`;

  setContextualAriaLabel(top, ".literature-title-toggle", openLabel);
  setContextualAriaLabel(top, ".menu-button", `Open actions for ${type}: ${title}`);
  setContextualAriaLabel(top, ".literature-edit-action", `Edit ${type}: ${title}`);
  setContextualAriaLabel(top, ".literature-tag-action", `Edit tags for ${type}: ${title}`);
  setContextualAriaLabel(top, ".literature-group-action", `Group literature document: ${title}`);
  setContextualAriaLabel(top, ".literature-edit-group-action", `Edit literature group: ${title}`);
  setContextualAriaLabel(top, ".literature-ungroup-action", `Ungroup literature group: ${title}`);
  setContextualAriaLabel(
    top,
    ".literature-copy-universe-action",
    `Copy ${type} to another universe: ${title}`,
  );
  setContextualAriaLabel(top, ".literature-delete-action", `Delete ${type}: ${title}`);
}

const LITERATURE_VIEW_HELPERS_API = Object.freeze({
  LITERATURE_PAGE_SIZE,
  getLiteraturePage,
  setLiteraturePage,
  resetLiteraturePage,
  scrollLiteraturePageToTop,
  renderLiteraturePagination,
  defaultLiteratureFilterState,
  getLiteratureFilterState,
  literatureFilterActiveCount,
  getLiteratureSortMode,
  setLiteratureSortMode,
  literatureSortModeLabel,
  literatureItemHasTags,
  literatureItemHasContent,
  literatureItemMatchesStatus,
  literatureGroupOptions,
  sanitizeLiteratureFilterState,
  buildLiteratureViewPlan,
  literatureSortTimestamp,
  literatureSortComparator,
  sortLiteratureViewPlan,
  syncLiteratureViewControls,
  setLiteratureFilterPanelOpen,
  toggleLiteratureFilterPanel,
  closeLiteratureFilterPanel,
  applyLiteratureFiltersFromControls,
  resetLiteratureFilters,
  setLiteratureSortPanelOpen,
  toggleLiteratureSortPanel,
  closeLiteratureSortPanel,
  applyLiteratureSortFromControl,
  resetLiteratureSort,
  applyLiteratureEntryActionLabels,
});

export function installLegacyLiteratureViewHelpersBindings(target = globalThis) {
  Object.assign(target, LITERATURE_VIEW_HELPERS_API);
  target.WormholesLiteratureViewHelpers = LITERATURE_VIEW_HELPERS_API;
  return LITERATURE_VIEW_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyLiteratureViewHelpersBindings(window);

export {
  LITERATURE_PAGE_SIZE,
  getLiteraturePage,
  setLiteraturePage,
  resetLiteraturePage,
  scrollLiteraturePageToTop,
  renderLiteraturePagination,
  defaultLiteratureFilterState,
  getLiteratureFilterState,
  literatureFilterActiveCount,
  getLiteratureSortMode,
  setLiteratureSortMode,
  literatureSortModeLabel,
  literatureItemHasTags,
  literatureItemHasContent,
  literatureItemMatchesStatus,
  literatureGroupOptions,
  sanitizeLiteratureFilterState,
  buildLiteratureViewPlan,
  literatureSortTimestamp,
  literatureSortComparator,
  sortLiteratureViewPlan,
  syncLiteratureViewControls,
  setLiteratureFilterPanelOpen,
  toggleLiteratureFilterPanel,
  closeLiteratureFilterPanel,
  applyLiteratureFiltersFromControls,
  resetLiteratureFilters,
  setLiteratureSortPanelOpen,
  toggleLiteratureSortPanel,
  closeLiteratureSortPanel,
  applyLiteratureSortFromControl,
  resetLiteratureSort,
  applyLiteratureEntryActionLabels,
};

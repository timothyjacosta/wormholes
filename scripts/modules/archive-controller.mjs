/* Wormholes Beta 110 archive module.
   Archive helpers, entry rendering, grouping, deletion, migration, and creation-folder sync extracted from wormholes-app.js.
   Loaded before wormholes-app.js so existing global functions remain available to the app core. */

import {controllerServices, registerControllerServices} from "./controller-service-registry.mjs";
import {
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
} from "./archive-view-helpers.mjs";
import {
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
} from "./archive-integrity-helpers.mjs";

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
    : controllerServices.getCreationTitleFromUniverse(universeId, creationId);
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
        bridges: controllerServices.normalizeBridges(entry.bridges),
      };
    })
    .filter(Boolean);

  if (removedGroupIds.length) {
    archiveEntries = archiveEntries.map((entry) => ({
      ...entry,
      connections: (entry.connections || []).filter((id) => !removedGroupIds.includes(id)),
      bridges: controllerServices
        .normalizeBridges(entry.bridges)
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
  const bridges = controllerServices.normalizeBridges(entry.bridges);
  if (bridges.length === 0) {
    return "";
  }

  return `
    <p><b>Bridges:</b></p>
    <ul class="connection-list">
      ${bridges
        .map((bridge) => {
          const universeTitle = controllerServices.getUniverseTitle(bridge.universeId);
          const creationTitle = bridge.creationId
            ? controllerServices.getCreationTitleFromUniverse(bridge.universeId, bridge.creationId)
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
              ? controllerServices.literatureFileTypeLabel(entry)
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
      controllerServices.saveEditedLiteratureGroupFromModal();
    } else {
      controllerServices.createLiteratureGroupFromModal();
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
      context: controllerServices.getCurrentUniverse()?.title || "",
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
  controllerServices.renderWormholesMap();
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
  group.bridges = controllerServices.normalizeBridges(group.bridges);
  group.notes = group.notes || [];

  const normalization = normalizeArchiveGroups({persist: false, cleanup: false});
  if (!saveArchiveToStorage()) {
    archiveEntries = previousArchiveEntries;
    return;
  }
  cleanupRemovedArchiveGroups(normalization.removedGroupIds);
  closeGroupModal();
  renderArchive();
  controllerServices.renderWormholesMap();

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
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
    const filteredUniverseBridges = controllerServices
      .normalizeUniverseBridges(universe)
      .filter(
        (bridge) => !(bridge.universeId === currentUniverseId && bridge.creationId === groupId),
      );

    if (
      JSON.stringify(filteredUniverseBridges) !==
      JSON.stringify(controllerServices.normalizeUniverseBridges(universe))
    ) {
      universe.bridges = filteredUniverseBridges;
      universesChanged = true;
    }

    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    let archiveChanged = false;

    archive.forEach((entry) => {
      const filteredBridges = controllerServices
        .normalizeBridges(entry.bridges)
        .filter(
          (bridge) => !(bridge.universeId === currentUniverseId && bridge.creationId === groupId),
        );

      if (
        JSON.stringify(filteredBridges) !==
        JSON.stringify(controllerServices.normalizeBridges(entry.bridges))
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
      bridges: controllerServices
        .normalizeBridges(entry.bridges)
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
  controllerServices.renderWormholesMap();

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
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
    controllerServices.toggleMapConnection(sourceId, targetId);
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
  controllerServices.renderConnectionsMap();
}

function archiveLiteratureBadgeHtml(entry) {
  if (!isGroupEntry(entry)) {
    return controllerServices.literatureBadgeHtml("entry", currentUniverseId, entry.id);
  }

  const groupBadge = controllerServices.literatureBadgeHtml("entry", currentUniverseId, entry.id);
  const childrenBadge = controllerServices.literatureBadgeHtml(
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
  const directRows = controllerServices.visionItemsForEntryTag(currentUniverseId, entry.id);
  const childRows = isGroupEntry(entry)
    ? controllerServices.visionItemsForGroupChildrenTag(currentUniverseId, entry.id)
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
        behavior: controllerServices.prefersReducedMotion() ? "auto" : "smooth",
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
        behavior: controllerServices.prefersReducedMotion() ? "auto" : "smooth",
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

  controllerServices.renderConnectStatus();

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
      controllerServices.openLiteratureLinksModal(
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
      controllerServices.togglePositionedMenu(menu);
    });
  });

  document.querySelectorAll(".edit-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      openEditModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".summarize-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      openSummaryModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".note-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      openNoteModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".group-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      openGroupModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".edit-group-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      openEditGroupModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".ungroup-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      ungroupEntry(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".move-universe-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      controllerServices.openMigrateModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll("#archiveList .copy-universe-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      openCopyToUniverseModal("archive", entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".connect-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      controllerServices.openConnectPickerModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".bridge-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      controllerServices.openBridgeModal(entryEl.dataset.id);
    });
  });

  document.querySelectorAll(".delete-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const entryEl = button.closest(".entry");
      controllerServices.closeMenus();
      openDeleteEntryConfirm(entryEl.dataset.id);
    });
  });

  populateArchiveVisionThumbnails();
  applyPendingArchiveReveal();

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
  }
}

async function populateArchiveVisionThumbnails() {
  archiveVisionObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  archiveVisionObjectUrls = [];

  const thumbs = Array.from(document.querySelectorAll(".archive-vision-thumb"));
  for (const thumb of thumbs) {
    const item = controllerServices.getVisionItemFromUniverse(
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

    await controllerServices.populateVisionThumbnailButton(
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
    delete connectionNotes[controllerServices.connectionKey(sourceId, targetId)];
    saveConnectionNotesToStorage();
  } else {
    source.connections.push(targetId);
    target.connections.push(sourceId);
  }

  saveArchiveToStorage();
  renderArchive();

  if (!alreadyConnected) {
    if (options.openRelationshipModal) {
      controllerServices.openConnectionModal(sourceId, targetId);
    } else if (!controllerServices.shouldSuppressRelationshipToast(options)) {
      showSavedToast("Connected");
    }
  } else if (!controllerServices.shouldSuppressRelationshipToast(options)) {
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
  const deletedUniverse = controllerServices.getCurrentUniverse();
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
      await controllerServices.ensureWormholesFolderReadyForDestructiveSync();
      let folderHandle = deletedCreationFolderHandle;
      if (!folderHandle) {
        const folders = deletedUniverse ? await ensureUniverseFolders(deletedUniverse) : null;
        folderHandle = folders?.creations || null;
      }
      await controllerServices.deleteFolderBackedRecordFile(deletedEntry, folderHandle);
    }
    await controllerServices.pruneWormholesFolderToAppState();
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
    controllerServices.renderConnectionsMap();
  }
  if (document.getElementById("wormholesModal")?.classList.contains("open")) {
    controllerServices.renderWormholesMap();
  }
}

function archiveEntryDisplayWhat(entry) {
  if (isGroupEntry(entry)) {
    const count = groupChildIds(entry).length;
    return `Group — ${count} creation${count === 1 ? "" : "s"}`;
  }
  return entry?.what?.val || "Creation";
}

function creationFileText(entry, universe = controllerServices.getCurrentUniverse(), options = {}) {
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

  const bridges = controllerServices.normalizeBridges(entry.bridges);
  lines.push("", "Bridges:");
  if (bridges.length) {
    bridges.forEach((bridge) => {
      const universeTitle = controllerServices.getUniverseTitle(bridge.universeId);
      const creationTitle = bridge.creationId
        ? controllerServices.getCreationTitleFromUniverse(bridge.universeId, bridge.creationId)
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
        `- ${label}${row.homeUniverseId ? ` (${controllerServices.getUniverseTitle(row.homeUniverseId)})` : ""}`,
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

async function createCreationDocxBlob(entry, universe = controllerServices.getCurrentUniverse()) {
  const linkedImageRows = controllerServices.linkedVisionRowsForCreationDocx(
    entry,
    universe?.id || currentUniverseId,
  );
  const {images, unavailable} = await controllerServices.docxImagesFromVisionRows(linkedImageRows);
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
  universe = controllerServices.getCurrentUniverse(),
  options = {},
) {
  if (!entry || !localFoldersEnabled || !folderHandle) return entry;

  if (!(await controllerServices.requestFolderPermission(folderHandle))) return entry;

  const blob = await createCreationDocxBlob(entry, universe);

  if (options.forceTitleFileName || !entry.folderFileName) {
    await controllerServices.renameFolderBackedRecordFile(
      entry,
      folderHandle,
      entry.title || "creation",
      ".docx",
      blob,
    );
  } else {
    await controllerServices.writeBlobToFolder(folderHandle, entry.folderFileName, blob);
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
      controllerServices.getCurrentUniverse(),
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
    !(await controllerServices.requestFolderPermission(creationFolderHandle))
  )
    return;

  let changed = false;
  for (const entry of archiveEntries) {
    if (entry.storage === "folder") continue;
    await writeArchiveEntryToFolder(
      entry,
      creationFolderHandle,
      controllerServices.getCurrentUniverse(),
    );
    changed = true;
  }

  if (changed) saveArchiveToStorage();
}

async function migrateAllArchiveEntriesToFolder(options = false) {
  const migrationOptions = controllerServices.normalizeFolderMigrationOptions(options);
  const force = migrationOptions.force;
  if (!localFoldersEnabled || !wormholesCreationsRootHandle) return;

  for (const universe of universes) {
    const folders = await ensureUniverseFolders(universe);
    if (
      !folders?.creations ||
      !(await controllerServices.requestFolderPermission(folders.creations))
    )
      continue;

    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    let changed = false;

    for (const entry of archive) {
      if (entry.storage === "folder" && !force) continue;

      const folderFileName = await controllerServices.folderMigrationFileName(
        entry,
        folders.creations,
        entry.title || "creation",
        ".docx",
        migrationOptions,
      );

      entry.folderFileName = folderFileName;
      await controllerServices.writeBlobToFolder(
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
  const sourceUniverse = controllerServices.getCurrentUniverse();

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
      controllerServices.closeMigrateModal();
      controllerServices.enterUniverse(targetUniverseId);
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
        (await controllerServices.requestFolderPermission(targetFolders.creations))
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
      targetNotes[controllerServices.makeConnectionKeyFromIds(idMap[a], idMap[b])] = note;
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
  await controllerServices.pruneWormholesFolderToAppState();
  controllerServices.closeMigrateModal();
  controllerServices.closeMenus();
  renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active"))
    controllerServices.renderConnectionsMap();
  if (document.getElementById("wormholesModal")?.classList.contains("open"))
    controllerServices.renderWormholesMap();
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
      context: controllerServices.getCurrentUniverse()?.title || "",
      operation: "archive another creation",
    }).ok
  )
    return;

  const generationMetadata =
    typeof controllerServices.currentGenerationMetadata === "function"
      ? controllerServices.currentGenerationMetadata()
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
      controllerServices.closeTitleModal();
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
  controllerServices.closeTitleModal();
  if (rollHistoryId) {
    window.WormholesRecentRollHistory?.markArchived?.(rollHistoryId, {
      entryId: entry.id,
      title: entry.title,
    });
  }
  showSavedToast("Creation archived");

  current = {what: null, attr1: null, attr2: null, pressure: null};
  if (typeof controllerServices.resetCurrentGenerationDiagnostics === "function")
    controllerServices.resetCurrentGenerationDiagnostics();
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
registerControllerServices(ARCHIVE_CONTROLLER_API);

export {
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
};

/* Wormholes Beta 261 — Literature group creation, editing, and ungrouping workflows.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";

function openLiteratureGroupModal(docId) {
  const source = getLiteratureDoc(docId);
  if (!source || isLiteratureGroup(source) || getLiteratureGroupForDocId(docId)) return;

  activeGroupEntryId = docId;
  activeGroupMode = "create";
  activeGroupContext = "literature";
  document.getElementById("groupModalTitle").textContent = "Group Literature";
  document.getElementById("saveGroupBtn").textContent = "Create Group";
  document.getElementById("groupError").classList.remove("show");
  document.getElementById("groupError").textContent =
    "Enter a group title and choose at least two literature documents.";
  document.getElementById("groupTitleInput").value = "";
  document.getElementById("groupModalSubtitle").textContent =
    `Group "${source.title}" with other literature in this universe. Existing tags stay attached.`;

  const candidates = literatureEntries.filter(
    (doc) => !isLiteratureGroup(doc) && (!getLiteratureGroupForDocId(doc.id) || doc.id === docId),
  );

  if (candidates.length <= 1) {
    document.getElementById("groupCreationList").innerHTML =
      `<div class="universe-empty">There are no other ungrouped literature documents available to group with this item.</div>`;
  } else {
    controllerServices.renderGroupChoiceList(candidates, new Set([docId]), new Set([docId]));
  }

  document.getElementById("groupModal").classList.add("open");
  setTimeout(() => document.getElementById("groupTitleInput").focus(), 0);
}

function openEditLiteratureGroupModal(groupId) {
  const group = getLiteratureDoc(groupId);
  if (!isLiteratureGroup(group)) return;

  activeGroupEntryId = groupId;
  activeGroupMode = "edit";
  activeGroupContext = "literature";
  document.getElementById("groupModalTitle").textContent = "Edit Literature Group";
  document.getElementById("saveGroupBtn").textContent = "Save Group";
  document.getElementById("groupError").classList.remove("show");
  document.getElementById("groupError").textContent =
    "Enter a group title and choose at least two literature documents.";
  document.getElementById("groupTitleInput").value = group.title || "";
  document.getElementById("groupModalSubtitle").textContent =
    `Add or remove literature from "${group.title}". Existing tags stay attached.`;

  const currentChildIds = new Set(literatureGroupChildIds(group));
  const candidates = literatureEntries.filter((doc) => {
    if (isLiteratureGroup(doc)) return false;
    const existingGroup = getLiteratureGroupForDocId(doc.id);
    return !existingGroup || existingGroup.id === group.id || currentChildIds.has(doc.id);
  });

  controllerServices.renderGroupChoiceList(candidates, currentChildIds, new Set());

  document.getElementById("groupModal").classList.add("open");
  setTimeout(() => document.getElementById("groupTitleInput").focus(), 0);
}

function createLiteratureGroupFromModal() {
  const source = getLiteratureDoc(activeGroupEntryId);
  const titleInput = document.getElementById("groupTitleInput");
  const title = titleInput.value.trim();
  const selectedChoiceIds = controllerServices.selectedGroupChoiceIds();

  const selectedIds = Array.from(
    new Set([activeGroupEntryId, ...selectedChoiceIds].filter(Boolean)),
  ).filter((id) => {
    const doc = getLiteratureDoc(id);
    return doc && !isLiteratureGroup(doc);
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
      operation: "create this Literature group",
    }).ok
  )
    return;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("literature", literatureEntries.length, 1, {
      context: controllerServices.getCurrentUniverse()?.title || "",
      operation: "create another Literature item",
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

  const previousLiteratureEntries = JSON.parse(JSON.stringify(literatureEntries));
  literatureEntries.forEach((doc) => {
    if (isLiteratureGroup(doc)) {
      doc.groupIds = literatureGroupChildIds(doc).filter((id) => !selectedIds.includes(id));
      doc.tags = literatureGroupTagUnion(doc.groupIds, doc.tags, literatureEntries);
    }
  });

  const groupDoc = {
    id: makeId(),
    kind: "literatureGroup",
    title,
    content: "",
    sourceName: "",
    fileType: "group",
    mimeType: "",
    fileData: "",
    fileSize: 0,
    convertedFrom: "",
    storage: "",
    folderFileName: "",
    contentStoreKey: "",
    contentStored: "",
    groupIds: selectedIds,
    tags: literatureGroupTagUnion(selectedIds, null, literatureEntries),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const firstIndex = literatureEntries.findIndex((doc) => selectedIds.includes(doc.id));
  literatureEntries.splice(firstIndex >= 0 ? firstIndex : 0, 0, groupDoc);
  normalizeLiteratureGroups({persist: false});
  const saveResult = saveLiteratureToStorage();
  if (!(saveResult === true || saveResult?.ok === true)) {
    literatureEntries = previousLiteratureEntries;
    return;
  }
  controllerServices.closeGroupModal();
  refreshLiteratureLinkDisplays();
  showSavedToast("Group created");
}

function saveEditedLiteratureGroupFromModal() {
  const group = getLiteratureDoc(activeGroupEntryId);
  const titleInput = document.getElementById("groupTitleInput");
  const title = titleInput.value.trim();
  const selectedIds = Array.from(new Set(controllerServices.selectedGroupChoiceIds())).filter(
    (id) => {
      const doc = getLiteratureDoc(id);
      return doc && !isLiteratureGroup(doc);
    },
  );

  if (!isLiteratureGroup(group) || !title || selectedIds.length < 2) {
    document.getElementById("groupError").classList.add("show");
    if (!title) titleInput.focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      previousValue: group.title || "",
      fieldName: "group title",
      operation: "save this Literature group",
    }).ok
  )
    return;
  const previousIds = new Set(literatureGroupChildIds(group));
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
  const pullsFromOtherGroups = literatureEntries.some(
    (doc) =>
      isLiteratureGroup(doc) &&
      doc.id !== group.id &&
      literatureGroupChildIds(doc).some((id) => selectedIds.includes(id)),
  );
  const destructiveMembershipChange = removesCurrentMembers || pullsFromOtherGroups;
  const undoState = destructiveMembershipChange ? window.WormholesUndo?.captureState?.() : null;
  const previousLiteratureEntries = JSON.parse(JSON.stringify(literatureEntries));

  literatureEntries.forEach((doc) => {
    if (isLiteratureGroup(doc) && doc.id !== group.id) {
      doc.groupIds = literatureGroupChildIds(doc).filter((id) => !selectedIds.includes(id));
      doc.tags = literatureGroupTagUnion(doc.groupIds, doc.tags, literatureEntries);
    }
  });

  group.title = title;
  group.groupIds = selectedIds;
  group.tags = literatureGroupTagUnion(selectedIds, group.tags, literatureEntries);
  group.updatedAt = new Date().toISOString();

  normalizeLiteratureGroups({persist: false});
  const saveResult = saveLiteratureToStorage();
  if (!(saveResult === true || saveResult?.ok === true)) {
    literatureEntries = previousLiteratureEntries;
    return;
  }
  controllerServices.closeGroupModal();
  refreshLiteratureLinkDisplays();
  if (destructiveMembershipChange && window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Literature group updated",
      restoredMessage: "Literature group changes undone",
      state: undoState,
    });
  } else {
    showSavedToast("Group updated");
  }
}

function ungroupLiteratureGroup(groupId) {
  const group = getLiteratureDoc(groupId);
  if (!isLiteratureGroup(group)) return;
  const undoState = window.WormholesUndo?.captureState?.();
  const previousLiteratureEntries = JSON.parse(JSON.stringify(literatureEntries));
  const previousActiveLiteratureId = activeLiteratureId;
  const previousActiveLiteratureTagId = activeLiteratureTagId;

  literatureEntries = literatureEntries.filter((doc) => doc.id !== groupId);
  if (activeLiteratureId === groupId) activeLiteratureId = null;
  if (activeLiteratureTagId === groupId) activeLiteratureTagId = null;
  const saveResult = saveLiteratureToStorage();
  if (!(saveResult === true || saveResult?.ok === true)) {
    literatureEntries = previousLiteratureEntries;
    activeLiteratureId = previousActiveLiteratureId;
    activeLiteratureTagId = previousActiveLiteratureTagId;
    return;
  }
  refreshLiteratureLinkDisplays();
  if (window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Literature group removed",
      restoredMessage: "Literature group restored",
      state: undoState,
    });
  } else {
    showSavedToast("Group removed");
  }
}

const LITERATURE_GROUP_HELPERS_API = Object.freeze({
  openLiteratureGroupModal,
  openEditLiteratureGroupModal,
  createLiteratureGroupFromModal,
  saveEditedLiteratureGroupFromModal,
  ungroupLiteratureGroup,
});

export function installLegacyLiteratureGroupHelpersBindings(target = globalThis) {
  Object.assign(target, LITERATURE_GROUP_HELPERS_API);
  target.WormholesLiteratureGroupHelpers = LITERATURE_GROUP_HELPERS_API;
  return LITERATURE_GROUP_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyLiteratureGroupHelpersBindings(window);

export {
  openLiteratureGroupModal,
  openEditLiteratureGroupModal,
  createLiteratureGroupFromModal,
  saveEditedLiteratureGroupFromModal,
  ungroupLiteratureGroup,
};

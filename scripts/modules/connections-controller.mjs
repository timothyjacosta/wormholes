/* Wormholes Beta 301 connections module.
   Handles creation-to-creation connection UI, notes, picker modals, and clear-connection behavior. */

import {controllerServices, registerControllerServices} from "./controller-service-registry.mjs";

let pendingRelationshipRemoval = null;

function openRelationshipRemovalConfirm(kind, sourceLabel, targetLabel, onConfirm) {
  const modal = document.getElementById("relationshipRemovalConfirmModal");
  const title = document.getElementById("relationshipRemovalConfirmTitle");
  const text = document.getElementById("relationshipRemovalConfirmText");
  const cancelButton = document.getElementById("cancelRelationshipRemovalBtn");
  const confirmButton = document.getElementById("confirmRelationshipRemovalBtn");
  if (!modal || !title || !text || !cancelButton || !confirmButton) return false;

  const relationshipName = kind === "bridge" ? "Bridge" : "Connection";
  const safeSource = String(sourceLabel || "the first item");
  const safeTarget = String(targetLabel || "the second item");
  title.textContent = `Remove ${relationshipName}?`;
  text.textContent = `This will remove the link between ${safeSource} and ${safeTarget}. The items will not be deleted.`;
  cancelButton.textContent = `Keep ${relationshipName}`;
  confirmButton.textContent = `Remove ${relationshipName}`;
  pendingRelationshipRemoval = typeof onConfirm === "function" ? onConfirm : null;
  modal.classList.add("open");
  return true;
}

function closeRelationshipRemovalConfirm() {
  document.getElementById("relationshipRemovalConfirmModal")?.classList.remove("open");
  pendingRelationshipRemoval = null;
}

function confirmRelationshipRemoval() {
  const action = pendingRelationshipRemoval;
  document.getElementById("relationshipRemovalConfirmModal")?.classList.remove("open");
  pendingRelationshipRemoval = null;
  action?.();
}

function renderConnectStatus() {
  const box = document.getElementById("connectStatus");
  if (!connectSourceId) {
    box.classList.remove("open");
    box.innerHTML = "";
    return;
  }

  const source = controllerServices.getEntry(connectSourceId);
  if (!source) {
    connectSourceId = null;
    box.classList.remove("open");
    box.innerHTML = "";
    return;
  }

  box.classList.add("open");
  box.innerHTML = `
    <b>Connecting from:</b> ${escapeHtml(source.title)}<br>
    Click dotted creations to connect them. Click solid-outlined creations to disconnect them. Choose <b>Finish Connecting</b> when done.
    <br>
    <button id="finishConnectBtn" type="button" data-app-button="true" class="app-button">Finish Connecting</button>
    <button id="cancelConnectBtn" type="button" data-app-button="true" class="app-button">Cancel Connect</button>
  `;
  document.getElementById("finishConnectBtn").addEventListener("click", () => {
    connectSourceId = null;
    controllerServices.renderArchive();
  });
  document.getElementById("cancelConnectBtn").addEventListener("click", () => {
    connectSourceId = null;
    controllerServices.renderArchive();
  });
}

function connectionsWorkspaceIsActive() {
  return !!document.getElementById("connectionsScreen")?.classList.contains("active");
}

function shouldSuppressRelationshipToast(options = {}) {
  return !options.showToast || !!options.silentToast || connectionsWorkspaceIsActive();
}

function openConnectPickerModal(entryId) {
  const entry = controllerServices.getEntry(entryId);
  if (!entry) return;

  activeConnectEntryId = entryId;
  stagedConnectTargetIds = new Set(
    (entry.connections || []).filter((id) => id !== entryId && controllerServices.getEntry(id)),
  );
  expandedConnectPickerNodes = new Set();
  document.getElementById("connectPickerSubtitle").textContent =
    `Item: ${entry.title}. Select groups or creations in this universe. Save when done.`;
  renderConnectPickerList();
  document.getElementById("connectPickerModal").classList.add("open");
}

function closeConnectPickerModal() {
  document.getElementById("connectPickerModal")?.classList.remove("open");
  activeConnectEntryId = null;
  stagedConnectTargetIds = new Set();
  expandedConnectPickerNodes = new Set();
}

function renderConnectEntryPicker(entry, depth = 0) {
  const source = controllerServices.getEntry(activeConnectEntryId);
  const isSource = source && source.id === entry.id;
  const isGroup = controllerServices.isGroupEntry(entry);
  const key = controllerServices.nestedPickerKey("connect-group", currentUniverseId, entry.id);
  const expanded = expandedConnectPickerNodes.has(key);
  const children = isGroup
    ? controllerServices
        .groupChildIds(entry)
        .map((id) => controllerServices.getEntry(id))
        .filter(Boolean)
    : [];
  const alreadyConnected = stagedConnectTargetIds.has(entry.id);
  const meta = isSource
    ? "Current item — cannot connect to itself"
    : alreadyConnected
      ? "Connected"
      : "Not connected";

  return `
    <div class="nested-picker-node depth-${depth}">
      <div class="nested-picker-row ${alreadyConnected ? "selected" : ""} ${isSource ? "disabled" : ""}">
        <button class="nested-picker-select app-button" type="button" data-app-button="true" data-picker-action="connect-entry" data-entry-id="${escapeHtml(entry.id)}" aria-pressed="${alreadyConnected ? "true" : "false"}" aria-label="${escapeHtml(`${alreadyConnected ? "Disconnect" : "Connect"} ${isGroup ? "group" : "creation"}: ${entry.title}${isSource ? ". Current item; cannot connect to itself" : ""}`)}" ${isSource ? `aria-disabled="true"` : ""}>
          <span class="group-choice-title">${escapeHtml(entry.title)}</span>
          <span class="group-choice-meta">${escapeHtml(controllerServices.entryPickerMeta(entry))} · ${escapeHtml(meta)}</span>
        </button>
        ${isGroup ? `<button class="nested-picker-expander app-button" type="button" data-app-button="true" data-picker-action="toggle-connect-node" data-picker-key="${escapeHtml(key)}">${expanded ? "▾" : "▸"}</button>` : ""}
      </div>
      ${isGroup && expanded ? `<div class="nested-picker-children">${children.length ? children.map((child) => renderConnectEntryPicker(child, depth + 1)).join("") : `<div class="universe-empty">This group is empty.</div>`}</div>` : ""}
    </div>
  `;
}

function renderConnectPickerList() {
  const list = document.getElementById("connectPickerList");
  const source = controllerServices.getEntry(activeConnectEntryId);

  if (!source) {
    list.innerHTML = `<div class="universe-empty">No creation selected.</div>`;
    return;
  }

  const topEntries = controllerServices.topLevelArchiveEntries(archiveEntries);

  list.innerHTML = `
    <div class="nested-picker-universe">
      <div class="nested-picker-row selected">
        <span class="nested-picker-select locked">
          <span class="group-choice-title">${escapeHtml(controllerServices.getCurrentUniverse()?.title || "Current Universe")}</span>
          <span class="group-choice-meta">Current universe · select groups or creations below</span>
        </span>
      </div>
      <div class="nested-picker-children">
        ${topEntries.length ? topEntries.map((entry) => renderConnectEntryPicker(entry, 1)).join("") : `<div class="universe-empty">No creations in this universe.</div>`}
      </div>
    </div>
  `;

  list.querySelectorAll("[data-picker-action]").forEach((control) => {
    const activate = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      const action = control.dataset.pickerAction;
      if (action === "toggle-connect-node") {
        const key = control.dataset.pickerKey;
        if (expandedConnectPickerNodes.has(key)) expandedConnectPickerNodes.delete(key);
        else expandedConnectPickerNodes.add(key);
        renderConnectPickerList();
        return;
      }

      if (control.getAttribute("aria-disabled") === "true") return;

      if (action === "connect-entry") {
        applyConnectPickerChoice(control.dataset.entryId);
      }
    };

    control.addEventListener("click", activate);
    control.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(event);
      }
    });
  });

  controllerServices.protectAllControls(list);
}

function applyConnectPickerChoice(targetId) {
  if (!activeConnectEntryId || !targetId || activeConnectEntryId === targetId) return;

  if (stagedConnectTargetIds.has(targetId)) stagedConnectTargetIds.delete(targetId);
  else stagedConnectTargetIds.add(targetId);
  renderConnectPickerList();
}

function saveConnectPickerModal() {
  const source = controllerServices.getEntry(activeConnectEntryId);
  if (!source) return;

  controllerServices.cleanupAllStaleLinks();
  const original = new Set(
    (source.connections || []).filter((id) => id !== source.id && controllerServices.getEntry(id)),
  );
  const staged = new Set(
    Array.from(stagedConnectTargetIds).filter(
      (id) => id !== source.id && controllerServices.getEntry(id),
    ),
  );
  const removedConnections = Array.from(original).some((targetId) => !staged.has(targetId));
  const undoState = removedConnections ? window.WormholesUndo?.captureState?.() : null;
  const connectionLimit = window.WormholesEntityLimits?.ensureConnectionPlan(
    archiveEntries,
    source.id,
    Array.from(staged),
    {sourceTitle: source.title || "", replaceSource: true},
  );
  if (connectionLimit && !connectionLimit.ok) return;

  original.forEach((targetId) => {
    if (staged.has(targetId)) return;
    const target = controllerServices.getEntry(targetId);
    source.connections = (source.connections || []).filter((id) => id !== targetId);
    if (target) {
      target.connections = (target.connections || []).filter((id) => id !== source.id);
    }
    delete connectionNotes[connectionKey(source.id, targetId)];
  });

  staged.forEach((targetId) => {
    const target = controllerServices.getEntry(targetId);
    if (!target) return;
    source.connections = addUniqueId(source.connections || [], targetId);
    target.connections = addUniqueId(target.connections || [], source.id);
  });

  saveArchiveToStorage();
  saveConnectionNotesToStorage();
  selectedMapNodeId = source.id;
  closeConnectPickerModal();
  controllerServices.closeMenus();
  controllerServices.renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
  }
  if (removedConnections && window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Connections updated",
      restoredMessage: "Connection changes undone",
      state: undoState,
    });
  } else {
    showSavedToast("Connections saved");
  }
}

function makeConnectionKeyFromIds(a, b) {
  return [a, b].sort().join("::");
}

function showConnectionsScreen() {
  selectedMapNodeId = null;
  connectionsMapIsolatedSubgraph = false;
  window.WormholesMapSearch?.clearActive?.("connections");
  document.getElementById("archiveListScreen").classList.remove("active");
  document.getElementById("connectionsScreen").classList.add("active");
  controllerServices.cleanupAllStaleLinks();
  connectionsMapAutoFitOnNextRender = true;
  controllerServices.updateDestructiveClearButtons();
  controllerServices.renderConnectionsMap();
}

function connectionKey(a, b) {
  return [a, b].sort().join("::");
}

function getConnectionNote(a, b) {
  return connectionNotes[connectionKey(a, b)] || "";
}

function setConnectionNote(a, b, text) {
  const key = connectionKey(a, b);
  const trimmed = text.trim();

  if (trimmed) {
    connectionNotes[key] = trimmed;
  } else {
    delete connectionNotes[key];
  }

  saveConnectionNotesToStorage();
}

function currentUniverseHasClearableConnections() {
  const hasEntryConnections = archiveEntries.some(
    (entry) => Array.isArray(entry.connections) && entry.connections.length > 0,
  );
  const hasConnectionNotes = Object.keys(connectionNotes || {}).length > 0;

  return hasEntryConnections || hasConnectionNotes;
}

function openConnectionModal(sourceId, targetId) {
  const key = connectionKey(sourceId, targetId);
  activeConnectionKey = key;
  activeBridgeNoteKey = null;

  const source = controllerServices.getEntry(sourceId);
  const target = controllerServices.getEntry(targetId);
  const existing = connectionNotes[key] || "";

  document.getElementById("connectionModalTitle").textContent = "Connection Details";
  const connectionError = document.getElementById("connectionError");
  connectionError.classList.remove("show");
  connectionError.textContent = "Connection details are required.";
  const connectionLabel = document.getElementById("connectionTextLabel");
  if (connectionLabel) connectionLabel.textContent = "Connection details";
  const saveButton = document.getElementById("saveConnectionTextBtn");
  if (saveButton) saveButton.textContent = "Save Details";
  document.getElementById("connectionModalSubtitle").textContent =
    `${source ? source.title : "Creation"} ↔ ${target ? target.title : "Creation"}`;
  document.getElementById("connectionTextInput").value = existing;
  setDestructiveButtonVisibility("deleteConnectionTextBtn", !!existing);
  const deleteButton = document.getElementById("deleteConnectionTextBtn");
  if (deleteButton) deleteButton.textContent = "Delete Connection Details";
  document.getElementById("connectionModal").classList.add("open");
  setTimeout(() => document.getElementById("connectionTextInput").focus(), 0);
}

function closeConnectionModal() {
  document.getElementById("connectionModal").classList.remove("open");
  activeConnectionKey = null;
  activeBridgeNoteKey = null;
}

function saveConnectionModalText() {
  if (!activeConnectionKey && !activeBridgeNoteKey) return;

  const text = document.getElementById("connectionTextInput").value.trim();
  if (!text) {
    document.getElementById("connectionError").classList.add("show");
    document.getElementById("connectionTextInput").focus();
    return;
  }

  if (activeBridgeNoteKey) {
    if (
      window.WormholesContentLimits &&
      !window.WormholesContentLimits.ensureString("note", text, {
        previousValue: bridgeNotes[activeBridgeNoteKey] || "",
        fieldName: "bridge note",
        operation: "save this bridge note",
      }).ok
    )
      return;
    bridgeNotes[activeBridgeNoteKey] = text;
    if (!saveBridgeNotesToStorage()) return;
    closeConnectionModal();
    controllerServices.renderWormholesMap();
    controllerServices.renderConnectionsMap();
    showSavedToast("Bridge note saved");
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("note", text, {
      previousValue: connectionNotes[activeConnectionKey] || "",
      fieldName: "connection details",
      operation: "save these connection details",
    }).ok
  )
    return;
  connectionNotes[activeConnectionKey] = text;
  if (!saveConnectionNotesToStorage()) return;
  closeConnectionModal();
  controllerServices.renderConnectionsMap();
  showSavedToast("Connection details saved");
}

function deleteConnectionModalText() {
  if (!activeConnectionKey && !activeBridgeNoteKey) return;
  const undoState = window.WormholesUndo?.captureState?.();

  if (activeBridgeNoteKey) {
    delete bridgeNotes[activeBridgeNoteKey];
    if (!saveBridgeNotesToStorage()) return;
    closeConnectionModal();
    controllerServices.renderWormholesMap();
    controllerServices.renderConnectionsMap();
    if (window.WormholesUndo && undoState) {
      window.WormholesUndo.offer({
        message: "Bridge note deleted",
        restoredMessage: "Bridge note restored",
        state: undoState,
      });
    } else {
      showSavedToast("Bridge note deleted");
    }
    return;
  }

  delete connectionNotes[activeConnectionKey];
  if (!saveConnectionNotesToStorage()) return;
  closeConnectionModal();
  controllerServices.renderConnectionsMap();
  if (window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Connection details deleted",
      restoredMessage: "Connection details restored",
      state: undoState,
    });
  } else {
    showSavedToast("Connection details deleted");
  }
}

function clearMapSelection() {
  selectedMapNodeId = null;
  connectionsMapIsolatedSubgraph = false;
  controllerServices.renderConnectionsMap();
}

function toggleMapConnection(sourceId, targetId) {
  if (sourceId === targetId) return;
  const source = controllerServices.getEntry(sourceId);
  const target = controllerServices.getEntry(targetId);
  if (!source || !target) return;

  const alreadyConnected = (source.connections || []).includes(targetId);
  if (alreadyConnected) {
    openRelationshipRemovalConfirm("connection", source.title, target.title, () => {
      controllerServices.connectEntries(sourceId, targetId, {silentToast: true});
      selectedMapNodeId = sourceId;
      controllerServices.renderConnectionsMap();
    });
    return;
  }

  controllerServices.connectEntries(sourceId, targetId, {silentToast: true});
  selectedMapNodeId = sourceId;
  controllerServices.renderConnectionsMap();
}

function parseConnectionsExternalNodeId(nodeId) {
  if (!nodeId) return null;

  if (nodeId.startsWith("universe:")) {
    return {
      type: "universe",
      universeId: nodeId.slice("universe:".length),
    };
  }

  if (nodeId.startsWith("external:")) {
    const parts = nodeId.split(":");
    return {
      type: "creation",
      universeId: parts[1],
      creationId: parts.slice(2).join(":"),
    };
  }

  return null;
}

function connectionsMapNodeTitle(nodeId) {
  const localEntry = controllerServices.getEntry(nodeId);
  if (localEntry) return localEntry.title;

  const target = parseConnectionsExternalNodeId(nodeId);
  if (!target) return "";

  if (target.type === "universe") {
    return controllerServices.getUniverseTitle(target.universeId);
  }

  return (
    controllerServices.visibleEntryTitleForUniverseEntry(target.universeId, target.creationId) ||
    controllerServices.getCreationTitleFromUniverse(target.universeId, target.creationId) ||
    "Linked Creation"
  );
}

function isSelectableConnectionsMapNodeId(nodeId) {
  if (!nodeId) return false;
  if (nodeId === `universe:${currentUniverseId}`) return true;
  if (controllerServices.getEntry(nodeId)) return true;

  const target = parseConnectionsExternalNodeId(nodeId);
  if (!target || !target.universeId || target.universeId === currentUniverseId) return false;
  if (!universes.some((universe) => universe.id === target.universeId)) return false;

  if (target.type === "creation") {
    return controllerServices.entityExistsInUniverse(target.universeId, target.creationId);
  }

  return true;
}

function isCurrentUniverseConnectionsMapNodeId(nodeId) {
  return !!(nodeId && currentUniverseId && nodeId === `universe:${currentUniverseId}`);
}

function isExternalConnectionsMapNodeId(nodeId) {
  const target = parseConnectionsExternalNodeId(nodeId);
  return !!(target && target.universeId && target.universeId !== currentUniverseId);
}

function clearCurrentUniverseConnectionsOnly() {
  const undoState = window.WormholesUndo?.captureState?.();
  archiveEntries.forEach((entry) => {
    entry.connections = [];
  });

  connectionNotes = {};
  saveArchiveToStorage();
  saveConnectionNotesToStorage();

  connectSourceId = null;
  selectedMapNodeId = null;
  controllerServices.closeGroupConnectionModal();

  closeClearMapConfirm();
  controllerServices.renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    showConnectionsScreen();
  }
  if (window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Connections removed",
      restoredMessage: "Connections restored",
      state: undoState,
    });
  } else {
    showSavedToast("Connections removed");
  }
}

/* Public controller surface for served ES-module builds. */
const CONNECTIONS_CONTROLLER_API = Object.freeze({
  renderConnectStatus,
  connectionsWorkspaceIsActive,
  shouldSuppressRelationshipToast,
  openConnectPickerModal,
  closeConnectPickerModal,
  renderConnectEntryPicker,
  renderConnectPickerList,
  applyConnectPickerChoice,
  saveConnectPickerModal,
  makeConnectionKeyFromIds,
  showConnectionsScreen,
  connectionKey,
  getConnectionNote,
  setConnectionNote,
  currentUniverseHasClearableConnections,
  openConnectionModal,
  closeConnectionModal,
  saveConnectionModalText,
  deleteConnectionModalText,
  openRelationshipRemovalConfirm,
  closeRelationshipRemovalConfirm,
  confirmRelationshipRemoval,
  clearMapSelection,
  toggleMapConnection,
  parseConnectionsExternalNodeId,
  connectionsMapNodeTitle,
  isSelectableConnectionsMapNodeId,
  isCurrentUniverseConnectionsMapNodeId,
  isExternalConnectionsMapNodeId,
  clearCurrentUniverseConnectionsOnly,
});
registerControllerServices(CONNECTIONS_CONTROLLER_API);

export {
  renderConnectStatus,
  connectionsWorkspaceIsActive,
  shouldSuppressRelationshipToast,
  openConnectPickerModal,
  closeConnectPickerModal,
  renderConnectEntryPicker,
  renderConnectPickerList,
  applyConnectPickerChoice,
  saveConnectPickerModal,
  makeConnectionKeyFromIds,
  showConnectionsScreen,
  connectionKey,
  getConnectionNote,
  setConnectionNote,
  currentUniverseHasClearableConnections,
  openConnectionModal,
  closeConnectionModal,
  saveConnectionModalText,
  deleteConnectionModalText,
  openRelationshipRemovalConfirm,
  closeRelationshipRemovalConfirm,
  confirmRelationshipRemoval,
  clearMapSelection,
  toggleMapConnection,
  parseConnectionsExternalNodeId,
  connectionsMapNodeTitle,
  isSelectableConnectionsMapNodeId,
  isCurrentUniverseConnectionsMapNodeId,
  isExternalConnectionsMapNodeId,
  clearCurrentUniverseConnectionsOnly,
};

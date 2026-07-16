/* Wormholes Beta 248 UI-workflow-state ownership boundary.
   Modal selections, staged picker choices, and transient workflow state are
   grouped here so the application shell no longer owns a monolithic state block. */

export let activeConnectionKey = null;
export let activeBridgeNoteKey = null;
export let activeSummaryEntryId = null;
export let activeNoteEntryId = null;
export let activeGroupEntryId = null;
export let activeGroupMode = "create";
export let activeGroupContext = "creation";
export let activeGroupConnection = null;
export let activeClearMapAction = null;
export let activeLiteratureId = null;
export let activeLiteratureDeleteId = null;
export let activeLiteratureViewerHomeUniverseId = null;
export let activeLiteratureTagId = null;
export let activeVisionTagId = null;
export let activeVisionRenameId = null;
export let expandedVisionId = null;
export let expandedVisionPlaceholder = null;
export let activeVisionTagGoTarget = null;
export let pendingArchiveRevealRequest = null;
export let activeVisionDragId = null;
export let activeVisionDeleteId = null;
export let visionMoveMode = false;
export let expandedLiteratureTagGroups = new Set();
export let expandedBridgePickerNodes = new Set();
export let expandedConnectPickerNodes = new Set();
export let stagedConnectTargetIds = new Set();
export let stagedBridgeTargetKeys = new Set();
export let stagedMigrateTargetUniverseId = null;
export let stagedCopyTargetUniverseId = null;
export let stagedTagUniverseIds = new Set();
export let stagedTagEntryKeys = new Set();
export let tagPickerHasUnsavedChanges = false;
export let activeConnectEntryId = null;
export let activeEditEntryId = null;
export let activeMigrateEntryId = null;
export let activeCopyItemType = null;
export let activeCopyItemId = null;
export let activeBridgeEntryId = null;
export let activeBridgeUniverseId = null;
export let activeUniverseSummaryId = null;
export let activeUniverseEditId = null;
export let activeUniverseDeleteId = null;
export let activeDeleteEntryId = null;

export function setActiveEditEntryId(value) {
  activeEditEntryId = value ?? null;
  return activeEditEntryId;
}

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

export function installLegacyUiStateBindings(target = globalThis) {
  const scalar = (name, getter, setter) => defineBinding(target, name, getter, setter);
  scalar(
    "activeConnectionKey",
    () => activeConnectionKey,
    (value) => {
      activeConnectionKey = value ?? null;
    },
  );
  scalar(
    "activeBridgeNoteKey",
    () => activeBridgeNoteKey,
    (value) => {
      activeBridgeNoteKey = value ?? null;
    },
  );
  scalar(
    "activeSummaryEntryId",
    () => activeSummaryEntryId,
    (value) => {
      activeSummaryEntryId = value ?? null;
    },
  );
  scalar(
    "activeNoteEntryId",
    () => activeNoteEntryId,
    (value) => {
      activeNoteEntryId = value ?? null;
    },
  );
  scalar(
    "activeGroupEntryId",
    () => activeGroupEntryId,
    (value) => {
      activeGroupEntryId = value ?? null;
    },
  );
  scalar(
    "activeGroupMode",
    () => activeGroupMode,
    (value) => {
      activeGroupMode = String(value || "create");
    },
  );
  scalar(
    "activeGroupContext",
    () => activeGroupContext,
    (value) => {
      activeGroupContext = String(value || "creation");
    },
  );
  scalar(
    "activeGroupConnection",
    () => activeGroupConnection,
    (value) => {
      activeGroupConnection = value ?? null;
    },
  );
  scalar(
    "activeClearMapAction",
    () => activeClearMapAction,
    (value) => {
      activeClearMapAction = value ?? null;
    },
  );
  scalar(
    "activeLiteratureId",
    () => activeLiteratureId,
    (value) => {
      activeLiteratureId = value ?? null;
    },
  );
  scalar(
    "activeLiteratureDeleteId",
    () => activeLiteratureDeleteId,
    (value) => {
      activeLiteratureDeleteId = value ?? null;
    },
  );
  scalar(
    "activeLiteratureViewerHomeUniverseId",
    () => activeLiteratureViewerHomeUniverseId,
    (value) => {
      activeLiteratureViewerHomeUniverseId = value ?? null;
    },
  );
  scalar(
    "activeLiteratureTagId",
    () => activeLiteratureTagId,
    (value) => {
      activeLiteratureTagId = value ?? null;
    },
  );
  scalar(
    "activeVisionTagId",
    () => activeVisionTagId,
    (value) => {
      activeVisionTagId = value ?? null;
    },
  );
  scalar(
    "activeVisionRenameId",
    () => activeVisionRenameId,
    (value) => {
      activeVisionRenameId = value ?? null;
    },
  );
  scalar(
    "expandedVisionId",
    () => expandedVisionId,
    (value) => {
      expandedVisionId = value ?? null;
    },
  );
  scalar(
    "expandedVisionPlaceholder",
    () => expandedVisionPlaceholder,
    (value) => {
      expandedVisionPlaceholder = value ?? null;
    },
  );
  scalar(
    "activeVisionTagGoTarget",
    () => activeVisionTagGoTarget,
    (value) => {
      activeVisionTagGoTarget = value ?? null;
    },
  );
  scalar(
    "pendingArchiveRevealRequest",
    () => pendingArchiveRevealRequest,
    (value) => {
      pendingArchiveRevealRequest = value ?? null;
    },
  );
  scalar(
    "activeVisionDragId",
    () => activeVisionDragId,
    (value) => {
      activeVisionDragId = value ?? null;
    },
  );
  scalar(
    "activeVisionDeleteId",
    () => activeVisionDeleteId,
    (value) => {
      activeVisionDeleteId = value ?? null;
    },
  );
  scalar(
    "visionMoveMode",
    () => visionMoveMode,
    (value) => {
      visionMoveMode = value === true;
    },
  );
  scalar(
    "expandedLiteratureTagGroups",
    () => expandedLiteratureTagGroups,
    (value) => {
      expandedLiteratureTagGroups = value instanceof Set ? value : new Set(value || []);
    },
  );
  scalar(
    "expandedBridgePickerNodes",
    () => expandedBridgePickerNodes,
    (value) => {
      expandedBridgePickerNodes = value instanceof Set ? value : new Set(value || []);
    },
  );
  scalar(
    "expandedConnectPickerNodes",
    () => expandedConnectPickerNodes,
    (value) => {
      expandedConnectPickerNodes = value instanceof Set ? value : new Set(value || []);
    },
  );
  scalar(
    "stagedConnectTargetIds",
    () => stagedConnectTargetIds,
    (value) => {
      stagedConnectTargetIds = value instanceof Set ? value : new Set(value || []);
    },
  );
  scalar(
    "stagedBridgeTargetKeys",
    () => stagedBridgeTargetKeys,
    (value) => {
      stagedBridgeTargetKeys = value instanceof Set ? value : new Set(value || []);
    },
  );
  scalar(
    "stagedMigrateTargetUniverseId",
    () => stagedMigrateTargetUniverseId,
    (value) => {
      stagedMigrateTargetUniverseId = value ?? null;
    },
  );
  scalar(
    "stagedCopyTargetUniverseId",
    () => stagedCopyTargetUniverseId,
    (value) => {
      stagedCopyTargetUniverseId = value ?? null;
    },
  );
  scalar(
    "stagedTagUniverseIds",
    () => stagedTagUniverseIds,
    (value) => {
      stagedTagUniverseIds = value instanceof Set ? value : new Set(value || []);
    },
  );
  scalar(
    "stagedTagEntryKeys",
    () => stagedTagEntryKeys,
    (value) => {
      stagedTagEntryKeys = value instanceof Set ? value : new Set(value || []);
    },
  );
  scalar(
    "tagPickerHasUnsavedChanges",
    () => tagPickerHasUnsavedChanges,
    (value) => {
      tagPickerHasUnsavedChanges = value === true;
    },
  );
  scalar(
    "activeConnectEntryId",
    () => activeConnectEntryId,
    (value) => {
      activeConnectEntryId = value ?? null;
    },
  );
  scalar(
    "activeEditEntryId",
    () => activeEditEntryId,
    (value) => {
      setActiveEditEntryId(value);
    },
  );
  scalar(
    "activeMigrateEntryId",
    () => activeMigrateEntryId,
    (value) => {
      activeMigrateEntryId = value ?? null;
    },
  );
  scalar(
    "activeCopyItemType",
    () => activeCopyItemType,
    (value) => {
      activeCopyItemType = value ?? null;
    },
  );
  scalar(
    "activeCopyItemId",
    () => activeCopyItemId,
    (value) => {
      activeCopyItemId = value ?? null;
    },
  );
  scalar(
    "activeBridgeEntryId",
    () => activeBridgeEntryId,
    (value) => {
      activeBridgeEntryId = value ?? null;
    },
  );
  scalar(
    "activeBridgeUniverseId",
    () => activeBridgeUniverseId,
    (value) => {
      activeBridgeUniverseId = value ?? null;
    },
  );
  scalar(
    "activeUniverseSummaryId",
    () => activeUniverseSummaryId,
    (value) => {
      activeUniverseSummaryId = value ?? null;
    },
  );
  scalar(
    "activeUniverseEditId",
    () => activeUniverseEditId,
    (value) => {
      activeUniverseEditId = value ?? null;
    },
  );
  scalar(
    "activeUniverseDeleteId",
    () => activeUniverseDeleteId,
    (value) => {
      activeUniverseDeleteId = value ?? null;
    },
  );
  scalar(
    "activeDeleteEntryId",
    () => activeDeleteEntryId,
    (value) => {
      activeDeleteEntryId = value ?? null;
    },
  );
  return target;
}

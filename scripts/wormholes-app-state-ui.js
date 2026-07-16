/* GENERATED from scripts/modules/app-state-ui.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 UI-workflow-state ownership boundary.
   Modal selections, staged picker choices, and transient workflow state are
   grouped here so the application shell no longer owns a monolithic state block. */

let activeConnectionKey = null;
let activeBridgeNoteKey = null;
let activeSummaryEntryId = null;
let activeNoteEntryId = null;
let activeGroupEntryId = null;
let activeGroupMode = "create";
let activeGroupContext = "creation";
let activeGroupConnection = null;
let activeClearMapAction = null;
let activeLiteratureId = null;
let activeLiteratureDeleteId = null;
let activeLiteratureViewerHomeUniverseId = null;
let activeLiteratureTagId = null;
let activeVisionTagId = null;
let activeVisionRenameId = null;
let expandedVisionId = null;
let expandedVisionPlaceholder = null;
let activeVisionTagGoTarget = null;
let pendingArchiveRevealRequest = null;
let activeVisionDragId = null;
let activeVisionDeleteId = null;
let visionMoveMode = false;
let expandedLiteratureTagGroups = new Set();
let expandedBridgePickerNodes = new Set();
let expandedConnectPickerNodes = new Set();
let stagedConnectTargetIds = new Set();
let stagedBridgeTargetKeys = new Set();
let stagedMigrateTargetUniverseId = null;
let stagedCopyTargetUniverseId = null;
let stagedTagUniverseIds = new Set();
let stagedTagEntryKeys = new Set();
let tagPickerHasUnsavedChanges = false;
let activeConnectEntryId = null;
let activeEditEntryId = null;
let activeMigrateEntryId = null;
let activeCopyItemType = null;
let activeCopyItemId = null;
let activeBridgeEntryId = null;
let activeBridgeUniverseId = null;
let activeUniverseSummaryId = null;
let activeUniverseEditId = null;
let activeUniverseDeleteId = null;
let activeDeleteEntryId = null;

function setActiveEditEntryId(value) {
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

function installLegacyUiStateBindings(target = globalThis) {
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

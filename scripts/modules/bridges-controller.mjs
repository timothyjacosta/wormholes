/* Wormholes Beta 248 bridges module.
   Manage Bridges modal/data logic, bridge notes, bridge normalization,
   and bridge interaction helpers extracted from wormholes-app.js.
   The visual map renderer remains in scripts/bridges-map.js. */

import {controllerServices, registerControllerServices} from "./controller-service-registry.mjs";

function offerBridgeRemovalUndo(undoState, message = "Bridge removed") {
  if (window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({message, restoredMessage: "Bridge restored", state: undoState});
  } else if (typeof showSavedToast === "function") {
    showSavedToast(message);
  }
}

function requestBridgeRemoval(sourceLabel, targetLabel, onConfirm) {
  return controllerServices.openRelationshipRemovalConfirm(
    "bridge",
    sourceLabel,
    targetLabel,
    onConfirm,
  );
}

function requestConnectionRemoval(sourceLabel, targetLabel, onConfirm) {
  return controllerServices.openRelationshipRemovalConfirm(
    "connection",
    sourceLabel,
    targetLabel,
    onConfirm,
  );
}

function wormholeNodeKey(node) {
  if (!node) return "";
  if (node.type === "universe") {
    return `U:${node.universeId}`;
  }
  return `C:${node.universeId}:${node.creationId}`;
}

function bridgeNoteKeyForNodes(a, b) {
  return [wormholeNodeKey(a), wormholeNodeKey(b)].sort().join("||");
}

function getBridgeNote(key) {
  return bridgeNotes[key] || "";
}

function bridgeRecordNodes(record) {
  if (!record?.sourceUniverseId || !record?.targetUniverseId) return null;

  return {
    source: record.sourceCreationId
      ? {
          type: "creation",
          universeId: record.sourceUniverseId,
          creationId: record.sourceCreationId,
        }
      : {type: "universe", universeId: record.sourceUniverseId},
    target: record.targetCreationId
      ? {
          type: "creation",
          universeId: record.targetUniverseId,
          creationId: record.targetCreationId,
        }
      : {type: "universe", universeId: record.targetUniverseId},
  };
}

function removeBridgeNoteForRecord(record) {
  const nodes = bridgeRecordNodes(record);
  if (!nodes) return true;

  const key = bridgeNoteKeyForNodes(nodes.source, nodes.target);
  if (!Object.prototype.hasOwnProperty.call(bridgeNotes || {}, key)) return true;

  const previous = bridgeNotes[key];
  delete bridgeNotes[key];

  if (saveBridgeNotesToStorage() === false) {
    bridgeNotes[key] = previous;
    return false;
  }

  return true;
}

function universeHasClearableBridges(universe) {
  if (!universe) return false;

  if (normalizeUniverseBridges(universe).length > 0) return true;

  const archive =
    universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);

  return archive.some((entry) => normalizeBridges(entry.bridges).length > 0);
}

function appHasClearableBridges() {
  const hasBridgeRecords = universes.some(universeHasClearableBridges);
  const hasBridgeNotes = Object.keys(bridgeNotes || {}).length > 0;

  return hasBridgeRecords || hasBridgeNotes;
}

function updateDestructiveClearButtons() {
  setDestructiveButtonVisibility(
    "clearConnectionsBtn",
    controllerServices.currentUniverseHasClearableConnections(),
  );
  setDestructiveButtonVisibility("clearBridgesBtn", appHasClearableBridges());
}

function openBridgeNoteModal(key, label) {
  activeBridgeNoteKey = key;
  activeConnectionKey = null;

  const existing = getBridgeNote(key);
  document.getElementById("connectionModalTitle").textContent = "Define this wormhole";
  const connectionError = document.getElementById("connectionError");
  connectionError.classList.remove("show");
  connectionError.textContent = "Bridge note is required.";
  const connectionLabel = document.getElementById("connectionTextLabel");
  if (connectionLabel) connectionLabel.textContent = "Bridge note";
  const saveButton = document.getElementById("saveConnectionTextBtn");
  if (saveButton) saveButton.textContent = "Save Note";
  document.getElementById("connectionModalSubtitle").textContent = label || "Describe this bridge.";
  document.getElementById("connectionTextInput").value = existing;
  setDestructiveButtonVisibility("deleteConnectionTextBtn", !!existing);
  const deleteButton = document.getElementById("deleteConnectionTextBtn");
  if (deleteButton) deleteButton.textContent = "Delete Bridge Note";
  document.getElementById("connectionModal").classList.add("open");
  setTimeout(() => document.getElementById("connectionTextInput").focus(), 0);
}

function targetCreationIdsForBridgeNode(universeId, creationId) {
  if (!universeId || !creationId) return [];
  const archive = controllerServices.archiveForUniverseLinkCheck(universeId);
  const entry = archive.find((item) => item.id === creationId);
  const ids = [creationId];

  if (controllerServices.isGroupEntry(entry)) {
    controllerServices.groupChildIds(entry).forEach((childId) => ids.push(childId));
  }

  return controllerServices
    .uniqueList(ids)
    .filter((id) => controllerServices.entityExistsInUniverse(universeId, id, archive));
}

function addBridgeToEntryTarget(sourceUniverseId, sourceCreationId, target) {
  if (
    !sourceUniverseId ||
    !sourceCreationId ||
    !target ||
    !target.universeId ||
    target.universeId === sourceUniverseId
  )
    return false;

  const archive =
    sourceUniverseId === currentUniverseId
      ? archiveEntries
      : readArchiveForUniverse(sourceUniverseId);
  const source = archive.find((entry) => entry.id === sourceCreationId);
  if (!source) return false;

  const targetCreationId = target.type === "creation" ? target.creationId : null;
  if (
    targetCreationId &&
    !controllerServices.entityExistsInUniverse(target.universeId, targetCreationId)
  )
    return false;

  const key = bridgeKey(target.universeId, targetCreationId);
  const originalBridges = normalizeBridges(source.bridges);
  source.bridges = originalBridges.map((bridge) => ({...bridge}));

  if (!source.bridges.some((bridge) => bridgeKey(bridge.universeId, bridge.creationId) === key)) {
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure("bridgesPerSource", source.bridges.length, 1, {
        context: source.title || "",
        operation: "add another bridge",
      }).ok
    )
      return false;
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure(
        "bridgesAcrossApp",
        window.WormholesEntityLimits.liveBridgeCount(),
        1,
        {operation: "add another bridge"},
      ).ok
    )
      return false;
    source.bridges.push({
      universeId: target.universeId,
      creationId: targetCreationId || null,
    });
  }

  const saved =
    sourceUniverseId === currentUniverseId
      ? saveArchiveToStorage()
      : saveArchiveForUniverse(sourceUniverseId, archive);

  if (saved === false) {
    source.bridges = originalBridges;
    return false;
  }

  if (sourceUniverseId === currentUniverseId) controllerServices.renderArchive();
  selectedMapNodeId = sourceCreationId;
  controllerServices.renderWormholesMap();
  controllerServices.renderConnectionsMap();
  return true;
}

function addBridgeToUniverseTarget(sourceUniverseId, target) {
  if (!sourceUniverseId || !target || !target.universeId || target.universeId === sourceUniverseId)
    return false;

  const source = universes.find((item) => item.id === sourceUniverseId);
  if (!source) return false;

  const targetCreationId = target.type === "creation" ? target.creationId : null;
  if (
    targetCreationId &&
    !controllerServices.entityExistsInUniverse(target.universeId, targetCreationId)
  )
    return false;

  const key = bridgeKey(target.universeId, targetCreationId);
  const originalBridges = normalizeUniverseBridges(source);
  source.bridges = originalBridges.map((bridge) => ({...bridge}));

  if (!source.bridges.some((bridge) => bridgeKey(bridge.universeId, bridge.creationId) === key)) {
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure("bridgesPerSource", source.bridges.length, 1, {
        context: source.title || "",
        operation: "add another bridge",
      }).ok
    )
      return false;
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure(
        "bridgesAcrossApp",
        window.WormholesEntityLimits.liveBridgeCount(),
        1,
        {operation: "add another bridge"},
      ).ok
    )
      return false;
    source.bridges.push({
      universeId: target.universeId,
      creationId: targetCreationId || null,
    });
  }

  if (saveUniversesToStorage() === false) {
    source.bridges = originalBridges;
    return false;
  }

  selectedMapNodeId = `universe:${sourceUniverseId}`;
  controllerServices.renderWormholesMap();
  controllerServices.renderConnectionsMap();
  return true;
}

function toggleEntryBridgeToExternalNode(sourceCreationId, externalNodeId) {
  if (removeMapBridgeToExternalNode(sourceCreationId, externalNodeId, {confirmRemoval: true}))
    return true;

  const target = controllerServices.parseConnectionsExternalNodeId(externalNodeId);
  return addBridgeToEntryTarget(currentUniverseId, sourceCreationId, target);
}

function toggleUniverseBridgeToExternalNode(sourceUniverseId, externalNodeId) {
  if (
    removeUniverseMapBridgeToExternalNode(sourceUniverseId, externalNodeId, {confirmRemoval: true})
  )
    return true;

  const target = controllerServices.parseConnectionsExternalNodeId(externalNodeId);
  return addBridgeToUniverseTarget(sourceUniverseId, target);
}

function removeUniverseMapBridgeToExternalNode(sourceUniverseId, externalNodeId, options = {}) {
  if (!sourceUniverseId || !externalNodeId) return false;

  const target = controllerServices.parseConnectionsExternalNodeId(externalNodeId);
  if (!target || target.universeId === sourceUniverseId) return false;

  if (target.type === "universe") {
    const existing = findUniverseBridgeBetween(sourceUniverseId, target.universeId);
    if (existing) {
      if (options.confirmRemoval === true) {
        requestBridgeRemoval(
          getUniverseTitle(sourceUniverseId),
          controllerServices.connectionsMapNodeTitle(externalNodeId),
          () =>
            removeUniverseMapBridgeToExternalNode(sourceUniverseId, externalNodeId, {
              confirmRemoval: false,
            }),
        );
        return true;
      }
      selectedMapNodeId = `universe:${sourceUniverseId}`;
      toggleUniverseBridge(sourceUniverseId, target.universeId, null, {confirmRemoval: false});
      return true;
    }
    return false;
  }

  if (target.type === "creation") {
    const candidateIds = targetCreationIdsForBridgeNode(target.universeId, target.creationId);

    for (const creationId of candidateIds) {
      const record = findUniverseToCreationBridgeBetween(
        sourceUniverseId,
        target.universeId,
        creationId,
      );
      if (record) {
        if (options.confirmRemoval === true) {
          requestBridgeRemoval(
            getUniverseTitle(sourceUniverseId),
            controllerServices.connectionsMapNodeTitle(externalNodeId),
            () =>
              removeUniverseMapBridgeToExternalNode(sourceUniverseId, externalNodeId, {
                confirmRemoval: false,
              }),
          );
          return true;
        }
        selectedMapNodeId = `universe:${sourceUniverseId}`;
        removeUniverseToCreationBridge(record);
        controllerServices.renderWormholesMap();
        controllerServices.renderConnectionsMap();
        return true;
      }
    }

    return false;
  }

  return false;
}

function removeMapBridgeToExternalNode(sourceCreationId, externalNodeId, options = {}) {
  if (!currentUniverseId || !sourceCreationId || !externalNodeId) return false;

  const target = controllerServices.parseConnectionsExternalNodeId(externalNodeId);
  if (!target || target.universeId === currentUniverseId) return false;

  if (target.type === "universe") {
    const record = findBridgeBetweenCreationAndUniverse(
      currentUniverseId,
      sourceCreationId,
      target.universeId,
    );
    if (record) {
      if (options.confirmRemoval === true) {
        requestBridgeRemoval(
          controllerServices.getEntry(sourceCreationId)?.title || "Selected item",
          controllerServices.connectionsMapNodeTitle(externalNodeId),
          () =>
            removeMapBridgeToExternalNode(sourceCreationId, externalNodeId, {
              confirmRemoval: false,
            }),
        );
        return true;
      }
      removeBridgeBetweenCreationAndUniverse(record);
      selectedMapNodeId = sourceCreationId;
      controllerServices.renderWormholesMap();
      controllerServices.renderConnectionsMap();
      return true;
    }
    return false;
  }

  if (target.type === "creation") {
    const candidateIds = targetCreationIdsForBridgeNode(target.universeId, target.creationId);

    for (const creationId of candidateIds) {
      const record = findCreationBridgeBetween(
        currentUniverseId,
        sourceCreationId,
        target.universeId,
        creationId,
      );
      if (record) {
        if (options.confirmRemoval === true) {
          requestBridgeRemoval(
            controllerServices.getEntry(sourceCreationId)?.title || "Selected item",
            controllerServices.connectionsMapNodeTitle(externalNodeId),
            () =>
              removeMapBridgeToExternalNode(sourceCreationId, externalNodeId, {
                confirmRemoval: false,
              }),
          );
          return true;
        }
        removeCreationBridgeRecord(record);
        selectedMapNodeId = sourceCreationId;
        controllerServices.renderWormholesMap();
        controllerServices.renderConnectionsMap();
        return true;
      }
    }

    return false;
  }

  return false;
}

function getUniverseTitle(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  return universe ? universe.title : "Unknown Universe";
}

function getUniverseSummary(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  return universe ? universe.summary || "" : "";
}

function normalizeHue(value) {
  return ((value % 360) + 360) % 360;
}

function hslColor(h, s, l, a = null) {
  const hue = Math.round(normalizeHue(h));
  const sat = Math.max(0, Math.min(100, Math.round(s)));
  const light = Math.max(0, Math.min(100, Math.round(l)));

  if (a === null || a === undefined) {
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  return `hsla(${hue}, ${sat}%, ${light}%, ${a})`;
}

function mapUniversePalette(universeId) {
  const safeIndex = Math.max(
    0,
    universes.findIndex((item) => item.id === universeId),
  );
  const schemeIndex = Math.floor(safeIndex / 3);
  const variantIndex = safeIndex % 3;
  const baseHues = [205, 152, 272, 34, 328, 188, 88, 242];
  const baseHue = baseHues[schemeIndex % baseHues.length];
  const variantOffsets = [-20, 0, 20];
  const saturationOffsets = [-2, 5, 10];
  const lightnessOffsets = [1, -1, 2];
  const hue = normalizeHue(baseHue + variantOffsets[variantIndex]);
  const titleHue = normalizeHue(hue + 180);
  const satBump = saturationOffsets[variantIndex];
  const lightBump = lightnessOffsets[variantIndex];

  /* Reskin 23: establish a clear per-universe hierarchy inside map views.
     - orbit/system graphic: darkest and dimmest
     - universe title node: lightest and most opaque
     - universe entities: between the two
     This keeps every universe visually distinct while preserving its own hue. */
  const entitySaturation = 50 + satBump;
  const entityLightness = 49 + lightBump;
  const titleSaturation = 56 + satBump;
  const titleLightness = 74 + lightBump;
  const orbitSaturation = 42 + satBump;
  const orbitLightness = 34 + lightBump;

  const creationFill = hslColor(hue + 2, entitySaturation + 2, entityLightness + 1, 0.48);
  const creationStroke = hslColor(hue + 2, 48 + satBump, 83, 0.92);
  const groupFill = hslColor(hue + 1, entitySaturation, entityLightness, 0.44);
  const groupStroke = hslColor(hue + 1, 44 + satBump, 81, 0.9);
  const universeFill = hslColor(hue, titleSaturation + 2, titleLightness, 0.68);
  const universeStroke = hslColor(hue, 48 + satBump, 86, 0.96);

  return {
    universeFill,
    universeStroke,
    groupFill,
    groupStroke,
    creationFill,
    creationStroke,
    childFill: creationFill,
    childStroke: creationStroke,
    systemBg: hslColor(hue, orbitSaturation, orbitLightness, 0.24),
    systemHalo: hslColor(hue, orbitSaturation + 2, orbitLightness + 4, 0.12),
    orbitStroke: hslColor(hue, orbitSaturation + 8, orbitLightness + 22, 0.16),
    softGlow: hslColor(hue, 44 + satBump, 60, 0.12),
  };
}

function mapUniversePaletteStyle(universeId) {
  const palette = mapUniversePalette(universeId);
  return [
    `--map-universe-fill:${palette.universeFill}`,
    `--map-universe-stroke:${palette.universeStroke}`,
    `--map-group-fill:${palette.groupFill}`,
    `--map-group-stroke:${palette.groupStroke}`,
    `--map-creation-fill:${palette.creationFill}`,
    `--map-creation-stroke:${palette.creationStroke}`,
    `--map-child-fill:${palette.childFill}`,
    `--map-child-stroke:${palette.childStroke}`,
    `--map-system-bg:${palette.systemBg}`,
    `--map-system-halo:${palette.systemHalo}`,
    `--map-orbit-stroke:${palette.orbitStroke}`,
    `--map-soft-glow:${palette.softGlow}`,
  ].join(";");
}

function normalizeUniverseBridge(bridge, sourceUniverseId) {
  if (!bridge) return null;

  if (typeof bridge === "string") {
    return {universeId: bridge, creationId: null};
  }

  if (typeof bridge === "object" && bridge.universeId) {
    return {
      universeId: bridge.universeId,
      creationId: bridge.creationId || null,
    };
  }

  return null;
}

function normalizeUniverseBridges(universe) {
  if (!universe) return [];

  return (universe.bridges || [])
    .map((bridge) => normalizeUniverseBridge(bridge, universe.id))
    .filter(
      (bridge) =>
        bridge &&
        bridge.universeId &&
        bridge.universeId !== universe.id &&
        controllerServices.linkBridgeTargetStillExists(bridge),
    );
}

function findUniverseBridgeBetween(a, b) {
  const universeA = universes.find((item) => item.id === a);
  const universeB = universes.find((item) => item.id === b);

  const outgoing = normalizeUniverseBridges(universeA).find(
    (bridge) => bridge.universeId === b && !bridge.creationId,
  );
  if (outgoing) {
    return {sourceUniverseId: a, targetUniverseId: b};
  }

  const incoming = normalizeUniverseBridges(universeB).find(
    (bridge) => bridge.universeId === a && !bridge.creationId,
  );
  if (incoming) {
    return {sourceUniverseId: b, targetUniverseId: a};
  }

  return null;
}

function areUniversesBridged(a, b) {
  return !!findUniverseBridgeBetween(a, b);
}

function getUniverseBridgeTargetsForFocus(universeId) {
  const targets = new Set();
  if (!universeId) return targets;

  universes.forEach((universe) => {
    normalizeUniverseBridges(universe).forEach((bridge) => {
      if (bridge.creationId) return;

      if (universe.id === universeId) {
        targets.add(bridge.universeId);
      }

      if (bridge.universeId === universeId) {
        targets.add(universe.id);
      }
    });
  });

  return targets;
}

function findUniverseToCreationBridgeBetween(
  focusedUniverseId,
  targetUniverseId,
  targetCreationId,
) {
  if (!focusedUniverseId || !targetUniverseId || !targetCreationId) return null;

  const focusedUniverse = universes.find((item) => item.id === focusedUniverseId);
  const outgoingUniverseBridge = normalizeUniverseBridges(focusedUniverse).find(
    (bridge) => bridge.universeId === targetUniverseId && bridge.creationId === targetCreationId,
  );

  if (outgoingUniverseBridge) {
    return {
      kind: "universe-creation",
      sourceUniverseId: focusedUniverseId,
      targetUniverseId,
      targetCreationId,
    };
  }

  const targetEntry = getArchiveEntryFromUniverse(targetUniverseId, targetCreationId);
  if (targetEntry) {
    const incomingCreationBridge = normalizeBridges(targetEntry.bridges).find(
      (bridge) => bridge.universeId === focusedUniverseId && !bridge.creationId,
    );

    if (incomingCreationBridge) {
      return {
        kind: "creation-universe",
        sourceUniverseId: targetUniverseId,
        sourceCreationId: targetCreationId,
        targetUniverseId: focusedUniverseId,
        targetCreationId: null,
      };
    }
  }

  return null;
}

function removeUniverseToCreationBridge(record) {
  if (!record) return false;

  if (record.kind === "creation-universe") {
    return removeCreationBridgeRecord(record);
  }

  const source = universes.find((item) => item.id === record.sourceUniverseId);
  if (!source) return false;
  const undoState = window.WormholesUndo?.captureState?.();
  const originalBridges = normalizeUniverseBridges(source);

  const key = bridgeKey(record.targetUniverseId, record.targetCreationId);
  source.bridges = originalBridges.filter(
    (bridge) => bridgeKey(bridge.universeId, bridge.creationId) !== key,
  );

  if (saveUniversesToStorage() === false) {
    source.bridges = originalBridges;
    return false;
  }

  removeBridgeNoteForRecord(record);
  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
  }
  offerBridgeRemovalUndo(undoState);

  return true;
}

function getUniverseToCreationBridgeContextForFocus(universeId) {
  const externalTargets = new Set();
  const internalTargets = new Set();

  if (!universeId) return {externalTargets, internalTargets};

  const focusedUniverse = universes.find((item) => item.id === universeId);

  normalizeUniverseBridges(focusedUniverse).forEach((bridge) => {
    if (!bridge.creationId) return;

    if (bridge.universeId === universeId) {
      internalTargets.add(`${bridge.universeId}:${bridge.creationId}`);
    } else {
      externalTargets.add(`${bridge.universeId}:${bridge.creationId}`);
    }
  });

  universes.forEach((universe) => {
    if (universe.id === universeId) return;

    normalizeUniverseBridges(universe).forEach((bridge) => {
      if (bridge.creationId && bridge.universeId === universeId) {
        internalTargets.add(`${universeId}:${bridge.creationId}`);
      }
    });

    readArchiveForUniverse(universe.id).forEach((entry) => {
      normalizeBridges(entry.bridges).forEach((bridge) => {
        if (!bridge.creationId && bridge.universeId === universeId) {
          externalTargets.add(`${universe.id}:${entry.id}`);
        }
      });
    });
  });

  return {externalTargets, internalTargets};
}

function findIncomingUniverseToCreationBridge(focusedUniverseId, focusedCreationId) {
  if (!focusedUniverseId || !focusedCreationId) return null;

  for (const universe of universes) {
    if (universe.id === focusedUniverseId) continue;

    const bridge = normalizeUniverseBridges(universe).find(
      (item) => item.universeId === focusedUniverseId && item.creationId === focusedCreationId,
    );

    if (bridge) {
      return {
        sourceUniverseId: universe.id,
        targetUniverseId: focusedUniverseId,
        targetCreationId: focusedCreationId,
      };
    }
  }

  return null;
}

function isUniverseBridgedToCreation(sourceUniverseId, targetUniverseId, targetCreationId) {
  const universe = universes.find((item) => item.id === sourceUniverseId);
  return normalizeUniverseBridges(universe).some(
    (bridge) => bridge.universeId === targetUniverseId && bridge.creationId === targetCreationId,
  );
}

function toggleUniverseBridge(
  sourceUniverseId,
  targetUniverseId,
  targetCreationId = null,
  options = {},
) {
  if (!sourceUniverseId || !targetUniverseId || sourceUniverseId === targetUniverseId) return false;

  const directSource = universes.find((item) => item.id === sourceUniverseId);
  const directRemoval = targetCreationId
    ? normalizeUniverseBridges(directSource).some(
        (bridge) =>
          bridge.universeId === targetUniverseId && bridge.creationId === targetCreationId,
      )
    : !!findUniverseBridgeBetween(sourceUniverseId, targetUniverseId);
  if (directRemoval && options.confirmRemoval === true) {
    const targetLabel = targetCreationId
      ? controllerServices.getCreationTitleFromUniverse(targetUniverseId, targetCreationId)
      : getUniverseTitle(targetUniverseId);
    requestBridgeRemoval(getUniverseTitle(sourceUniverseId), targetLabel, () => {
      toggleUniverseBridge(sourceUniverseId, targetUniverseId, targetCreationId, {
        confirmRemoval: false,
      });
      wormholeFocusUniverseId = sourceUniverseId;
      selectedWormholeCreation = null;
      controllerServices.renderWormholesMap();
    });
    return true;
  }

  if (!targetCreationId) {
    const existing = findUniverseBridgeBetween(sourceUniverseId, targetUniverseId);

    if (existing) {
      const storedSource = universes.find((item) => item.id === existing.sourceUniverseId);
      if (storedSource) {
        const undoState = window.WormholesUndo?.captureState?.();
        const originalBridges = normalizeUniverseBridges(storedSource);
        storedSource.bridges = originalBridges.filter(
          (bridge) => !(bridge.universeId === existing.targetUniverseId && !bridge.creationId),
        );
        if (saveUniversesToStorage() === false) {
          storedSource.bridges = originalBridges;
          return false;
        }
        removeBridgeNoteForRecord(existing);
        controllerServices.renderWormholesMap();
        offerBridgeRemovalUndo(undoState);
      }
      return true;
    }
  }

  const source = universes.find((item) => item.id === sourceUniverseId);
  if (!source) return false;

  const key = bridgeKey(targetUniverseId, targetCreationId);
  const originalBridges = normalizeUniverseBridges(source);
  source.bridges = originalBridges.map((bridge) => ({...bridge}));
  const removing = source.bridges.some(
    (bridge) => bridgeKey(bridge.universeId, bridge.creationId) === key,
  );
  const undoState = removing ? window.WormholesUndo?.captureState?.() : null;

  if (removing) {
    source.bridges = source.bridges.filter(
      (bridge) => bridgeKey(bridge.universeId, bridge.creationId) !== key,
    );
  } else {
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure("bridgesPerSource", source.bridges.length, 1, {
        context: source.title || "",
        operation: "add another bridge",
      }).ok
    )
      return false;
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure(
        "bridgesAcrossApp",
        window.WormholesEntityLimits.liveBridgeCount(),
        1,
        {operation: "add another bridge"},
      ).ok
    )
      return false;
    source.bridges.push({
      universeId: targetUniverseId,
      creationId: targetCreationId || null,
    });
  }

  if (saveUniversesToStorage() === false) {
    source.bridges = originalBridges;
    return false;
  }

  if (removing) {
    removeBridgeNoteForRecord({sourceUniverseId, targetUniverseId, targetCreationId});
  }
  controllerServices.renderWormholesMap();
  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
  }
  if (removing) offerBridgeRemovalUndo(undoState);
  return true;
}

function normalizeBridge(bridge) {
  if (!bridge) return null;

  if (typeof bridge === "string") {
    return {universeId: bridge, creationId: null};
  }

  if (typeof bridge === "object" && bridge.universeId) {
    return {
      universeId: bridge.universeId,
      creationId: bridge.creationId || null,
    };
  }

  return null;
}

function normalizeBridges(bridges) {
  return (bridges || [])
    .map(normalizeBridge)
    .filter((bridge) => bridge && controllerServices.linkBridgeTargetStillExists(bridge));
}

function bridgeKey(universeId, creationId = null) {
  return `${universeId}::${creationId || ""}`;
}

function hasBridge(entry, universeId, creationId = null) {
  const wanted = bridgeKey(universeId, creationId);
  return normalizeBridges(entry.bridges).some(
    (bridge) => bridgeKey(bridge.universeId, bridge.creationId) === wanted,
  );
}

function getCreationTitleFromUniverse(universeId, creationId) {
  const archive = readArchiveForUniverse(universeId);
  const entry = archive.find((item) => item.id === creationId);
  return entry ? entry.title : "";
}

function nestedPickerKey(type, universeId, entryId = "") {
  return `${type}:${universeId}:${entryId || ""}`;
}

function entryPickerMeta(entry) {
  if (controllerServices.isGroupEntry(entry)) return "Group";
  return entry.what?.val ? entry.what.val.split("—")[0].trim() : "Creation";
}

function hasUniverseBridge(sourceUniverseId, targetUniverseId, targetCreationId = null) {
  if (!sourceUniverseId || !targetUniverseId || sourceUniverseId === targetUniverseId) return false;

  if (!targetCreationId) {
    return !!findUniverseBridgeBetween(sourceUniverseId, targetUniverseId);
  }

  const source = universes.find((item) => item.id === sourceUniverseId);
  return normalizeUniverseBridges(source).some(
    (bridge) =>
      bridgeKey(bridge.universeId, bridge.creationId) ===
      bridgeKey(targetUniverseId, targetCreationId),
  );
}

function openUniverseBridgeModal(universeId) {
  const universe = universes.find((item) => item.id === universeId);
  if (!universe) return;

  activeBridgeEntryId = null;
  activeBridgeUniverseId = universeId;
  stagedBridgeTargetKeys = new Set(
    normalizeUniverseBridges(universe).map((bridge) =>
      bridgeKey(bridge.universeId, bridge.creationId),
    ),
  );
  expandedBridgePickerNodes = new Set();
  document.getElementById("bridgeModalTitle").textContent = "Create Bridges";
  document.getElementById("bridgeModalSubtitle").textContent =
    `Universe: ${universe.title}. Select items in other universes. Save when done.`;
  renderBridgeUniverseList();
  document.getElementById("bridgeModal").classList.add("open");
}

function openBridgeModal(entryId) {
  const entry = controllerServices.getEntry(entryId);
  if (!entry) return;

  activeBridgeEntryId = entryId;
  activeBridgeUniverseId = null;
  stagedBridgeTargetKeys = new Set(
    normalizeBridges(entry.bridges).map((bridge) =>
      bridgeKey(bridge.universeId, bridge.creationId),
    ),
  );
  expandedBridgePickerNodes = new Set();
  document.getElementById("bridgeModalTitle").textContent = "Create Bridges";
  document.getElementById("bridgeModalSubtitle").textContent =
    `Item: ${entry.title}. Select items in other universes. Save when done.`;
  renderBridgeUniverseList();
  document.getElementById("bridgeModal").classList.add("open");
}

function closeBridgeModal() {
  document.getElementById("bridgeModal").classList.remove("open");
  activeBridgeEntryId = null;
  activeBridgeUniverseId = null;
  stagedBridgeTargetKeys = new Set();
  expandedBridgePickerNodes = new Set();
}

function renderBridgeEntryPicker(universeId, entry, depth = 0, archive = null) {
  const fullArchive = archive || readArchiveForUniverse(universeId);
  const isGroup = controllerServices.isGroupEntry(entry);
  const key = nestedPickerKey("group", universeId, entry.id);
  const expanded = expandedBridgePickerNodes.has(key);
  const children = isGroup
    ? controllerServices
        .groupChildIds(entry)
        .map((id) => fullArchive.find((item) => item.id === id))
        .filter(Boolean)
    : [];
  const alreadyBridged = stagedBridgeTargetKeys.has(bridgeKey(universeId, entry.id));
  const meta = alreadyBridged ? "Bridged" : "Not bridged";

  return `
    <div class="nested-picker-node depth-${depth}">
      <div class="nested-picker-row ${alreadyBridged ? "selected" : ""}">
        <button class="nested-picker-select app-button" type="button" data-app-button="true" data-picker-action="bridge-entry" data-universe-id="${escapeHtml(universeId)}" data-entry-id="${escapeHtml(entry.id)}" aria-pressed="${alreadyBridged ? "true" : "false"}" aria-label="${escapeHtml(`${alreadyBridged ? "Remove bridge to" : "Bridge to"} ${isGroup ? "group" : "creation"}: ${entry.title} in ${getUniverseTitle(universeId) || "universe"}`)}">
          <span class="group-choice-title">${escapeHtml(entry.title)}</span>
          <span class="group-choice-meta">${escapeHtml(entryPickerMeta(entry))} · ${escapeHtml(meta)}</span>
        </button>
        ${isGroup ? `<button class="nested-picker-expander app-button" type="button" data-app-button="true" data-picker-action="toggle-bridge-node" data-picker-key="${escapeHtml(key)}">${expanded ? "▾" : "▸"}</button>` : ""}
      </div>
      ${isGroup && expanded ? `<div class="nested-picker-children">${children.length ? children.map((child) => renderBridgeEntryPicker(universeId, child, depth + 1, fullArchive)).join("") : `<div class="universe-empty">This group is empty.</div>`}</div>` : ""}
    </div>
  `;
}

function renderBridgeUniverseList() {
  const list = document.getElementById("bridgeUniverseList");
  const entry = controllerServices.getEntry(activeBridgeEntryId);
  const sourceUniverse = activeBridgeUniverseId
    ? universes.find((item) => item.id === activeBridgeUniverseId)
    : null;

  if (!entry && !sourceUniverse) {
    list.innerHTML = `<div class="universe-empty">No item selected.</div>`;
    return;
  }

  if (universes.length === 0) {
    list.innerHTML = `<div class="universe-empty">No saved universes available.</div>`;
    return;
  }

  const sourceTitle = entry ? entry.title : sourceUniverse.title;
  const sourceLabel = entry ? "Item" : "Universe";
  document.getElementById("bridgeModalSubtitle").textContent =
    `${sourceLabel}: ${sourceTitle}. Select items in other universes. Save when done.`;

  list.innerHTML = universes
    .map((universe) => {
      const archive = readArchiveForUniverse(universe.id);
      const topEntries = controllerServices.topLevelArchiveEntries(archive);
      const creationCount = archive.filter((item) => !controllerServices.isGroupEntry(item)).length;
      const groupCount = archive.filter((item) => controllerServices.isGroupEntry(item)).length;
      const isSourceUniverse = sourceUniverse
        ? universe.id === sourceUniverse.id
        : universe.id === currentUniverseId;
      const key = nestedPickerKey("universe", universe.id);
      const expanded = expandedBridgePickerNodes.has(key);
      const alreadyUniverseBridge = stagedBridgeTargetKeys.has(bridgeKey(universe.id, null));
      const titleMeta = isSourceUniverse
        ? "Current universe"
        : alreadyUniverseBridge
          ? "Bridged"
          : `${creationCount} creation${creationCount === 1 ? "" : "s"} · ${groupCount} group${groupCount === 1 ? "" : "s"}`;

      return `
      <div class="nested-picker-universe" data-universe-id="${escapeHtml(universe.id)}">
        <div class="nested-picker-row ${alreadyUniverseBridge ? "selected" : ""} ${isSourceUniverse ? "disabled" : ""}">
          <button class="nested-picker-select app-button" type="button" data-app-button="true" data-picker-action="bridge-universe" data-universe-id="${escapeHtml(universe.id)}" aria-pressed="${alreadyUniverseBridge ? "true" : "false"}" aria-label="${escapeHtml(`${alreadyUniverseBridge ? "Remove bridge to universe" : "Bridge to universe"}: ${universe.title}${isSourceUniverse ? ". Current universe; cannot bridge to itself" : ""}`)}" ${isSourceUniverse ? `aria-disabled="true"` : ""}>
            <span class="group-choice-title">${escapeHtml(universe.title)}</span>
            ${universe.summary ? `<span class="group-choice-meta">${escapeHtml(universe.summary)}</span>` : ""}
            <span class="group-choice-meta">${escapeHtml(titleMeta)}</span>
          </button>
          <button class="nested-picker-expander app-button" type="button" data-app-button="true" data-picker-action="toggle-bridge-node" data-picker-key="${escapeHtml(key)}" ${isSourceUniverse ? `aria-disabled="true"` : ""}>${expanded ? "▾" : "▸"}</button>
        </div>
        ${expanded && !isSourceUniverse ? `<div class="nested-picker-children">${topEntries.length ? topEntries.map((child) => renderBridgeEntryPicker(universe.id, child, 1, archive)).join("") : `<div class="universe-empty">This universe has no creations or groups.</div>`}</div>` : ""}
      </div>
    `;
    })
    .join("");

  bindBridgePickerControls(list);
  controllerServices.protectAllControls(list);
}

function bindBridgePickerControls(list) {
  list.querySelectorAll("[data-picker-action]").forEach((control) => {
    const activate = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      const action = control.dataset.pickerAction;
      if (action === "toggle-bridge-node") {
        if (control.getAttribute("aria-disabled") === "true") return;
        const key = control.dataset.pickerKey;
        if (expandedBridgePickerNodes.has(key)) expandedBridgePickerNodes.delete(key);
        else expandedBridgePickerNodes.add(key);
        renderBridgeUniverseList();
        return;
      }

      if (control.getAttribute("aria-disabled") === "true") return;

      if (action === "bridge-universe") {
        bridgeEntryToUniverse(control.dataset.universeId, null);
        return;
      }

      if (action === "bridge-entry") {
        bridgeEntryToUniverse(control.dataset.universeId, control.dataset.entryId);
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
}

function bridgeEntryToUniverse(targetUniverseId, targetCreationId = null) {
  const sourceUniverse = activeBridgeUniverseId
    ? universes.find((item) => item.id === activeBridgeUniverseId)
    : null;
  const entry = controllerServices.getEntry(activeBridgeEntryId);
  if (sourceUniverse) {
    if (!targetUniverseId || targetUniverseId === sourceUniverse.id) return;
  } else if (!entry || !targetUniverseId || targetUniverseId === currentUniverseId) {
    return;
  }

  const key = bridgeKey(targetUniverseId, targetCreationId);
  if (stagedBridgeTargetKeys.has(key)) stagedBridgeTargetKeys.delete(key);
  else stagedBridgeTargetKeys.add(key);
  renderBridgeUniverseList();
}

function bridgePickerTargetNode(bridge) {
  if (!bridge?.universeId) return null;
  if (bridge.creationId) {
    return {type: "creation", universeId: bridge.universeId, creationId: bridge.creationId};
  }
  return {type: "universe", universeId: bridge.universeId};
}

function saveBridgePickerModal() {
  const entry = controllerServices.getEntry(activeBridgeEntryId);
  const sourceUniverse = activeBridgeUniverseId
    ? universes.find((item) => item.id === activeBridgeUniverseId)
    : null;
  if (!entry && !sourceUniverse) return false;

  const originalBridges = sourceUniverse
    ? normalizeUniverseBridges(sourceUniverse)
    : normalizeBridges(entry.bridges);
  const originalKeys = new Set(
    originalBridges.map((bridge) => bridgeKey(bridge.universeId, bridge.creationId)),
  );
  const nextBridges = Array.from(stagedBridgeTargetKeys)
    .map((key) => {
      const [universeId, creationId] = key.split("::");
      return {universeId, creationId: creationId || null};
    })
    .filter(
      (bridge) => bridge.universeId && controllerServices.linkBridgeTargetStillExists(bridge),
    );
  const nextKeys = new Set(
    nextBridges.map((bridge) => bridgeKey(bridge.universeId, bridge.creationId)),
  );
  const removedBridges = Array.from(originalKeys).some((key) => !nextKeys.has(key));
  const addedBridgeCount = Array.from(nextKeys).filter((key) => !originalKeys.has(key)).length;
  const removedBridgeCount = Array.from(originalKeys).filter((key) => !nextKeys.has(key)).length;
  if (window.WormholesEntityLimits && nextBridges.length > originalBridges.length) {
    if (
      !window.WormholesEntityLimits.ensure(
        "bridgesPerSource",
        originalBridges.length,
        nextBridges.length - originalBridges.length,
        {context: sourceUniverse?.title || entry?.title || "", operation: "add these bridges"},
      ).ok
    )
      return false;
    const currentTotal = window.WormholesEntityLimits.liveBridgeCount();
    const projectedTotal = currentTotal + addedBridgeCount - removedBridgeCount;
    if (
      projectedTotal > currentTotal &&
      !window.WormholesEntityLimits.ensure(
        "bridgesAcrossApp",
        currentTotal,
        projectedTotal - currentTotal,
        {operation: "add these bridges"},
      ).ok
    )
      return false;
  }
  const undoState = removedBridges ? window.WormholesUndo?.captureState?.() : null;

  const sourceNode = sourceUniverse
    ? {type: "universe", universeId: sourceUniverse.id}
    : {type: "creation", universeId: currentUniverseId, creationId: entry.id};
  const removedNoteKeys = [];

  originalBridges.forEach((bridge) => {
    const key = bridgeKey(bridge.universeId, bridge.creationId);
    if (nextKeys.has(key)) return;
    const targetNode = bridgePickerTargetNode(bridge);
    if (targetNode) {
      removedNoteKeys.push(bridgeNoteKeyForNodes(sourceNode, targetNode));
    }
  });

  if (sourceUniverse) {
    sourceUniverse.bridges = nextBridges;
    if (saveUniversesToStorage() === false) {
      sourceUniverse.bridges = originalBridges;
      return false;
    }
  } else {
    entry.bridges = nextBridges;
    if (saveArchiveToStorage() === false) {
      entry.bridges = originalBridges;
      return false;
    }
  }

  const removedNotes = new Map();
  removedNoteKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(bridgeNotes || {}, key)) {
      removedNotes.set(key, bridgeNotes[key]);
      delete bridgeNotes[key];
    }
  });
  if (removedNotes.size && saveBridgeNotesToStorage() === false) {
    removedNotes.forEach((value, key) => {
      bridgeNotes[key] = value;
    });
  }

  closeBridgeModal();
  controllerServices.renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    if (sourceUniverse) selectedMapNodeId = `universe:${sourceUniverse.id}`;
    controllerServices.renderConnectionsMap();
  }
  if (document.getElementById("wormholesModal")?.classList.contains("open")) {
    controllerServices.renderWormholesMap();
  }
  if (removedBridges && window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Bridges updated",
      restoredMessage: "Bridge changes undone",
      state: undoState,
    });
  } else {
    showSavedToast("Bridges saved");
  }
  return true;
}

function openBridgeNewUniverseModal() {
  if (!activeBridgeEntryId && !activeBridgeUniverseId) return;

  document.getElementById("bridgeNewUniverseError").classList.remove("show");
  document.getElementById("bridgeNewUniverseInput").value = "";
  document.getElementById("bridgeNewUniverseModal").classList.add("open");
  setTimeout(() => document.getElementById("bridgeNewUniverseInput").focus(), 0);
}

function closeBridgeNewUniverseModal() {
  document.getElementById("bridgeNewUniverseModal").classList.remove("open");
}

function createBridgeNewUniverse() {
  const entry = controllerServices.getEntry(activeBridgeEntryId);
  const sourceUniverse = activeBridgeUniverseId
    ? universes.find((item) => item.id === activeBridgeUniverseId)
    : null;
  if (!entry && !sourceUniverse) return;

  const input = document.getElementById("bridgeNewUniverseInput");
  const title = input.value.trim();
  const error = document.getElementById("bridgeNewUniverseError");
  error.classList.remove("show");

  if (!title) {
    controllerServices.setModalErrorText("bridgeNewUniverseError", "A universe title is required.");
    input.focus();
    return;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      fieldName: "universe title",
      operation: "create this universe",
    }).ok
  )
    return;

  if (controllerServices.duplicateUniverseTitleExists(title)) {
    controllerServices.setModalErrorText(
      "bridgeNewUniverseError",
      "A universe with that title already exists. Choose a unique title.",
    );
    input.focus();
    return;
  }

  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("universes", universes.length, 1, {
      operation: "create another universe",
    }).ok
  )
    return;
  const sourceBridgeCount = sourceUniverse
    ? normalizeUniverseBridges(sourceUniverse).length
    : normalizeBridges(entry?.bridges).length;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("bridgesPerSource", sourceBridgeCount, 1, {
      context: sourceUniverse?.title || entry?.title || "",
      operation: "add another bridge",
    }).ok
  )
    return;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure(
      "bridgesAcrossApp",
      window.WormholesEntityLimits.liveBridgeCount(),
      1,
      {operation: "add another bridge"},
    ).ok
  )
    return;

  const universe = {
    id: makeId(),
    title,
    summary: "",
    bridges: [],
    createdAt: new Date().toISOString(),
  };
  universe.diskFolderName = controllerServices.stableUniverseFolderName(universe);

  universes.unshift(universe);
  saveUniversesToStorage();

  if (sourceUniverse) {
    sourceUniverse.bridges = normalizeUniverseBridges(sourceUniverse);
    sourceUniverse.bridges.push({universeId: universe.id, creationId: null});
    saveUniversesToStorage();
  } else {
    entry.bridges = normalizeBridges(entry.bridges);
    entry.bridges.push({universeId: universe.id, creationId: null});
    saveArchiveToStorage();
  }

  closeBridgeNewUniverseModal();
  closeBridgeModal();
  controllerServices.renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    if (sourceUniverse) selectedMapNodeId = `universe:${sourceUniverse.id}`;
    controllerServices.renderConnectionsMap();
  }
}

function openWormholesModal() {
  selectedWormholeCreation = null;
  wormholeFocusUniverseId = null;
  wormholesMapIsolatedSubgraph = false;
  window.WormholesMapSearch?.clearActive?.("wormholes");
  controllerServices.cleanupAllStaleLinks();
  wormholesMapAutoFitOnNextRender = true;
  updateDestructiveClearButtons();
  document.getElementById("wormholesModal").classList.add("open");
  controllerServices.renderWormholesMap();
}

function closeWormholesModal() {
  document.getElementById("wormholesModal").classList.remove("open");
  selectedWormholeCreation = null;
  wormholeFocusUniverseId = null;
  wormholesMapIsolatedSubgraph = false;
  window.WormholesMapSearch?.clearActive?.("wormholes");
}

function clearWormholeFocus() {
  selectedWormholeCreation = null;
  wormholeFocusUniverseId = null;
  wormholesMapIsolatedSubgraph = false;
  window.WormholesMapSearch?.clearActive?.("wormholes");
  controllerServices.renderWormholesMap();
}

function setWormholeUniverseFocus(universeId) {
  wormholeFocusUniverseId = universeId;
  selectedWormholeCreation = null;
  controllerServices.renderWormholesMap();
}

function getArchiveEntryFromUniverse(universeId, creationId) {
  return readArchiveForUniverse(universeId).find((entry) => entry.id === creationId) || null;
}

function saveUniverseArchiveAndRefresh(universeId, archive) {
  if (saveArchiveForUniverse(universeId, archive) === false) return false;

  if (currentUniverseId === universeId) {
    archiveEntries = archive;
    controllerServices.renderArchive();
  }

  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
  }
  return true;
}

function toggleWormholeInternalConnection(universeId, sourceId, targetId, options = {}) {
  if (sourceId === targetId) return false;

  const archive = readArchiveForUniverse(universeId);
  const source = archive.find((entry) => entry.id === sourceId);
  const target = archive.find((entry) => entry.id === targetId);
  if (!source || !target) return false;

  controllerServices.cleanupAllStaleLinks();

  const originalSourceConnections = Array.isArray(source.connections)
    ? [...source.connections]
    : [];
  const originalTargetConnections = Array.isArray(target.connections)
    ? [...target.connections]
    : [];
  source.connections = [...originalSourceConnections];
  target.connections = [...originalTargetConnections];

  const alreadyConnected = source.connections.includes(targetId);
  if (alreadyConnected && options.confirmRemoval === true) {
    requestConnectionRemoval(source.title, target.title, () => {
      toggleWormholeInternalConnection(universeId, sourceId, targetId, {confirmRemoval: false});
      selectedWormholeCreation = {universeId, creationId: sourceId};
      wormholeFocusUniverseId = universeId;
      controllerServices.renderWormholesMap();
    });
    return true;
  }
  const undoState = alreadyConnected ? window.WormholesUndo?.captureState?.() : null;

  if (!alreadyConnected) {
    const limitResult = window.WormholesEntityLimits?.ensureConnectionPlan(
      archive,
      sourceId,
      [targetId],
      {sourceTitle: source.title || ""},
    );
    if (limitResult && !limitResult.ok) return false;
  }

  if (alreadyConnected) {
    source.connections = source.connections.filter((id) => id !== targetId);
    target.connections = target.connections.filter((id) => id !== sourceId);
  } else {
    source.connections.push(targetId);
    target.connections.push(sourceId);
  }

  if (saveUniverseArchiveAndRefresh(universeId, archive) === false) {
    source.connections = originalSourceConnections;
    target.connections = originalTargetConnections;
    return false;
  }

  if (alreadyConnected) {
    const notes = readConnectionNotesForUniverse(universeId);
    const noteKey = controllerServices.makeConnectionKeyFromIds(sourceId, targetId);
    const previousNote = notes[noteKey];
    delete notes[noteKey];
    if (saveConnectionNotesForUniverse(universeId, notes) === false && previousNote !== undefined) {
      notes[noteKey] = previousNote;
    }

    if (currentUniverseId === universeId) {
      connectionNotes = notes;
    }
  }

  controllerServices.renderWormholesMap();
  if (alreadyConnected) {
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
  return true;
}

function getEntryBridgeRecord(
  sourceUniverseId,
  sourceCreationId,
  targetUniverseId,
  targetCreationId,
) {
  const archive = readArchiveForUniverse(sourceUniverseId);
  const source = archive.find((entry) => entry.id === sourceCreationId);
  if (!source) return null;

  const bridge = normalizeBridges(source.bridges).find(
    (item) => item.universeId === targetUniverseId && item.creationId === targetCreationId,
  );

  if (!bridge) return null;

  return {
    sourceUniverseId,
    sourceCreationId,
    targetUniverseId,
    targetCreationId,
  };
}

function findCreationBridgeBetween(aUniverseId, aCreationId, bUniverseId, bCreationId) {
  return (
    getEntryBridgeRecord(aUniverseId, aCreationId, bUniverseId, bCreationId) ||
    getEntryBridgeRecord(bUniverseId, bCreationId, aUniverseId, aCreationId)
  );
}

function removeCreationBridgeRecord(record) {
  if (!record) return false;

  const archive = readArchiveForUniverse(record.sourceUniverseId);
  const source = archive.find((entry) => entry.id === record.sourceCreationId);
  if (!source) return false;
  const undoState = window.WormholesUndo?.captureState?.();
  const originalBridges = normalizeBridges(source.bridges);

  const key = bridgeKey(record.targetUniverseId, record.targetCreationId);
  source.bridges = originalBridges.filter(
    (bridge) => bridgeKey(bridge.universeId, bridge.creationId) !== key,
  );

  if (saveUniverseArchiveAndRefresh(record.sourceUniverseId, archive) === false) {
    source.bridges = originalBridges;
    return false;
  }
  removeBridgeNoteForRecord(record);
  offerBridgeRemovalUndo(undoState);
  return true;
}

function findCreationBridgeWithFocusedUniverse(
  focusedUniverseId,
  targetUniverseId,
  targetCreationId,
) {
  if (
    !focusedUniverseId ||
    !targetUniverseId ||
    !targetCreationId ||
    focusedUniverseId === targetUniverseId
  )
    return null;

  const focusedArchive = readArchiveForUniverse(focusedUniverseId);
  for (const focusedEntry of focusedArchive) {
    const record = findCreationBridgeBetween(
      focusedUniverseId,
      focusedEntry.id,
      targetUniverseId,
      targetCreationId,
    );
    if (record) return record;
  }

  return null;
}

function getCreationBridgeContextForUniverse(universeId) {
  const externalTargets = new Set();
  const internalSources = new Set();

  if (!universeId) return {externalTargets, internalSources};

  const focusArchive = readArchiveForUniverse(universeId);
  const focusIds = new Set(focusArchive.map((entry) => entry.id));

  focusArchive.forEach((entry) => {
    normalizeBridges(entry.bridges).forEach((bridge) => {
      if (bridge.creationId && bridge.universeId !== universeId) {
        externalTargets.add(`${bridge.universeId}:${bridge.creationId}`);
        internalSources.add(`${universeId}:${entry.id}`);
      }
    });
  });

  universes.forEach((universe) => {
    if (universe.id === universeId) return;

    readArchiveForUniverse(universe.id).forEach((entry) => {
      normalizeBridges(entry.bridges).forEach((bridge) => {
        if (
          bridge.creationId &&
          bridge.universeId === universeId &&
          focusIds.has(bridge.creationId)
        ) {
          externalTargets.add(`${universe.id}:${entry.id}`);
          internalSources.add(`${universeId}:${bridge.creationId}`);
        }
      });
    });
  });

  return {externalTargets, internalSources};
}

function getCreationBridgeTargetsForCreation(universeId, creationId) {
  const targets = new Set();
  if (!universeId || !creationId) return targets;

  const sourceEntry = getArchiveEntryFromUniverse(universeId, creationId);
  if (sourceEntry) {
    normalizeBridges(sourceEntry.bridges).forEach((bridge) => {
      if (bridge.creationId) {
        targets.add(`${bridge.universeId}:${bridge.creationId}`);
      }
    });
  }

  universes.forEach((universe) => {
    readArchiveForUniverse(universe.id).forEach((entry) => {
      normalizeBridges(entry.bridges).forEach((bridge) => {
        if (bridge.creationId === creationId && bridge.universeId === universeId) {
          targets.add(`${universe.id}:${entry.id}`);
        }
      });
    });
  });

  return targets;
}

function getUniverseBridgeTargetsForCreation(universeId, creationId) {
  const targets = new Set();
  if (!universeId || !creationId) return targets;

  const sourceEntry = getArchiveEntryFromUniverse(universeId, creationId);

  if (sourceEntry) {
    normalizeBridges(sourceEntry.bridges).forEach((bridge) => {
      if (!bridge.creationId) {
        targets.add(bridge.universeId);
      }
    });
  }

  universes.forEach((universe) => {
    if (universe.id === universeId) return;

    normalizeUniverseBridges(universe).forEach((bridge) => {
      if (bridge.universeId === universeId && bridge.creationId === creationId) {
        targets.add(universe.id);
      }
    });
  });

  return targets;
}

function findBridgeBetweenCreationAndUniverse(creationUniverseId, creationId, otherUniverseId) {
  if (
    !creationUniverseId ||
    !creationId ||
    !otherUniverseId ||
    creationUniverseId === otherUniverseId
  )
    return null;

  const sourceEntry = getArchiveEntryFromUniverse(creationUniverseId, creationId);
  if (sourceEntry) {
    const outgoing = normalizeBridges(sourceEntry.bridges).find(
      (bridge) => bridge.universeId === otherUniverseId && !bridge.creationId,
    );

    if (outgoing) {
      return {
        kind: "creation-universe",
        sourceUniverseId: creationUniverseId,
        sourceCreationId: creationId,
        targetUniverseId: otherUniverseId,
        targetCreationId: null,
      };
    }
  }

  const otherUniverse = universes.find((item) => item.id === otherUniverseId);
  const incomingUniverseBridge = normalizeUniverseBridges(otherUniverse).find(
    (bridge) => bridge.universeId === creationUniverseId && bridge.creationId === creationId,
  );

  if (incomingUniverseBridge) {
    return {
      kind: "universe-creation",
      sourceUniverseId: otherUniverseId,
      targetUniverseId: creationUniverseId,
      targetCreationId: creationId,
    };
  }

  return null;
}

function removeBridgeBetweenCreationAndUniverse(record) {
  if (!record) return false;

  if (record.kind === "creation-universe") {
    return removeCreationBridgeRecord(record);
  }

  if (record.kind === "universe-creation") {
    return removeUniverseToCreationBridge(record);
  }

  return false;
}

function toggleWormholeBridge(
  sourceUniverseId,
  sourceId,
  targetUniverseId,
  targetCreationId = null,
  options = {},
) {
  if (!sourceUniverseId || !sourceId || !targetUniverseId) return false;
  if (sourceUniverseId === targetUniverseId && targetCreationId) return false;

  if (targetCreationId) {
    const existing = findCreationBridgeBetween(
      sourceUniverseId,
      sourceId,
      targetUniverseId,
      targetCreationId,
    );
    if (existing) {
      if (options.confirmRemoval === true) {
        requestBridgeRemoval(
          controllerServices.getCreationTitleFromUniverse(sourceUniverseId, sourceId),
          controllerServices.getCreationTitleFromUniverse(targetUniverseId, targetCreationId),
          () => {
            toggleWormholeBridge(sourceUniverseId, sourceId, targetUniverseId, targetCreationId, {
              confirmRemoval: false,
            });
            selectedWormholeCreation = {universeId: sourceUniverseId, creationId: sourceId};
            wormholeFocusUniverseId = sourceUniverseId;
          },
        );
        return true;
      }
      const removed = removeCreationBridgeRecord(existing);
      if (removed) controllerServices.renderWormholesMap();
      return removed;
    }
  } else {
    const existingCreationUniverseBridge = findBridgeBetweenCreationAndUniverse(
      sourceUniverseId,
      sourceId,
      targetUniverseId,
    );
    if (existingCreationUniverseBridge) {
      if (options.confirmRemoval === true) {
        requestBridgeRemoval(
          controllerServices.getCreationTitleFromUniverse(sourceUniverseId, sourceId),
          getUniverseTitle(targetUniverseId),
          () => {
            toggleWormholeBridge(sourceUniverseId, sourceId, targetUniverseId, null, {
              confirmRemoval: false,
            });
            selectedWormholeCreation = {universeId: sourceUniverseId, creationId: sourceId};
            wormholeFocusUniverseId = sourceUniverseId;
          },
        );
        return true;
      }
      const removed = removeBridgeBetweenCreationAndUniverse(existingCreationUniverseBridge);
      if (removed) controllerServices.renderWormholesMap();
      return removed;
    }
  }

  const archive = readArchiveForUniverse(sourceUniverseId);
  const source = archive.find((entry) => entry.id === sourceId);
  if (!source) return false;

  const originalBridges = normalizeBridges(source.bridges);
  source.bridges = originalBridges.map((bridge) => ({...bridge}));

  const key = bridgeKey(targetUniverseId, targetCreationId);
  const alreadyBridged = source.bridges.some(
    (bridge) => bridgeKey(bridge.universeId, bridge.creationId) === key,
  );

  if (alreadyBridged) {
    source.bridges = source.bridges.filter(
      (bridge) => bridgeKey(bridge.universeId, bridge.creationId) !== key,
    );
  } else {
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure("bridgesPerSource", source.bridges.length, 1, {
        context: source.title || "",
        operation: "add another bridge",
      }).ok
    )
      return false;
    if (
      window.WormholesEntityLimits &&
      !window.WormholesEntityLimits.ensure(
        "bridgesAcrossApp",
        window.WormholesEntityLimits.liveBridgeCount(),
        1,
        {operation: "add another bridge"},
      ).ok
    )
      return false;
    source.bridges.push({
      universeId: targetUniverseId,
      creationId: targetCreationId || null,
    });
  }

  if (saveUniverseArchiveAndRefresh(sourceUniverseId, archive) === false) {
    source.bridges = originalBridges;
    return false;
  }
  controllerServices.renderWormholesMap();
  return true;
}

function handleWormholeCreationClick(universeId, creationId) {
  if (wormholeFocusUniverseId && !selectedWormholeCreation) {
    if (wormholeFocusUniverseId === universeId) {
      return;
    }

    const focusedUniverseId = wormholeFocusUniverseId;
    const existingCreationBridge = findCreationBridgeWithFocusedUniverse(
      focusedUniverseId,
      universeId,
      creationId,
    );
    if (existingCreationBridge) {
      requestBridgeRemoval(
        getUniverseTitle(focusedUniverseId),
        controllerServices.getCreationTitleFromUniverse(universeId, creationId),
        () => {
          removeCreationBridgeRecord(existingCreationBridge);
          wormholeFocusUniverseId = focusedUniverseId;
          selectedWormholeCreation = null;
          controllerServices.renderWormholesMap();
          if (document.getElementById("connectionsScreen")?.classList.contains("active"))
            controllerServices.renderConnectionsMap();
        },
      );
      return;
    }

    const existingUniverseBridge = findUniverseToCreationBridgeBetween(
      focusedUniverseId,
      universeId,
      creationId,
    );
    if (existingUniverseBridge) {
      requestBridgeRemoval(
        getUniverseTitle(focusedUniverseId),
        controllerServices.getCreationTitleFromUniverse(universeId, creationId),
        () => {
          removeUniverseToCreationBridge(existingUniverseBridge);
          wormholeFocusUniverseId = focusedUniverseId;
          selectedWormholeCreation = null;
          controllerServices.renderWormholesMap();
          if (document.getElementById("connectionsScreen")?.classList.contains("active"))
            controllerServices.renderConnectionsMap();
        },
      );
      return;
    }

    toggleUniverseBridge(focusedUniverseId, universeId, creationId, {confirmRemoval: true});
    wormholeFocusUniverseId = focusedUniverseId;
    selectedWormholeCreation = null;
    return;
  }

  if (!selectedWormholeCreation) {
    selectedWormholeCreation = {universeId, creationId};
    wormholeFocusUniverseId = universeId;
    controllerServices.renderWormholesMap();
    return;
  }

  const source = selectedWormholeCreation;

  if (source.universeId === universeId && source.creationId === creationId) {
    clearWormholeFocus();
    return;
  }

  if (source.universeId === universeId) {
    toggleWormholeInternalConnection(universeId, source.creationId, creationId, {
      confirmRemoval: true,
    });
    selectedWormholeCreation = source;
    wormholeFocusUniverseId = source.universeId;
    return;
  }

  toggleWormholeBridge(source.universeId, source.creationId, universeId, creationId, {
    confirmRemoval: true,
  });
  selectedWormholeCreation = source;
  wormholeFocusUniverseId = source.universeId;
}

function handleWormholeUniverseClick(universeId) {
  if (selectedWormholeCreation) {
    if (selectedWormholeCreation.universeId === universeId) {
      clearWormholeFocus();
      return;
    }

    const source = selectedWormholeCreation;
    toggleWormholeBridge(source.universeId, source.creationId, universeId, null, {
      confirmRemoval: true,
    });
    selectedWormholeCreation = source;
    wormholeFocusUniverseId = source.universeId;
    return;
  }

  if (wormholeFocusUniverseId && !selectedWormholeCreation) {
    if (wormholeFocusUniverseId === universeId) {
      clearWormholeFocus();
      return;
    }

    const focusedUniverseId = wormholeFocusUniverseId;
    toggleUniverseBridge(focusedUniverseId, universeId, null, {confirmRemoval: true});
    wormholeFocusUniverseId = focusedUniverseId;
    selectedWormholeCreation = null;
    return;
  }

  setWormholeUniverseFocus(universeId);
}

function clearAllBridgesOnly() {
  const undoState = window.WormholesUndo?.captureState?.();
  universes.forEach((universe) => {
    universe.bridges = [];
    const archive =
      universe.id === currentUniverseId ? archiveEntries : readArchiveForUniverse(universe.id);
    archive.forEach((entry) => {
      entry.bridges = [];
    });
    if (universe.id !== currentUniverseId) {
      saveArchiveForUniverse(universe.id, archive);
    }
  });

  bridgeNotes = {};
  saveUniversesToStorage();
  if (currentUniverseId) {
    saveArchiveToStorage();
  }
  saveBridgeNotesToStorage();

  selectedWormholeCreation = null;
  wormholeFocusUniverseId = null;
  selectedMapNodeId = null;

  closeClearMapConfirm();
  controllerServices.renderWormholesMap();
  if (document.getElementById("connectionsScreen")?.classList.contains("active")) {
    controllerServices.renderConnectionsMap();
  }
  if (window.WormholesUndo && undoState) {
    window.WormholesUndo.offer({
      message: "Bridges cleared",
      restoredMessage: "Bridges restored",
      state: undoState,
    });
  } else {
    showSavedToast("Bridges cleared");
  }
}

/* Public controller surface for served ES-module builds. */
const BRIDGES_CONTROLLER_API = Object.freeze({
  offerBridgeRemovalUndo,
  wormholeNodeKey,
  bridgeNoteKeyForNodes,
  getBridgeNote,
  bridgeRecordNodes,
  removeBridgeNoteForRecord,
  universeHasClearableBridges,
  appHasClearableBridges,
  updateDestructiveClearButtons,
  openBridgeNoteModal,
  targetCreationIdsForBridgeNode,
  addBridgeToEntryTarget,
  addBridgeToUniverseTarget,
  toggleEntryBridgeToExternalNode,
  toggleUniverseBridgeToExternalNode,
  removeUniverseMapBridgeToExternalNode,
  removeMapBridgeToExternalNode,
  getUniverseTitle,
  getUniverseSummary,
  normalizeHue,
  hslColor,
  mapUniversePalette,
  mapUniversePaletteStyle,
  normalizeUniverseBridge,
  normalizeUniverseBridges,
  findUniverseBridgeBetween,
  areUniversesBridged,
  getUniverseBridgeTargetsForFocus,
  findUniverseToCreationBridgeBetween,
  removeUniverseToCreationBridge,
  getUniverseToCreationBridgeContextForFocus,
  findIncomingUniverseToCreationBridge,
  isUniverseBridgedToCreation,
  toggleUniverseBridge,
  normalizeBridge,
  normalizeBridges,
  bridgeKey,
  hasBridge,
  getCreationTitleFromUniverse,
  nestedPickerKey,
  entryPickerMeta,
  hasUniverseBridge,
  openUniverseBridgeModal,
  openBridgeModal,
  closeBridgeModal,
  renderBridgeEntryPicker,
  renderBridgeUniverseList,
  bindBridgePickerControls,
  bridgeEntryToUniverse,
  bridgePickerTargetNode,
  saveBridgePickerModal,
  openBridgeNewUniverseModal,
  closeBridgeNewUniverseModal,
  createBridgeNewUniverse,
  openWormholesModal,
  closeWormholesModal,
  clearWormholeFocus,
  setWormholeUniverseFocus,
  getArchiveEntryFromUniverse,
  saveUniverseArchiveAndRefresh,
  toggleWormholeInternalConnection,
  getEntryBridgeRecord,
  findCreationBridgeBetween,
  removeCreationBridgeRecord,
  findCreationBridgeWithFocusedUniverse,
  getCreationBridgeContextForUniverse,
  getCreationBridgeTargetsForCreation,
  getUniverseBridgeTargetsForCreation,
  findBridgeBetweenCreationAndUniverse,
  removeBridgeBetweenCreationAndUniverse,
  toggleWormholeBridge,
  handleWormholeCreationClick,
  handleWormholeUniverseClick,
  clearAllBridgesOnly,
});
registerControllerServices(BRIDGES_CONTROLLER_API);

export {
  offerBridgeRemovalUndo,
  wormholeNodeKey,
  bridgeNoteKeyForNodes,
  getBridgeNote,
  bridgeRecordNodes,
  removeBridgeNoteForRecord,
  universeHasClearableBridges,
  appHasClearableBridges,
  updateDestructiveClearButtons,
  openBridgeNoteModal,
  targetCreationIdsForBridgeNode,
  addBridgeToEntryTarget,
  addBridgeToUniverseTarget,
  toggleEntryBridgeToExternalNode,
  toggleUniverseBridgeToExternalNode,
  removeUniverseMapBridgeToExternalNode,
  removeMapBridgeToExternalNode,
  getUniverseTitle,
  getUniverseSummary,
  normalizeHue,
  hslColor,
  mapUniversePalette,
  mapUniversePaletteStyle,
  normalizeUniverseBridge,
  normalizeUniverseBridges,
  findUniverseBridgeBetween,
  areUniversesBridged,
  getUniverseBridgeTargetsForFocus,
  findUniverseToCreationBridgeBetween,
  removeUniverseToCreationBridge,
  getUniverseToCreationBridgeContextForFocus,
  findIncomingUniverseToCreationBridge,
  isUniverseBridgedToCreation,
  toggleUniverseBridge,
  normalizeBridge,
  normalizeBridges,
  bridgeKey,
  hasBridge,
  getCreationTitleFromUniverse,
  nestedPickerKey,
  entryPickerMeta,
  hasUniverseBridge,
  openUniverseBridgeModal,
  openBridgeModal,
  closeBridgeModal,
  renderBridgeEntryPicker,
  renderBridgeUniverseList,
  bindBridgePickerControls,
  bridgeEntryToUniverse,
  bridgePickerTargetNode,
  saveBridgePickerModal,
  openBridgeNewUniverseModal,
  closeBridgeNewUniverseModal,
  createBridgeNewUniverse,
  openWormholesModal,
  closeWormholesModal,
  clearWormholeFocus,
  setWormholeUniverseFocus,
  getArchiveEntryFromUniverse,
  saveUniverseArchiveAndRefresh,
  toggleWormholeInternalConnection,
  getEntryBridgeRecord,
  findCreationBridgeBetween,
  removeCreationBridgeRecord,
  findCreationBridgeWithFocusedUniverse,
  getCreationBridgeContextForUniverse,
  getCreationBridgeTargetsForCreation,
  getUniverseBridgeTargetsForCreation,
  findBridgeBetweenCreationAndUniverse,
  removeBridgeBetweenCreationAndUniverse,
  toggleWormholeBridge,
  handleWormholeCreationClick,
  handleWormholeUniverseClick,
  clearAllBridgesOnly,
};

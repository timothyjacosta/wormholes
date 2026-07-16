/* Wormholes Beta 261 — Archive link cleanup, schema normalization, and migration remapping.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";

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
      .map(controllerServices.normalizeBridge)
      .filter((bridge) => linkBridgeTargetStillExists(bridge, archiveByUniverse));

    const oldGroupIds = groupChildIds(entry);
    const newGroupIds = isGroupEntry(entry)
      ? uniqueList(oldGroupIds).filter((childId) => childId !== entry.id && ids.has(childId))
      : entry.groupIds;

    if (
      JSON.stringify(newConnections) !== JSON.stringify(oldConnections) ||
      JSON.stringify(newBridges) !==
        JSON.stringify(controllerServices.normalizeBridges(rawBridges)) ||
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
      .map((bridge) => controllerServices.normalizeUniverseBridge(bridge, universe.id))
      .filter(
        (bridge) =>
          bridge &&
          bridge.universeId !== universe.id &&
          linkBridgeTargetStillExists(bridge, archiveByUniverse),
      );

    if (
      JSON.stringify(newBridges) !==
      JSON.stringify(controllerServices.normalizeUniverseBridges(universe))
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
        .map(controllerServices.normalizeBridge)
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
          JSON.stringify(controllerServices.normalizeBridges(rawBridges)) ||
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
      .map((bridge) => controllerServices.normalizeUniverseBridge(bridge, universe.id))
      .filter(
        (bridge) =>
          bridge &&
          !(bridge.universeId === deletedUniverseId && bridge.creationId === deletedEntityId) &&
          linkBridgeTargetStillExists(bridge, archiveByUniverse),
      );

    if (
      JSON.stringify(newBridges) !==
      JSON.stringify(controllerServices.normalizeUniverseBridges(universe))
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
      ? controllerServices.normalizeBridgeListForImport(entry?.bridges, "", validUniverseIds)
      : controllerServices.normalizeBridges(entry?.bridges),
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

      clone.bridges = controllerServices
        .normalizeBridges(clone.bridges)
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
    const nextUniverseBridges = controllerServices
      .normalizeUniverseBridges(universe)
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
      const nextBridges = controllerServices.normalizeBridges(entry.bridges).map((bridge) => {
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
      entry.bridges = controllerServices.normalizeBridges(nextBridges);
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
      bridges: controllerServices
        .normalizeBridges(item.bridges)
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

export function installLegacyArchiveIntegrityHelpersBindings(target = globalThis) {
  Object.assign(target, ARCHIVE_INTEGRITY_HELPERS_API);
  target.WormholesArchiveIntegrityHelpers = ARCHIVE_INTEGRITY_HELPERS_API;
  return ARCHIVE_INTEGRITY_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyArchiveIntegrityHelpersBindings(window);

export {
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
};

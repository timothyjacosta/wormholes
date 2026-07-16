/* Wormholes Beta 248 cross-reference safeguards.
   Validates that imported groups, connections, bridges, notes, and tags point to existing items. */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

import importedAppErrorsApi from "./app-errors.mjs";

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;

  function canonicalId(value) {
    if (value === undefined || value === null || value === "") return "";
    return String(value);
  }

  function referenceResult(kind, options = {}) {
    return {
      ok: false,
      kind: kind || "reference",
      context: options.context || "",
      detail: options.detail || "",
      universeId: canonicalId(options.universeId),
      sourceId: canonicalId(options.sourceId),
      targetId: canonicalId(options.targetId),
    };
  }

  function dialogCopy(result) {
    const context = result?.context ? ` in “${result.context}”` : "";
    return {
      title: "Some linked items are missing",
      text: `This backup contains a group, connection, bridge, note, or tag that does not match the included items${context}.`,
      detail: "Nothing was imported. Create a new backup from the source app and try again.",
    };
  }

  function closeDialog() {
    document?.getElementById?.("referenceIntegrityModal")?.classList?.remove?.("open");
  }

  function showDialog(result) {
    if (!result || result.ok) return false;
    const copy = dialogCopy(result);
    const modal = document?.getElementById?.("referenceIntegrityModal");
    const title = document?.getElementById?.("referenceIntegrityTitle");
    const text = document?.getElementById?.("referenceIntegrityText");
    const detail = document?.getElementById?.("referenceIntegrityDetail");
    const closeButton = document?.getElementById?.("closeReferenceIntegrityBtn");
    if (!modal || !title || !text || !detail || !closeButton) {
      try {
        window.alert?.(`${copy.title}\n\n${copy.text}\n\n${copy.detail}`);
      } catch (error) {}
      return true;
    }
    title.textContent = copy.title;
    text.textContent = copy.text;
    detail.textContent = copy.detail;
    modal.classList.add("open");
    setTimeout(() => closeButton.focus?.(), 0);
    return true;
  }

  function errorFor(result) {
    const copy = dialogCopy(result);
    const appErrors =
      typeof importedAppErrorsApi !== "undefined"
        ? importedAppErrorsApi
        : window.WormholesAppErrors;
    const error = appErrors?.createError
      ? appErrors.createError("WORMHOLES_BROKEN_REFERENCE", `${copy.text} ${copy.detail}`, {
          name: "WormholesReferenceIntegrityError",
          details: result,
        })
      : new Error(`${copy.text} ${copy.detail}`);
    error.name = "WormholesReferenceIntegrityError";
    error.code = "WORMHOLES_BROKEN_REFERENCE";
    error.referenceIntegrityResult = result;
    return error;
  }

  function fail(kind, options = {}) {
    throw errorFor(referenceResult(kind, options));
  }

  function detailsForUniverse(data, universeId) {
    if (!universeId || !data?.universeData || typeof data.universeData !== "object") return {};
    return data.universeData[universeId] || {};
  }

  function isArchiveGroup(entry) {
    return (
      !!entry &&
      (entry.kind === "group" || Array.isArray(entry.groupIds) || Array.isArray(entry.children))
    );
  }

  function archiveGroupIds(entry) {
    if (Array.isArray(entry?.groupIds)) return entry.groupIds;
    if (Array.isArray(entry?.children)) return entry.children;
    return [];
  }

  function isLiteratureGroup(doc) {
    return (
      !!doc &&
      (doc.kind === "literatureGroup" ||
        doc.fileType === "group" ||
        Array.isArray(doc.groupIds) ||
        Array.isArray(doc.children))
    );
  }

  function literatureGroupIds(doc) {
    if (Array.isArray(doc?.groupIds)) return doc.groupIds;
    if (Array.isArray(doc?.children)) return doc.children;
    return [];
  }

  function bridgeRecord(value) {
    if (typeof value === "string") return {universeId: canonicalId(value), creationId: ""};
    if (!value || typeof value !== "object") return null;
    return {
      universeId: canonicalId(value.universeId),
      creationId: canonicalId(value.creationId),
    };
  }

  function universeNodeKey(universeId) {
    return `U:${canonicalId(universeId)}`;
  }
  function creationNodeKey(universeId, creationId) {
    return `C:${canonicalId(universeId)}:${canonicalId(creationId)}`;
  }
  function relationshipKey(a, b, separator) {
    return [a, b].sort().join(separator);
  }

  function validateUniqueReferences(values, kind, options = {}) {
    const seen = new Set();
    for (const raw of Array.isArray(values) ? values : []) {
      const value = canonicalId(raw);
      if (!value) fail(kind, {...options, detail: "empty-reference"});
      if (seen.has(value)) fail(kind, {...options, targetId: value, detail: "duplicate-reference"});
      seen.add(value);
    }
    return seen;
  }

  function validateGroupReferences(items, groupPredicate, memberGetter, kind, context) {
    const itemMap = new Map(
      (Array.isArray(items) ? items : []).map((item) => [canonicalId(item?.id), item]),
    );
    const membership = new Map();
    for (const item of itemMap.values()) {
      if (!groupPredicate(item)) continue;
      const sourceId = canonicalId(item?.id);
      const memberIds = validateUniqueReferences(memberGetter(item), kind, {context, sourceId});
      for (const targetId of memberIds) {
        const target = itemMap.get(targetId);
        if (!target || targetId === sourceId || groupPredicate(target)) {
          fail(kind, {context, sourceId, targetId, detail: "missing-or-invalid-group-member"});
        }
        const previousGroupId = membership.get(targetId);
        if (previousGroupId && previousGroupId !== sourceId) {
          fail(kind, {context, sourceId, targetId, detail: "member-in-multiple-groups"});
        }
        membership.set(targetId, sourceId);
      }
    }
  }

  function validateConnections(archive, connectionNotes, context) {
    const itemMap = new Map(
      (Array.isArray(archive) ? archive : []).map((item) => [canonicalId(item?.id), item]),
    );
    for (const [sourceId, item] of itemMap) {
      const targetIds = validateUniqueReferences(item?.connections, "connection", {
        context,
        sourceId,
      });
      for (const targetId of targetIds) {
        const target = itemMap.get(targetId);
        if (!target || targetId === sourceId) {
          fail("connection", {context, sourceId, targetId, detail: "missing-or-self-target"});
        }
        const reciprocal = Array.isArray(target.connections)
          ? target.connections.map(canonicalId)
          : [];
        if (!reciprocal.includes(sourceId)) {
          fail("connection", {context, sourceId, targetId, detail: "one-sided-connection"});
        }
      }
    }

    const notes = connectionNotes && typeof connectionNotes === "object" ? connectionNotes : {};
    for (const key of Object.keys(notes)) {
      const parts = String(key).split("::");
      if (parts.length !== 2) fail("connection-note", {context, detail: "invalid-note-key"});
      const sourceId = canonicalId(parts[0]);
      const targetId = canonicalId(parts[1]);
      const source = itemMap.get(sourceId);
      const target = itemMap.get(targetId);
      if (!source || !target || !sourceId || !targetId || sourceId === targetId) {
        fail("connection-note", {context, sourceId, targetId, detail: "missing-note-target"});
      }
      const linked =
        Array.isArray(source.connections) &&
        source.connections.map(canonicalId).includes(targetId) &&
        Array.isArray(target.connections) &&
        target.connections.map(canonicalId).includes(sourceId);
      if (!linked)
        fail("connection-note", {context, sourceId, targetId, detail: "note-without-connection"});
    }
  }

  function validateTags(tags, archiveMaps, universeIds, kind, context, sourceId) {
    const universeRefs = validateUniqueReferences(tags?.universes, `${kind}-universe-tag`, {
      context,
      sourceId,
    });
    for (const universeId of universeRefs) {
      if (!universeIds.has(universeId)) {
        fail(`${kind}-universe-tag`, {
          context,
          sourceId,
          universeId,
          targetId: universeId,
          detail: "missing-universe",
        });
      }
    }

    const seenEntries = new Set();
    for (const tag of Array.isArray(tags?.entries) ? tags.entries : []) {
      const universeId = canonicalId(tag?.universeId);
      const targetId = canonicalId(tag?.entryId);
      const key = `${universeId}::${targetId}`;
      if (!universeId || !targetId || seenEntries.has(key)) {
        fail(`${kind}-entry-tag`, {
          context,
          sourceId,
          universeId,
          targetId,
          detail: seenEntries.has(key) ? "duplicate-reference" : "empty-reference",
        });
      }
      seenEntries.add(key);
      if (!universeIds.has(universeId) || !archiveMaps.get(universeId)?.has(targetId)) {
        fail(`${kind}-entry-tag`, {
          context,
          sourceId,
          universeId,
          targetId,
          detail: "missing-entry",
        });
      }
    }
  }

  function validateBridgeList(
    bridges,
    sourceNode,
    sourceUniverseId,
    archiveMaps,
    universeIds,
    context,
    edgeSet,
  ) {
    const seen = new Set();
    for (const rawBridge of Array.isArray(bridges) ? bridges : []) {
      const bridge = bridgeRecord(rawBridge);
      const targetUniverseId = canonicalId(bridge?.universeId);
      const targetCreationId = canonicalId(bridge?.creationId);
      const duplicateKey = `${targetUniverseId}::${targetCreationId}`;
      if (!bridge || !targetUniverseId || seen.has(duplicateKey)) {
        fail("bridge", {
          context,
          universeId: sourceUniverseId,
          sourceId: sourceNode,
          targetId: targetCreationId || targetUniverseId,
          detail: seen.has(duplicateKey) ? "duplicate-reference" : "invalid-target",
        });
      }
      seen.add(duplicateKey);
      if (targetUniverseId === sourceUniverseId || !universeIds.has(targetUniverseId)) {
        fail("bridge", {
          context,
          universeId: sourceUniverseId,
          sourceId: sourceNode,
          targetId: targetUniverseId,
          detail: "missing-or-self-universe",
        });
      }
      if (targetCreationId && !archiveMaps.get(targetUniverseId)?.has(targetCreationId)) {
        fail("bridge", {
          context,
          universeId: sourceUniverseId,
          sourceId: sourceNode,
          targetId: targetCreationId,
          detail: "missing-creation",
        });
      }
      const targetNode = targetCreationId
        ? creationNodeKey(targetUniverseId, targetCreationId)
        : universeNodeKey(targetUniverseId);
      edgeSet.add(relationshipKey(sourceNode, targetNode, "||"));
    }
  }

  function parseBridgeNoteNode(nodeKey, archiveMaps, universeIds) {
    const value = String(nodeKey || "");
    if (value.startsWith("U:")) {
      const universeId = value.slice(2);
      if (universeId && universeIds.has(universeId)) return {key: universeNodeKey(universeId)};
      return null;
    }
    if (value.startsWith("C:")) {
      const parts = value.split(":");
      const universeId = canonicalId(parts[1]);
      const creationId = canonicalId(parts.slice(2).join(":"));
      if (
        universeId &&
        creationId &&
        universeIds.has(universeId) &&
        archiveMaps.get(universeId)?.has(creationId)
      ) {
        return {key: creationNodeKey(universeId, creationId)};
      }
    }
    return null;
  }

  function validateAppData(data, options = {}) {
    if (options.allowBrokenReferences) return true;
    const universes = Array.isArray(data?.universes) ? data.universes : [];
    const universeIds = new Set(
      universes.map((universe) => canonicalId(universe?.id)).filter(Boolean),
    );
    const universeTitles = new Map(
      universes.map((universe) => [
        canonicalId(universe?.id),
        String(universe?.title || "Untitled Universe"),
      ]),
    );
    const archiveMaps = new Map();

    for (const universe of universes) {
      const universeId = canonicalId(universe?.id);
      const details = detailsForUniverse(data, universeId);
      const archive = Array.isArray(details.archive) ? details.archive : [];
      archiveMaps.set(universeId, new Map(archive.map((item) => [canonicalId(item?.id), item])));
    }

    const currentUniverseId = canonicalId(data?.currentUniverseId);
    if (currentUniverseId && !universeIds.has(currentUniverseId)) {
      fail("current-universe", {targetId: currentUniverseId, detail: "missing-current-universe"});
    }

    const bridgeEdges = new Set();
    for (const universe of universes) {
      const universeId = canonicalId(universe?.id);
      const context = universeTitles.get(universeId) || "Untitled Universe";
      const details = detailsForUniverse(data, universeId);
      const archive = Array.isArray(details.archive) ? details.archive : [];
      const literature = Array.isArray(details.literature) ? details.literature : [];
      const vision = Array.isArray(details.vision) ? details.vision : [];

      validateGroupReferences(archive, isArchiveGroup, archiveGroupIds, "Archive group", context);
      validateGroupReferences(
        literature,
        isLiteratureGroup,
        literatureGroupIds,
        "Literature group",
        context,
      );
      validateConnections(archive, details.connectionNotes, context);

      validateBridgeList(
        universe?.bridges,
        universeNodeKey(universeId),
        universeId,
        archiveMaps,
        universeIds,
        context,
        bridgeEdges,
      );
      for (const entry of archive) {
        validateBridgeList(
          entry?.bridges,
          creationNodeKey(universeId, entry?.id),
          universeId,
          archiveMaps,
          universeIds,
          context,
          bridgeEdges,
        );
      }

      for (const doc of literature) {
        validateTags(
          doc?.tags,
          archiveMaps,
          universeIds,
          "Literature",
          context,
          canonicalId(doc?.id),
        );
      }
      for (const item of vision) {
        validateTags(
          item?.tags,
          archiveMaps,
          universeIds,
          "Vision Board",
          context,
          canonicalId(item?.id),
        );
      }
    }

    const notes = data?.bridgeNotes && typeof data.bridgeNotes === "object" ? data.bridgeNotes : {};
    for (const key of Object.keys(notes)) {
      const parts = String(key).split("||");
      if (parts.length !== 2) fail("bridge-note", {detail: "invalid-note-key"});
      const first = parseBridgeNoteNode(parts[0], archiveMaps, universeIds);
      const second = parseBridgeNoteNode(parts[1], archiveMaps, universeIds);
      if (!first || !second || first.key === second.key) {
        fail("bridge-note", {detail: "missing-note-target"});
      }
      if (!bridgeEdges.has(relationshipKey(first.key, second.key, "||"))) {
        fail("bridge-note", {detail: "note-without-bridge"});
      }
    }

    return true;
  }

  document
    ?.getElementById?.("closeReferenceIntegrityBtn")
    ?.addEventListener?.("click", closeDialog);

  window.WormholesReferenceIntegrity = {
    canonicalId,
    referenceResult,
    validateAppData,
    showDialog,
    closeDialog,
    errorFor,
  };
  return window.WormholesReferenceIntegrity;
}

export const api = install(globalThis);
export default api;

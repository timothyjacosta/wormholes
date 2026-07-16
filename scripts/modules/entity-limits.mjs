/* Wormholes Beta 248 entity-count safeguards.
   Keeps pathological datasets from exhausting memory or rendering capacity while preserving existing over-limit data. */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

import importedAppErrorsApi from "./app-errors.mjs";

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;

  const LIMITS = Object.freeze({
    universes: Object.freeze({label: "universes", singular: "universe", hard: 250}),
    archive: Object.freeze({
      label: "Archive creations and groups in one universe",
      singular: "Archive entity",
      hard: 5000,
    }),
    literature: Object.freeze({
      label: "Literature documents and groups in one universe",
      singular: "Literature entity",
      hard: 5000,
    }),
    vision: Object.freeze({
      label: "Vision Board items in one universe",
      singular: "Vision Board item",
      hard: 2500,
    }),
    notes: Object.freeze({label: "notes on one Archive entity", singular: "note", hard: 500}),
    groupMembers: Object.freeze({
      label: "members in one group",
      singular: "group member",
      hard: 1000,
    }),
    connectionsPerEntity: Object.freeze({
      label: "connections on one Archive entity",
      singular: "connection",
      hard: 5000,
    }),
    connectionsPerUniverse: Object.freeze({
      label: "unique connections in one universe",
      singular: "connection",
      hard: 50000,
    }),
    bridgesPerSource: Object.freeze({
      label: "bridges from one source",
      singular: "bridge",
      hard: 5000,
    }),
    bridgesAcrossApp: Object.freeze({
      label: "bridges across Wormholes",
      singular: "bridge",
      hard: 50000,
    }),
  });

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  }

  function config(kind) {
    return LIMITS[kind] || {label: "entities", singular: "entity", hard: 0};
  }

  function makeResult(kind, currentCount, additionCount = 1, options = {}) {
    const limit = config(kind);
    const current = number(currentCount);
    const addition = number(additionCount);
    const projected = current + addition;
    return {
      ok: !limit.hard || projected <= limit.hard,
      kind,
      label: options.label || limit.label,
      singular: options.singular || limit.singular,
      current,
      addition,
      projected,
      hard: limit.hard,
      context: options.context || "",
      operation: options.operation || "add more items",
    };
  }

  function dialogCopy(result) {
    const context = result.context ? ` in “${result.context}”` : "";
    const itemWord = result.addition === 1 ? result.singular : result.label;
    return {
      title: `${result.singular.charAt(0).toUpperCase()}${result.singular.slice(1)} limit reached`,
      text: `This action would create ${result.projected.toLocaleString()} ${result.label}${context}. Wormholes supports up to ${result.hard.toLocaleString()}.`,
      detail: `Nothing was added. Remove or move existing items before trying to ${result.operation}. The limit is intentionally high and does not remove existing work.${itemWord ? "" : ""}`,
    };
  }

  function closeDialog() {
    document?.getElementById?.("entityLimitModal")?.classList?.remove?.("open");
  }

  function showDialog(result) {
    if (!result || result.ok) return false;
    const copy = dialogCopy(result);
    const modal = document?.getElementById?.("entityLimitModal");
    const title = document?.getElementById?.("entityLimitTitle");
    const text = document?.getElementById?.("entityLimitText");
    const detail = document?.getElementById?.("entityLimitDetail");
    const closeButton = document?.getElementById?.("closeEntityLimitBtn");
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

  function ensure(kind, currentCount, additionCount = 1, options = {}) {
    const result = makeResult(kind, currentCount, additionCount, options);
    if (!result.ok && options.showDialog !== false) showDialog(result);
    return result;
  }

  function errorFor(result) {
    const copy = dialogCopy(result);
    const appErrors =
      typeof importedAppErrorsApi !== "undefined"
        ? importedAppErrorsApi
        : window.WormholesAppErrors;
    const error = appErrors?.createError
      ? appErrors.createError("WORMHOLES_ENTITY_LIMIT_EXCEEDED", `${copy.text} ${copy.detail}`, {
          name: "WormholesEntityLimitError",
          details: result,
        })
      : new Error(`${copy.text} ${copy.detail}`);
    error.name = "WormholesEntityLimitError";
    error.code = "WORMHOLES_ENTITY_LIMIT_EXCEEDED";
    error.entityLimitResult = result;
    return error;
  }

  function assert(kind, currentCount, additionCount = 1, options = {}) {
    const result = makeResult(kind, currentCount, additionCount, options);
    if (!result.ok) throw errorFor(result);
    return result;
  }

  function pairKey(a, b) {
    return [String(a || ""), String(b || "")].sort().join("::");
  }

  function uniqueConnectionCount(archive) {
    const validIds = new Set(
      (Array.isArray(archive) ? archive : []).map((entry) => entry?.id).filter(Boolean),
    );
    const pairs = new Set();
    (Array.isArray(archive) ? archive : []).forEach((entry) => {
      if (!entry?.id) return;
      (Array.isArray(entry.connections) ? entry.connections : []).forEach((targetId) => {
        if (targetId && targetId !== entry.id && validIds.has(targetId))
          pairs.add(pairKey(entry.id, targetId));
      });
    });
    return pairs.size;
  }

  function bridgeCountForArchive(archive) {
    return (Array.isArray(archive) ? archive : []).reduce(
      (sum, entry) => sum + (Array.isArray(entry?.bridges) ? entry.bridges.length : 0),
      0,
    );
  }

  function appBridgeCountFromData(data) {
    const universes = Array.isArray(data?.universes) ? data.universes : [];
    return universes.reduce((sum, universe) => {
      const archive = data?.universeData?.[universe?.id]?.archive || [];
      return (
        sum +
        (Array.isArray(universe?.bridges) ? universe.bridges.length : 0) +
        bridgeCountForArchive(archive)
      );
    }, 0);
  }

  function liveArchive(universeId) {
    try {
      if (
        typeof currentUniverseId !== "undefined" &&
        universeId === currentUniverseId &&
        typeof archiveEntries !== "undefined"
      )
        return archiveEntries || [];
      if (typeof readArchiveForUniverse === "function")
        return readArchiveForUniverse(universeId) || [];
    } catch (error) {}
    return [];
  }

  function liveBridgeCount() {
    try {
      return (Array.isArray(universes) ? universes : []).reduce((sum, universe) => {
        const archive = liveArchive(universe.id);
        return (
          sum +
          (Array.isArray(universe?.bridges) ? universe.bridges.length : 0) +
          bridgeCountForArchive(archive)
        );
      }, 0);
    } catch (error) {
      return 0;
    }
  }

  function ensureConnectionPlan(archive, sourceId, targetIds, options = {}) {
    const entries = Array.isArray(archive) ? archive : [];
    const byId = new Map(entries.map((entry) => [entry?.id, entry]).filter((row) => row[0]));
    const source = byId.get(sourceId);
    if (!source) return {ok: false};
    const currentPairs = new Set();
    entries.forEach((entry) =>
      (Array.isArray(entry?.connections) ? entry.connections : []).forEach((targetId) => {
        if (byId.has(targetId) && targetId !== entry.id)
          currentPairs.add(pairKey(entry.id, targetId));
      }),
    );
    const desiredTargets = Array.from(new Set(targetIds || [])).filter(
      (targetId) => byId.has(targetId) && targetId !== sourceId,
    );
    const originalTargets = new Set(
      (Array.isArray(source.connections) ? source.connections : []).filter(
        (targetId) => byId.has(targetId) && targetId !== sourceId,
      ),
    );
    const additions = desiredTargets.filter(
      (targetId) => !currentPairs.has(pairKey(sourceId, targetId)),
    );
    const removals = options.replaceSource
      ? Array.from(originalTargets).filter((targetId) => !desiredTargets.includes(targetId))
      : [];
    const projectedUniverse = currentPairs.size + additions.length - removals.length;
    if (
      projectedUniverse > LIMITS.connectionsPerUniverse.hard &&
      projectedUniverse > currentPairs.size
    ) {
      const result = makeResult("connectionsPerUniverse", 0, projectedUniverse, {
        ...options,
        operation: "add these connections",
      });
      if (options.showDialog !== false) showDialog(result);
      return result;
    }
    const projectedSource = options.replaceSource
      ? desiredTargets.length
      : originalTargets.size + additions.length;
    if (
      projectedSource > LIMITS.connectionsPerEntity.hard &&
      projectedSource > originalTargets.size
    ) {
      const result = makeResult("connectionsPerEntity", 0, projectedSource, {
        ...options,
        context: options.sourceTitle || options.context || "",
        operation: "add these connections",
      });
      if (options.showDialog !== false) showDialog(result);
      return result;
    }
    for (const targetId of additions) {
      const target = byId.get(targetId);
      const targetCount = new Set(Array.isArray(target?.connections) ? target.connections : [])
        .size;
      if (targetCount + 1 > LIMITS.connectionsPerEntity.hard) {
        const result = makeResult("connectionsPerEntity", targetCount, 1, {
          ...options,
          context: target?.title || "",
          operation: "add this connection",
        });
        if (options.showDialog !== false) showDialog(result);
        return result;
      }
    }
    return {
      ok: true,
      additions: additions.length,
      removals: removals.length,
      projectedUniverse,
      projectedSource,
    };
  }

  function validateAppData(data, options = {}) {
    if (options.allowOverLimit) return true;
    const universes = Array.isArray(data?.universes) ? data.universes : [];
    assert("universes", 0, universes.length, {
      context: "this backup",
      operation: "import this backup",
    });
    let totalBridges = 0;
    universes.forEach((universe) => {
      const title = universe?.title || "Untitled Universe";
      const details = data?.universeData?.[universe?.id] || {};
      const archive = Array.isArray(details.archive) ? details.archive : [];
      const literature = Array.isArray(details.literature) ? details.literature : [];
      const vision = Array.isArray(details.vision) ? details.vision : [];
      assert("archive", 0, archive.length, {context: title, operation: "import this backup"});
      assert("literature", 0, literature.length, {
        context: title,
        operation: "import this backup",
      });
      assert("vision", 0, vision.length, {context: title, operation: "import this backup"});
      archive.forEach((entry) => {
        assert("notes", 0, Array.isArray(entry?.notes) ? entry.notes.length : 0, {
          context: entry?.title || title,
          operation: "import this backup",
        });
        if (entry?.kind === "group")
          assert("groupMembers", 0, Array.isArray(entry?.groupIds) ? entry.groupIds.length : 0, {
            context: entry?.title || title,
            operation: "import this backup",
          });
        assert(
          "connectionsPerEntity",
          0,
          Array.isArray(entry?.connections) ? new Set(entry.connections).size : 0,
          {context: entry?.title || title, operation: "import this backup"},
        );
        assert("bridgesPerSource", 0, Array.isArray(entry?.bridges) ? entry.bridges.length : 0, {
          context: entry?.title || title,
          operation: "import this backup",
        });
      });
      literature.forEach((doc) => {
        if (doc?.kind === "literatureGroup")
          assert("groupMembers", 0, Array.isArray(doc?.groupIds) ? doc.groupIds.length : 0, {
            context: doc?.title || title,
            operation: "import this backup",
          });
      });
      assert("connectionsPerUniverse", 0, uniqueConnectionCount(archive), {
        context: title,
        operation: "import this backup",
      });
      assert(
        "bridgesPerSource",
        0,
        Array.isArray(universe?.bridges) ? universe.bridges.length : 0,
        {context: title, operation: "import this backup"},
      );
      totalBridges +=
        (Array.isArray(universe?.bridges) ? universe.bridges.length : 0) +
        bridgeCountForArchive(archive);
    });
    assert("bridgesAcrossApp", 0, totalBridges, {
      context: "this backup",
      operation: "import this backup",
    });
    return true;
  }

  document?.getElementById?.("closeEntityLimitBtn")?.addEventListener?.("click", closeDialog);

  window.WormholesEntityLimits = {
    limits: LIMITS,
    makeResult,
    ensure,
    assert,
    showDialog,
    closeDialog,
    errorFor,
    uniqueConnectionCount,
    bridgeCountForArchive,
    appBridgeCountFromData,
    liveBridgeCount,
    liveArchive,
    ensureConnectionPlan,
    validateAppData,
  };
  return window.WormholesEntityLimits;
}

export const api = install(globalThis);
export default api;

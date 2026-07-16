/* Wormholes Beta 252 background recent-roll history.
   Keeps a small local diagnostic record of completed generated creations and
   mirrors a plain-language, seed-free summary into the Activity Log. */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

import importedGenerationVersioningApi from "./generation-versioning.mjs";
import {api as importedActivityLogApi} from "./activity-log.mjs";

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;
  const generationVersioningApi =
    typeof importedGenerationVersioningApi !== "undefined"
      ? importedGenerationVersioningApi
      : global.WormholesGenerationVersioning;
  const activityLogApi =
    typeof importedActivityLogApi !== "undefined"
      ? importedActivityLogApi
      : global.WormholesActivityLog;

  const STORAGE_KEY = "wormholes_recent_roll_history_v1";
  const MAX_ITEMS = 50;
  const VERSION = 1;
  const MAX_VALUE_LENGTH = 700;
  const state = {items: []};

  function nowIso() {
    return new Date().toISOString();
  }

  function createId() {
    try {
      return `roll-${crypto.randomUUID()}`;
    } catch (error) {
      return `roll-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  function cleanText(value, max = MAX_VALUE_LENGTH) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function sanitizeResult(result) {
    if (!result || typeof result !== "object" || Array.isArray(result)) return null;
    const normalized = {
      what: cleanText(result.what),
      attr1: cleanText(result.attr1),
      attr2: cleanText(result.attr2),
      pressure: cleanText(result.pressure),
    };
    return Object.values(normalized).some(Boolean) ? normalized : null;
  }

  function sanitizeDiagnostic(diagnostic) {
    const sharedNormalizer = generationVersioningApi?.normalizeDiagnostic;
    if (typeof sharedNormalizer === "function") return sharedNormalizer(diagnostic);

    if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) return null;
    const seed = cleanText(diagnostic.seed, 16).toLowerCase();
    const algorithm = cleanText(diagnostic.algorithm, 40);
    const version = Number(diagnostic.version);
    if (version !== 1 && version !== 2) return null;
    const seedBehaviorVersion = cleanText(
      diagnostic.seedBehaviorVersion || (version === 1 ? "xorshift32-inclusive-int-v1" : ""),
      80,
    );
    const generatorVersion = cleanText(diagnostic.generatorVersion, 40);
    const tableVersion = cleanText(diagnostic.tableVersion, 80);
    const rawFingerprint = cleanText(diagnostic.tableFingerprint, 16).toLowerCase();
    const tableFingerprint = /^[0-9a-f]{8}$/.test(rawFingerprint) ? rawFingerprint : "";
    const draws = Number(diagnostic.draws);
    if (!/^[0-9a-f]{8}$/.test(seed) || algorithm !== "xorshift32-v1") return null;
    if (!seedBehaviorVersion || !generatorVersion || !tableVersion) return null;
    if (version === 2 && !tableFingerprint) return null;
    if (!Number.isInteger(draws) || draws < 0 || draws > 10000) return null;
    const actions = Array.isArray(diagnostic.actions)
      ? diagnostic.actions
          .slice(0, 100)
          .map((action) => {
            if (!action || typeof action !== "object" || Array.isArray(action)) return null;
            const kind = cleanText(action.kind, 30);
            if (!["what", "attribute", "story", "quick-full"].includes(kind)) return null;
            const rolls = {};
            if (action.rolls && typeof action.rolls === "object" && !Array.isArray(action.rolls)) {
              Object.entries(action.rolls)
                .slice(0, 8)
                .forEach(([key, value]) => {
                  const cleanKey = cleanText(key, 20);
                  if (
                    /^[a-z][a-z0-9]{0,19}$/i.test(cleanKey) &&
                    Number.isInteger(value) &&
                    value >= 1 &&
                    value <= 40
                  ) {
                    rolls[cleanKey] = value;
                  }
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
      ...(diagnostic.authoredChanges === true ? {authoredChanges: true} : {}),
    };
  }

  function sanitizeItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const result = sanitizeResult(item.result);
    const diagnostic = sanitizeDiagnostic(item.diagnostic);
    if (!result || !diagnostic) return null;
    const completedAt = Number.isFinite(Date.parse(item.completedAt))
      ? new Date(item.completedAt).toISOString()
      : nowIso();
    const archivedAt = Number.isFinite(Date.parse(item.archivedAt))
      ? new Date(item.archivedAt).toISOString()
      : "";
    return {
      version: VERSION,
      id: cleanText(item.id || createId(), 220),
      completedAt,
      universeId: cleanText(item.universeId, 220),
      universeTitle: cleanText(item.universeTitle, 300),
      result,
      diagnostic,
      archived: item.archived === true,
      archivedAt,
      archiveEntryId: cleanText(item.archiveEntryId, 220),
      archiveTitle: cleanText(item.archiveTitle, 300),
      edited: item.edited === true,
      logItemId: cleanText(item.logItemId, 220),
    };
  }

  function readStorage() {
    try {
      const raw = global.localStorage?.getItem?.(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.map(sanitizeItem).filter(Boolean).slice(-MAX_ITEMS)
        : [];
    } catch (error) {
      return [];
    }
  }

  function saveStorage() {
    try {
      global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(state.items.slice(-MAX_ITEMS)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function resultType(result) {
    const what = cleanText(result?.what, 300);
    const type = what.split(/\s+[—-]\s+/)[0].trim();
    return type || "creation";
  }

  function userDetail(item) {
    const result = item.result || {};
    const parts = [
      result.what ? `What: ${result.what}` : "",
      result.attr1 ? `Attribute: ${result.attr1}` : "",
      result.attr2 ? `Attribute: ${result.attr2}` : "",
      result.pressure ? `Story: ${result.pressure}` : "",
    ].filter(Boolean);
    let status = "Not archived.";
    if (item.archived) {
      status = item.archiveTitle ? `Archived as “${item.archiveTitle}”.` : "Archived.";
      if (item.edited) status += " The generated details were later edited.";
    }
    return {
      title: `Recent roll: ${resultType(result)}`,
      summary: [...parts, status].join("\n"),
      steps: [],
    };
  }

  function updateLogItem(item) {
    if (!item?.logItemId) return;
    activityLogApi?.update?.(item.logItemId, {detail: userDetail(item)});
  }

  function recordCompleted(payload = {}) {
    const result = sanitizeResult(payload.result);
    const diagnostic = sanitizeDiagnostic(payload.diagnostic);
    if (!result || !diagnostic) return null;

    const item = sanitizeItem({
      id: payload.id || createId(),
      completedAt: payload.completedAt || nowIso(),
      universeId: payload.universeId,
      universeTitle: payload.universeTitle,
      result,
      diagnostic,
      archived: false,
      edited: false,
    });
    if (!item) return null;

    const logItem = activityLogApi?.add?.({
      type: "action",
      message: `Rolled ${resultType(result)}`,
      detail: userDetail(item),
    });
    if (logItem?.id) item.logItemId = logItem.id;

    state.items.push(item);
    if (state.items.length > MAX_ITEMS) state.items.splice(0, state.items.length - MAX_ITEMS);
    saveStorage();
    return clone(item);
  }

  function markArchived(historyId, archive = {}) {
    const item = state.items.find((candidate) => candidate.id === historyId);
    if (!item) return null;
    item.archived = true;
    item.archivedAt = nowIso();
    item.archiveEntryId = cleanText(archive.entryId, 220);
    item.archiveTitle = cleanText(archive.title, 300);
    saveStorage();
    updateLogItem(item);
    return clone(item);
  }

  function syncArchiveEntry(entryId, options = {}) {
    const cleanId = cleanText(entryId, 220);
    if (!cleanId) return null;
    const item = [...state.items]
      .reverse()
      .find((candidate) => candidate.archiveEntryId === cleanId);
    if (!item) return null;
    if (options.title !== undefined) item.archiveTitle = cleanText(options.title, 300);
    if (options.generatedFieldsChanged === true) item.edited = true;
    saveStorage();
    updateLogItem(item);
    return clone(item);
  }

  function markEditedByArchiveEntry(entryId) {
    return syncArchiveEntry(entryId, {generatedFieldsChanged: true});
  }

  function getById(id) {
    return clone(state.items.find((item) => item.id === id) || null);
  }
  function latest(limit = MAX_ITEMS) {
    const count = Math.max(0, Math.min(MAX_ITEMS, Number.parseInt(limit, 10) || MAX_ITEMS));
    return clone(state.items.slice(-count)) || [];
  }
  function clear() {
    state.items = [];
    try {
      global.localStorage?.removeItem?.(STORAGE_KEY);
    } catch (error) {}
  }

  state.items = readStorage();

  global.WormholesRecentRollHistory = Object.freeze({
    storageKey: STORAGE_KEY,
    maxItems: MAX_ITEMS,
    version: VERSION,
    state,
    recordCompleted,
    markArchived,
    syncArchiveEntry,
    markEditedByArchiveEntry,
    getById,
    latest,
    clear,
  });
  return global.WormholesRecentRollHistory;
}

export const api = install(globalThis);
export default api;

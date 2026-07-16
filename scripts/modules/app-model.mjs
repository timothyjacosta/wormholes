/* Wormholes Beta 248 application model boundary.
   Pure collection/domain helpers plus an observable in-memory state registry.
   Persistence and DOM rendering live in separate layers. */

const DEFAULT_DOMAINS = Object.freeze([
  "universes",
  "currentUniverseId",
  "archive",
  "literature",
  "vision",
  "connectionNotes",
  "bridgeNotes",
]);

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function findById(items, id) {
  return safeArray(items).find((item) => item?.id === id) || null;
}

export function groupChildIds(item) {
  if (!item || typeof item !== "object") return [];
  if (Array.isArray(item.groupIds)) return item.groupIds;
  if (Array.isArray(item.children)) return item.children;
  return [];
}

export function groupForChild(items, childId, isGroup = (item) => groupChildIds(item).length > 0) {
  return (
    safeArray(items).find((item) => isGroup(item) && groupChildIds(item).includes(childId)) || null
  );
}

export function topLevelItems(items, isGroup = (item) => groupChildIds(item).length > 0) {
  const rows = safeArray(items);
  const groupedIds = new Set();
  rows.forEach((item) => {
    if (isGroup(item)) groupChildIds(item).forEach((id) => groupedIds.add(id));
  });
  return rows.filter((item) => !groupedIds.has(item?.id));
}

export function childItems(group, items) {
  return groupChildIds(group)
    .map((id) => findById(items, id))
    .filter(Boolean);
}

export function replaceById(items, id, nextItem) {
  return safeArray(items).map((item) => (item?.id === id ? nextItem : item));
}

export function updateById(items, id, updater) {
  if (typeof updater !== "function") return safeArray(items);
  return safeArray(items).map((item) => (item?.id === id ? updater(item) : item));
}

export function removeById(items, id) {
  return safeArray(items).filter((item) => item?.id !== id);
}

export function createAppModel(initialState = {}) {
  const state = Object.create(null);
  const revisions = Object.create(null);
  const listeners = new Set();
  let totalRevision = 0;

  DEFAULT_DOMAINS.forEach((domain) => {
    const initial = initialState[domain];
    if (domain === "currentUniverseId")
      state[domain] = typeof initial === "string" ? initial : null;
    else if (domain === "connectionNotes" || domain === "bridgeNotes")
      state[domain] = safeObject(initial);
    else state[domain] = safeArray(initial);
    revisions[domain] = 0;
  });

  function notify(change) {
    listeners.forEach((listener) => {
      try {
        listener(change);
      } catch (error) {}
    });
  }

  function read(domain) {
    return state[String(domain)];
  }

  function replace(domain, value, meta = {}) {
    const key = String(domain || "");
    if (!key) throw new TypeError("A model domain is required.");
    state[key] = value;
    revisions[key] = (revisions[key] || 0) + 1;
    totalRevision += 1;
    const change = Object.freeze({
      domain: key,
      revision: revisions[key],
      totalRevision,
      reason: String(meta.reason || ""),
      source: String(meta.source || ""),
    });
    if (meta.silent !== true) notify(change);
    return value;
  }

  function replaceMany(values = {}, meta = {}) {
    Object.keys(values || {}).forEach((domain) =>
      replace(domain, values[domain], {...meta, silent: true}),
    );
    const change = Object.freeze({
      domain: "*",
      revision: 0,
      totalRevision,
      reason: String(meta.reason || ""),
      source: String(meta.source || ""),
    });
    if (meta.silent !== true) notify(change);
    return snapshot();
  }

  function update(domain, updater, meta = {}) {
    if (typeof updater !== "function") throw new TypeError("A model updater function is required.");
    return replace(domain, updater(read(domain)), meta);
  }

  function revision(domain) {
    return domain ? revisions[String(domain)] || 0 : totalRevision;
  }

  function snapshot(domains = DEFAULT_DOMAINS) {
    const result = {};
    safeArray(domains).forEach((domain) => {
      result[domain] = state[domain];
    });
    return Object.freeze(result);
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    domains: DEFAULT_DOMAINS,
    collections,
    read,
    replace,
    replaceMany,
    update,
    revision,
    snapshot,
    subscribe,
  });
}

export const collections = Object.freeze({
  findById,
  groupChildIds,
  groupForChild,
  topLevelItems,
  childItems,
  replaceById,
  updateById,
  removeById,
});

export function installAppModel(target = globalThis) {
  if (target.WormholesAppModel) return target.WormholesAppModel;
  const model = createAppModel();
  target.WormholesAppModel = model;
  return model;
}

if (typeof window !== "undefined") installAppModel(window);

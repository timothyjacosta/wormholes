/* Wormholes Beta 301 app-data storage-key helpers. */

export function appDataKeysForUniverse(universeId) {
  return [
    archiveStorageKey(universeId),
    oldArchiveStorageKey(universeId),
    connectionNotesStorageKey(universeId),
    oldConnectionNotesStorageKey(universeId),
    literatureStorageKey(universeId),
    oldLiteratureStorageKey(universeId),
    visionStorageKey(universeId),
    oldVisionStorageKey(universeId),
  ];
}

export function removeStoredAppKey(key, target = globalThis) {
  const repository = target.WormholesRepositories?.local;
  if (repository) return repository.remove(key);
  if (typeof target.removeLocalStorageKey === "function") return target.removeLocalStorageKey(key);
  try {
    target.localStorage?.removeItem?.(key);
    return true;
  } catch (error) {
    return false;
  }
}

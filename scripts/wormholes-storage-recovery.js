/* GENERATED from scripts/modules/storage-recovery.mjs. Do not edit this direct-file compatibility adapter. */



/* Wormholes Beta 252 corrupted localStorage recovery.
   Validates authored persisted datasets before normal startup loading, preserves damaged raw
   records in the recovery database, and restores only the affected dataset from the newest
   valid rolling snapshot or legacy record. */
(function () {
  const storageApi =
    typeof importedStorageFacadeApi !== "undefined"
      ? importedStorageFacadeApi
      : globalThis.WormholesStorageFacade || globalThis;
  const snapshotsApi =
    typeof importedSnapshotsApi !== "undefined"
      ? importedSnapshotsApi
      : globalThis.WormholesSnapshots;
  const services =
    typeof importedControllerServices !== "undefined"
      ? importedControllerServices
      : globalThis.controllerServices || globalThis;
  const ARRAY_OF_OBJECTS = "an array of records";
  const PLAIN_OBJECT = "an object";

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isRecordArray(value) {
    return Array.isArray(value) && value.every((item) => isPlainObject(item));
  }

  function validateValue(value, spec) {
    const schema = window.WormholesPersistedSchema;
    if (spec?.dataset && schema?.validate) {
      return schema.validate(spec.dataset, value, {mode: "read"}).ok;
    }
    if (spec.kind === "object") return isPlainObject(value);
    return isRecordArray(value);
  }

  function expectedTypeFor(spec) {
    return spec.kind === "object" ? PLAIN_OBJECT : ARRAY_OF_OBJECTS;
  }

  function inspectStoredText(text, spec) {
    if (text === null) return {status: "missing", data: null};
    try {
      const parsed = storageApi.parsePersistedDatasetText(text, spec.kind === "object" ? {} : []);
      if (!validateValue(parsed.data, spec)) {
        throw new Error(`${spec.label} should contain ${expectedTypeFor(spec)}.`);
      }
      return {
        status: "valid",
        data: parsed.data,
        revision: parsed.revision || 0,
        isRevisioned: !!parsed.isRevisioned,
      };
    } catch (error) {
      return {status: "corrupt", data: null, error};
    }
  }

  function readStorageText(key) {
    const repository = window.WormholesRepositories?.local;
    if (repository) return repository.get(key);
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function activeStoredRecord(spec) {
    const primaryText = readStorageText(spec.key);
    if (primaryText !== null) return {sourceKey: spec.key, rawText: primaryText};
    if (spec.oldKey) {
      const oldText = readStorageText(spec.oldKey);
      if (oldText !== null) return {sourceKey: spec.oldKey, rawText: oldText};
    }
    return null;
  }

  function legacyRecoveryCandidate(spec, damagedSourceKey) {
    if (!spec.oldKey || damagedSourceKey === spec.oldKey) return null;
    const text = readStorageText(spec.oldKey);
    if (text === null) return null;
    const inspected = inspectStoredText(text, spec);
    if (inspected.status !== "valid") return null;
    return {data: inspected.data, source: "legacy", sourceKey: spec.oldKey, snapshotId: ""};
  }

  function valueFromSnapshot(snapshot, spec) {
    const data = snapshot?.data;
    if (!data || typeof data !== "object") return undefined;
    if (spec.dataset === "universes") return data.universes;
    if (spec.dataset === "bridgeNotes") return data.bridgeNotes;
    const universeData = data.universeData?.[spec.universeId];
    if (!universeData || typeof universeData !== "object") return undefined;
    return universeData[spec.dataset];
  }

  function snapshotRecoveryCandidate(spec, snapshots) {
    for (const snapshot of snapshots || []) {
      const value = valueFromSnapshot(snapshot, spec);
      if (value === undefined || !validateValue(value, spec)) continue;
      return {
        data: value,
        source: "snapshot",
        sourceKey: "",
        snapshotId: String(snapshot.id || ""),
        snapshotCreatedAt: String(snapshot.createdAt || ""),
      };
    }
    return null;
  }

  async function writeRecoveredValue(spec, value) {
    storageApi.unblockPersistedDatasetWrites(spec.key);
    if (spec.dataset === "literature") {
      return !!(await services.saveImportedLiteratureForUniverse(spec.universeId, value));
    }
    if (spec.dataset === "vision") {
      return !!(await services.saveImportedVisionForUniverse(spec.universeId, value));
    }
    const repositoryName = spec.dataset === "bridgeNotes" ? "bridgeNotes" : spec.dataset;
    const repository =
      typeof storageApi.wormholesRepository === "function"
        ? storageApi.wormholesRepository(repositoryName)
        : null;
    if (repository) {
      return storageApi.persistenceResultOk(
        repository.save(spec.universeId || null, value, {
          context: `Could not recover ${spec.label}`,
        }),
      );
    }
    return !!storageApi.saveLocalStorageJson(
      spec.key,
      value,
      `Could not recover ${spec.label}`,
      `${spec.label} could not be recovered.`,
    );
  }

  async function preserveDamagedRecord(spec, active, error) {
    const api = snapshotsApi;
    if (!api?.quarantineCorruptedRecord) {
      throw new Error("Corrupted-record preservation storage is unavailable.");
    }
    return api.quarantineCorruptedRecord({
      storageKey: spec.key,
      sourceKey: active.sourceKey,
      datasetLabel: spec.label,
      expectedType: expectedTypeFor(spec),
      rawText: active.rawText,
      error,
    });
  }

  async function recoverOne(spec, snapshots) {
    const active = activeStoredRecord(spec);
    if (!active) return {status: "missing", spec};

    const inspected = inspectStoredText(active.rawText, spec);
    if (inspected.status === "valid") {
      storageApi.unblockPersistedDatasetWrites(spec.key);
      return {status: "valid", spec};
    }

    let quarantine = null;
    try {
      quarantine = await preserveDamagedRecord(spec, active, inspected.error);
    } catch (error) {
      storageApi.blockPersistedDatasetWrites(
        spec.key,
        `${spec.label} is damaged and could not be safely preserved for recovery.`,
      );
      return {status: "blocked", spec, error, originalError: inspected.error};
    }

    const candidate =
      legacyRecoveryCandidate(spec, active.sourceKey) || snapshotRecoveryCandidate(spec, snapshots);
    if (!candidate) {
      storageApi.blockPersistedDatasetWrites(
        spec.key,
        `${spec.label} is damaged and no valid saved copy was found.`,
      );
      return {status: "blocked", spec, quarantine, error: inspected.error};
    }

    try {
      const saved = await writeRecoveredValue(spec, candidate.data);
      if (!saved) throw new Error(`${spec.label} recovery could not be saved.`);
      if (active.sourceKey !== spec.key) storageApi.removeLocalStorageKey(active.sourceKey);
      if (candidate.sourceKey && candidate.sourceKey !== spec.key)
        storageApi.removeLocalStorageKey(candidate.sourceKey);
      storageApi.unblockPersistedDatasetWrites(spec.key);
      await snapshotsApi?.markCorruptedRecordRecovered?.(quarantine.id, {
        recoverySource: candidate.source,
        recoverySnapshotId: candidate.snapshotId || "",
      });
      return {status: "recovered", spec, quarantine, candidate};
    } catch (error) {
      storageApi.blockPersistedDatasetWrites(
        spec.key,
        `${spec.label} is damaged and its saved copy could not be saved.`,
      );
      return {status: "blocked", spec, quarantine, error};
    }
  }

  function globalSpecs() {
    return [
      {
        key: storageApi.UNIVERSES_KEY,
        oldKey: storageApi.OLD_UNIVERSES_KEY,
        dataset: "universes",
        kind: "array",
        label: "Universe list",
      },
      {
        key: storageApi.WORMHOLE_BRIDGE_NOTES_KEY,
        oldKey: storageApi.OLD_WORMHOLE_BRIDGE_NOTES_KEY,
        dataset: "bridgeNotes",
        kind: "object",
        label: "Bridge notes",
      },
    ];
  }

  const universeDatasetDefinitions = [
    {
      currentPrefix: "wormholesUniverseArchive:",
      oldPrefix: "worldBuilderUniverseArchive:",
      dataset: "archive",
      kind: "array",
      label: "Archive",
    },
    {
      currentPrefix: "wormholesUniverseConnectionNotes:",
      oldPrefix: "worldBuilderUniverseConnectionNotes:",
      dataset: "connectionNotes",
      kind: "object",
      label: "Connection details",
    },
    {
      currentPrefix: "wormholesUniverseLiterature:",
      oldPrefix: "worldBuilderUniverseLiterature:",
      dataset: "literature",
      kind: "array",
      label: "Document details",
    },
    {
      currentPrefix: "wormholesUniverseVisionBoard:",
      oldPrefix: "worldBuilderUniverseVisionBoard:",
      dataset: "vision",
      kind: "array",
      label: "Vision Board metadata",
    },
  ];

  function collectUniverseIdsFromStorage(ids) {
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || "";
        universeDatasetDefinitions.forEach((definition) => {
          for (const prefix of [definition.currentPrefix, definition.oldPrefix]) {
            if (key.startsWith(prefix) && key.length > prefix.length) {
              ids.add(key.slice(prefix.length));
            }
          }
        });
      }
    } catch (error) {}
  }

  function collectUniverseIdsFromUniverseList(ids) {
    for (const key of [storageApi.UNIVERSES_KEY, storageApi.OLD_UNIVERSES_KEY]) {
      const text = readStorageText(key);
      if (text === null) continue;
      const inspected = inspectStoredText(text, {kind: "array", label: "Universe list"});
      if (inspected.status !== "valid") continue;
      inspected.data.forEach((universe) => {
        if (universe?.id) ids.add(String(universe.id));
      });
      break;
    }
  }

  function collectUniverseIdsFromSnapshots(ids, snapshots) {
    (snapshots || []).forEach((snapshot) => {
      const data = snapshot?.data;
      (Array.isArray(data?.universes) ? data.universes : []).forEach((universe) => {
        if (universe?.id) ids.add(String(universe.id));
      });
      Object.keys(data?.universeData || {}).forEach((id) => id && ids.add(String(id)));
    });
  }

  function universeSpecs(universeIds) {
    const specs = [];
    for (const universeId of universeIds) {
      universeDatasetDefinitions.forEach((definition) => {
        specs.push({
          key: `${definition.currentPrefix}${universeId}`,
          oldKey: `${definition.oldPrefix}${universeId}`,
          dataset: definition.dataset,
          kind: definition.kind,
          label: `${definition.label} for universe ${universeId}`,
          universeId,
        });
      });
    }
    return specs;
  }

  function reportRecoveryResults(results) {
    const recovered = results.filter((result) => result.status === "recovered");
    const blocked = results.filter((result) => result.status === "blocked");
    if (!recovered.length && !blocked.length) return;

    const details = [];
    if (recovered.length)
      details.push(
        `${recovered.length} damaged record${recovered.length === 1 ? " was" : "s were"} recovered`,
      );
    if (blocked.length)
      details.push(
        `${blocked.length} record${blocked.length === 1 ? " remains" : "s remain"} protected from overwriting`,
      );
    const error = new Error(`${details.join("; ")}.`);
    const userMessage = blocked.length
      ? "Wormholes found damaged local data. Unrecovered areas are protected from being overwritten; use Restore Points or a backup."
      : `Wormholes recovered ${recovered.length} damaged local record${recovered.length === 1 ? "" : "s"} from a saved restore point.`;
    services.reportAppError?.("Corrupted local data recovery", error, {userMessage});
  }

  async function recoverCorruptedLocalStorageRecords() {
    if (window.__wormholesRecoveringCorruptStorage) return {recovered: 0, blocked: 0, results: []};
    window.__wormholesRecoveringCorruptStorage = true;
    const results = [];
    try {
      let snapshots = [];
      try {
        snapshots = (await snapshotsApi?.listSnapshots?.()) || [];
      } catch (error) {
        snapshots = [];
      }

      for (const spec of globalSpecs()) {
        results.push(await recoverOne(spec, snapshots));
      }

      const universeIds = new Set();
      collectUniverseIdsFromUniverseList(universeIds);
      collectUniverseIdsFromStorage(universeIds);
      collectUniverseIdsFromSnapshots(universeIds, snapshots);
      for (const spec of universeSpecs(universeIds)) {
        results.push(await recoverOne(spec, snapshots));
      }
    } finally {
      window.__wormholesRecoveringCorruptStorage = false;
    }

    reportRecoveryResults(results);
    return {
      recovered: results.filter((result) => result.status === "recovered").length,
      blocked: results.filter((result) => result.status === "blocked").length,
      results,
    };
  }

  const api = Object.freeze({
    recoverCorruptedLocalStorageRecords,
    inspectStoredText,
    isRecordArray,
    isPlainObject,
  });
  window.WormholesStorageRecovery = api;
  return api;
})();

const storageRecoveryModuleApi = globalThis.WormholesStorageRecovery;

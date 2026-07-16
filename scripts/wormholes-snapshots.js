/* GENERATED from scripts/modules/recovery-snapshots.mjs. Do not edit this direct-file compatibility adapter. */

/* Wormholes Beta 252 recovery snapshots.
   Keeps a bounded set of full-state recovery points in a dedicated IndexedDB database
   so snapshots survive ordinary app-data clearing and can be restored from Settings. */
(function () {
  const services =
    typeof importedControllerServices !== "undefined"
      ? importedControllerServices
      : globalThis.controllerServices || globalThis;
  const DB_NAME = "WormholesRecoverySnapshots";
  const DB_VERSION = 2;
  const STORE_NAME = "snapshots";
  const CORRUPTION_STORE_NAME = "corruptedRecords";
  const MAX_SNAPSHOTS = 5;
  const MAX_CORRUPTED_RECORDS = 20;
  const AUTOMATIC_DEBOUNCE_MS = 10000;
  const AUTOMATIC_MIN_INTERVAL_MS = 15 * 60 * 1000;

  let dbPromise = null;
  let captureInProgress = null;
  let automaticTimer = null;
  let meaningfulChangePending = false;
  let suppressChangeNotifications = 0;

  function makeSnapshotId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function openSnapshotDb() {
    if (!window.indexedDB)
      return Promise.reject(new Error("Browser storage is not available for restore points."));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {keyPath: "id"});
        }
        if (!db.objectStoreNames.contains(CORRUPTION_STORE_NAME)) {
          db.createObjectStore(CORRUPTION_STORE_NAME, {keyPath: "id"});
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () =>
        reject(request.error || new Error("Could not open Restore Point storage."));
      request.onblocked = () =>
        reject(new Error("Restore Point storage is blocked by another Wormholes tab."));
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }

  async function defaultStoreTransaction(storeName, mode, work) {
    const db = await openSnapshotDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      try {
        result = work(store, tx);
      } catch (error) {
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("Restore Point storage failed."));
      tx.onabort = () => reject(tx.error || new Error("Restore Point storage was stopped."));
    });
  }

  const defaultStore = {
    async put(record) {
      return defaultStoreTransaction(STORE_NAME, "readwrite", (store) => {
        store.put(record);
        return true;
      });
    },
    async get(id) {
      const db = await openSnapshotDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () =>
          reject(request.error || tx.error || new Error("Could not read the restore point."));
      });
    },
    async list() {
      const db = await openSnapshotDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () =>
          reject(request.error || tx.error || new Error("Could not list restore points."));
      });
    },
    async del(id) {
      return defaultStoreTransaction(STORE_NAME, "readwrite", (store) => {
        store.delete(id);
        return true;
      });
    },
  };

  const defaultCorruptionStore = {
    async put(record) {
      return defaultStoreTransaction(CORRUPTION_STORE_NAME, "readwrite", (store) => {
        store.put(record);
        return true;
      });
    },
    async get(id) {
      const db = await openSnapshotDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(CORRUPTION_STORE_NAME, "readonly");
        const request = tx.objectStore(CORRUPTION_STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () =>
          reject(
            request.error || tx.error || new Error("Could not read a preserved corrupted record."),
          );
      });
    },
    async list() {
      const db = await openSnapshotDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(CORRUPTION_STORE_NAME, "readonly");
        const request = tx.objectStore(CORRUPTION_STORE_NAME).getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () =>
          reject(
            request.error || tx.error || new Error("Could not list preserved corrupted records."),
          );
      });
    },
    async del(id) {
      return defaultStoreTransaction(CORRUPTION_STORE_NAME, "readwrite", (store) => {
        store.delete(id);
        return true;
      });
    },
  };

  function snapshotStore() {
    return window.WormholesSnapshotStorageAdapter || defaultStore;
  }

  function corruptionStore() {
    return window.WormholesCorruptionStorageAdapter || defaultCorruptionStore;
  }

  function corruptionTextSignature(storageKey, rawText) {
    const text = `${storageKey || ""}\n${rawText || ""}`;
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `corrupt-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  async function listCorruptedRecords() {
    const records = await corruptionStore().list();
    return records
      .slice()
      .sort((a, b) => String(b.detectedAt || "").localeCompare(String(a.detectedAt || "")));
  }

  async function pruneCorruptedRecords() {
    const records = await listCorruptedRecords();
    const extras = records.slice(MAX_CORRUPTED_RECORDS);
    for (const record of extras) {
      await corruptionStore().del(record.id);
    }
    return Math.max(0, records.length - extras.length);
  }

  async function quarantineCorruptedRecord(details = {}) {
    const storageKey = String(details.storageKey || "");
    const rawText = String(details.rawText ?? "");
    const signature = corruptionTextSignature(storageKey, rawText);
    const existing = (await listCorruptedRecords()).find(
      (record) => record.signature === signature,
    );
    if (existing) return existing;

    const record = {
      id: makeSnapshotId(),
      detectedAt: new Date().toISOString(),
      storageKey,
      sourceKey: String(details.sourceKey || storageKey),
      datasetLabel: String(details.datasetLabel || "Stored dataset"),
      expectedType: String(details.expectedType || ""),
      rawText,
      signature,
      error: String(details.error?.message || details.error || "Stored record failed validation."),
      recovered: false,
      recoveredAt: "",
      recoverySource: "",
      recoverySnapshotId: "",
    };
    await corruptionStore().put(record);
    await pruneCorruptedRecords();
    return record;
  }

  async function markCorruptedRecordRecovered(id, details = {}) {
    if (!id) return null;
    const record = await corruptionStore().get(id);
    if (!record) return null;
    const updated = {
      ...record,
      recovered: true,
      recoveredAt: new Date().toISOString(),
      recoverySource: String(details.recoverySource || ""),
      recoverySnapshotId: String(details.recoverySnapshotId || ""),
    };
    await corruptionStore().put(updated);
    return updated;
  }

  function comparableSnapshotData(exportData) {
    return {
      schemaVersion: exportData?.schemaVersion || 0,
      currentUniverseId: exportData?.currentUniverseId || "",
      universes: exportData?.universes || [],
      bridgeNotes: exportData?.bridgeNotes || {},
      universeData: exportData?.universeData || {},
    };
  }

  function hashSnapshotData(exportData) {
    const text = JSON.stringify(comparableSnapshotData(exportData));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function snapshotReasonLabel(reason) {
    const labels = {
      automatic: "Automatic restore point",
      "before-import": "Before app-data import",
      "before-backup-restore": "Before backup-folder restore",
      "before-clear-data": "Before Clear Data",
      "before-snapshot-restore": "Before restoring a point",
      "before-universe-delete": "Before universe deletion",
      "before-universe-migrate-delete": "Before moving creations and deleting universe",
    };
    return labels[reason] || "Restore point";
  }

  async function getSnapshot(id) {
    if (!id) return null;
    return await snapshotStore().get(id);
  }

  async function listSnapshots() {
    const records = await snapshotStore().list();
    return records
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  async function pruneSnapshots() {
    const records = await listSnapshots();
    const extras = records.slice(MAX_SNAPSHOTS);
    for (const record of extras) {
      await snapshotStore().del(record.id);
    }
    return Math.max(0, records.length - extras.length);
  }

  async function createSnapshot(options = {}) {
    const reason = options.reason || "automatic";
    const force = !!options.force;
    const allowDuplicate = !!options.allowDuplicate;
    const verifyWrite = !!options.verifyWrite;
    const preserveExistingUntilCommitted = !!options.preserveExistingUntilCommitted;
    if (window.WormholesSingleTab && !window.WormholesSingleTab.canWrite()) {
      throw new Error("Only the active Wormholes tab can create a restore point.");
    }
    if (captureInProgress) return captureInProgress;
    if (typeof services.buildWormholesAppDataExport !== "function") {
      throw new Error("Wormholes app data is not ready for restore points.");
    }

    captureInProgress = (async () => {
      const existing = await listSnapshots();
      const latest = existing[0] || null;
      if (!force && latest) {
        const age = Date.now() - Date.parse(latest.createdAt || 0);
        if (Number.isFinite(age) && age >= 0 && age < AUTOMATIC_MIN_INTERVAL_MS) {
          return {deferred: true, waitMs: AUTOMATIC_MIN_INTERVAL_MS - age, latest};
        }
      }

      let exportData = options.data || null;
      if (!exportData) {
        suppressChangeNotifications += 1;
        try {
          exportData = await services.buildWormholesAppDataExport();
        } finally {
          suppressChangeNotifications = Math.max(0, suppressChangeNotifications - 1);
        }
      }

      const signature = hashSnapshotData(exportData);
      if (latest && latest.signature === signature && !allowDuplicate) {
        meaningfulChangePending = false;
        return latest;
      }

      const oldestRollingSnapshot =
        existing.length >= MAX_SNAPSHOTS ? existing[existing.length - 1] : null;

      if (!options.skipCapacityPreflight && window.WormholesStorageCapacity?.preflight) {
        const grossRequiredBytes =
          window.WormholesStorageCapacity.estimateSnapshotBytes(exportData);
        const reclaimableBytes =
          oldestRollingSnapshot && !preserveExistingUntilCommitted
            ? Math.floor(
                window.WormholesStorageCapacity.jsonByteLength(oldestRollingSnapshot) * 0.9,
              )
            : 0;
        const requiredBytes = Math.max(0, grossRequiredBytes - reclaimableBytes);
        const capacityResult = await window.WormholesStorageCapacity.preflight({
          operationLabel:
            reason === "automatic"
              ? "creating an automatic restore point"
              : "creating this restore point",
          requiredBytes,
          continueLabel: "Create Restore Point Anyway",
          mode: reason === "automatic" ? "silent-skip" : "interactive",
          notifyOnSkip: reason === "automatic",
        });
        if (!capacityResult.approved) {
          meaningfulChangePending = false;
          if (reason === "automatic") {
            return {skipped: true, reason: "low-storage", capacity: capacityResult};
          }
          throw new Error(
            capacityResult.status === "block"
              ? "Not enough estimated browser storage to create the required restore point."
              : "Restore point creation was canceled.",
          );
        }
      }

      const record = {
        id: makeSnapshotId(),
        createdAt: new Date().toISOString(),
        reason,
        reasonLabel: snapshotReasonLabel(reason),
        appVersion: typeof WORMHOLES_APP_VERSION !== "undefined" ? WORMHOLES_APP_VERSION : "",
        schemaVersion: exportData?.schemaVersion || 0,
        signature,
        summary:
          exportData?.exportSummary ||
          (typeof services.summarizeWormholesAppDataExport === "function"
            ? services.summarizeWormholesAppDataExport(exportData)
            : null),
        data: exportData,
      };
      let removedRollingSnapshot = null;
      try {
        await snapshotStore().put(record);
      } catch (error) {
        const quotaLike =
          error?.name === "QuotaExceededError" ||
          /quota|storage.*full|not enough.*space/i.test(String(error?.message || error || ""));
        if (!quotaLike || !oldestRollingSnapshot?.id || preserveExistingUntilCommitted) {
          throw error;
        }

        // A browser can still reject the write after a successful capacity estimate.
        // Roll the oldest point out only after that real quota failure, then retry once.
        // If the retry also fails, restore the prior recovery point so exhaustion does not
        // silently shrink the user's recovery history.
        await snapshotStore().del(oldestRollingSnapshot.id);
        removedRollingSnapshot = oldestRollingSnapshot;
        try {
          await snapshotStore().put(record);
        } catch (retryError) {
          try {
            await snapshotStore().put(removedRollingSnapshot);
          } catch (restoreError) {
            console.error(
              "Could not restore the previous restore point after storage filled up",
              restoreError,
            );
          }
          throw retryError;
        }
      }
      if (verifyWrite) {
        const persisted = await snapshotStore().get(record.id);
        if (
          !persisted?.data ||
          persisted.signature !== record.signature ||
          persisted.reason !== record.reason
        ) {
          try {
            await snapshotStore().del(record.id);
          } catch (error) {}
          throw new Error("The restore point could not be verified after it was saved.");
        }
      }
      await pruneSnapshots();
      meaningfulChangePending = false;
      window.dispatchEvent?.(new CustomEvent("wormholes-recovery-snapshots-changed"));
      return record;
    })();

    try {
      return await captureInProgress;
    } finally {
      captureInProgress = null;
    }
  }

  async function preserveEmergencySnapshotBeforeClearData(options = {}) {
    const record = await createSnapshot({
      reason: "before-clear-data",
      force: true,
      allowDuplicate: true,
      verifyWrite: true,
      preserveExistingUntilCommitted: true,
      data: options.data || null,
      skipCapacityPreflight: !!options.skipCapacityPreflight,
    });
    if (!record?.id || record.reason !== "before-clear-data" || !record.data) {
      throw new Error(
        "Wormholes could not save a verified emergency restore point before deleting data.",
      );
    }
    return record;
  }

  function scheduleAutomaticSnapshot(delayMs = AUTOMATIC_DEBOUNCE_MS) {
    if (automaticTimer) clearTimeout(automaticTimer);
    automaticTimer = setTimeout(
      async () => {
        automaticTimer = null;
        if (!meaningfulChangePending) return;
        try {
          const result = await createSnapshot({reason: "automatic"});
          if (result?.deferred && meaningfulChangePending) {
            scheduleAutomaticSnapshot(Math.max(1000, result.waitMs));
          }
        } catch (error) {
          console.error("Could not create an automatic restore point", error);
        }
      },
      Math.max(0, delayMs),
    );
  }

  function noteMeaningfulChange() {
    if (
      suppressChangeNotifications ||
      window.__wormholesClearingAppData ||
      window.__wormholesRecoveringCorruptStorage ||
      window.__wormholesRecoveringIndexedDbRecords
    )
      return;
    meaningfulChangePending = true;
    scheduleAutomaticSnapshot();
  }

  function formatSnapshotDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    try {
      return date.toLocaleString([], {dateStyle: "medium", timeStyle: "short"});
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function closeRecoverySnapshotsModal() {
    document.getElementById("recoverySnapshotsModal")?.classList.remove("open");
  }

  async function renderRecoverySnapshotsList() {
    const list = document.getElementById("recoverySnapshotsList");
    if (!list) return;
    list.replaceChildren();
    try {
      const records = await listSnapshots();
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "recovery-snapshots-empty";
        empty.textContent = "No restore points have been created yet.";
        list.appendChild(empty);
        return;
      }

      records.forEach((record) => {
        const row = document.createElement("div");
        row.className = "recovery-snapshot-row";
        const details = document.createElement("div");
        details.className = "recovery-snapshot-details";
        const title = document.createElement("strong");
        title.textContent = formatSnapshotDate(record.createdAt);
        const reason = document.createElement("span");
        reason.textContent = record.reasonLabel || snapshotReasonLabel(record.reason);
        const summary = document.createElement("small");
        summary.textContent =
          record.summary && typeof services.formatWormholesAppDataExportSummary === "function"
            ? services.formatWormholesAppDataExportSummary(record.summary)
            : record.appVersion || "Wormholes restore point";
        details.append(title, reason, summary);

        const restore = document.createElement("button");
        restore.type = "button";
        restore.className = "app-button recovery-snapshot-restore-button";
        restore.dataset.appButton = "true";
        restore.textContent = "Restore";
        restore.addEventListener("click", () => restoreSnapshot(record.id));
        row.append(details, restore);
        list.appendChild(row);
      });
    } catch (error) {
      const message = document.createElement("p");
      message.className = "recovery-snapshots-empty";
      message.textContent = "Restore points could not be loaded.";
      list.appendChild(message);
      console.error("Could not list restore points", error);
    }
  }

  async function openRecoverySnapshotsModal() {
    services.toggleSettingsMenu?.(false);
    const modal = document.getElementById("recoverySnapshotsModal");
    if (!modal) return;
    modal.classList.add("open");
    await renderRecoverySnapshotsList();
    setTimeout(() => modal.querySelector("button")?.focus(), 0);
  }

  async function restoreSnapshot(id) {
    const record = await snapshotStore().get(id);
    if (!record?.data) {
      services.setSettingsStatus?.("That restore point is no longer available.");
      return false;
    }
    const confirmed = window.confirm(
      "Restore this point? Current data will be saved as a new restore point first. Select OK to restore or Cancel to keep current data.",
    );
    if (!confirmed) return false;

    services.setSettingsStatus?.("Preparing restore…");
    try {
      const rollbackData = await services.buildWormholesAppDataExport();
      if (window.WormholesStorageCapacity?.preflight) {
        const capacityResult = await window.WormholesStorageCapacity.preflight({
          operationLabel: "restoring this point",
          requiredBytes: window.WormholesStorageCapacity.estimateAppDataOperationBytes(
            record.data,
            rollbackData,
          ),
          continueLabel: "Restore Anyway",
        });
        if (!capacityResult.approved) {
          services.setSettingsStatus?.(
            capacityResult.status === "block"
              ? "Restore did not start because there is not enough estimated browser storage. Nothing was changed."
              : "Restore canceled. Nothing was changed.",
          );
          return false;
        }
      }
      services.setSettingsStatus?.("Restoring point…");
      await createSnapshot({
        reason: "before-snapshot-restore",
        force: true,
        data: rollbackData,
        skipCapacityPreflight: true,
      });
      const restored = await services.applyWormholesAppDataImport(record.data, {
        skipConfirmation: true,
        persistentSnapshot: false,
        capacityPreflight: false,
        allowEntityLimitBypass: true,
        allowDuplicateIdBypass: true,
        allowBrokenReferenceBypass: true,
        allowUnsafeUrlBypass: true,
        successMessage: "Restore point restored",
      });
      if (restored) {
        closeRecoverySnapshotsModal();
        if (!window.WormholesUndo?.hasActive?.())
          services.showSavedToast?.("Restore point restored");
        services.setSettingsStatus?.(
          `Restore point from ${formatSnapshotDate(record.createdAt)} was restored.`,
        );
      }
      return !!restored;
    } catch (error) {
      console.error("Could not restore the restore point", error);
      services.reportAppError?.("Restore point failed", error, {
        code: "WORMHOLES_RECOVERY_FAILED",
        userMessage: "Restore failed. Try another restore point or backup.",
      });
      services.setSettingsStatus?.(
        "This restore point could not be restored. Your current data was saved in a new restore point first.",
      );
      return false;
    }
  }

  const api = Object.freeze({
    maxSnapshots: MAX_SNAPSHOTS,
    maxCorruptedRecords: MAX_CORRUPTED_RECORDS,
    automaticMinIntervalMs: AUTOMATIC_MIN_INTERVAL_MS,
    noteMeaningfulChange,
    createSnapshot,
    preserveEmergencySnapshotBeforeClearData,
    getSnapshot,
    listSnapshots,
    pruneSnapshots,
    listCorruptedRecords,
    quarantineCorruptedRecord,
    markCorruptedRecordRecovered,
    pruneCorruptedRecords,
    openRecoverySnapshotsModal,
    closeRecoverySnapshotsModal,
    restoreSnapshot,
    hashSnapshotData,
    snapshotReasonLabel,
  });
  window.WormholesSnapshots = api;
  return api;
})();

const recoverySnapshotsModuleApi = globalThis.WormholesSnapshots;

/* GENERATED from scripts/modules/write-ahead-journal.mjs. Do not edit this direct-file compatibility adapter. */


/* Wormholes Beta 252 write-ahead journal.
   Records a verified recovery-snapshot reference before an operation changes
   multiple browser stores. An unfinished operation is rolled back at startup. */
(function () {
  const snapshotsApi =
    typeof importedSnapshotsApi !== "undefined"
      ? importedSnapshotsApi
      : globalThis.WormholesSnapshots;
  const services =
    typeof importedControllerServices !== "undefined"
      ? importedControllerServices
      : globalThis.controllerServices || globalThis;
  const DB_NAME = "WormholesWriteAheadJournal";
  const DB_VERSION = 1;
  const STORE_NAME = "operations";
  const PENDING_STATUS = "pending";

  let dbPromise = null;
  let activeTransactionId = "";
  let recoveryInProgress = false;
  let lastRecoveryNotice = "";

  function makeOperationId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `operation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function clonePlain(value, fallback) {
    if (value === undefined) return fallback;
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
    } catch (error) {}
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
  }

  function openJournalDb() {
    if (!window.indexedDB)
      return Promise.reject(new Error("IndexedDB is not available for the operation journal."));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {keyPath: "id"});
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () =>
        reject(request.error || new Error("Could not open the operation journal."));
      request.onblocked = () =>
        reject(new Error("The operation journal is blocked by another Wormholes tab."));
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }

  async function defaultTransaction(mode, work) {
    const db = await openJournalDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let result;
      try {
        result = work(store, tx);
      } catch (error) {
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("Operation journal transaction failed."));
      tx.onabort = () =>
        reject(tx.error || new Error("Operation journal transaction was aborted."));
    });
  }

  const defaultStore = {
    async put(record) {
      return defaultTransaction("readwrite", (store) => {
        store.put(record);
        return true;
      });
    },
    async get(id) {
      const db = await openJournalDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () =>
          reject(request.error || tx.error || new Error("Could not read the operation journal."));
      });
    },
    async list() {
      const db = await openJournalDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () =>
          reject(
            request.error || tx.error || new Error("Could not list operation journal entries."),
          );
      });
    },
    async del(id) {
      return defaultTransaction("readwrite", (store) => {
        store.delete(id);
        return true;
      });
    },
  };

  function journalStore() {
    return window.WormholesWriteAheadJournalStorageAdapter || defaultStore;
  }

  function transactionId(transaction) {
    if (typeof transaction === "string") return transaction;
    return String(transaction?.id || "");
  }

  async function getRecoverySnapshot(id) {
    if (!id) return null;
    if (snapshotsApi?.getSnapshot) {
      return await snapshotsApi.getSnapshot(id);
    }
    const snapshots = (await snapshotsApi?.listSnapshots?.()) || [];
    return snapshots.find((snapshot) => snapshot?.id === id) || null;
  }

  function normalizeAdditionalUniverses(value) {
    return (Array.isArray(value) ? value : [])
      .map((universe) => {
        if (typeof universe === "string") return {id: universe};
        if (!universe?.id) return null;
        return {id: String(universe.id), title: String(universe.title || "")};
      })
      .filter(Boolean);
  }

  async function pendingRecords() {
    const records = await journalStore().list();
    return records
      .filter((record) => record?.status === PENDING_STATUS)
      .sort((a, b) => String(a.startedAt || "").localeCompare(String(b.startedAt || "")));
  }

  async function clearFinishedRecords() {
    const records = await journalStore().list();
    for (const record of records) {
      if (record?.status === PENDING_STATUS) continue;
      await journalStore().del(record.id);
    }
  }

  async function begin(options = {}) {
    if (recoveryInProgress)
      throw new Error("Wormholes is still recovering an interrupted operation.");
    if (window.WormholesSingleTab && !window.WormholesSingleTab.canWrite()) {
      throw new Error("Only the active Wormholes tab can begin a multi-store operation.");
    }
    if (activeTransactionId)
      throw new Error("Another multi-store operation is already in progress.");

    await clearFinishedRecords();
    let pending = await pendingRecords();
    if (pending.length && window.WormholesUndo?.hasActive?.()) {
      await window.WormholesUndo.commitActive({silent: true});
      pending = await pendingRecords();
    }
    if (pending.length) {
      throw new Error(
        "An unfinished Wormholes operation must be recovered before another operation can start.",
      );
    }

    const rollbackSnapshotId = String(options.rollbackSnapshotId || "");
    const rollbackSnapshot = await getRecoverySnapshot(rollbackSnapshotId);
    if (!rollbackSnapshot?.data) {
      throw new Error("A verified restore point is required before this operation can start.");
    }

    const now = new Date().toISOString();
    const record = {
      id: makeOperationId(),
      status: PENDING_STATUS,
      operation: String(options.operation || "multi-store-operation"),
      label: String(options.label || "Wormholes operation"),
      phase: "prepared",
      startedAt: now,
      updatedAt: now,
      appVersion: typeof WORMHOLES_APP_VERSION !== "undefined" ? WORMHOLES_APP_VERSION : "",
      schemaVersion: Number(
        rollbackSnapshot?.schemaVersion || rollbackSnapshot?.data?.schemaVersion || 0,
      ),
      rollbackSnapshotId,
      rollbackSignature: String(rollbackSnapshot.signature || ""),
      additionalUniverses: normalizeAdditionalUniverses(options.additionalUniverses),
      folderState: options.folderState === undefined ? null : clonePlain(options.folderState, null),
      details: clonePlain(options.details, {}),
    };

    await journalStore().put(record);
    const verified = await journalStore().get(record.id);
    if (
      !verified ||
      verified.status !== PENDING_STATUS ||
      verified.rollbackSnapshotId !== rollbackSnapshotId
    ) {
      try {
        await journalStore().del(record.id);
      } catch (error) {}
      throw new Error("The write-ahead journal could not be verified, so nothing was changed.");
    }

    activeTransactionId = record.id;
    return {id: record.id, operation: record.operation, label: record.label};
  }

  async function markPhase(transaction, phase, details) {
    const id = transactionId(transaction);
    if (!id) return false;
    const record = await journalStore().get(id);
    if (!record || record.status !== PENDING_STATUS) return false;
    const updated = {
      ...record,
      phase: String(phase || record.phase || "working"),
      updatedAt: new Date().toISOString(),
      details:
        details === undefined
          ? record.details
          : {...(record.details || {}), ...clonePlain(details, {})},
    };
    await journalStore().put(updated);
    return true;
  }

  async function finish(transaction, status) {
    const id = transactionId(transaction);
    if (!id) return false;
    const record = await journalStore().get(id);
    if (!record) {
      if (activeTransactionId === id) activeTransactionId = "";
      return true;
    }
    const completed = {
      ...record,
      status: String(status || "committed"),
      phase: String(status || "committed"),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    await journalStore().put(completed);
    const verified = await journalStore().get(id);
    if (!verified || verified.status !== completed.status) {
      throw new Error("The operation journal could not record completion.");
    }
    await journalStore().del(id);
    if (activeTransactionId === id) activeTransactionId = "";
    return true;
  }

  async function commit(transaction) {
    return finish(transaction, "committed");
  }

  async function discardAfterRollback(transaction) {
    return finish(transaction, "rolled-back");
  }

  async function restoreRecord(record, options = {}) {
    const snapshot = await getRecoverySnapshot(record?.rollbackSnapshotId);
    if (!snapshot?.data) {
      throw new Error(`Restore point ${record?.rollbackSnapshotId || ""} is unavailable.`);
    }
    if (
      typeof services.prepareWormholesAppDataImport !== "function" ||
      typeof services.writePreparedWormholesAppDataImport !== "function"
    ) {
      throw new Error("Wormholes app-data restore functions are unavailable.");
    }

    const prepared = services.prepareWormholesAppDataImport(snapshot.data, {
      allowOverLimit: true,
      allowDuplicateIds: true,
      allowBrokenReferences: true,
      allowUnsafeUrls: true,
    });
    await services.writePreparedWormholesAppDataImport(prepared, {
      additionalUniverses: Array.isArray(record.additionalUniverses)
        ? record.additionalUniverses
        : [],
      journal: false,
    });

    if (
      record.folderState &&
      typeof restoreLocalFolderStateAfterFailedBackupRestore === "function"
    ) {
      await restoreLocalFolderStateAfterFailedBackupRestore(record.folderState);
    }

    if (
      options.applyRuntime &&
      typeof services.applyPreparedWormholesAppDataToRuntime === "function"
    ) {
      services.applyPreparedWormholesAppDataToRuntime(prepared);
    }
    return true;
  }

  async function rollback(transaction, options = {}) {
    const id = transactionId(transaction);
    if (!id) return false;
    const record = await journalStore().get(id);
    if (!record) {
      if (activeTransactionId === id) activeTransactionId = "";
      return true;
    }
    await restoreRecord(record, {applyRuntime: options.applyRuntime !== false});
    await discardAfterRollback(id);
    return true;
  }

  async function recoverPendingOperations() {
    if (recoveryInProgress) return {recovered: 0};
    recoveryInProgress = true;
    let recovered = 0;
    try {
      await clearFinishedRecords();
      const records = await pendingRecords();
      for (const record of records) {
        await restoreRecord(record, {applyRuntime: false});
        await finish(record.id, "recovered");
        recovered += 1;
      }
      if (recovered) {
        lastRecoveryNotice =
          recovered === 1
            ? "Wormholes recovered an operation that was interrupted before it finished."
            : `Wormholes recovered ${recovered} operations that were interrupted before they finished.`;
      }
      return {recovered};
    } finally {
      recoveryInProgress = false;
      activeTransactionId = "";
    }
  }

  function consumeRecoveryNotice() {
    const notice = lastRecoveryNotice;
    lastRecoveryNotice = "";
    return notice;
  }

  const api = Object.freeze({
    begin,
    markPhase,
    commit,
    rollback,
    discardAfterRollback,
    recoverPendingOperations,
    consumeRecoveryNotice,
    pendingRecords,
    get activeTransactionId() {
      return activeTransactionId;
    },
    get recoveryInProgress() {
      return recoveryInProgress;
    },
  });
  window.WormholesWriteAheadJournal = api;
  return api;
})();

const writeAheadJournalModuleApi = globalThis.WormholesWriteAheadJournal;

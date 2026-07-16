/* Wormholes Beta 248: large data store. Keeps bulky document/image payloads out of localStorage. */
(function () {
  const DB_NAME = "WormholesLargeData";
  const DB_VERSION = 1;
  const STORE = "largeData";
  const baseSupported = !!window.indexedDB;
  let unavailableReason = baseSupported ? "" : "IndexedDB is not available in this browser.";
  let dbPromise = null;
  let availabilityPromise = null;

  function markUnavailable(error) {
    unavailableReason = error?.message || "IndexedDB is not available right now.";
    dbPromise = null;
    return false;
  }

  function isAvailable() {
    return baseSupported && !unavailableReason;
  }

  function status() {
    return {supported: isAvailable(), reason: unavailableReason};
  }

  function openDb() {
    if (!baseSupported)
      return Promise.reject(new Error("IndexedDB is not available in this browser."));
    if (unavailableReason) return Promise.reject(new Error(unavailableReason));
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, {keyPath: "key"});
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () =>
        reject(request.error || new Error("Could not open large data store."));
      request.onblocked = () =>
        reject(new Error("Large data store is blocked by another Wormholes tab."));
    }).catch((error) => {
      markUnavailable(error);
      throw error;
    });

    return dbPromise;
  }

  async function tx(mode, work) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      let settled = false;
      const finish = (value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };
      const fail = (error) => {
        if (!settled) {
          settled = true;
          reject(error || transaction.error || new Error("Large data transaction failed."));
        }
      };
      transaction.onerror = () => fail(transaction.error);
      transaction.onabort = () => fail(transaction.error);
      try {
        work(store, finish, fail);
      } catch (e) {
        fail(e);
      }
    });
  }

  async function ready() {
    if (!baseSupported) return false;
    if (unavailableReason) return false;
    if (availabilityPromise) return availabilityPromise;

    availabilityPromise = (async () => {
      const testKey = "__wormholes_indexeddb_test__";
      try {
        await tx("readwrite", (store, finish, fail) => {
          const putRequest = store.put({
            key: testKey,
            value: "ok",
            updatedAt: new Date().toISOString(),
          });
          putRequest.onsuccess = () => {
            const deleteRequest = store.delete(testKey);
            deleteRequest.onsuccess = () => finish(true);
            deleteRequest.onerror = () => fail(deleteRequest.error);
          };
          putRequest.onerror = () => fail(putRequest.error);
        });
        return true;
      } catch (error) {
        return markUnavailable(error);
      }
    })();

    return availabilityPromise;
  }

  async function put(key, value) {
    if (!key) throw new Error("Missing large data key.");
    if (!(await ready())) throw new Error(unavailableReason || "IndexedDB is unavailable.");
    return tx("readwrite", (store, finish, fail) => {
      const request = store.put({key, value, updatedAt: new Date().toISOString()});
      request.onsuccess = () => finish(true);
      request.onerror = () => fail(request.error);
    });
  }

  async function inspect(key) {
    if (!key) return {status: "missing", key: "", value: undefined, updatedAt: ""};
    if (!(await ready())) {
      return {
        status: "unavailable",
        key: String(key),
        value: undefined,
        updatedAt: "",
        reason: unavailableReason || "IndexedDB is unavailable.",
      };
    }
    try {
      return await tx("readonly", (store, finish, fail) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const record = request.result;
          if (!record) {
            finish({status: "missing", key: String(key), value: undefined, updatedAt: ""});
            return;
          }
          finish({
            status: "found",
            key: String(key),
            value: record.value,
            updatedAt: String(record.updatedAt || ""),
          });
        };
        request.onerror = () => fail(request.error);
      });
    } catch (error) {
      return {status: "error", key: String(key), value: undefined, updatedAt: "", error};
    }
  }

  async function get(key) {
    const result = await inspect(key);
    if (result.status === "found") return result.value;
    if (result.status === "error") throw result.error || new Error("Could not read large data.");
    return "";
  }

  async function del(key) {
    if (!key) return false;
    if (!(await ready())) return false;
    return tx("readwrite", (store, finish, fail) => {
      const request = store.delete(key);
      request.onsuccess = () => finish(true);
      request.onerror = () => fail(request.error);
    });
  }

  async function deletePrefix(prefix) {
    if (!prefix) return 0;
    if (!(await ready())) return 0;
    return tx("readwrite", (store, finish, fail) => {
      const request = store.openCursor();
      let count = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          finish(count);
          return;
        }
        if (String(cursor.key || "").startsWith(prefix)) {
          cursor.delete();
          count += 1;
        }
        cursor.continue();
      };
      request.onerror = () => fail(request.error);
    });
  }
  async function clearAll() {
    if (!(await ready())) return false;
    return tx("readwrite", (store, finish, fail) => {
      const request = store.clear();
      request.onsuccess = () => finish(true);
      request.onerror = () => fail(request.error);
    });
  }

  function byteSize(value) {
    try {
      return new Blob([String(value ?? "")]).size;
    } catch (e) {
      return String(value ?? "").length;
    }
  }

  async function estimatePrefixBytes(prefixes) {
    const prefixList = (Array.isArray(prefixes) ? prefixes : [prefixes])
      .map((prefix) => String(prefix || ""))
      .filter(Boolean);
    if (!prefixList.length) return 0;
    if (!(await ready())) return 0;

    return tx("readonly", (store, finish, fail) => {
      const request = store.openCursor();
      let bytes = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          finish(bytes);
          return;
        }
        const key = String(cursor.key || cursor.value?.key || "");
        if (prefixList.some((prefix) => key.startsWith(prefix))) {
          bytes += byteSize(cursor.value?.value || "");
        }
        cursor.continue();
      };
      request.onerror = () => fail(request.error);
    });
  }

  window.WormholesLargeDataStore = {
    get supported() {
      return isAvailable();
    },
    get unavailableReason() {
      return unavailableReason;
    },
    ready,
    status,
    put,
    get,
    inspect,
    del,
    deletePrefix,
    clearAll,
    estimatePrefixBytes,
  };

  ready();
})();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};

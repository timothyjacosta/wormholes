/* GENERATED from scripts/modules/persistence-repositories.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Wormholes Beta 248 canonical persistence repository layer.
     All browser storage and large-data access is exposed through repository interfaces. */
  
  function installPersistenceRepositories() {
    if (typeof window === "undefined") return null;
    if (window.WormholesRepositories) return window.WormholesRepositories;
    const DATASET_FORMAT = "Wormholes Persisted Dataset";
    const blockedDatasetKeys = new Map();
    const appRepositories = Object.create(null);
  
    const FAILURE_CODES = Object.freeze({
      SCHEMA_INVALID: "schema_invalid",
      QUOTA_EXCEEDED: "quota_exceeded",
      CORRUPT_DATASET_BLOCKED: "corrupt_dataset_blocked",
      STORAGE_UNAVAILABLE: "storage_unavailable",
      PERMISSION_DENIED: "permission_denied",
      FOLDER_SYNC_FAILED: "folder_sync_failed",
    });
  
    const APP_ERROR_CODES = Object.freeze({
      [FAILURE_CODES.SCHEMA_INVALID]: "WORMHOLES_SCHEMA_INVALID",
      [FAILURE_CODES.QUOTA_EXCEEDED]: "WORMHOLES_QUOTA_EXCEEDED",
      [FAILURE_CODES.CORRUPT_DATASET_BLOCKED]: "WORMHOLES_CORRUPT_DATASET_BLOCKED",
      [FAILURE_CODES.STORAGE_UNAVAILABLE]: "WORMHOLES_STORAGE_UNAVAILABLE",
      [FAILURE_CODES.PERMISSION_DENIED]: "WORMHOLES_PERMISSION_DENIED",
      [FAILURE_CODES.FOLDER_SYNC_FAILED]: "WORMHOLES_FOLDER_SYNC_FAILED",
    });
  
    const USER_MESSAGES = Object.freeze({
      [FAILURE_CODES.SCHEMA_INVALID]:
        "Some information is incomplete or invalid. Review it and try again.",
      [FAILURE_CODES.QUOTA_EXCEEDED]: "Storage is full. Free some space, then try again.",
      [FAILURE_CODES.CORRUPT_DATASET_BLOCKED]:
        "Saving is paused because saved data may be damaged. Use Recovery or a recent backup.",
      [FAILURE_CODES.STORAGE_UNAVAILABLE]:
        "Browser storage is not available. Check browser settings, then try again.",
      [FAILURE_CODES.PERMISSION_DENIED]:
        "Wormholes does not have permission to save there. Reconnect the folder and try again.",
      [FAILURE_CODES.FOLDER_SYNC_FAILED]:
        "Saved in Wormholes, but the folder could not be updated. Reconnect the folder and try again.",
    });
  
    function appErrorsApi() {
      return typeof importedAppErrorsApi !== "undefined"
        ? importedAppErrorsApi
        : window.WormholesAppErrors;
    }
  
    function successResult(details = {}) {
      return Object.freeze({ok: true, code: "ok", ...details});
    }
  
    function normalizeFailureCode(code) {
      const value = String(code || "");
      return Object.values(FAILURE_CODES).includes(value) ? value : FAILURE_CODES.STORAGE_UNAVAILABLE;
    }
  
    function failureResult(code, error, options = {}) {
      const failureCode = normalizeFailureCode(code);
      const appCode = APP_ERROR_CODES[failureCode];
      const technicalError = error instanceof Error ? error : new Error(String(error || failureCode));
      const userMessage = String(options.userMessage || USER_MESSAGES[failureCode]);
      const normalizedError = appErrorsApi()?.createError
        ? appErrorsApi().createError(appCode, technicalError.message || String(failureCode), {
            name: technicalError.name || "WormholesPersistenceError",
            userMessage,
            recoverable: options.recoverable !== false,
            cause: technicalError,
          })
        : Object.assign(new Error(technicalError.message || String(failureCode)), {
            name: technicalError.name || "WormholesPersistenceError",
            code: appCode,
            userMessage,
            recoverable: options.recoverable !== false,
            cause: technicalError,
          });
      return Object.freeze({
        ok: false,
        code: failureCode,
        error: normalizedError,
        userMessage,
        recoverable: options.recoverable !== false,
        context: String(options.context || "Could not save app data"),
      });
    }
  
    function isQuotaExceededError(error) {
      const name = String(error?.name || "");
      const message = String(error?.message || "");
      const code = Number(error?.code || 0);
      return (
        name === "QuotaExceededError" ||
        name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        code === 22 ||
        code === 1014 ||
        /quota(?: exceeded)?|storage (?:is )?full|not enough (?:storage|space)/i.test(message)
      );
    }
  
    function isPermissionDeniedError(error) {
      const name = String(error?.name || "");
      const message = String(error?.message || "");
      return (
        name === "NotAllowedError" ||
        name === "SecurityError" ||
        /permission (?:was )?(?:denied|not granted)|access (?:was )?denied|not allowed/i.test(message)
      );
    }
  
    function classifyStorageFailure(error) {
      if (isQuotaExceededError(error)) return FAILURE_CODES.QUOTA_EXCEEDED;
      if (isPermissionDeniedError(error)) return FAILURE_CODES.PERMISSION_DENIED;
      return FAILURE_CODES.STORAGE_UNAVAILABLE;
    }
  
    function classifyFolderFailure(error) {
      return isPermissionDeniedError(error)
        ? FAILURE_CODES.PERMISSION_DENIED
        : FAILURE_CODES.FOLDER_SYNC_FAILED;
    }
  
    function resultFromError(error, options = {}) {
      const kind =
        options.kind === "folder" ? classifyFolderFailure(error) : classifyStorageFailure(error);
      return failureResult(kind, error, options);
    }
  
    const results = Object.freeze({
      FAILURE_CODES,
      USER_MESSAGES,
      success: successResult,
      failure: failureResult,
      fromError: resultFromError,
      classifyStorageFailure,
      classifyFolderFailure,
      isQuotaExceededError,
      isPermissionDeniedError,
      isOk(result) {
        return result === true || result?.ok === true;
      },
    });
  
    function schemaLayer() {
      return window.WormholesPersistedSchema || null;
    }
  
    function canonicalLayer() {
      return window.WormholesCanonicalPersistence || null;
    }
  
    function canonicalVersion(schemaName) {
      return canonicalLayer()?.migrations?.currentVersion?.(schemaName) || 1;
    }
  
    function prepareCanonicalDataset(schemaName, value, options = {}) {
      if (!schemaName || !canonicalLayer()?.migrations?.migrateDataset) return value;
      return canonicalLayer().migrations.migrateDataset(schemaName, value, {
        fromVersion: options.fromVersion,
        scope: options.scope,
        dropInvalidReferences: options.dropInvalidReferences === true,
      });
    }
  
    function validateSchema(schemaName, value, mode) {
      if (!schemaName || !schemaLayer()?.validate)
        return {ok: true, schema: String(schemaName || ""), mode, issues: []};
      return schemaLayer().validate(schemaName, value, {mode});
    }
  
    function schemaError(result) {
      if (schemaLayer()?.errorFor) return schemaLayer().errorFor(result);
      const appErrors = appErrorsApi();
      const message = `Persisted ${result?.schema || "data"} did not match its expected schema.`;
      const error = appErrors?.createError
        ? appErrors.createError("WORMHOLES_PERSISTED_SCHEMA", message, {
            name: "WormholesPersistedSchemaError",
            details: result,
          })
        : new Error(message);
      error.name = "WormholesPersistedSchemaError";
      error.code = "WORMHOLES_PERSISTED_SCHEMA";
      error.schemaResult = result;
      return error;
    }
  
    function canWrite() {
      return !(window.WormholesSingleTab && !window.WormholesSingleTab.canWrite());
    }
  
    function reportStorageFailure(result) {
      if (!result || result.ok) return result;
      if (typeof window.rememberStorageFailure === "function") {
        window.rememberStorageFailure(result.context, result.error, result.userMessage);
        return result;
      }
      if (typeof window.reportAppError === "function") {
        window.reportAppError(result.context, result.error, {
          code: result.error?.code || APP_ERROR_CODES[result.code] || "WORMHOLES_SAVE_FAILED",
          userMessage: result.userMessage,
        });
      }
      return result;
    }
  
    function noteMutation(key) {
      try {
        window.WormholesUndo?.notePersistedMutation?.(key);
      } catch (error) {}
    }
  
    function emit(type, detail) {
      try {
        if (typeof window.dispatchEvent !== "function") return;
        const event =
          typeof CustomEvent === "function" ? new CustomEvent(type, {detail}) : {type, detail};
        window.dispatchEvent(event);
      } catch (error) {}
    }
  
    const local = {
      get(key) {
        try {
          return localStorage.getItem(String(key));
        } catch (error) {
          return null;
        }
      },
      set(key, value, options = {}) {
        const storageKey = String(key || "");
        if (!canWrite()) {
          return reportStorageFailure(
            failureResult(
              FAILURE_CODES.STORAGE_UNAVAILABLE,
              new Error("This tab is read-only because another Wormholes tab is active."),
              {
                context: options.context || "Could not save app data",
                userMessage:
                  options.userMessage ||
                  "Changes cannot be saved from this tab. Use the active Wormholes tab.",
              },
            ),
          );
        }
        try {
          noteMutation(storageKey);
          localStorage.setItem(storageKey, String(value));
          return successResult({key: storageKey});
        } catch (error) {
          const code = classifyStorageFailure(error);
          return reportStorageFailure(
            failureResult(code, error, {
              context: options.context || "Could not save app data",
              userMessage: options.failureMessages?.[code] || USER_MESSAGES[code],
            }),
          );
        }
      },
      remove(key) {
        if (!canWrite()) return false;
        const storageKey = String(key || "");
        try {
          noteMutation(storageKey);
          localStorage.removeItem(storageKey);
          emit("wormholes-dataset-removed", {key: storageKey});
          return true;
        } catch (error) {
          return false;
        }
      },
      keys() {
        const keys = [];
        try {
          for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key !== null) keys.push(key);
          }
        } catch (error) {}
        return keys;
      },
      clearMatching(predicate, options = {}) {
        const preserve =
          options.preserveKeys instanceof Set
            ? options.preserveKeys
            : new Set(options.preserveKeys || []);
        const keys = local.keys().filter((key) => !preserve.has(key) && predicate(key));
        keys.forEach((key) => {
          if (!local.remove(key)) throw new Error(`Could not remove stored key: ${key}`);
        });
        return keys.length;
      },
    };
  
    const preferences = {
      readText(key, fallback = "") {
        const value = local.get(key);
        return value === null ? fallback : value;
      },
      writeText(key, value, options = {}) {
        return local.set(key, value, options);
      },
      readJson(key, fallback = null) {
        const text = local.get(key);
        if (text === null || text === "") return fallback;
        try {
          return JSON.parse(text);
        } catch (error) {
          return fallback;
        }
      },
      writeJson(key, value, options = {}) {
        return local.set(key, JSON.stringify(value), options);
      },
      remove(key) {
        return local.remove(key);
      },
    };
  
    function parseDatasetText(text, fallbackValue = null) {
      if (!text)
        return {
          data: fallbackValue,
          revision: 0,
          updatedAt: "",
          schemaVersion: 1,
          isRevisioned: false,
        };
      const parsed = JSON.parse(text);
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        parsed.format === DATASET_FORMAT
      ) {
        if (!Number.isInteger(parsed.revision) || parsed.revision < 1) {
          throw new Error("Persisted dataset revision metadata is invalid.");
        }
        if (!Object.prototype.hasOwnProperty.call(parsed, "data")) {
          throw new Error("Persisted dataset is missing its data field.");
        }
        if (parsed.updatedAt !== undefined && typeof parsed.updatedAt !== "string") {
          throw new Error("Persisted dataset update metadata is invalid.");
        }
        if (
          parsed.schemaVersion !== undefined &&
          (!Number.isInteger(parsed.schemaVersion) || parsed.schemaVersion < 1)
        ) {
          throw new Error("Persisted dataset schema metadata is invalid.");
        }
        return {
          data: parsed.data,
          revision: parsed.revision,
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
          schemaVersion: Number.isInteger(parsed.schemaVersion) ? parsed.schemaVersion : 1,
          isRevisioned: true,
        };
      }
      return {
        data: parsed,
        revision: 0,
        updatedAt: "",
        schemaVersion: 1,
        isRevisioned: false,
      };
    }
  
    function readMigratedText(primaryKey, legacyKey) {
      const primary = local.get(primaryKey);
      if (primary !== null || !legacyKey) return primary;
      if (blockedDatasetKeys.has(String(primaryKey))) return null;
      const legacy = local.get(legacyKey);
      if (legacy === null) return null;
      if (
        results.isOk(
          local.set(primaryKey, legacy, {
            context: "Could not migrate stored app data",
            userMessage: "Stored app data could not be migrated.",
          }),
        )
      ) {
        local.remove(legacyKey);
      }
      return legacy;
    }
  
    const datasets = {
      format: DATASET_FORMAT,
      parseText: parseDatasetText,
      readMigratedText,
      read(primaryKey, legacyKey, fallbackValue = null, options = {}) {
        const storageKey = String(primaryKey || "");
        const saved = readMigratedText(primaryKey, legacyKey);
        const envelope = saved
          ? parseDatasetText(saved, fallbackValue)
          : {
              data: fallbackValue,
              revision: 0,
              updatedAt: "",
              schemaVersion: 1,
              isRevisioned: false,
            };
        const schemaName = String(options.schema || "");
        let canonicalData = envelope.data;
        try {
          canonicalData = prepareCanonicalDataset(schemaName, envelope.data, {
            fromVersion: envelope.schemaVersion,
            scope: options.scope,
            dropInvalidReferences: true,
          });
        } catch (error) {
          blockedDatasetKeys.set(storageKey, error?.message || "Stored data could not be prepared.");
          throw error;
        }
        const result = validateSchema(schemaName, canonicalData, "read");
        if (!result.ok) {
          const error = schemaError(result);
          blockedDatasetKeys.set(storageKey, error.message);
          throw error;
        }
        return {
          ...envelope,
          data: canonicalData,
          schemaVersion: canonicalVersion(schemaName),
          migrated:
            canonicalData !== envelope.data ||
            envelope.schemaVersion !== canonicalVersion(schemaName),
        };
      },
      readData(primaryKey, legacyKey, fallbackValue = null, options = {}) {
        return datasets.read(primaryKey, legacyKey, fallbackValue, options).data;
      },
      write(key, value, options = {}) {
        const storageKey = String(key || "");
        if (blockedDatasetKeys.has(storageKey)) {
          const reason =
            blockedDatasetKeys.get(storageKey) ||
            "Stored data is damaged and could not be recovered.";
          return reportStorageFailure(
            failureResult(FAILURE_CODES.CORRUPT_DATASET_BLOCKED, new Error(reason), {
              context: options.context || "Could not save app data",
              userMessage:
                options.blockedUserMessage || USER_MESSAGES[FAILURE_CODES.CORRUPT_DATASET_BLOCKED],
            }),
          );
        }
  
        const schemaName = String(options.schema || "");
        let canonicalValue = value;
        try {
          canonicalValue = prepareCanonicalDataset(schemaName, value, {
            fromVersion: canonicalVersion(schemaName),
            scope: options.scope,
          });
        } catch (error) {
          return reportStorageFailure(
            failureResult(FAILURE_CODES.SCHEMA_INVALID, error, {
              context: options.context || "Could not save app data",
              userMessage:
                options.schemaUserMessage ||
                error?.userMessage ||
                USER_MESSAGES[FAILURE_CODES.SCHEMA_INVALID],
            }),
          );
        }
        const schemaResult = validateSchema(schemaName, canonicalValue, "write");
        if (!schemaResult.ok) {
          return reportStorageFailure(
            failureResult(FAILURE_CODES.SCHEMA_INVALID, schemaError(schemaResult), {
              context: options.context || "Could not save app data",
              userMessage: options.schemaUserMessage || USER_MESSAGES[FAILURE_CODES.SCHEMA_INVALID],
            }),
          );
        }
  
        let previousRevision = 0;
        try {
          const existing = local.get(storageKey);
          if (existing) previousRevision = parseDatasetText(existing, null).revision;
        } catch (error) {}
  
        const envelope = {
          format: DATASET_FORMAT,
          revision: previousRevision + 1,
          updatedAt: new Date().toISOString(),
          schemaVersion: canonicalVersion(schemaName),
          data: canonicalValue,
        };
        const saved = local.set(storageKey, JSON.stringify(envelope), {
          context: options.context || "Could not save app data",
          failureMessages: options.failureMessages,
        });
        if (!saved.ok) return saved;
  
        try {
          window.WormholesSnapshots?.noteMeaningfulChange?.(storageKey, envelope.revision);
        } catch (error) {}
        emit("wormholes-dataset-saved", {
          key: storageKey,
          revision: envelope.revision,
          updatedAt: envelope.updatedAt,
          schemaVersion: envelope.schemaVersion,
        });
        return successResult({
          key: storageKey,
          revision: envelope.revision,
          updatedAt: envelope.updatedAt,
          schemaVersion: envelope.schemaVersion,
          data: canonicalValue,
        });
      },
      remove(primaryKey, legacyKey) {
        const primaryRemoved = local.remove(primaryKey);
        if (legacyKey) local.remove(legacyKey);
        return primaryRemoved;
      },
      block(key, reason = "Stored data is damaged and could not be recovered.") {
        if (key)
          blockedDatasetKeys.set(
            String(key),
            String(reason || "Stored data is damaged and could not be recovered."),
          );
      },
      unblock(key) {
        if (key) blockedDatasetKeys.delete(String(key));
      },
      isBlocked(key) {
        return blockedDatasetKeys.has(String(key || ""));
      },
      blockReason(key) {
        return blockedDatasetKeys.get(String(key || "")) || "";
      },
      createRepository(config = {}) {
        const keyFor =
          typeof config.keyFor === "function" ? config.keyFor : () => String(config.key || "");
        const legacyKeyFor =
          typeof config.legacyKeyFor === "function"
            ? config.legacyKeyFor
            : () => String(config.legacyKey || "");
        const schemaName = String(config.schema || "");
        const fallbackFor = (scope) =>
          typeof config.fallback === "function" ? config.fallback(scope) : config.fallback;
        return Object.freeze({
          schema: schemaName,
          key(scope) {
            return keyFor(scope);
          },
          legacyKey(scope) {
            return legacyKeyFor(scope) || "";
          },
          read(scope, fallbackValue) {
            const fallback = arguments.length > 1 ? fallbackValue : fallbackFor(scope);
            return datasets.readData(keyFor(scope), legacyKeyFor(scope), fallback, {
              schema: schemaName,
              scope,
            });
          },
          readEnvelope(scope, fallbackValue) {
            const fallback = arguments.length > 1 ? fallbackValue : fallbackFor(scope);
            return datasets.read(keyFor(scope), legacyKeyFor(scope), fallback, {
              schema: schemaName,
              scope,
            });
          },
          save(scope, value, overrides = {}) {
            const saved = datasets.write(keyFor(scope), value, {
              schema: schemaName,
              context: overrides.context || config.context,
              userMessage: overrides.userMessage || config.userMessage,
              blockedUserMessage: overrides.blockedUserMessage || config.blockedUserMessage,
              schemaUserMessage: overrides.schemaUserMessage || config.schemaUserMessage,
              failureMessages: overrides.failureMessages || config.failureMessages,
              scope,
            });
            if (saved.ok && legacyKeyFor(scope)) local.remove(legacyKeyFor(scope));
            if (saved.ok && typeof config.onSaved === "function")
              config.onSaved(scope, saved.data ?? value);
            return saved;
          },
          remove(scope) {
            return datasets.remove(keyFor(scope), legacyKeyFor(scope));
          },
          block(scope, reason) {
            datasets.block(keyFor(scope), reason);
          },
          unblock(scope) {
            datasets.unblock(keyFor(scope));
          },
          isBlocked(scope) {
            return datasets.isBlocked(keyFor(scope));
          },
        });
      },
    };
  
    function largeDataBackend() {
      return window.WormholesLargeDataStore || null;
    }
  
    const largeData = {
      get supported() {
        return !!largeDataBackend()?.supported;
      },
      get unavailableReason() {
        return largeDataBackend()?.unavailableReason || "";
      },
      ready() {
        return largeDataBackend()?.ready?.() ?? Promise.resolve(false);
      },
      status() {
        return (
          largeDataBackend()?.status?.() || {supported: false, reason: "IndexedDB is unavailable."}
        );
      },
      put(key, value) {
        const storageKey = String(key || "");
        if (!storageKey) return Promise.reject(new TypeError("A storage key is required."));
        if (typeof value !== "string")
          return Promise.reject(new TypeError("Large persisted payloads must be strings."));
        const backend = largeDataBackend();
        if (!backend?.put) return Promise.reject(new Error("IndexedDB is unavailable."));
        return backend.put(storageKey, value);
      },
      async get(key) {
        const backend = largeDataBackend();
        if (!backend?.get) return "";
        const value = await backend.get(key);
        if (value === "" || value === undefined || value === null) return "";
        if (typeof value !== "string")
          throw new TypeError("Large persisted payloads must be strings.");
        return value;
      },
      async inspect(key) {
        const backend = largeDataBackend();
        if (!backend?.inspect)
          return {
            status: "unavailable",
            key: String(key || ""),
            value: undefined,
            updatedAt: "",
            reason: "IndexedDB is unavailable.",
          };
        const result = await backend.inspect(key);
        if (result?.status === "found" && typeof result.value !== "string") {
          return {
            ...result,
            status: "invalid",
            reason: "The stored payload has an unexpected type.",
          };
        }
        return result;
      },
      delete(key) {
        const backend = largeDataBackend();
        if (!backend?.del) return Promise.resolve(false);
        return backend.del(key);
      },
      deletePrefix(prefix) {
        const backend = largeDataBackend();
        if (!backend?.deletePrefix) return Promise.resolve(0);
        return backend.deletePrefix(prefix);
      },
      clearAll() {
        const backend = largeDataBackend();
        if (!backend?.clearAll) return Promise.resolve(false);
        return backend.clearAll();
      },
      estimatePrefixBytes(prefixes) {
        const backend = largeDataBackend();
        if (!backend?.estimatePrefixBytes) return Promise.resolve(0);
        return backend.estimatePrefixBytes(prefixes);
      },
    };
  
    function register(name, repository) {
      if (!name || !repository) throw new Error("Repository name and implementation are required.");
      appRepositories[String(name)] = repository;
      return repository;
    }
  
    function get(name) {
      return appRepositories[String(name)] || null;
    }
  
    const api = Object.freeze({
      results,
      local,
      preferences,
      datasets,
      schema: schemaLayer(),
      canonical: canonicalLayer(),
      largeData,
      app: appRepositories,
      register,
      get,
    });
    window.WormholesRepositories = api;
    return api;
  }
  
  const repositories = typeof window !== "undefined" ? installPersistenceRepositories() : null;
})();

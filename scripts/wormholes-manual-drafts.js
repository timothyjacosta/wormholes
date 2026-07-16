/* GENERATED from scripts/modules/manual-drafts.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    const STORAGE_KEY = "wormholesManualCreationDrafts";
    const STORE_VERSION = 1;
    const FORM_TYPE = "manual-creation";
    const FIELD_LIMITS = Object.freeze({
      manualTitle: 500,
      manualWhat: 200,
      manualWhatCustom: 200,
      manualAttr1: 200,
      manualAttr1Custom: 200,
      manualAttr2: 200,
      manualAttr2Custom: 200,
      manualStory: 200,
      manualStoryCustom: 200,
    });
    const FIELD_IDS = Object.freeze(Object.keys(FIELD_LIMITS));
  
    function emptyStore() {
      return {version: STORE_VERSION, drafts: {}};
    }
  
    function cleanId(value) {
      return String(value || "")
        .trim()
        .slice(0, 500);
    }
  
    function sanitizeFields(fields) {
      const source = fields && typeof fields === "object" && !Array.isArray(fields) ? fields : {};
      const clean = {};
      FIELD_IDS.forEach((id) => {
        clean[id] = String(source[id] || "").slice(0, FIELD_LIMITS[id]);
      });
      return clean;
    }
  
    function fieldsHaveData(fields) {
      return FIELD_IDS.some((id) => String(fields?.[id] || "").trim() !== "");
    }
  
    function normalizeDraft(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const fields = sanitizeFields(value.fields);
      if (!fieldsHaveData(fields)) return null;
      const parsedTime = Date.parse(value.updatedAt || "");
      return {
        fields,
        updatedAt: Number.isFinite(parsedTime)
          ? new Date(parsedTime).toISOString()
          : new Date().toISOString(),
      };
    }
  
    function normalizeStore(value) {
      const normalized = emptyStore();
      if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;
      const sourceDrafts =
        value.drafts && typeof value.drafts === "object" && !Array.isArray(value.drafts)
          ? value.drafts
          : {};
  
      Object.entries(sourceDrafts).forEach(([rawUniverseId, formRecords]) => {
        const universeId = cleanId(rawUniverseId);
        if (
          !universeId ||
          !formRecords ||
          typeof formRecords !== "object" ||
          Array.isArray(formRecords)
        )
          return;
        const manualDraft = normalizeDraft(formRecords[FORM_TYPE]);
        if (manualDraft) normalized.drafts[universeId] = {[FORM_TYPE]: manualDraft};
      });
      return normalized;
    }
  
    function localRepository() {
      return globalThis.WormholesRepositories?.local || null;
    }
  
    function readStore() {
      try {
        const raw =
          localRepository()?.get?.(STORAGE_KEY) ?? globalThis.localStorage?.getItem?.(STORAGE_KEY);
        if (!raw) return emptyStore();
        return normalizeStore(JSON.parse(raw));
      } catch (error) {
        try {
          if (localRepository()) localRepository().remove(STORAGE_KEY);
          else globalThis.localStorage?.removeItem?.(STORAGE_KEY);
        } catch (removeError) {}
        if (typeof globalThis.reportAppError === "function") {
          globalThis.reportAppError("Could not read unfinished manual-creation drafts", error, {
            userMessage: "An unreadable unfinished creation draft was discarded.",
          });
        }
        return emptyStore();
      }
    }
  
    function writeStore(store) {
      const normalized = normalizeStore(store);
      try {
        if (Object.keys(normalized.drafts).length === 0) {
          return (
            localRepository()?.remove?.(STORAGE_KEY) ??
            (globalThis.localStorage?.removeItem?.(STORAGE_KEY), true)
          );
        }
        const serialized = JSON.stringify(normalized);
        const repository = localRepository();
        if (repository?.set) {
          const result = repository.set(STORAGE_KEY, serialized, {
            context: "Could not save unfinished manual-creation draft",
          });
          return result === true || result?.ok === true;
        }
        globalThis.localStorage?.setItem?.(STORAGE_KEY, serialized);
        return true;
      } catch (error) {
        if (typeof globalThis.reportAppError === "function") {
          globalThis.reportAppError("Could not save unfinished manual-creation draft", error, {
            userMessage: "This unfinished creation could not be saved as a local draft.",
          });
        }
        return false;
      }
    }
  
    function getDraft(universeId, formType = FORM_TYPE) {
      const id = cleanId(universeId);
      if (!id || formType !== FORM_TYPE) return null;
      const draft = readStore().drafts[id]?.[FORM_TYPE] || null;
      return draft ? {fields: {...draft.fields}, updatedAt: draft.updatedAt} : null;
    }
  
    function saveDraft(universeId, fields, formType = FORM_TYPE) {
      const id = cleanId(universeId);
      if (!id || formType !== FORM_TYPE) return {ok: false, reason: "missing-universe"};
      const cleanFields = sanitizeFields(fields);
      if (!fieldsHaveData(cleanFields)) {
        return {ok: removeDraft(id, formType), removed: true};
      }
  
      const store = readStore();
      const draft = {fields: cleanFields, updatedAt: new Date().toISOString()};
      store.drafts[id] = {...(store.drafts[id] || {}), [FORM_TYPE]: draft};
      return {
        ok: writeStore(store),
        draft: {fields: {...draft.fields}, updatedAt: draft.updatedAt},
      };
    }
  
    function removeDraft(universeId, formType = FORM_TYPE) {
      const id = cleanId(universeId);
      if (!id || formType !== FORM_TYPE) return false;
      const store = readStore();
      if (!store.drafts[id]?.[FORM_TYPE]) return true;
      delete store.drafts[id][FORM_TYPE];
      if (Object.keys(store.drafts[id]).length === 0) delete store.drafts[id];
      return writeStore(store);
    }
  
    function removeUniverseDrafts(universeId) {
      const id = cleanId(universeId);
      if (!id) return false;
      const store = readStore();
      if (!store.drafts[id]) return true;
      delete store.drafts[id];
      return writeStore(store);
    }
  
    function clearAll() {
      try {
        return (
          localRepository()?.remove?.(STORAGE_KEY) ??
          (globalThis.localStorage?.removeItem?.(STORAGE_KEY), true)
        );
      } catch (error) {
        if (typeof globalThis.reportAppError === "function") {
          globalThis.reportAppError("Could not clear unfinished manual-creation drafts", error, {
            userMessage: "Some unfinished creation drafts could not be cleared.",
          });
        }
        return false;
      }
    }
  
    function prune(validUniverseIds) {
      const valid = new Set(
        (Array.isArray(validUniverseIds) ? validUniverseIds : []).map(cleanId).filter(Boolean),
      );
      const store = readStore();
      let changed = false;
      Object.keys(store.drafts).forEach((universeId) => {
        if (valid.has(universeId)) return;
        delete store.drafts[universeId];
        changed = true;
      });
      return changed ? writeStore(store) : true;
    }
  
    globalThis.WormholesManualDrafts = Object.freeze({
      storageKey: STORAGE_KEY,
      formType: FORM_TYPE,
      fieldIds: FIELD_IDS,
      sanitizeFields,
      fieldsHaveData,
      getDraft,
      saveDraft,
      removeDraft,
      removeUniverseDrafts,
      clearAll,
      prune,
      _readStore: readStore,
    });
    return globalThis.WormholesManualDrafts;
  }
  
  const api = install(globalThis);
})();

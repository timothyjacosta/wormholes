/* GENERATED from scripts/modules/id-integrity.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    const issuedIds = new Set();
    const LABELS = Object.freeze({
      universe: "universe",
      archive: "Archive item",
      literature: "Literature item",
      vision: "Vision Board item",
    });
  
    function canonicalId(value) {
      if (value === undefined || value === null || value === "") return "";
      return String(value);
    }
  
    function labelFor(kind) {
      return LABELS[kind] || "item";
    }
  
    function duplicateResult(kind, id, options = {}) {
      return {
        ok: false,
        kind,
        label: options.label || labelFor(kind),
        duplicateId: canonicalId(id),
        context: options.context || "",
        firstIndex: Number.isInteger(options.firstIndex) ? options.firstIndex : -1,
        duplicateIndex: Number.isInteger(options.duplicateIndex) ? options.duplicateIndex : -1,
      };
    }
  
    function findDuplicateIds(items, kind, options = {}) {
      const seen = new Map();
      const collection = Array.isArray(items) ? items : [];
      for (let index = 0; index < collection.length; index += 1) {
        const id = canonicalId(collection[index]?.id);
        if (!id) continue;
        if (seen.has(id)) {
          return duplicateResult(kind, id, {
            ...options,
            firstIndex: seen.get(id),
            duplicateIndex: index,
          });
        }
        seen.set(id, index);
      }
      return {
        ok: true,
        kind,
        label: options.label || labelFor(kind),
        context: options.context || "",
      };
    }
  
    function dialogCopy(result) {
      const context = result?.context ? ` in “${result.context}”` : "";
      return {
        title: "Duplicate items found",
        text: `This backup contains more than one ${result?.label || "item"} with the same internal ID${context}.`,
        detail:
          "Wormholes could not safely tell those items apart. Nothing was imported. Export a new backup from the source app and try again.",
      };
    }
  
    function closeDialog() {
      document?.getElementById?.("duplicateIdModal")?.classList?.remove?.("open");
    }
  
    function showDialog(result) {
      if (!result || result.ok) return false;
      const copy = dialogCopy(result);
      const modal = document?.getElementById?.("duplicateIdModal");
      const title = document?.getElementById?.("duplicateIdTitle");
      const text = document?.getElementById?.("duplicateIdText");
      const detail = document?.getElementById?.("duplicateIdDetail");
      const closeButton = document?.getElementById?.("closeDuplicateIdBtn");
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
  
    function errorFor(result) {
      const copy = dialogCopy(result);
      const appErrors =
        typeof importedAppErrorsApi !== "undefined"
          ? importedAppErrorsApi
          : window.WormholesAppErrors;
      const error = appErrors?.createError
        ? appErrors.createError("WORMHOLES_DUPLICATE_ID", `${copy.text} ${copy.detail}`, {
            name: "WormholesDuplicateIdError",
            details: result,
          })
        : new Error(`${copy.text} ${copy.detail}`);
      error.name = "WormholesDuplicateIdError";
      error.code = "WORMHOLES_DUPLICATE_ID";
      error.idIntegrityResult = result;
      return error;
    }
  
    function assertUniqueIds(items, kind, options = {}) {
      const result = findDuplicateIds(items, kind, options);
      if (!result.ok) throw errorFor(result);
      return result;
    }
  
    function detailsForUniverse(data, universe) {
      const id = canonicalId(universe?.id);
      if (!id || !data?.universeData || typeof data.universeData !== "object") return {};
      return data.universeData[id] || data.universeData[universe?.id] || {};
    }
  
    function validateAppData(data, options = {}) {
      if (options.allowDuplicateIds) return true;
      const universeList = Array.isArray(data?.universes) ? data.universes : [];
      assertUniqueIds(universeList, "universe", {context: "this backup"});
  
      universeList.forEach((universe) => {
        const title = String(universe?.title || "Untitled Universe");
        const details = detailsForUniverse(data, universe);
        assertUniqueIds(details?.archive, "archive", {context: title});
        assertUniqueIds(details?.literature, "literature", {context: title});
        assertUniqueIds(details?.vision, "vision", {context: title});
      });
      return true;
    }
  
    function liveCollections() {
      const collections = [];
      try {
        if (typeof universes !== "undefined" && Array.isArray(universes)) collections.push(universes);
      } catch (error) {}
      try {
        if (typeof archiveEntries !== "undefined" && Array.isArray(archiveEntries))
          collections.push(archiveEntries);
      } catch (error) {}
      try {
        if (typeof literatureEntries !== "undefined" && Array.isArray(literatureEntries))
          collections.push(literatureEntries);
      } catch (error) {}
      try {
        if (typeof visionEntries !== "undefined" && Array.isArray(visionEntries))
          collections.push(visionEntries);
      } catch (error) {}
      return collections;
    }
  
    function isKnownLiveId(value) {
      const id = canonicalId(value);
      if (!id) return true;
      if (issuedIds.has(id)) return true;
      return liveCollections().some((collection) =>
        collection.some((item) => canonicalId(item?.id) === id),
      );
    }
  
    function claimGeneratedId(value) {
      const id = canonicalId(value);
      if (!id || isKnownLiveId(id)) return false;
      issuedIds.add(id);
      return true;
    }
  
    document?.getElementById?.("closeDuplicateIdBtn")?.addEventListener?.("click", closeDialog);
  
    window.WormholesIdIntegrity = {
      canonicalId,
      duplicateResult,
      findDuplicateIds,
      assertUniqueIds,
      validateAppData,
      showDialog,
      closeDialog,
      errorFor,
      isKnownLiveId,
      claimGeneratedId,
    };
    return window.WormholesIdIntegrity;
  }
  
  const api = install(globalThis);
})();

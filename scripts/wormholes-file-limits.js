/* GENERATED from scripts/modules/file-limits.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    const MIB = 1024 * 1024;
    const LIMITS = Object.freeze({
      appData: Object.freeze({
        label: "Wormholes app-data backup",
        perFileBytes: 256 * MIB,
        batchBytes: 256 * MIB,
      }),
      literature: Object.freeze({
        label: "Literature document",
        perFileBytes: 50 * MIB,
        batchBytes: 200 * MIB,
      }),
      vision: Object.freeze({
        label: "Vision Board image",
        perFileBytes: 75 * MIB,
        batchBytes: 300 * MIB,
      }),
      backupManifest: Object.freeze({
        label: "Wormholes backup manifest",
        perFileBytes: 256 * MIB,
        batchBytes: 256 * MIB,
      }),
      backupCreation: Object.freeze({
        label: "backup creation file",
        perFileBytes: 10 * MIB,
        batchBytes: 512 * MIB,
      }),
      backupLiterature: Object.freeze({
        label: "backup Literature document",
        perFileBytes: 50 * MIB,
        batchBytes: 512 * MIB,
      }),
      backupImage: Object.freeze({
        label: "backup image",
        perFileBytes: 75 * MIB,
        batchBytes: 1024 * MIB,
      }),
    });
  
    function formatBytes(bytes) {
      const value = Math.max(0, Number(bytes) || 0);
      const storageCapacity =
        typeof importedStorageCapacityApi !== "undefined"
          ? importedStorageCapacityApi
          : window.WormholesStorageCapacity;
      if (storageCapacity?.formatBytes) {
        return storageCapacity.formatBytes(value);
      }
      if (value < 1024) return `${Math.round(value)} B`;
      if (value < MIB) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
      if (value < 1024 * MIB) return `${(value / MIB).toFixed(value < 10 * MIB ? 1 : 0)} MB`;
      return `${(value / (1024 * MIB)).toFixed(1)} GB`;
    }
  
    function fileName(file) {
      return String(file?.name || "Selected file");
    }
  
    function limitsFor(kind) {
      return LIMITS[kind] || LIMITS.appData;
    }
  
    function validate(files, kind) {
      const list = Array.from(files || []);
      const limits = limitsFor(kind);
      const oversized = list
        .filter((file) => Math.max(0, Number(file?.size) || 0) > limits.perFileBytes)
        .map((file) => ({name: fileName(file), size: Math.max(0, Number(file?.size) || 0)}));
      const totalBytes = list.reduce((sum, file) => sum + Math.max(0, Number(file?.size) || 0), 0);
      const batchExceeded = list.length > 1 && totalBytes > limits.batchBytes;
      return {
        ok: oversized.length === 0 && !batchExceeded,
        kind,
        label: limits.label,
        files: list,
        oversized,
        totalBytes,
        perFileBytes: limits.perFileBytes,
        batchBytes: limits.batchBytes,
        batchExceeded,
      };
    }
  
    function dialogCopy(result, options = {}) {
      const label = String(options.label || result.label || "file");
      if (result.oversized.length) {
        const first = result.oversized[0];
        const extra =
          result.oversized.length > 1
            ? ` and ${result.oversized.length - 1} other file${result.oversized.length === 2 ? "" : "s"}`
            : "";
        return {
          title: result.oversized.length === 1 ? "File is too large" : "Some files are too large",
          text: `${first.name}${extra} exceeds the ${formatBytes(result.perFileBytes)} limit for a ${label}.`,
          detail:
            "Nothing was imported. Choose a smaller file, reduce its size, or split the content into multiple files.",
        };
      }
      return {
        title: "Selected files are too large",
        text: `This selection totals ${formatBytes(result.totalBytes)}. The maximum for one ${label} selection is ${formatBytes(result.batchBytes)}.`,
        detail: "Nothing was imported. Select fewer files and upload them in smaller batches.",
      };
    }
  
    function closeDialog() {
      document?.getElementById?.("fileSizeLimitModal")?.classList?.remove?.("open");
    }
  
    function showDialog(result, options = {}) {
      if (!result || result.ok) return false;
      const copy = dialogCopy(result, options);
      const modal = document?.getElementById?.("fileSizeLimitModal");
      const title = document?.getElementById?.("fileSizeLimitTitle");
      const text = document?.getElementById?.("fileSizeLimitText");
      const detail = document?.getElementById?.("fileSizeLimitDetail");
      const closeButton = document?.getElementById?.("closeFileSizeLimitBtn");
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
  
    function enforce(files, kind, options = {}) {
      const result = validate(files, kind);
      if (!result.ok && options.showDialog !== false) showDialog(result, options);
      return result;
    }
  
    function errorFor(result, options = {}) {
      const copy = dialogCopy(result, options);
      const appErrors =
        typeof importedAppErrorsApi !== "undefined"
          ? importedAppErrorsApi
          : window.WormholesAppErrors;
      const error = appErrors?.createError
        ? appErrors.createError("WORMHOLES_FILE_TOO_LARGE", `${copy.text} ${copy.detail}`, {
            name: "WormholesFileSizeLimitError",
            details: result,
          })
        : new Error(`${copy.text} ${copy.detail}`);
      error.name = "WormholesFileSizeLimitError";
      error.code = "WORMHOLES_FILE_TOO_LARGE";
      error.fileLimitResult = result;
      return error;
    }
  
    function assertFile(file, kind, options = {}) {
      const result = validate(file ? [file] : [], kind);
      if (!result.ok) throw errorFor(result, options);
      return file;
    }
  
    document?.getElementById?.("closeFileSizeLimitBtn")?.addEventListener?.("click", closeDialog);
  
    window.WormholesFileLimits = {
      MIB,
      limits: LIMITS,
      formatBytes,
      limitsFor,
      validate,
      enforce,
      showDialog,
      closeDialog,
      errorFor,
      assertFile,
    };
    return window.WormholesFileLimits;
  }
  
  const api = install(globalThis);
})();

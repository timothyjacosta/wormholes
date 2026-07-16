/* GENERATED from scripts/modules/storage-capacity.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    const MIB = 1024 * 1024;
    const LARGE_LITERATURE_THRESHOLD_BYTES = 512 * 1024;
    const MIN_OPERATION_OVERHEAD_BYTES = 256 * 1024;
    let pendingDecision = null;
    let lowStorageSnapshotNoticeShown = false;
  
    function byteLength(text) {
      const value = String(text ?? "");
      try {
        if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).byteLength;
      } catch (error) {}
      try {
        if (typeof Blob !== "undefined") return new Blob([value]).size;
      } catch (error) {}
      return unescape(encodeURIComponent(value)).length;
    }
  
    function jsonByteLength(value) {
      try {
        return byteLength(JSON.stringify(value ?? null));
      } catch (error) {
        return 0;
      }
    }
  
    function formatBytes(bytes) {
      const value = Math.max(0, Number(bytes) || 0);
      if (value < 1024) return `${Math.round(value)} B`;
      if (value < MIB) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
      if (value < 1024 * MIB) return `${(value / MIB).toFixed(value < 10 * MIB ? 1 : 0)} MB`;
      return `${(value / (1024 * MIB)).toFixed(1)} GB`;
    }
  
    function safetyReserveForQuota(quota) {
      const normalizedQuota = Math.max(0, Number(quota) || 0);
      if (!normalizedQuota) return 0;
      return Math.min(normalizedQuota * 0.25, Math.max(8 * MIB, normalizedQuota * 0.1));
    }
  
    function classifyEstimate(estimate = {}, requiredBytes = 0) {
      const quota = Number(estimate.quota);
      const usage = Number(estimate.usage);
      const required = Math.max(0, Math.ceil(Number(requiredBytes) || 0));
      if (!Number.isFinite(quota) || quota <= 0 || !Number.isFinite(usage) || usage < 0) {
        return {
          status: "unknown",
          quota: 0,
          usage: 0,
          available: 0,
          requiredBytes: required,
          reserveBytes: 0,
          afterBytes: 0,
        };
      }
      const available = Math.max(0, quota - usage);
      const reserveBytes = safetyReserveForQuota(quota);
      const afterBytes = available - required;
      const status =
        required > available || afterBytes < 0
          ? "block"
          : afterBytes < reserveBytes || required > available * 0.75
            ? "warn"
            : "safe";
      return {status, quota, usage, available, requiredBytes: required, reserveBytes, afterBytes};
    }
  
    async function estimateBrowserStorage() {
      try {
        if (!navigator?.storage?.estimate) return null;
        const result = await navigator.storage.estimate();
        if (
          !result ||
          !Number.isFinite(Number(result.quota)) ||
          !Number.isFinite(Number(result.usage))
        )
          return null;
        return {quota: Number(result.quota), usage: Number(result.usage)};
      } catch (error) {
        return null;
      }
    }
  
    function operationMessage(result, options = {}) {
      const operation = String(options.operationLabel || "this operation");
      const required = formatBytes(result.requiredBytes);
      const available = formatBytes(result.available);
      if (result.status === "block") {
        return {
          title: "Not enough browser storage",
          text: `Wormholes estimates that ${operation} may need about ${required}, but only about ${available} is currently available.`,
          detail:
            "Nothing was changed. Free browser storage, remove unneeded large images or restore points, connect a local folder where applicable, or try a smaller operation.",
        };
      }
      return {
        title: "Browser storage is running low",
        text: `Wormholes estimates that ${operation} may need about ${required}. About ${available} is currently available.`,
        detail: `The operation should fit, but it may leave less than the recommended ${formatBytes(result.reserveBytes)} safety reserve for autosaves, Undo, and restore points.`,
      };
    }
  
    function closeCapacityModal(approved) {
      const modal = document?.getElementById?.("storageCapacityPreflightModal");
      modal?.classList?.remove?.("open");
      const pending = pendingDecision;
      pendingDecision = null;
      if (pending) pending.resolve(!!approved);
    }
  
    function showCapacityModal(result, options = {}) {
      const modal = document?.getElementById?.("storageCapacityPreflightModal");
      const title = document?.getElementById?.("storageCapacityPreflightTitle");
      const text = document?.getElementById?.("storageCapacityPreflightText");
      const detail = document?.getElementById?.("storageCapacityPreflightDetail");
      const continueButton = document?.getElementById?.("continueStorageCapacityBtn");
      const cancelButton = document?.getElementById?.("cancelStorageCapacityBtn");
      const copy = operationMessage(result, options);
  
      if (!modal || !title || !text || !detail || !cancelButton) {
        if (result.status === "block") {
          try {
            window.alert?.(`${copy.title}\n\n${copy.text}\n\n${copy.detail}`);
          } catch (error) {}
          return Promise.resolve(false);
        }
        try {
          return Promise.resolve(
            window.confirm?.(
              `${copy.title}\n\n${copy.text}\n\n${copy.detail}\n\nContinue anyway?`,
            ) !== false,
          );
        } catch (error) {
          return Promise.resolve(false);
        }
      }
  
      if (pendingDecision) pendingDecision.resolve(false);
      title.textContent = copy.title;
      text.textContent = copy.text;
      detail.textContent = copy.detail;
      cancelButton.textContent = result.status === "block" ? "Close" : "Cancel";
      if (continueButton) {
        continueButton.hidden = result.status === "block";
        continueButton.disabled = result.status === "block";
        continueButton.textContent = options.continueLabel || "Continue";
      }
      modal.classList.add("open");
  
      return new Promise((resolve) => {
        pendingDecision = {resolve};
        setTimeout(
          () =>
            (result.status === "block" ? cancelButton : continueButton || cancelButton)?.focus?.(),
          0,
        );
      });
    }
  
    async function preflight(options = {}) {
      const requiredBytes = Math.max(0, Math.ceil(Number(options.requiredBytes) || 0));
      if (!requiredBytes) return {approved: true, status: "safe", requiredBytes: 0};
      const estimate = await estimateBrowserStorage();
      if (!estimate) return {approved: true, status: "unknown", requiredBytes};
  
      const result = classifyEstimate(estimate, requiredBytes);
      if (result.status === "safe" || result.status === "unknown") return {...result, approved: true};
  
      const mode = options.mode || "interactive";
      if (mode === "silent-allow" && result.status === "warn") return {...result, approved: true};
      if (mode === "silent-skip") {
        if (options.notifyOnSkip && !lowStorageSnapshotNoticeShown) {
          lowStorageSnapshotNoticeShown = true;
          try {
            window.showSavedToast?.(
              "Work saved · restore point skipped because browser storage is low",
            );
          } catch (error) {}
        }
        return {...result, approved: false};
      }
      if (result.status === "block" && mode === "silent-allow") return {...result, approved: false};
  
      const approved = await showCapacityModal(result, options);
      return {...result, approved};
    }
  
    function estimateAppDataOperationBytes(importData, currentData = null) {
      const importedBytes = jsonByteLength(importData);
      const currentBytes = currentData ? jsonByteLength(currentData) : 0;
      return Math.ceil(importedBytes * 1.6 + currentBytes * 1.2 + 2 * MIB);
    }
  
    function estimateSnapshotBytes(exportData) {
      return Math.ceil(jsonByteLength(exportData) * 1.2 + MIN_OPERATION_OVERHEAD_BYTES);
    }
  
    function estimateFileBatchBytes(files, options = {}) {
      const total = Array.from(files || []).reduce(
        (sum, file) => sum + Math.max(0, Number(file?.size) || 0),
        0,
      );
      const kind = options.kind || "generic";
      if (kind === "vision") {
        const multiplier = options.folderBacked ? 0.3 : 1.85;
        return Math.ceil(total * multiplier + MIB);
      }
      if (kind === "literature") return Math.ceil(total * 2.5 + MIB);
      return Math.ceil(total * 1.5 + MIB);
    }
  
    function estimateLiteratureSaveBytes(content, previousContent = "") {
      const nextBytes = byteLength(content || "");
      const previousBytes = byteLength(previousContent || "");
      const growth = Math.max(0, nextBytes - previousBytes);
      return Math.ceil(Math.max(growth * 2, nextBytes * 1.5) + MIN_OPERATION_OVERHEAD_BYTES);
    }
  
    function installModalHandlers() {
      document
        ?.getElementById?.("cancelStorageCapacityBtn")
        ?.addEventListener?.("click", () => closeCapacityModal(false));
      document
        ?.getElementById?.("continueStorageCapacityBtn")
        ?.addEventListener?.("click", () => closeCapacityModal(true));
    }
  
    installModalHandlers();
  
    window.WormholesStorageCapacity = {
      largeLiteratureThresholdBytes: LARGE_LITERATURE_THRESHOLD_BYTES,
      byteLength,
      jsonByteLength,
      formatBytes,
      safetyReserveForQuota,
      classifyEstimate,
      estimateBrowserStorage,
      estimateAppDataOperationBytes,
      estimateSnapshotBytes,
      estimateFileBatchBytes,
      estimateLiteratureSaveBytes,
      preflight,
      closeCapacityModal,
    };
    return window.WormholesStorageCapacity;
  }
  
  const api = install(globalThis);
})();

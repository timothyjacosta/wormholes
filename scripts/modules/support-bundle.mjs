/* Wormholes Beta 301 privacy-safe support report.
   Creates a small diagnostics file without exporting creative content, file contents,
   folder names, paths, URLs, or raw activity messages. */
const supportBundleModuleApi = (function (global) {
  const document = global.document;
  const SUPPORT_REPORT_FORMAT = "wormholes-support-report";
  const SUPPORT_REPORT_VERSION = 1;
  const MAX_LOG_ITEMS = 80;
  const SAFE_DOWNLOAD_ATTR = "data-wormholes-safe-download";
  let returnOpener = null;
  let currentReport = null;

  function metaValue(name) {
    const value =
      document?.querySelector?.(`meta[name="${name}"]`)?.getAttribute?.("content") || "";
    const text = String(value).trim();
    return text && !text.includes("$Format:") ? text : "";
  }

  function buildInfo() {
    const titleMatch = String(document?.title || "").match(/Wormholes Beta \d+/i);
    return {
      version: metaValue("wormholes-build-version") || titleMatch?.[0] || "Wormholes",
      layout: metaValue("wormholes-layout-mode") || "Desktop only — fluid window",
      buildId: metaValue("wormholes-build-id") || "Local copy",
      sourceCommit: metaValue("wormholes-build-commit") || "Local copy",
      builtAt: metaValue("wormholes-build-timestamp") || "Local copy",
    };
  }

  function browserName() {
    const ua = String(global.navigator?.userAgent || "");
    const brands = global.navigator?.userAgentData?.brands;
    if (Array.isArray(brands)) {
      const preferred = brands.find((item) => !/not[\s_-]?a[\s_-]?brand/i.test(item?.brand || ""));
      if (preferred?.brand) return `${preferred.brand} ${preferred.version || ""}`.trim();
    }
    const patterns = [
      [/Firefox\/(\d+)/i, "Firefox"],
      [/Edg\/(\d+)/i, "Edge"],
      [/Chrome\/(\d+)/i, "Chrome"],
      [/Version\/(\d+).+Safari/i, "Safari"],
    ];
    for (const [pattern, label] of patterns) {
      const match = ua.match(pattern);
      if (match) return `${label} ${match[1]}`;
    }
    return "Unknown browser";
  }

  function platformName() {
    return String(
      global.navigator?.userAgentData?.platform || global.navigator?.platform || "Unknown",
    ).slice(0, 80);
  }

  function storageAvailable() {
    try {
      const key = "__wormholes_support_storage_test__";
      global.localStorage?.setItem?.(key, "1");
      global.localStorage?.removeItem?.(key);
      return true;
    } catch {
      return false;
    }
  }

  function localFolderSupported() {
    try {
      const service = global.controllerServices || global;
      if (typeof service.localFolderApiSupported === "function")
        return !!service.localFolderApiSupported();
    } catch {
      return false;
    }
    return (
      typeof global.showDirectoryPicker === "function" || !!global.navigator?.storage?.getDirectory
    );
  }

  function activeStorageMode() {
    return global.localFoldersEnabled === true ? "Browser and local folder" : "Browser only";
  }

  async function persistentStorageState() {
    try {
      if (typeof global.navigator?.storage?.persisted !== "function") return "Not reported";
      return (await global.navigator.storage.persisted()) ? "Granted" : "Not granted";
    } catch {
      return "Not reported";
    }
  }

  function eventCategory(item) {
    const text =
      `${item?.type || ""} ${item?.message || ""} ${item?.detail?.title || ""}`.toLowerCase();
    const rules = [
      [/(storage|quota|indexeddb|database)/, "storage"],
      [/(folder|permission|sync)/, "local-folder"],
      [/(import|restore)/, "import"],
      [/(export|backup)/, "export"],
      [/(recover|snapshot|corrupt|damage)/, "recovery"],
      [/(literature|document)/, "literature"],
      [/(vision|image)/, "vision-board"],
      [/(bridge|connection|connect)/, "connections"],
      [/(universe)/, "universe"],
      [/(archive|creation)/, "archive"],
      [/(generate|roll)/, "generator"],
      [/(undo)/, "undo"],
    ];
    for (const [pattern, category] of rules) if (pattern.test(text)) return category;
    return item?.type === "error" ? "app-error" : "app-event";
  }

  function safeErrorCode(item) {
    const technical = item?.detail?.technical;
    if (!technical || typeof technical !== "object") return "";
    for (const [key, value] of Object.entries(technical)) {
      if (!/(^|_)(code|name|error)$/i.test(String(key))) continue;
      const text = String(value || "").trim();
      if (/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(text)) return text;
    }
    return "";
  }

  function sanitizeActivityLog(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(-MAX_LOG_ITEMS).map((item) => {
      const type = ["action", "toast", "error", "undo", "system"].includes(item?.type)
        ? item.type
        : "notice";
      const result = {
        time: Number.isFinite(Date.parse(item?.time))
          ? new Date(item.time).toISOString()
          : "Unknown",
        type,
        category: eventCategory(item),
        hasDetails: !!item?.detail,
      };
      const code = safeErrorCode(item);
      if (code) result.errorCode = code;
      return result;
    });
  }

  function schemaInfo() {
    const schema = global.WormholesSchemaVersions;
    const storage = global.WormholesStorageFacade || global.controllerServices || global;
    let stored = 0;
    try {
      if (typeof storage.readStoredSchemaVersion === "function")
        stored = Number(storage.readStoredSchemaVersion() || 0);
    } catch {
      stored = 0;
    }
    return {
      appDataCurrent: Number(schema?.current || 0),
      appDataSupported: Array.isArray(schema?.supported) ? schema.supported.map(Number) : [],
      storedAppDataVersion: stored,
      supportReportVersion: SUPPORT_REPORT_VERSION,
    };
  }

  function safeConfiguration() {
    let skipAnimation = false;
    try {
      skipAnimation = global.localStorage?.getItem?.("wormholesSkipRollAnimation") === "true";
    } catch {
      skipAnimation = false;
    }
    return {
      runtime: global.location?.protocol === "file:" ? "Direct file" : "Served",
      language: String(global.navigator?.language || "Unknown").slice(0, 30),
      reducedMotion: !!global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
      skipRollAnimation: skipAnimation,
      localFolderEnabled: global.localFoldersEnabled === true,
      localFolderSupported: localFolderSupported(),
      indexedDbSupported: !!global.indexedDB,
      largeDataStoreSupported: !!global.WormholesLargeDataStore?.supported,
    };
  }

  async function createSupportReport() {
    const logItems = global.WormholesActivityLog?.state?.items || [];
    return {
      format: SUPPORT_REPORT_FORMAT,
      formatVersion: SUPPORT_REPORT_VERSION,
      createdAt: new Date().toISOString(),
      privacy: {
        creativeContentIncluded: false,
        note: "This report does not include universes, creations, Literature, images, imported files, folder names, paths, or URLs.",
      },
      build: buildInfo(),
      environment: {
        browser: browserName(),
        platform: platformName(),
      },
      storage: {
        activeMode: activeStorageMode(),
        browserStorageAvailable: storageAvailable(),
        persistentStorage: await persistentStorageState(),
        largeData: global.WormholesLargeDataStore?.supported
          ? "IndexedDB with browser fallback"
          : "Browser fallback",
      },
      configuration: safeConfiguration(),
      schemas: schemaInfo(),
      logs: sanitizeActivityLog(logItems),
    };
  }

  function supportReportFileName() {
    const stamp = new Date()
      .toISOString()
      .replace(/[:]/g, "-")
      .replace(/\.\d{3}Z$/, "Z");
    return `Wormholes_Support_Report_${stamp}.json`;
  }

  function setDownloadEnabled(enabled) {
    const download = document?.getElementById?.("downloadSupportReportBtn");
    if (!download) return;
    const setDisabled =
      global.controllerServices?.setAppButtonDisabled || global.setAppButtonDisabled;
    if (typeof setDisabled === "function") setDisabled(download, !enabled);
    else {
      download.disabled = !enabled;
      if (enabled) {
        download.removeAttribute?.("disabled");
        download.removeAttribute?.("aria-disabled");
        download.tabIndex = 0;
      }
    }
  }

  function renderPreview(report) {
    const preview = document?.getElementById?.("supportReportPreview");
    if (preview) preview.textContent = JSON.stringify(report, null, 2);
    setDownloadEnabled(!!report);
    return report;
  }

  async function openSupportReport(event) {
    const modal = document?.getElementById?.("supportReportModal");
    if (!modal) return null;
    returnOpener = event?.currentTarget || document.activeElement || null;
    if (typeof global.toggleSettingsMenu === "function") global.toggleSettingsMenu(false);
    const status = document.getElementById("supportReportStatus");
    if (status) status.textContent = "Preparing report…";
    const preview = document.getElementById("supportReportPreview");
    if (preview) preview.textContent = "Preparing report…";
    modal.classList.add("open");
    setDownloadEnabled(false);
    currentReport = await createSupportReport();
    renderPreview(currentReport);
    if (status)
      status.textContent = "Review the report below, then download it when you are ready.";
    setTimeout(() => document.getElementById("downloadSupportReportBtn")?.focus(), 0);
    return currentReport;
  }

  function closeSupportReport(options = {}) {
    document?.getElementById?.("supportReportModal")?.classList.remove("open");
    const opener = returnOpener;
    returnOpener = null;
    currentReport = null;
    if (options.returnToSettings !== false && typeof global.toggleSettingsMenu === "function") {
      global.toggleSettingsMenu(true);
    }
    setTimeout(() => opener?.focus?.(), 0);
  }

  function downloadReport(report = currentReport) {
    if (
      !report ||
      !document?.body ||
      typeof global.Blob !== "function" ||
      !global.URL?.createObjectURL
    )
      return false;
    const blob = new Blob([JSON.stringify(report, null, 2)], {type: "application/json"});
    const url = global.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = supportReportFileName();
    link.rel = "noopener";
    link.style.display = "none";
    link.setAttribute(SAFE_DOWNLOAD_ATTR, "true");
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      global.URL.revokeObjectURL(url);
    }, 1000);
    const status = document.getElementById("supportReportStatus");
    if (status) status.textContent = "Support report downloaded.";
    global.WormholesActivityLog?.recordAction?.("Exported support report");
    return true;
  }

  function install() {
    document?.getElementById?.("supportReportBtn")?.addEventListener("click", openSupportReport);
    document
      ?.getElementById?.("closeSupportReportBtn")
      ?.addEventListener("click", closeSupportReport);
    document
      ?.getElementById?.("downloadSupportReportBtn")
      ?.addEventListener("click", () => downloadReport());
  }

  if (document) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", install, {once: true});
    else install();
  }

  const api = Object.freeze({
    format: SUPPORT_REPORT_FORMAT,
    version: SUPPORT_REPORT_VERSION,
    buildInfo,
    browserName,
    platformName,
    sanitizeActivityLog,
    schemaInfo,
    safeConfiguration,
    createSupportReport,
    supportReportFileName,
    setDownloadEnabled,
    renderPreview,
    open: openSupportReport,
    close: closeSupportReport,
    download: downloadReport,
  });
  global.WormholesSupportReport = api;
  return api;
})(globalThis.window || globalThis);

export {supportBundleModuleApi as api};
export default supportBundleModuleApi;

import importedStorageFacadeApi from "./storage-facade.mjs";
import importedSnapshotsApi from "./recovery-snapshots.mjs";
import importedStorageCapacityApi from "./storage-capacity.mjs";
import {controllerServices as importedControllerServices} from "./controller-service-registry.mjs";

/* Wormholes Beta 252 storage-usage dashboard.
   Expands the compact Settings counter into an on-demand, read-only breakdown
   without adding continuous storage scans to normal app use. */
(function () {
  const storageApi =
    typeof importedStorageFacadeApi !== "undefined"
      ? importedStorageFacadeApi
      : globalThis.WormholesStorageFacade || globalThis;
  const snapshotsApi =
    typeof importedSnapshotsApi !== "undefined"
      ? importedSnapshotsApi
      : globalThis.WormholesSnapshots;
  const storageCapacityApi =
    typeof importedStorageCapacityApi !== "undefined"
      ? importedStorageCapacityApi
      : globalThis.WormholesStorageCapacity;
  const services =
    typeof importedControllerServices !== "undefined"
      ? importedControllerServices
      : globalThis.controllerServices || globalThis;
  const CATEGORY_KEYS = Object.freeze({
    creations: "creations",
    literature: "literature",
    images: "images",
    other: "other",
  });

  let dashboardOpener = null;
  let renderToken = 0;

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function bytesForText(value) {
    if (typeof storageApi.storageByteSize === "function") return storageApi.storageByteSize(value);
    try {
      return new Blob([String(value ?? "")]).size;
    } catch (error) {
      return String(value ?? "").length;
    }
  }

  function formatBytes(value) {
    if (typeof storageApi.formatStorageBytes === "function")
      return storageApi.formatStorageBytes(value);
    if (storageCapacityApi?.formatBytes) return storageCapacityApi.formatBytes(value);
    return `${Math.max(0, Math.round(Number(value) || 0))} B`;
  }

  function classifyLocalStorageKey(key) {
    const value = String(key || "");
    if (
      /UniverseArchive:|UniverseConnectionNotes:|BridgeNotes$|GeneratorArchive$|ConnectionNotes$/i.test(
        value,
      )
    ) {
      return CATEGORY_KEYS.creations;
    }
    if (/UniverseLiterature:/i.test(value)) return CATEGORY_KEYS.literature;
    if (/UniverseVisionBoard:/i.test(value)) return CATEGORY_KEYS.images;
    return CATEGORY_KEYS.other;
  }

  function appStorageKeys() {
    const repository =
      typeof storageApi.repositoryLayer === "function" ? storageApi.repositoryLayer()?.local : null;
    try {
      if (repository?.keys) return repository.keys();
      return Array.from({length: localStorage.length}, (_, index) =>
        localStorage.key(index),
      ).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function localStorageValue(key) {
    const repository =
      typeof storageApi.repositoryLayer === "function" ? storageApi.repositoryLayer()?.local : null;
    try {
      return repository ? repository.get(key) : localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function localStorageBreakdown() {
    const result = {creations: 0, literature: 0, images: 0, other: 0};
    appStorageKeys().forEach((key) => {
      if (!String(key).startsWith("wormholes") && !String(key).startsWith("worldBuilder")) return;
      const value = localStorageValue(key);
      const category = classifyLocalStorageKey(key);
      result[category] += bytesForText(key) + bytesForText(value || "");
    });
    return result;
  }

  function knownUniverseIds() {
    const ids = new Set();
    try {
      const list = Array.isArray(globalThis.universes) ? globalThis.universes : [];
      list.forEach((universe) => {
        if (universe?.id) ids.add(String(universe.id));
      });
    } catch (error) {}
    try {
      if (globalThis.currentUniverseId) ids.add(String(globalThis.currentUniverseId));
    } catch (error) {}
    return Array.from(ids);
  }

  async function largeDataBreakdown() {
    const store = window.WormholesLargeDataStore || null;
    if (!store?.estimatePrefixBytes) return {literature: 0, images: 0};
    const ids = knownUniverseIds();
    if (!ids.length) return {literature: 0, images: 0};
    const literaturePrefixes = ids.map((id) => `literature:${id}:`);
    const imagePrefixes = ids.map((id) => `vision:${id}:`);
    try {
      const [literature, images] = await Promise.all([
        store.estimatePrefixBytes(literaturePrefixes),
        store.estimatePrefixBytes(imagePrefixes),
      ]);
      return {literature: safeNumber(literature), images: safeNumber(images)};
    } catch (error) {
      return {literature: 0, images: 0};
    }
  }

  function folderHandle(name) {
    try {
      if (name === "creations") return globalThis.wormholesCreationsRootHandle || null;
      if (name === "literature") return globalThis.wormholesLiteratureRootHandle || null;
      if (name === "images") return globalThis.wormholesImagesRootHandle || null;
    } catch (error) {}
    return null;
  }

  async function measuredFolderDirectoryBytes(handle) {
    if (!handle || typeof storageApi.directoryStorageBytes !== "function") return 0;
    try {
      if (
        typeof services.hasFolderPermission === "function" &&
        !(await services.hasFolderPermission(handle, "read"))
      )
        return null;
      const bytes = await storageApi.directoryStorageBytes(handle);
      return bytes === null ? null : safeNumber(bytes);
    } catch (error) {
      return null;
    }
  }

  async function folderBreakdown() {
    let enabled = false;
    try {
      enabled = !!globalThis.localFoldersEnabled;
    } catch (error) {}
    if (!enabled) {
      return {
        enabled: false,
        measurable: true,
        creations: 0,
        literature: 0,
        images: 0,
        other: 0,
        total: 0,
      };
    }

    let appTotal = null;
    try {
      if (typeof storageApi.appLocalFolderBytes === "function")
        appTotal = await storageApi.appLocalFolderBytes();
    } catch (error) {
      appTotal = null;
    }
    if (appTotal === null) {
      return {
        enabled: true,
        measurable: false,
        creations: null,
        literature: null,
        images: null,
        other: null,
        total: null,
      };
    }

    const [creations, literature, images] = await Promise.all([
      measuredFolderDirectoryBytes(folderHandle("creations")),
      measuredFolderDirectoryBytes(folderHandle("literature")),
      measuredFolderDirectoryBytes(folderHandle("images")),
    ]);
    if ([creations, literature, images].some((value) => value === null)) {
      return {
        enabled: true,
        measurable: false,
        creations: null,
        literature: null,
        images: null,
        other: null,
        total: null,
      };
    }
    const categorized = safeNumber(creations) + safeNumber(literature) + safeNumber(images);
    return {
      enabled: true,
      measurable: true,
      creations: safeNumber(creations),
      literature: safeNumber(literature),
      images: safeNumber(images),
      other: Math.max(0, safeNumber(appTotal) - categorized),
      total: safeNumber(appTotal),
    };
  }

  function approximateSnapshotBytesFromSignature(snapshot) {
    const signature = String(snapshot?.signature || "");
    const match = signature.match(/-(\d+)$/);
    if (match) return safeNumber(match[1]) + 1024;
    return 0;
  }

  async function recoverySnapshotSummary() {
    try {
      const snapshots = (await snapshotsApi?.listSnapshots?.()) || [];
      const corrupted = (await snapshotsApi?.listCorruptedRecords?.()) || [];
      const snapshotBytes = snapshots.reduce(
        (sum, snapshot) => sum + approximateSnapshotBytesFromSignature(snapshot),
        0,
      );
      const corruptedBytes = corrupted.reduce(
        (sum, record) => sum + bytesForText(record?.rawText || "") + 512,
        0,
      );
      return {
        count: snapshots.length,
        corruptedCount: corrupted.length,
        approximateBytes: snapshotBytes + corruptedBytes,
        hasEstimate: snapshots.every(
          (snapshot) => approximateSnapshotBytesFromSignature(snapshot) > 0,
        ),
      };
    } catch (error) {
      return {
        count: 0,
        corruptedCount: 0,
        approximateBytes: 0,
        hasEstimate: false,
        unavailable: true,
      };
    }
  }

  async function browserCapacitySummary() {
    try {
      const estimate = storageCapacityApi?.estimateBrowserStorage
        ? await storageCapacityApi.estimateBrowserStorage()
        : await navigator.storage?.estimate?.();
      if (
        !estimate ||
        !Number.isFinite(Number(estimate.quota)) ||
        !Number.isFinite(Number(estimate.usage))
      ) {
        return {available: false};
      }
      const quota = Math.max(0, Number(estimate.quota));
      const usage = Math.max(0, Number(estimate.usage));
      const remaining = Math.max(0, quota - usage);
      const percent = quota > 0 ? Math.min(100, Math.max(0, (usage / quota) * 100)) : 0;
      const reserve =
        storageCapacityApi?.safetyReserveForQuota?.(quota) ||
        Math.min(quota * 0.15, 8 * 1024 * 1024);
      const state =
        remaining < reserve || percent >= 90 ? "low" : percent >= 70 ? "watch" : "healthy";
      return {available: true, quota, usage, remaining, percent, reserve, state};
    } catch (error) {
      return {available: false};
    }
  }

  async function measureStorageUsage() {
    const local = localStorageBreakdown();
    const [large, folder, snapshots, capacity] = await Promise.all([
      largeDataBreakdown(),
      folderBreakdown(),
      recoverySnapshotSummary(),
      browserCapacitySummary(),
    ]);

    const browser = {
      creations: local.creations,
      literature: local.literature + large.literature,
      images: local.images + large.images,
      other: local.other,
    };
    browser.total = browser.creations + browser.literature + browser.images + browser.other;

    const measuredFolderTotal = folder.measurable ? folder.total : 0;
    return {
      browser,
      folder,
      snapshots,
      capacity,
      contentTotal: browser.total + measuredFolderTotal,
    };
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(text ?? "");
  }

  function setRow(idPrefix, browserBytes, folderBytes, folderMeasurable) {
    setText(`${idPrefix}Browser`, formatBytes(browserBytes));
    setText(
      `${idPrefix}Folder`,
      folderMeasurable ? formatBytes(folderBytes) : "Reconnect to measure",
    );
    setText(
      `${idPrefix}Total`,
      folderMeasurable
        ? formatBytes(safeNumber(browserBytes) + safeNumber(folderBytes))
        : `${formatBytes(browserBytes)} + folder`,
    );
  }

  function renderCapacity(capacity) {
    const progress = document.getElementById("storageUsageCapacityProgress");
    const status = document.getElementById("storageUsageCapacityStatus");
    const note = document.getElementById("storageUsageCapacityNote");
    if (!capacity?.available) {
      if (progress) {
        progress.hidden = true;
        progress.value = 0;
      }
      if (status) {
        status.className = "storage-usage-capacity-status";
        status.textContent = "Browser capacity estimate unavailable";
      }
      if (note)
        note.textContent =
          "This browser did not provide a storage quota estimate. Wormholes will still check capacity before large operations.";
      return;
    }
    if (progress) {
      progress.hidden = false;
      progress.value = capacity.percent;
      progress.setAttribute("aria-valuetext", `${capacity.percent.toFixed(1)} percent used`);
    }
    if (status) {
      status.className = `storage-usage-capacity-status storage-usage-capacity-status--${capacity.state}`;
      status.textContent = `${formatBytes(capacity.usage)} of ${formatBytes(capacity.quota)} used by this browser site`;
    }
    if (note) {
      const stateText =
        capacity.state === "low"
          ? "Storage is running low. Consider removing large images or documents after making a backup."
          : capacity.state === "watch"
            ? "Storage use is getting high. Wormholes will warn before large operations that may exceed the remaining space."
            : "Storage has a comfortable safety margin for normal saves, Undo, and restore points.";
      note.textContent = `${formatBytes(capacity.remaining)} remains. ${stateText}`;
    }
  }

  function renderSnapshotSummary(snapshots) {
    const value = document.getElementById("storageUsageSnapshotsValue");
    const note = document.getElementById("storageUsageSnapshotsNote");
    if (!value || !note) return;
    if (snapshots?.unavailable) {
      value.textContent = "Unavailable";
      note.textContent = "Restore Point storage could not be measured right now.";
      return;
    }
    const countLabel = `${snapshots.count} snapshot${snapshots.count === 1 ? "" : "s"}`;
    value.textContent =
      snapshots.approximateBytes > 0
        ? `About ${formatBytes(snapshots.approximateBytes)}`
        : countLabel;
    const quarantine = snapshots.corruptedCount
      ? ` It also contains ${snapshots.corruptedCount} preserved damaged record${snapshots.corruptedCount === 1 ? "" : "s"}.`
      : "";
    note.textContent = `${countLabel}, stored in this browser and capped at five.${quarantine}`;
  }

  function renderDashboard(measurement) {
    const folderMeasured = measurement.folder.measurable;
    setText("storageUsageContentTotal", formatBytes(measurement.contentTotal));
    setText("storageUsageBrowserTotal", formatBytes(measurement.browser.total));
    setText(
      "storageUsageFolderTotal",
      folderMeasured
        ? formatBytes(measurement.folder.total)
        : measurement.folder.enabled
          ? "Reconnect to measure"
          : "Not connected",
    );

    setRow(
      "storageUsageCreations",
      measurement.browser.creations,
      measurement.folder.creations,
      folderMeasured,
    );
    setRow(
      "storageUsageLiterature",
      measurement.browser.literature,
      measurement.folder.literature,
      folderMeasured,
    );
    setRow(
      "storageUsageImages",
      measurement.browser.images,
      measurement.folder.images,
      folderMeasured,
    );
    setRow(
      "storageUsageOther",
      measurement.browser.other,
      measurement.folder.other,
      folderMeasured,
    );

    const folderNote = document.getElementById("storageUsageFolderNote");
    if (folderNote) {
      folderNote.textContent = measurement.folder.enabled
        ? folderMeasured
          ? "Local-folder values include all Wormholes universe folders that are currently connected."
          : "Reconnect the local folder from Settings to include its files in the dashboard total."
        : "Local-folder storage is not enabled. All current content is stored in the browser.";
    }

    renderSnapshotSummary(measurement.snapshots);
    renderCapacity(measurement.capacity);
  }

  function setLoadingState(isLoading, message = "Calculating storage usage…") {
    const modal = document.getElementById("storageUsageDashboardModal");
    const status = document.getElementById("storageUsageDashboardStatus");
    if (modal) modal.setAttribute("aria-busy", isLoading ? "true" : "false");
    if (status) status.textContent = message;
  }

  async function openStorageUsageDashboard(event) {
    dashboardOpener =
      event?.currentTarget ||
      document.getElementById("storageUsageDetailsBtn") ||
      document.activeElement;
    if (typeof services.toggleSettingsMenu === "function") services.toggleSettingsMenu(false);
    const modal = document.getElementById("storageUsageDashboardModal");
    if (!modal) return;
    modal.classList.add("open");
    const token = ++renderToken;
    setLoadingState(true);
    setTimeout(() => document.getElementById("closeStorageUsageDashboardBtn")?.focus(), 0);
    try {
      const measurement = await measureStorageUsage();
      if (token !== renderToken || !modal.classList.contains("open")) return;
      renderDashboard(measurement);
      setLoadingState(false, "Storage usage updated.");
    } catch (error) {
      if (token !== renderToken) return;
      setLoadingState(false, "Storage usage could not be fully measured.");
      console.error("Could not measure Wormholes storage usage", error);
    }
  }

  function closeStorageUsageDashboard() {
    renderToken += 1;
    document.getElementById("storageUsageDashboardModal")?.classList.remove("open");
    const returnTarget = dashboardOpener || document.getElementById("storageUsageDetailsBtn");
    dashboardOpener = null;
    // Reopen after the closing click finishes bubbling so the document-level
    // outside-click handler does not immediately close Settings again.
    setTimeout(() => {
      if (typeof services.toggleSettingsMenu === "function") services.toggleSettingsMenu(true);
      returnTarget?.focus?.();
    }, 0);
  }

  function installStorageDashboardHandlers() {
    const root = document.documentElement;
    if (root?.dataset.storageDashboardHandlersBound === "true") return;
    if (root?.dataset) root.dataset.storageDashboardHandlersBound = "true";
    document
      .getElementById("storageUsageDetailsBtn")
      ?.addEventListener("click", openStorageUsageDashboard);
    document
      .getElementById("closeStorageUsageDashboardBtn")
      ?.addEventListener("click", closeStorageUsageDashboard);
  }

  installStorageDashboardHandlers();

  const api = Object.freeze({
    classifyLocalStorageKey,
    localStorageBreakdown,
    approximateSnapshotBytesFromSignature,
    measureStorageUsage,
    open: openStorageUsageDashboard,
    close: closeStorageUsageDashboard,
  });
  window.WormholesStorageDashboard = api;
  return api;
})();

const storageDashboardModuleApi = globalThis.WormholesStorageDashboard;
export {storageDashboardModuleApi as api};
export default storageDashboardModuleApi;

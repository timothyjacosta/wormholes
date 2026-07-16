/* GENERATED from scripts/modules/vision-board-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* EMBEDDED from scripts/modules/vision-board-view-helpers.mjs for direct-file compatibility. */
/* Wormholes Beta 261 — Vision Board pagination, filtering, sorting, and list-action presentation.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

const visionFilterStatesByUniverse = new Map();
const visionSortStatesByUniverse = new Map();
const visionPageStatesByUniverse = new Map();
const VISION_PAGE_SIZE = 48;
const VISION_SORT_MODES = new Set([
  "board",
  "title-asc",
  "title-desc",
  "newest",
  "oldest",
  "filename",
]);
let visionFilterPanelOpen = false;
let visionSortPanelOpen = false;

function getVisionPage(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  return Math.max(1, Number.parseInt(visionPageStatesByUniverse.get(key), 10) || 1);
}

function setVisionPage(page, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  visionPageStatesByUniverse.set(key, Math.max(1, Number.parseInt(page, 10) || 1));
}

function resetVisionPage() {
  setVisionPage(1);
}

function scrollVisionPageToTop() {
  const target =
    document.getElementById("visionBoardCount") || document.getElementById("visionTab");
  target?.scrollIntoView?.({
    behavior:
      typeof (globalThis.controllerServices || globalThis).prefersReducedMotion === "function" &&
      (globalThis.controllerServices || globalThis).prefersReducedMotion()
        ? "auto"
        : "smooth",
    block: "start",
  });
}

function renderVisionPagination(totalPages, currentPage) {
  window.WormholesPagination?.renderControls?.(document.getElementById("visionPagination"), {
    label: "Vision Board",
    totalPages,
    page: currentPage,
    onPageChange(nextPage) {
      setVisionPage(nextPage);
      renderVisionBoard();
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(scrollVisionPageToTop);
    },
  });
}

function defaultVisionFilterState() {
  return {
    tags: "all",
    storage: "all",
    format: "all",
  };
}

function getVisionFilterState(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  if (!visionFilterStatesByUniverse.has(key)) {
    visionFilterStatesByUniverse.set(key, defaultVisionFilterState());
  }
  return visionFilterStatesByUniverse.get(key);
}

function visionFilterActiveCount(state = getVisionFilterState()) {
  return (
    Number(state.tags !== "all") + Number(state.storage !== "all") + Number(state.format !== "all")
  );
}

function getVisionSortMode(universeId = currentUniverseId) {
  const key = universeId || "__none__";
  const mode = visionSortStatesByUniverse.get(key) || "board";
  if (!VISION_SORT_MODES.has(mode)) {
    visionSortStatesByUniverse.set(key, "board");
    return "board";
  }
  return mode;
}

function setVisionSortMode(mode, universeId = currentUniverseId) {
  const key = universeId || "__none__";
  visionSortStatesByUniverse.set(key, VISION_SORT_MODES.has(mode) ? mode : "board");
}

function visionSortModeLabel(mode = getVisionSortMode()) {
  return (
    {
      "title-asc": "A–Z",
      "title-desc": "Z–A",
      newest: "Newest",
      oldest: "Oldest",
      filename: "Filename",
    }[mode] || ""
  );
}

function sanitizeVisionFilterState(state = getVisionFilterState()) {
  const clean = {
    ...defaultVisionFilterState(),
    ...(state || {}),
  };
  if (!["all", "tagged", "untagged", "universe", "creation"].includes(clean.tags))
    clean.tags = "all";
  if (!["all", "app", "folder"].includes(clean.storage)) clean.storage = "all";
  if (!["all", "png", "jpeg"].includes(clean.format)) clean.format = "all";
  return clean;
}

function visionItemFormat(item) {
  const mime = String(item?.mimeType || "").toLowerCase();
  const name = String(item?.folderFileName || item?.sourceName || "").toLowerCase();
  if (mime === "image/png" || name.endsWith(".png")) return "png";
  return "jpeg";
}

function visionItemMatchesFilters(item, state = getVisionFilterState()) {
  const clean = sanitizeVisionFilterState(state);
  const universeTags = item?.tags?.universes || [];
  const creationTags = item?.tags?.entries || [];
  const tagged = universeTags.length > 0 || creationTags.length > 0;

  if (clean.tags === "tagged" && !tagged) return false;
  if (clean.tags === "untagged" && tagged) return false;
  if (clean.tags === "universe" && universeTags.length === 0) return false;
  if (clean.tags === "creation" && creationTags.length === 0) return false;
  if (clean.storage === "folder" && item?.storage !== "folder") return false;
  if (clean.storage === "app" && item?.storage === "folder") return false;
  if (clean.format !== "all" && visionItemFormat(item) !== clean.format) return false;
  return true;
}

function visionSortComparator(mode = getVisionSortMode()) {
  return (a, b) => {
    const titleA = String(a?.title || a?.sourceName || "").trim();
    const titleB = String(b?.title || b?.sourceName || "").trim();
    const titleCompare = titleA.localeCompare(titleB, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    const createdA = Date.parse(a?.createdAt || "") || 0;
    const createdB = Date.parse(b?.createdAt || "") || 0;

    if (mode === "title-asc") return titleCompare;
    if (mode === "title-desc") return -titleCompare;
    if (mode === "newest") return createdB - createdA || titleCompare;
    if (mode === "oldest") return createdA - createdB || titleCompare;
    if (mode === "filename") {
      const fileA = String(a?.sourceName || a?.folderFileName || a?.title || "");
      const fileB = String(b?.sourceName || b?.folderFileName || b?.title || "");
      return (
        fileA.localeCompare(fileB, undefined, {sensitivity: "base", numeric: true}) || titleCompare
      );
    }
    return 0;
  };
}

function buildVisionViewRows(
  entries = visionEntries,
  state = getVisionFilterState(),
  mode = getVisionSortMode(),
) {
  const rows = (entries || [])
    .map((item, index) => ({item, index}))
    .filter((row) => visionItemMatchesFilters(row.item, state));
  if (mode !== "board") {
    const compare = visionSortComparator(mode);
    rows.sort((a, b) => compare(a.item, b.item));
  }
  return rows;
}

function syncVisionViewControls() {
  const state = sanitizeVisionFilterState(getVisionFilterState());
  visionFilterStatesByUniverse.set(currentUniverseId || "__none__", state);
  const tags = document.getElementById("visionFilterTags");
  const storage = document.getElementById("visionFilterStorage");
  const format = document.getElementById("visionFilterFormat");
  if (tags) tags.value = state.tags;
  if (storage) storage.value = state.storage;
  if (format) format.value = state.format;

  const filterPanel = document.getElementById("visionFilterPanel");
  const filterButton = document.getElementById("visionFilterBtn");
  const activeCount = visionFilterActiveCount(state);
  if (filterPanel) filterPanel.hidden = !visionFilterPanelOpen;
  if (filterButton) {
    filterButton.textContent = activeCount ? `Filter (${activeCount})` : "Filter";
    filterButton.classList.toggle("filter-active", activeCount > 0);
    filterButton.setAttribute("aria-expanded", visionFilterPanelOpen ? "true" : "false");
  }

  const sortPanel = document.getElementById("visionSortPanel");
  const sortButton = document.getElementById("visionSortBtn");
  const sortSelect = document.getElementById("visionSortOrder");
  const sortMode = getVisionSortMode();
  if (sortPanel) sortPanel.hidden = !visionSortPanelOpen;
  if (sortSelect) sortSelect.value = sortMode;
  if (sortButton) {
    const label = visionSortModeLabel(sortMode);
    sortButton.textContent = sortMode === "board" ? "Sort" : `Sort (${label})`;
    sortButton.classList.toggle("sort-active", sortMode !== "board");
    sortButton.setAttribute("aria-expanded", visionSortPanelOpen ? "true" : "false");
  }
}

function setVisionFilterPanelOpen(open) {
  visionFilterPanelOpen = !!open;
  if (visionFilterPanelOpen) visionSortPanelOpen = false;
  syncVisionViewControls();
  if (visionFilterPanelOpen) {
    setTimeout(() => document.getElementById("visionFilterTags")?.focus(), 0);
  }
}

function toggleVisionFilterPanel() {
  setVisionFilterPanelOpen(!visionFilterPanelOpen);
}

function closeVisionFilterPanel() {
  visionFilterPanelOpen = false;
  syncVisionViewControls();
  setTimeout(() => document.getElementById("visionFilterBtn")?.focus(), 0);
}

function applyVisionFiltersFromControls() {
  const state = getVisionFilterState();
  state.tags = document.getElementById("visionFilterTags")?.value || "all";
  state.storage = document.getElementById("visionFilterStorage")?.value || "all";
  state.format = document.getElementById("visionFilterFormat")?.value || "all";
  resetVisionPage();
  renderVisionBoard();
}

function resetVisionFilters() {
  visionFilterStatesByUniverse.set(currentUniverseId || "__none__", defaultVisionFilterState());
  resetVisionPage();
  renderVisionBoard();
}

function setVisionSortPanelOpen(open) {
  visionSortPanelOpen = !!open;
  if (visionSortPanelOpen) visionFilterPanelOpen = false;
  syncVisionViewControls();
  if (visionSortPanelOpen) {
    setTimeout(() => document.getElementById("visionSortOrder")?.focus(), 0);
  }
}

function toggleVisionSortPanel() {
  setVisionSortPanelOpen(!visionSortPanelOpen);
}

function closeVisionSortPanel() {
  visionSortPanelOpen = false;
  syncVisionViewControls();
  setTimeout(() => document.getElementById("visionSortBtn")?.focus(), 0);
}

function applyVisionSortFromControl() {
  setVisionSortMode(document.getElementById("visionSortOrder")?.value || "board");
  resetVisionPage();
  renderVisionBoard();
}

function resetVisionSort() {
  setVisionSortMode("board");
  resetVisionPage();
  renderVisionBoard();
}

function resetVisionViewForMoving() {
  const hadViewChanges =
    visionFilterActiveCount(getVisionFilterState()) > 0 || getVisionSortMode() !== "board";
  if (!hadViewChanges) return false;
  visionFilterStatesByUniverse.set(currentUniverseId || "__none__", defaultVisionFilterState());
  setVisionSortMode("board");
  resetVisionPage();
  visionFilterPanelOpen = false;
  visionSortPanelOpen = false;
  return true;
}

function applyVisionPinActionLabels(pin) {
  const title = compactText(
    pin?.querySelector?.(".vision-pin-label")?.textContent ||
      pin?.getAttribute?.("title") ||
      "Vision board item",
  );
  const type = "vision board item";

  setContextualAriaLabel(
    pin,
    ".vision-pin-menu-button",
    `Open image actions for ${type}: ${title}`,
  );
  setContextualAriaLabel(pin, ".vision-rename-action", `Rename ${type}: ${title}`);
  setContextualAriaLabel(pin, ".vision-tag-action", `Edit tags for ${type}: ${title}`);
  setContextualAriaLabel(pin, ".vision-move-action", `Move ${type}: ${title}`);
  setContextualAriaLabel(
    pin,
    ".vision-copy-universe-action",
    `Copy ${type} to another universe: ${title}`,
  );
  setContextualAriaLabel(pin, ".vision-delete-action", `Delete ${type}: ${title}`);
}

const VISION_BOARD_VIEW_HELPERS_API = Object.freeze({
  VISION_PAGE_SIZE,
  getVisionPage,
  setVisionPage,
  resetVisionPage,
  scrollVisionPageToTop,
  renderVisionPagination,
  defaultVisionFilterState,
  getVisionFilterState,
  visionFilterActiveCount,
  getVisionSortMode,
  setVisionSortMode,
  visionSortModeLabel,
  sanitizeVisionFilterState,
  visionItemFormat,
  visionItemMatchesFilters,
  visionSortComparator,
  buildVisionViewRows,
  syncVisionViewControls,
  setVisionFilterPanelOpen,
  toggleVisionFilterPanel,
  closeVisionFilterPanel,
  applyVisionFiltersFromControls,
  resetVisionFilters,
  setVisionSortPanelOpen,
  toggleVisionSortPanel,
  closeVisionSortPanel,
  applyVisionSortFromControl,
  resetVisionSort,
  resetVisionViewForMoving,
  applyVisionPinActionLabels,
});

function installLegacyVisionBoardViewHelpersBindings(target = globalThis) {
  Object.assign(target, VISION_BOARD_VIEW_HELPERS_API);
  target.WormholesVisionBoardViewHelpers = VISION_BOARD_VIEW_HELPERS_API;
  return VISION_BOARD_VIEW_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyVisionBoardViewHelpersBindings(window);

/* EMBEDDED from scripts/modules/vision-image-helpers.mjs for direct-file compatibility. */
/* Wormholes Beta 261 — Vision image validation, MIME handling, conversion, and thumbnail generation.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

function visionFileKind(file) {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();

  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || type === "image/jpeg") return "image";
  if (name.endsWith(".png") || type === "image/png") return "image";
  return "unsupported";
}

function mimeTypeFromDataUrl(dataUrl) {
  return (String(dataUrl || "").match(/^data:([^;]+);/i) || [])[1] || "";
}

const SAFE_IMPORTED_VISION_DATA_URL_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

function normalizedImportedVisionImageMimeType(mimeType) {
  const clean = String(mimeType || "")
    .trim()
    .toLowerCase();
  if (clean === "image/jpg") return "image/jpeg";
  if (clean === "image/png" || clean === "image/jpeg") return clean;
  return "";
}

function importedVisionDataUrlMimeType(dataUrl) {
  const match = String(dataUrl || "")
    .trim()
    .match(/^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return "";
  const mimeType = normalizedImportedVisionImageMimeType(match[1]);
  if (
    !mimeType ||
    !SAFE_IMPORTED_VISION_DATA_URL_MIME_TYPES.has(
      String(match[1] || "")
        .trim()
        .toLowerCase(),
    )
  )
    return "";
  const payload = String(match[2] || "").replace(/\s+/g, "");
  if (!payload || !/^[a-z0-9+/]+={0,2}$/i.test(payload)) return "";
  return mimeType;
}

function isSafeImportedVisionImageDataUrl(dataUrl, kind = "visionImage") {
  const raw = String(dataUrl || "").trim();
  const mediaResult = window.WormholesMediaLimits?.dataUrlResult?.(raw, kind, {
    showDialog: false,
  });
  if (mediaResult && !mediaResult.ok) return false;
  return !!importedVisionDataUrlMimeType(raw);
}

function safeImportedVisionImageDataUrl(dataUrl, kind = "visionImage") {
  const raw = String(dataUrl || "").trim();
  return isSafeImportedVisionImageDataUrl(raw, kind) ? raw : "";
}

function safeImportedVisionMimeType(item, dataUrl, thumbnailDataUrl) {
  return (
    normalizedImportedVisionImageMimeType(item?.mimeType) ||
    importedVisionDataUrlMimeType(dataUrl) ||
    importedVisionDataUrlMimeType(thumbnailDataUrl) ||
    ""
  );
}

function dataUrlWithMimeType(dataUrl, mimeType) {
  const cleanMime = String(mimeType || "").toLowerCase();
  const raw = String(dataUrl || "");
  if (!raw.startsWith("data:") || !cleanMime) return raw;
  const commaIndex = raw.indexOf(",");
  if (commaIndex < 0) return raw;
  const header = raw.slice(0, commaIndex);
  const payload = raw.slice(commaIndex + 1);
  const suffix = header.toLowerCase().includes(";base64") ? ";base64" : "";
  return `data:${cleanMime}${suffix},${payload}`;
}

function visionMimeTypeForFolderFile(file, item = null) {
  const explicit = String(file?.type || "").toLowerCase();
  if (explicit === "image/png" || explicit === "image/jpeg" || explicit === "image/jpg") {
    return explicit === "image/jpg" ? "image/jpeg" : explicit;
  }
  return visionStoredMimeType({
    ...(item || {}),
    sourceName: file?.name || item?.sourceName || "",
    folderFileName: file?.name || item?.folderFileName || "",
  });
}

function visionOutputMimeTypeForFile(file) {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();
  return name.endsWith(".png") || type === "image/png" ? "image/png" : "image/jpeg";
}

function visionExtensionForMimeType(mimeType, fallback = ".jpg") {
  const clean = String(mimeType || "").toLowerCase();
  if (clean === "image/png") return ".png";
  if (clean === "image/jpeg" || clean === "image/jpg") return ".jpg";
  return fallback;
}

function visionStoredMimeType(item) {
  const explicit = String(item?.mimeType || "").toLowerCase();
  if (explicit === "image/png" || explicit === "image/jpeg" || explicit === "image/jpg") {
    return explicit === "image/jpg" ? "image/jpeg" : explicit;
  }

  const fromDataUrl = mimeTypeFromDataUrl(
    item?.dataUrl || item?.thumbnailDataUrl || "",
  ).toLowerCase();
  if (fromDataUrl === "image/png" || fromDataUrl === "image/jpeg" || fromDataUrl === "image/jpg") {
    return fromDataUrl === "image/jpg" ? "image/jpeg" : fromDataUrl;
  }

  const fileName = String(item?.folderFileName || item?.sourceName || "").toLowerCase();
  if (fileName.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

function visionExtensionForStoredItem(item, fallback = ".jpg") {
  if (item?.fileType === "pdf") return ".pdf";

  const storedExtension = (globalThis.controllerServices || globalThis).extensionForStoredFileName(item?.folderFileName || "", "")
    .toLowerCase();
  if (storedExtension === ".png" || storedExtension === ".jpg" || storedExtension === ".jpeg") {
    return storedExtension === ".jpeg" ? ".jpg" : storedExtension;
  }

  return visionExtensionForMimeType(visionStoredMimeType(item), fallback);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}

function loadImageElementFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };

    img.src = url;
  });
}

async function imageFileToCanvasDataUrl(file, maxSide, jpegQuality) {
  const img = await loadImageElementFromFile(file);
  const outputMimeType = visionOutputMimeTypeForFile(file);
  const scale = Math.min(
    1,
    maxSide / Math.max(img.naturalWidth || img.width || 1, img.naturalHeight || img.height || 1),
  );
  const width = Math.max(1, Math.round((img.naturalWidth || img.width || 1) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || img.height || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (outputMimeType !== "image/png") {
    ctx.fillStyle = "#1f272d";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  return outputMimeType === "image/png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", jpegQuality);
}

async function imageFileToPinboardDataUrl(file) {
  return await imageFileToCanvasDataUrl(file, 1400, 0.84);
}

async function imageFileToThumbnailDataUrl(file) {
  return await imageFileToCanvasDataUrl(file, 360, 0.78);
}

async function regenerateVisionThumbnailDataUrl(dataUrl) {
  const safeDataUrl = safeImportedVisionImageDataUrl(dataUrl, "visionImage");
  if (!safeDataUrl || typeof File === "undefined") return "";
  const mimeType = importedVisionDataUrlMimeType(safeDataUrl) || "image/jpeg";
  const extension = mimeType === "image/png" ? ".png" : ".jpg";
  const file = new File(
    [(globalThis.controllerServices || globalThis).dataUrlToBlob(safeDataUrl)],
    `recovered-thumbnail-source${extension}`,
    {type: mimeType},
  );
  const thumbnail = await imageFileToThumbnailDataUrl(file);
  return safeImportedVisionImageDataUrl(thumbnail, "visionThumbnail");
}

async function imageBlobToThumbnailBlob(blob) {
  if (!blob) return null;

  // Linked-image DOCX exports already declare thumbnails as JPEG files.
  // Keep this conversion JPEG-only so PNG vision-board preservation does not create
  // mismatched .jpg files containing PNG data inside generated DOCX packages.
  const fileLike = new File([blob], "thumbnail.jpg", {type: "image/jpeg"});
  const dataUrl = await imageFileToThumbnailDataUrl(fileLike);
  return (globalThis.controllerServices || globalThis).dataUrlToBlob(dataUrl);
}

async function convertUploadedVisionFile(file) {
  const fileType = visionFileKind(file);
  if (fileType === "unsupported") {
    throw new Error("Accepts JPEG and PNG. PDFs are not supported.");
  }

  const title = file.name.replace(/\.[^.]+$/, "") || file.name;
  const now = new Date().toISOString();
  const mimeType = visionOutputMimeTypeForFile(file);
  const extension = visionExtensionForMimeType(mimeType, ".jpg");
  const dataUrl = await imageFileToPinboardDataUrl(file);
  const thumbnailDataUrl = await imageFileToThumbnailDataUrl(file);

  if (
    localFoldersEnabled &&
    visionFolderHandle &&
    (await (globalThis.controllerServices || globalThis).requestFolderPermission(visionFolderHandle))
  ) {
    try {
      const folderFileName = await (globalThis.controllerServices || globalThis).uniqueFolderFileName(
        visionFolderHandle,
        title,
        extension,
      );
      const blob = (globalThis.controllerServices || globalThis).dataUrlToBlob(dataUrl);

      await (globalThis.controllerServices || globalThis).writeBlobToFolder(visionFolderHandle, folderFileName, blob);

      return {
        id: makeId(),
        title,
        sourceName: file.name,
        fileType,
        mimeType,
        dataUrl: "",
        thumbnailDataUrl,
        storage: "folder",
        folderFileName,
        fileSize: file.size || 0,
        tags: {universes: [], entries: []},
        createdAt: now,
      };
    } catch (e) {
      rememberFolderSaveFailure(
        "Uploaded image saved in app, but could not sync to local folder",
        e,
        "Saved in Wormholes, but the folder was not updated.",
      );
    }
  }

  return {
    id: makeId(),
    title,
    sourceName: file.name,
    fileType,
    mimeType,
    dataUrl,
    thumbnailDataUrl,
    storage: "",
    folderFileName: "",
    fileSize: file.size || 0,
    tags: {universes: [], entries: []},
    createdAt: now,
  };
}

const VISION_IMAGE_HELPERS_API = Object.freeze({
  visionFileKind,
  mimeTypeFromDataUrl,
  normalizedImportedVisionImageMimeType,
  importedVisionDataUrlMimeType,
  isSafeImportedVisionImageDataUrl,
  safeImportedVisionImageDataUrl,
  safeImportedVisionMimeType,
  dataUrlWithMimeType,
  visionMimeTypeForFolderFile,
  visionOutputMimeTypeForFile,
  visionExtensionForMimeType,
  visionStoredMimeType,
  visionExtensionForStoredItem,
  readFileAsDataUrl,
  loadImageElementFromFile,
  imageFileToCanvasDataUrl,
  imageFileToPinboardDataUrl,
  imageFileToThumbnailDataUrl,
  regenerateVisionThumbnailDataUrl,
  imageBlobToThumbnailBlob,
  convertUploadedVisionFile,
});

function installLegacyVisionImageHelpersBindings(target = globalThis) {
  Object.assign(target, VISION_IMAGE_HELPERS_API);
  target.WormholesVisionImageHelpers = VISION_IMAGE_HELPERS_API;
  return VISION_IMAGE_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyVisionImageHelpersBindings(window);
/* Wormholes Beta 110 vision board module. Split from the original single-file build.
   Vision Board storage, rendering, upload, tagging, image viewer, and folder-sync helpers extracted from wormholes-app.js.
   Loaded before wormholes-app.js so existing global functions remain available to the app core. */



let visionRenderVersion = 0;
const visionPreviewSourcesById = new Map();
let expandedVisionObjectUrl = "";
let expandedVisionLoadVersion = 0;
let visionImageViewerLoadVersion = 0;

function visionDataStoreKeyFor(universeId, itemId) {
  return `vision:${universeId || currentUniverseId || "none"}:${itemId}:dataUrl`;
}

function visionThumbnailStoreKeyFor(universeId, itemId) {
  return `vision:${universeId || currentUniverseId || "none"}:${itemId}:thumbnailDataUrl`;
}

function visionMetadataStorageKeyFor(universeId = currentUniverseId) {
  return visionStorageKey(universeId);
}

function trimVisionItemForLocalStorage(item, universeId = currentUniverseId) {
  const dataStoreKey =
    item.dataStoreKey || (item.id ? visionDataStoreKeyFor(universeId, item.id) : "");
  const thumbnailStoreKey =
    item.thumbnailStoreKey || (item.id ? visionThumbnailStoreKeyFor(universeId, item.id) : "");
  const imageReady = !!(item.dataStored === "indexedDB" && dataStoreKey);
  const thumbnailReady = !!(item.thumbnailStored === "indexedDB" && thumbnailStoreKey);
  return {
    ...item,
    dataUrl: imageReady ? "" : item.dataUrl || "",
    thumbnailDataUrl: thumbnailReady ? "" : item.thumbnailDataUrl || "",
    dataStoreKey: imageReady ? dataStoreKey : item.dataStoreKey || "",
    thumbnailStoreKey: thumbnailReady || item.thumbnailStoreKey ? thumbnailStoreKey : "",
    dataStored: imageReady
      ? "indexedDB"
      : item.dataUrl
        ? "pending-indexedDB"
        : item.dataStored || "",
    thumbnailStored: thumbnailReady ? "indexedDB" : item.thumbnailStored || "",
  };
}

function normalizeVisionPersistenceResult(result) {
  if (result && typeof result === "object" && typeof result.ok === "boolean") return result;
  return result
    ? {ok: true, code: "ok"}
    : {
        ok: false,
        code: "storage_unavailable",
        userMessage: "Could not save this image. Try again.",
        recoverable: true,
      };
}

function writeVisionMetadataOnly(universeId, entries) {
  const prepared = (entries || []).map((entry) => trimVisionItemForLocalStorage(entry, universeId));
  const repository =
    typeof wormholesRepository === "function" ? wormholesRepository("vision") : null;
  const result = repository
    ? repository.save(universeId, prepared)
    : saveLocalStorageJson(
        visionMetadataStorageKeyFor(universeId),
        prepared,
        "Could not save vision metadata to app storage",
        "Vision metadata could not be saved.",
      );
  return normalizeVisionPersistenceResult(result);
}

async function persistVisionLargeData(universeId, item) {
  if (!item || !item.id) return item;
  if (item.dataUrl) {
    const key = item.dataStoreKey || visionDataStoreKeyFor(universeId, item.id);
    if (await persistLargeDataValue(key, item.dataUrl, "vision image")) {
      item.dataStoreKey = key;
      item.dataStored = "indexedDB";
    }
  }
  if (item.thumbnailDataUrl) {
    const key = item.thumbnailStoreKey || visionThumbnailStoreKeyFor(universeId, item.id);
    if (await persistLargeDataValue(key, item.thumbnailDataUrl, "vision thumbnail")) {
      item.thumbnailStoreKey = key;
      item.thumbnailStored = "indexedDB";
    }
  }
  return item;
}

function scheduleVisionLargeDataSave(universeId, entries) {
  if (!largeDataStoreAvailable()) {
    if ((entries || []).some((item) => item?.dataUrl && item.dataUrl.length > 100000)) {
      reportAppError(
        "IndexedDB is unavailable for large image storage",
        new Error("IndexedDB unavailable"),
        {
          userMessage: "Large images are using app-only fallback storage in this browser.",
        },
      );
    }
    return Promise.resolve(false);
  }
  const pending = (entries || []).filter(
    (item) =>
      (item?.dataUrl && item.dataStored !== "indexedDB") ||
      (item?.thumbnailDataUrl && item.thumbnailStored !== "indexedDB"),
  );
  if (!pending.length) return Promise.resolve(true);
  return Promise.all(pending.map((item) => persistVisionLargeData(universeId, item)))
    .then(() => writeVisionMetadataOnly(universeId, entries))
    .catch((e) => {
      reportAppError("Could not move vision image data out of localStorage", e, {
        userMessage: "Large image storage needs attention.",
      });
      return false;
    });
}

async function materializeVisionItemImageData(item, universeId = currentUniverseId) {
  if (!item || item.dataUrl) return item || null;

  const imageKeys = (globalThis.controllerServices || globalThis).uniqueList([
    item.dataStoreKey,
    item.id ? visionDataStoreKeyFor(universeId, item.id) : "",
  ]);

  for (const key of imageKeys) {
    const dataUrl = await loadLargeDataValue(key, "vision image");
    if (dataUrl) {
      item.dataUrl = dataUrl;
      item.dataStoreKey = key;
      item.dataStored = "indexedDB";
      break;
    }
  }

  return item;
}

async function materializeVisionItemThumbnailData(item, universeId = currentUniverseId) {
  if (!item || item.thumbnailDataUrl) return item || null;

  const thumbnailKeys = (globalThis.controllerServices || globalThis).uniqueList([
    item.thumbnailStoreKey,
    item.id ? visionThumbnailStoreKeyFor(universeId, item.id) : "",
  ]);

  for (const key of thumbnailKeys) {
    const thumbnail = await loadLargeDataValue(key, "vision thumbnail");
    if (thumbnail) {
      item.thumbnailDataUrl = thumbnail;
      item.thumbnailStoreKey = key;
      item.thumbnailStored = "indexedDB";
      break;
    }
  }

  return item;
}

async function materializeVisionItemLargeData(item, universeId = currentUniverseId) {
  if (!item) return null;
  await materializeVisionItemImageData(item, universeId);
  await materializeVisionItemThumbnailData(item, universeId);
  return item;
}

async function deleteVisionLargeData(item) {
  if (!item) return;
  await deleteLargeDataValue(item.dataStoreKey);
  await deleteLargeDataValue(item.thumbnailStoreKey);
}

function allVisionItemsWithHomeUniverse() {
  const rows = [];
  universes.forEach((universe) => {
    readVisionBoardForUniverse(universe.id).forEach((item) => {
      rows.push({item, homeUniverseId: universe.id});
    });
  });
  return rows;
}

function getVisionItem(itemId) {
  return visionEntries.find((item) => item.id === itemId) || null;
}

function restoreVisionItemSnapshot(target, snapshot) {
  if (!target || !snapshot) return target;
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, JSON.parse(JSON.stringify(snapshot)));
  return target;
}

function getVisionItemFromUniverse(universeId, itemId) {
  return readVisionBoardForUniverse(universeId).find((item) => item.id === itemId) || null;
}

function visionItemHasUniverseTag(item, universeId) {
  return (item.tags?.universes || []).includes(universeId);
}

function visionItemHasEntryTag(item, universeId, entryId) {
  return (item.tags?.entries || []).some(
    (tag) => tag.universeId === universeId && tag.entryId === entryId,
  );
}

function visionItemsForUniverseTag(universeId) {
  return allVisionItemsWithHomeUniverse().filter((row) =>
    visionItemHasUniverseTag(row.item, universeId),
  );
}

function visionItemsForEntryTag(universeId, entryId) {
  return allVisionItemsWithHomeUniverse().filter((row) =>
    visionItemHasEntryTag(row.item, universeId, entryId),
  );
}

function visionItemsForUniverseAndEntriesTag(universeId) {
  const seen = new Set();
  const rows = [];

  allVisionItemsWithHomeUniverse().forEach((row) => {
    const hasUniverseTag = (row.item.tags?.universes || []).includes(universeId);
    const hasEntryTag = (row.item.tags?.entries || []).some((tag) => tag.universeId === universeId);

    if (!hasUniverseTag && !hasEntryTag) return;

    const key = `${row.homeUniverseId}:${row.item.id}`;
    if (seen.has(key)) return;

    seen.add(key);
    rows.push(row);
  });

  return rows;
}

function visionItemsForGroupChildrenTag(universeId, groupId) {
  const archive =
    universeId === currentUniverseId ? archiveEntries : readArchiveForUniverse(universeId);
  const group = archive.find((entry) => entry.id === groupId);
  if (!(globalThis.controllerServices || globalThis).isGroupEntry(group)) return [];

  const rows = [];
  (globalThis.controllerServices || globalThis).groupChildIds(group).forEach((childId) => {
    visionItemsForEntryTag(universeId, childId).forEach((row) => {
      rows.push({
        ...row,
        taggedEntryId: childId,
        taggedEntryTitle: (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(universeId, childId),
      });
    });
  });
  return rows;
}

function visionCountForUniverseTag(universeId) {
  return visionItemsForUniverseTag(universeId).length;
}

function visionCountForUniverseAndEntriesTag(universeId) {
  return visionItemsForUniverseAndEntriesTag(universeId).length;
}

function visionCountForEntryTag(universeId, entryId) {
  return visionItemsForEntryTag(universeId, entryId).length;
}

function visionCountForGroupChildrenTag(universeId, groupId) {
  return visionItemsForGroupChildrenTag(universeId, groupId).length;
}

function normalizeVisionEntry(entry) {
  const canonicalBuilder = window.WormholesCanonicalPersistence?.builders?.vision;
  if (canonicalBuilder) {
    const canonical = canonicalBuilder(entry || {}, {
      scope: currentUniverseId,
      idFactory: makeId,
      normalizeTags: (globalThis.controllerServices || globalThis).normalizeImportedTags,
      dataStoreKeyFor: visionDataStoreKeyFor,
      thumbnailStoreKeyFor: visionThumbnailStoreKeyFor,
    });
    return {
      ...canonical,
      tags: {
        universes: [...canonical.tags.universes],
        entries: canonical.tags.entries.map((tag) => ({...tag})),
      },
    };
  }
  return {
    id: entry.id || makeId(),
    title: entry.title || entry.sourceName || "Untitled Vision",
    sourceName: entry.sourceName || entry.title || "",
    fileType: entry.fileType || "image",
    mimeType: entry.mimeType || "",
    thumbnailDataUrl: entry.thumbnailDataUrl || "",
    dataUrl: entry.dataUrl || "",
    storage: entry.storage || "",
    folderFileName: entry.folderFileName || "",
    dataStoreKey:
      entry.dataStoreKey || (entry.id ? visionDataStoreKeyFor(currentUniverseId, entry.id) : ""),
    thumbnailStoreKey:
      entry.thumbnailStoreKey ||
      (entry.id ? visionThumbnailStoreKeyFor(currentUniverseId, entry.id) : ""),
    dataStored: entry.dataStored || "",
    thumbnailStored: entry.thumbnailStored || "",
    fileSize: entry.fileSize || 0,
    tags: {
      universes: Array.isArray(entry.tags?.universes) ? entry.tags.universes : [],
      entries: Array.isArray(entry.tags?.entries) ? entry.tags.entries : [],
    },
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function loadVisionBoardFromStorage() {
  if (!currentUniverseId) {
    visionEntries = [];
    window.WormholesAppModel?.replace?.("vision", visionEntries, {
      source: "persistence",
      reason: "clear vision",
    });
    return;
  }

  try {
    const savedEntries =
      (typeof wormholesRepository === "function" ? wormholesRepository("vision") : null)?.read(
        currentUniverseId,
        [],
      ) ?? readPersistedDatasetData(visionStorageKey(), oldVisionStorageKey(), []);
    visionEntries = Array.isArray(savedEntries) ? savedEntries.map(normalizeVisionEntry) : [];
    visionEntries =
      window.WormholesRenderValidation?.validateVision?.(visionEntries, {
        storageKey: visionStorageKey(),
        universeId: currentUniverseId,
        releaseProtection: true,
      })?.value || visionEntries;
  } catch (e) {
    visionEntries = [];
    reportAppError("Could not load vision metadata from app storage", e, {
      userMessage: "Vision metadata could not be loaded.",
    });
  }

  window.WormholesAppModel?.replace?.("vision", visionEntries, {
    source: "persistence",
    reason: "load vision",
  });
  scheduleVisionLargeDataSave(currentUniverseId, visionEntries);
}

function saveVisionBoardToStorage() {
  if (!currentUniverseId) return {ok: true, code: "ok"};
  window.WormholesAppModel?.replace?.("vision", visionEntries, {
    source: "persistence",
    reason: "save vision",
  });

  const result = writeVisionMetadataOnly(currentUniverseId, visionEntries);
  requestStorageFootnoteUpdate();
  if (!result.ok) {
    const message = document.getElementById("visionBoardMessage");
    if (message)
      message.textContent = result.userMessage || "Could not save this image. Try again.";
    return result;
  }

  scheduleVisionLargeDataSave(currentUniverseId, visionEntries);
  return result;
}

async function migrateVisionBoardToFolder() {
  if (
    !localFoldersEnabled ||
    !visionFolderHandle ||
    !(await (globalThis.controllerServices || globalThis).requestFolderPermission(visionFolderHandle))
  )
    return;

  let changed = false;
  for (const [index, item] of visionEntries.entries()) {
    if (!item.dataUrl) await materializeVisionItemLargeData(item, currentUniverseId);
    if (item.storage === "folder" || !item.dataUrl) continue;

    const extension = visionExtensionForStoredItem(item, ".jpg");
    const folderFileName = await (globalThis.controllerServices || globalThis).uniqueFolderFileName(
      visionFolderHandle,
      item.title || item.sourceName || "vision",
      extension,
    );
    const blob = (globalThis.controllerServices || globalThis).dataUrlToBlob(item.dataUrl);
    await (globalThis.controllerServices || globalThis).writeBlobToFolder(visionFolderHandle, folderFileName, blob);
    item.mimeType = item.mimeType || blob.type || visionStoredMimeType(item);

    item.storage = "folder";
    item.folderFileName = folderFileName;
    item.dataUrl = "";
    changed = true;
  }

  if (changed) saveVisionBoardToStorage();
}

async function syncVisionFolderEntries() {
  // Folder deletion is not auto-applied to app metadata.
  // This prevents backup/switch-folder workflows from erasing images when a source folder is missing.
  return;
}

async function visionItemDisplaySrc(item, homeUniverseId = currentUniverseId) {
  if (!item) return "";
  await materializeVisionItemImageData(item, homeUniverseId);
  if (item.dataUrl) return item.dataUrl;

  if (item.storage === "folder" && item.folderFileName) {
    let folder = homeUniverseId === currentUniverseId ? visionFolderHandle : null;

    if (!folder && localFoldersEnabled && wormholesImagesRootHandle) {
      const universe = universes.find((item) => item.id === homeUniverseId);
      const folders = universe ? await ensureUniverseFolders(universe) : null;
      folder = folders?.images || null;
    }

    if (folder) {
      return await (globalThis.controllerServices || globalThis).objectUrlFromFolderFile(folder, item.folderFileName);
    }
  }

  return "";
}

async function decodeVisionFullImageIntoElement(image, source, options = {}) {
  if (!image || !source) return false;
  const safeRender = window.WormholesSafeRender;
  const safeSource = safeRender?.safeImageUrl?.(source, {imageKind: "visionImage"}) || "";
  if (!safeSource) return false;

  const fallbackSource = String(options.fallbackSource || "");
  const fallbackKind = String(options.fallbackKind || "visionThumbnail");
  image.decoding = "async";
  image.loading = "eager";

  let loadCleanup = () => {};
  let loadPromise = null;
  if (typeof image.addEventListener === "function") {
    loadPromise = new Promise((resolve, reject) => {
      let timeoutId = 0;
      const cleanup = () => {
        image.removeEventListener?.("load", onLoad);
        image.removeEventListener?.("error", onError);
        if (timeoutId) clearTimeout(timeoutId);
      };
      const onLoad = () => {
        cleanup();
        resolve(true);
      };
      const onError = () => {
        cleanup();
        reject(new Error("Image decode failed"));
      };
      image.addEventListener("load", onLoad, {once: true});
      image.addEventListener("error", onError, {once: true});
      if (typeof setTimeout === "function") {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Image decode timed out"));
        }, 15000);
      }
      loadCleanup = cleanup;
    });
  }

  const assigned = safeRender?.setAttribute?.(image, "src", safeSource, {
    image: true,
    imageKind: "visionImage",
  });
  if (!assigned) {
    loadCleanup();
    return false;
  }

  try {
    // Full-resolution decoding is intentionally started only after the user
    // opens an expanded image. Browsing surfaces continue to use thumbnails.
    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch (decodeError) {
        // Some browser/image combinations reject decode() even though the
        // normal load pipeline can still display the image. Accept that path.
        if (!(image.complete && image.naturalWidth > 0)) {
          if (!loadPromise) throw decodeError;
          await loadPromise;
        }
      }
    } else if (!(image.complete && image.naturalWidth > 0)) {
      if (!loadPromise) return false;
      await loadPromise;
    }

    loadCleanup();
    return !!(image.naturalWidth > 0 || typeof image.naturalWidth !== "number");
  } catch (error) {
    loadCleanup();
    if (fallbackSource) {
      safeRender?.setAttribute?.(image, "src", fallbackSource, {
        image: true,
        imageKind: fallbackKind,
      });
    } else {
      image.removeAttribute?.("src");
    }
    throw error;
  }
}

async function visionItemThumbnailSource(item, homeUniverseId = currentUniverseId) {
  if (!item) return {src: "", imageKind: "visionThumbnail"};
  // Preview paths load only the thumbnail record. The full image is materialized
  // only when no thumbnail exists or the user opens the expanded image.
  await materializeVisionItemThumbnailData(item, homeUniverseId);

  if (item.thumbnailDataUrl) {
    return {src: item.thumbnailDataUrl, imageKind: "visionThumbnail"};
  }

  if (item.dataUrl) {
    return {src: item.dataUrl, imageKind: "visionImage"};
  }

  const src = await visionItemDisplaySrc(item, homeUniverseId);
  return {src, imageKind: "visionImage"};
}

async function populateVisionThumbnailButton(thumb, item, homeUniverseId, objectUrls) {
  if (!thumb || !item) return false;
  const altText = item.title || item.sourceName || "Image";
  const safeRender = window.WormholesSafeRender;
  if (!safeRender?.replaceWithImage) return false;

  let primary;
  try {
    primary = await visionItemThumbnailSource(item, homeUniverseId);
  } catch (e) {
    primary = {src: "", imageKind: "visionThumbnail"};
  }

  const rememberObjectUrl = (source) => {
    if (
      source?.startsWith?.("blob:") &&
      Array.isArray(objectUrls) &&
      !objectUrls.includes(source)
    ) {
      objectUrls.push(source);
    }
  };

  const renderSource = (source) => {
    if (!source?.src) return false;
    const rendered = safeRender.replaceWithImage(thumb, source.src, altText, {
      imageKind: source.imageKind,
    });
    if (rendered) {
      rememberObjectUrl(source.src);
      const image = thumb.querySelector("img");
      if (image) {
        image.decoding = "async";
        image.loading = "eager";
      }
    }
    return rendered;
  };

  if (renderSource(primary)) {
    const image = thumb.querySelector("img");
    if (image && primary.imageKind === "visionThumbnail") {
      image.addEventListener(
        "error",
        async () => {
          try {
            const fullSrc = await visionItemDisplaySrc(item, homeUniverseId);
            if (fullSrc && fullSrc !== primary.src) {
              renderSource({src: fullSrc, imageKind: "visionImage"});
            }
          } catch (e) {}
        },
        {once: true},
      );
    }
    return true;
  }

  try {
    const fullSrc = await visionItemDisplaySrc(item, homeUniverseId);
    return renderSource({src: fullSrc, imageKind: "visionImage"});
  } catch (e) {
    return false;
  }
}

async function renderVisionBoardView() {
  const renderVersion = ++visionRenderVersion;
  visionEntries =
    window.WormholesRenderValidation?.validateVision?.(visionEntries, {
      storageKey: visionStorageKey(),
      universeId: currentUniverseId,
      report: false,
    })?.value || visionEntries;
  closeExpandedVisionImage();
  const count = document.getElementById("visionBoardCount");
  const grid = document.getElementById("visionBoardGrid");
  if (!count || !grid) return;

  visionObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  visionObjectUrls = [];
  visionPreviewSourcesById.clear();

  if (visionFolderHandle) {
    await syncVisionFolderEntries();
  }

  syncVisionViewControls();
  const filterState = sanitizeVisionFilterState(getVisionFilterState());
  const viewRows = buildVisionViewRows(visionEntries, filterState, getVisionSortMode());
  const paginatedView = visionMoveMode
    ? {page: 1, totalPages: 1, totalItems: viewRows.length, rows: viewRows}
    : window.WormholesPagination?.paginateRows?.(viewRows, VISION_PAGE_SIZE, getVisionPage()) || {
        page: 1,
        totalPages: 1,
        totalItems: viewRows.length,
        rows: viewRows,
      };
  setVisionPage(paginatedView.page);
  const pageRows = paginatedView.rows;
  const filtered = visionFilterActiveCount(filterState) > 0;
  count.textContent = filtered
    ? `${viewRows.length} of ${visionEntries.length} images`
    : `${visionEntries.length} image${visionEntries.length === 1 ? "" : "s"} added`;
  const resultCount = document.getElementById("visionFilterResultCount");
  if (resultCount) {
    resultCount.textContent = filtered
      ? `${viewRows.length} image${viewRows.length === 1 ? "" : "s"} shown`
      : `${visionEntries.length} image${visionEntries.length === 1 ? "" : "s"}`;
  }

  if (
    localFoldersEnabled &&
    !visionFolderHandle &&
    visionEntries.some((item) => item.storage === "folder")
  ) {
    count.textContent += localFolderRestoreInProgress
      ? " · reconnecting local folder"
      : " · folder reconnect needed";
  }

  if (viewRows.length === 0) {
    renderVisionPagination(1, 1);
    grid.innerHTML = `
      <div class="vision-board-empty">
        <p>${visionEntries.length ? "No images match these filters." : "No images yet. Add one to start your vision board."}</p>
      </div>
    `;
    return;
  }

  const rows = [];
  let reconnectNeeded = 0;

  for (const {item, index} of pageRows) {
    const title = escapeHtml(item.title || item.sourceName || "Vision Board Item");
    const tagBadge = visionTagCountBadgeHtml(item);
    const tagBadgeClass = tagBadge ? " has-tag-badge" : "";
    let displaySource = {src: "", imageKind: item.fileType === "pdf" ? "" : "visionThumbnail"};

    try {
      displaySource =
        item.fileType === "pdf"
          ? {src: await visionItemDisplaySrc(item, currentUniverseId), imageKind: ""}
          : await visionItemThumbnailSource(item, currentUniverseId);
    } catch (e) {
      displaySource = {src: "", imageKind: item.fileType === "pdf" ? "" : "visionThumbnail"};
    }

    const menu = `
      <div class="vision-pin-menu-wrap menu-wrap">
        <button class="vision-pin-menu-button menu-button app-button" type="button" aria-label="Open image menu" data-app-button="true">⋮</button>
        <div class="menu vision-pin-menu">
          <button class="vision-rename-action app-button" type="button" data-app-button="true">Rename</button>
          <button class="vision-tag-action app-button" type="button" data-app-button="true">Tag</button>
          <button class="vision-move-action app-button" type="button" data-app-button="true">Move</button>
          <button class="vision-copy-universe-action app-button" type="button" data-app-button="true">Copy to Universe</button>
          <button class="vision-delete-action app-button" type="button" data-app-button="true">Delete Image</button>
        </div>
      </div>
    `;
    const dragLayer = visionMoveMode
      ? `<div class="vision-drag-layer" draggable="true" aria-hidden="true" title="Drag to move"></div>`
      : "";

    const safeDisplaySrc =
      item.fileType === "pdf"
        ? String(displaySource.src || "")
        : window.WormholesSafeRender?.safeImageUrl?.(displaySource.src, {
            imageKind: displaySource.imageKind || "visionThumbnail",
          }) || "";
    const safeSrc = escapeHtml(safeDisplaySrc);
    if (!safeSrc) {
      reconnectNeeded += 1;
      rows.push(`
        <div class="vision-pin vision-pin-missing${tagBadgeClass}" data-vision-id="${escapeHtml(item.id)}" data-vision-index="${index}" title="${title}" draggable="false">
          ${menu}
          ${dragLayer}
          <div class="vision-missing-note">Reconnect local folder to show this item.</div>
          ${tagBadge}
          <span class="vision-pin-label">${title}</span>
        </div>
      `);
      continue;
    }

    if (item.fileType !== "pdf") {
      visionPreviewSourcesById.set(item.id, {
        src: safeDisplaySrc,
        imageKind: displaySource.imageKind || "visionThumbnail",
      });
      if (safeDisplaySrc.startsWith("blob:") && !visionObjectUrls.includes(safeDisplaySrc)) {
        visionObjectUrls.push(safeDisplaySrc);
      }
    }

    if (item.fileType === "pdf") {
      rows.push(`
        <div class="vision-pin pdf-pin${tagBadgeClass}" data-vision-id="${escapeHtml(item.id)}" data-vision-index="${index}" title="${title}" draggable="false">
          ${menu}
          <object data="${safeSrc}" type="application/pdf" aria-label="${title}" draggable="false"></object>
          ${dragLayer}
          ${tagBadge}
          <span class="vision-pin-label">${title}</span>
        </div>
      `);
    } else {
      rows.push(`
        <div class="vision-pin expandable${tagBadgeClass}" data-vision-id="${escapeHtml(item.id)}" data-vision-index="${index}" title="${title}" draggable="false" aria-expanded="false">
          ${menu}
          <img src="${safeSrc}" alt="${title}" draggable="false">
          ${dragLayer}
          ${tagBadge}
          <div class="vision-pin-tags" aria-hidden="true"><span class="vision-pin-tag-title">Tags</span><span class="vision-pin-tag-list">${renderVisionTagsHtml(item)}</span></div>
          <span class="vision-pin-label">${title}</span>
        </div>
      `);
    }
  }

  if (renderVersion !== visionRenderVersion) return;

  if (reconnectNeeded) {
    count.textContent += ` · ${reconnectNeeded} need folder reconnect`;
  }

  grid.innerHTML = rows.length
    ? `${rows.join("")}${visionMoveMode ? `<div class="vision-move-finish-row"><span class="vision-move-hint">Drag images to reorder them, then finish moving.</span><button id="finishVisionMoveBtn" class="app-button" type="button" data-app-button="true">Finish Moving</button></div>` : ""}`
    : `<div class="vision-board-empty"><p>${visionEntries.length ? "No images match these filters." : "No images yet. Add one to start your vision board."}</p></div>`;
  renderVisionPagination(
    visionMoveMode ? 1 : paginatedView.totalPages,
    visionMoveMode ? 1 : paginatedView.page,
  );

  applyContextualActionAriaLabels(grid);

  installVisionBoardMenuHandlers();
}

function clearExpandedVisionObjectUrl() {
  if (!expandedVisionObjectUrl) return;
  try {
    URL.revokeObjectURL(expandedVisionObjectUrl);
  } catch (e) {}
  visionObjectUrls = visionObjectUrls.filter((url) => url !== expandedVisionObjectUrl);
  expandedVisionObjectUrl = "";
}

function restoreVisionPinPreview(pin, itemId) {
  const image = pin?.querySelector?.("img");
  const preview = visionPreviewSourcesById.get(itemId);
  if (!image || !preview?.src) return false;
  return !!window.WormholesSafeRender?.setAttribute?.(image, "src", preview.src, {
    image: true,
    imageKind: preview.imageKind || "visionThumbnail",
  });
}

function closeExpandedVisionImage() {
  expandedVisionLoadVersion += 1;
  if (expandedVisionId) {
    const oldPin = document.querySelector(
      `.vision-pin[data-vision-id="${cssEscapeValue(expandedVisionId)}"]`,
    );
    restoreVisionPinPreview(oldPin, expandedVisionId);
    oldPin?.classList.remove("expanded");
    oldPin?.setAttribute("aria-expanded", "false");

    if (oldPin && expandedVisionPlaceholder?.parentNode) {
      expandedVisionPlaceholder.parentNode.insertBefore(oldPin, expandedVisionPlaceholder);
    }
  }

  clearExpandedVisionObjectUrl();

  if (expandedVisionPlaceholder?.parentNode) {
    expandedVisionPlaceholder.parentNode.removeChild(expandedVisionPlaceholder);
  }

  expandedVisionPlaceholder = null;
  expandedVisionId = null;
  const backdrop = document.getElementById("visionEnlargeBackdrop");
  backdrop?.classList.remove("open");
  backdrop?.setAttribute("aria-hidden", "true");
}

async function openExpandedVisionImage(itemId) {
  if (visionMoveMode || !itemId) return;
  const pin = document.querySelector(
    `#visionBoardGrid .vision-pin[data-vision-id="${cssEscapeValue(itemId)}"]`,
  );
  const image = pin?.querySelector?.("img");
  const item = getVisionItem(itemId);
  if (!pin || !image || !item) return;

  if (expandedVisionId && expandedVisionId !== itemId) {
    closeExpandedVisionImage();
  }

  const loadVersion = ++expandedVisionLoadVersion;
  (globalThis.controllerServices || globalThis).closeMenus();
  const rect = pin.getBoundingClientRect();
  expandedVisionPlaceholder = document.createElement("div");
  expandedVisionPlaceholder.className = "vision-pin-expanded-placeholder";
  expandedVisionPlaceholder.style.minHeight = `${Math.max(150, Math.round(rect.height))}px`;
  expandedVisionPlaceholder.style.gridColumn = getComputedStyle(pin).gridColumn;
  expandedVisionPlaceholder.style.gridRow = getComputedStyle(pin).gridRow;
  pin.parentNode?.insertBefore(expandedVisionPlaceholder, pin);

  document.body.appendChild(pin);
  expandedVisionId = itemId;
  pin.classList.add("expanded");
  pin.setAttribute("aria-expanded", "true");

  const backdrop = document.getElementById("visionEnlargeBackdrop");
  backdrop?.classList.add("open");
  backdrop?.setAttribute("aria-hidden", "false");

  try {
    const preview = visionPreviewSourcesById.get(itemId);
    const fullSrc =
      preview?.imageKind === "visionImage"
        ? preview.src
        : await visionItemDisplaySrc(item, currentUniverseId);
    if (loadVersion !== expandedVisionLoadVersion || expandedVisionId !== itemId || !fullSrc)
      return;
    const safeFullSrc =
      window.WormholesSafeRender?.safeImageUrl?.(fullSrc, {imageKind: "visionImage"}) || "";
    if (!safeFullSrc) return;

    const previewSrc = visionPreviewSourcesById.get(itemId)?.src || "";
    clearExpandedVisionObjectUrl();
    if (safeFullSrc.startsWith("blob:") && safeFullSrc !== previewSrc) {
      expandedVisionObjectUrl = safeFullSrc;
    }
    await decodeVisionFullImageIntoElement(image, safeFullSrc, {
      fallbackSource: previewSrc,
      fallbackKind: visionPreviewSourcesById.get(itemId)?.imageKind || "visionThumbnail",
    });
    if (loadVersion !== expandedVisionLoadVersion || expandedVisionId !== itemId) {
      restoreVisionPinPreview(pin, itemId);
    }
  } catch (e) {
    // Keep the already-visible thumbnail when the full image cannot be decoded.
  }
}

function toggleExpandedVisionImage(itemId) {
  if (expandedVisionId === itemId) {
    closeExpandedVisionImage();
  } else {
    openExpandedVisionImage(itemId);
  }
}

function handleVisionBoardDelegatedClick(event) {
  if (event.target.closest?.("#visionEnlargeBackdrop")) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    closeExpandedVisionImage();
    return false;
  }

  const tagButton = event.target.closest?.(".vision-pin-tag[data-tag-type]");
  if (tagButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openVisionTagGoModal({
      type: tagButton.dataset.tagType,
      universeId: tagButton.dataset.universeId || "",
      entryId: tagButton.dataset.entryId || "",
      title: tagButton.dataset.tagTitle || tagButton.textContent.trim(),
    });
    return false;
  }

  const expandedPinAny = event.target.closest?.(".vision-pin.expanded");

  const menuButton = event.target.closest?.(".vision-pin-menu-button");
  if (menuButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    (globalThis.controllerServices || globalThis).togglePositionedMenu(menuButton.nextElementSibling);
    return false;
  }

  const action = event.target.closest?.(
    ".vision-rename-action, .vision-tag-action, .vision-move-action, .vision-copy-universe-action, .vision-delete-action",
  );
  if (action) {
    const pin = action.closest(".vision-pin");
    const id = pin?.dataset?.visionId;
    if (!id) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    (globalThis.controllerServices || globalThis).closeMenus();
    closeExpandedVisionImage();

    if (action.classList.contains("vision-rename-action")) {
      openVisionRenameModal(id);
    } else if (action.classList.contains("vision-tag-action")) {
      openVisionTagModal(id);
    } else if (action.classList.contains("vision-move-action")) {
      moveVisionItem(id);
    } else if (action.classList.contains("vision-copy-universe-action")) {
      openCopyToUniverseModal("vision", id);
    } else if (action.classList.contains("vision-delete-action")) {
      openVisionDeleteConfirm(id);
    }

    return false;
  }

  if (
    expandedPinAny &&
    !event.target.closest?.(".vision-pin-menu-wrap") &&
    !event.target.closest?.(".vision-pin-tags")
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    closeExpandedVisionImage();
    return false;
  }

  const grid = event.target.closest?.("#visionBoardGrid");
  if (!grid) return;

  const clickedPin = event.target.closest?.("#visionBoardGrid .vision-pin.expandable");
  if (
    clickedPin &&
    !visionMoveMode &&
    clickedPin.querySelector("img") &&
    !event.target.closest?.(".vision-pin-menu-wrap")
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    toggleExpandedVisionImage(clickedPin.dataset.visionId);
    return false;
  }
}

let visionPointerDragState = null;

function clearVisionDragIndicators() {
  document
    .querySelectorAll(
      ".vision-pin.dragging, .vision-pin.drag-over, .vision-pin.drag-before, .vision-pin.drag-after",
    )
    .forEach((item) => {
      item.classList.remove("dragging", "drag-over", "drag-before", "drag-after");
      if (item.dataset) delete item.dataset.dropPosition;
    });
}

function findVisionDropPinAtPoint(clientX, clientY, sourceId) {
  const pins = Array.from(
    document.querySelectorAll("#visionBoardGrid .vision-pin[data-vision-id]"),
  );
  return (
    pins.find((pin) => {
      if (!pin?.dataset?.visionId || pin.dataset.visionId === sourceId) return false;
      const rect = pin.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    }) || null
  );
}

function setVisionDropIndicator(pin, clientX, clientY) {
  if (!pin) return "before";
  const rect = pin.getBoundingClientRect();
  const horizontal = rect.width >= rect.height;
  const before = horizontal
    ? clientX < rect.left + rect.width / 2
    : clientY < rect.top + rect.height / 2;

  pin.dataset.dropPosition = before ? "before" : "after";
  pin.classList.toggle("drag-before", before);
  pin.classList.toggle("drag-after", !before);
  pin.classList.add("drag-over");
  return pin.dataset.dropPosition;
}

function updateVisionPointerDrag(event) {
  if (!visionPointerDragState || !activeVisionDragId) return;
  event.preventDefault();
  event.stopPropagation();

  const deltaX = Math.abs(event.clientX - visionPointerDragState.startX);
  const deltaY = Math.abs(event.clientY - visionPointerDragState.startY);
  if (deltaX > 3 || deltaY > 3) visionPointerDragState.moved = true;

  const targetPin = findVisionDropPinAtPoint(event.clientX, event.clientY, activeVisionDragId);
  clearVisionDragIndicators();
  visionPointerDragState.pin?.classList.add("dragging");

  if (targetPin) {
    visionPointerDragState.targetId = targetPin.dataset.visionId;
    visionPointerDragState.dropPosition = setVisionDropIndicator(
      targetPin,
      event.clientX,
      event.clientY,
    );
  } else {
    visionPointerDragState.targetId = "";
    visionPointerDragState.dropPosition = "";
  }
}

function finishVisionPointerDrag(event, shouldDrop = true) {
  if (!visionPointerDragState) return;
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const state = visionPointerDragState;
  visionPointerDragState = null;

  const sourceId = activeVisionDragId || state.sourceId;
  const targetId = state.targetId || "";
  const dropPosition = state.dropPosition || "before";
  activeVisionDragId = null;

  try {
    state.dragLayer?.releasePointerCapture?.(state.pointerId);
  } catch (e) {}

  clearVisionDragIndicators();

  if (shouldDrop && state.moved && sourceId) {
    if (targetId && sourceId !== targetId) {
      const targetIndex = visionEntries.findIndex((item) => item.id === targetId);
      if (targetIndex >= 0) {
        const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex;
        moveVisionItemToIndex(sourceId, insertIndex);
        return;
      }
    }

    const grid = document.getElementById("visionBoardGrid");
    if (event && grid) {
      const rect = grid.getBoundingClientRect();
      const overGrid =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (overGrid) moveVisionItemToEnd(sourceId);
    }
  }
}

function startVisionPointerDrag(event, pin, dragLayer) {
  if (!visionMoveMode || !pin?.dataset?.visionId || event.target.closest?.(".menu-wrap")) return;
  if (typeof event.button === "number" && event.button !== 0) return;

  event.preventDefault();
  event.stopPropagation();

  activeVisionDragId = pin.dataset.visionId;
  visionPointerDragState = {
    sourceId: activeVisionDragId,
    pin,
    dragLayer,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    targetId: "",
    dropPosition: "",
  };

  clearVisionDragIndicators();
  pin.classList.add("dragging");

  try {
    dragLayer?.setPointerCapture?.(event.pointerId);
  } catch (e) {}
}

function installVisionBoardMenuHandlers() {
  const grid = document.getElementById("visionBoardGrid");

  document.querySelectorAll("#visionBoardGrid .menu-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      (globalThis.controllerServices || globalThis).togglePositionedMenu(button.nextElementSibling);
    });
  });

  document.getElementById("finishVisionMoveBtn")?.addEventListener("click", finishVisionMoveMode);

  document.querySelectorAll("#visionBoardGrid .vision-pin").forEach((pin) => {
    pin.setAttribute("draggable", visionMoveMode ? "true" : "false");

    const dragLayer = pin.querySelector(".vision-drag-layer");
    if (dragLayer) {
      dragLayer.addEventListener("pointerdown", (event) =>
        startVisionPointerDrag(event, pin, dragLayer),
      );
      dragLayer.addEventListener("pointermove", updateVisionPointerDrag);
      dragLayer.addEventListener("pointerup", (event) => finishVisionPointerDrag(event, true));
      dragLayer.addEventListener("pointercancel", (event) => finishVisionPointerDrag(event, false));
      dragLayer.addEventListener("lostpointercapture", (event) => {
        if (visionPointerDragState?.pointerId === event.pointerId)
          finishVisionPointerDrag(event, false);
      });
    }

    pin.addEventListener("dragstart", (event) => {
      const startedFromDragSurface =
        event.target.closest?.(".vision-drag-layer") || event.currentTarget === pin;
      if (!visionMoveMode || !startedFromDragSurface || event.target.closest?.(".menu-wrap")) {
        event.preventDefault();
        return;
      }

      if (visionPointerDragState) {
        event.preventDefault();
        return;
      }

      activeVisionDragId = pin.dataset.visionId;
      pin.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", activeVisionDragId || "");
      try {
        event.dataTransfer.setDragImage(
          pin,
          Math.min(24, pin.clientWidth / 2),
          Math.min(24, pin.clientHeight / 2),
        );
      } catch (e) {}
    });

    pin.addEventListener("dragend", () => {
      activeVisionDragId = null;
      clearVisionDragIndicators();
    });

    pin.addEventListener("dragover", (event) => {
      if (!activeVisionDragId || activeVisionDragId === pin.dataset.visionId) return;
      event.preventDefault();

      const rect = pin.getBoundingClientRect();
      const horizontal = rect.width >= rect.height;
      const before = horizontal
        ? event.clientX < rect.left + rect.width / 2
        : event.clientY < rect.top + rect.height / 2;

      pin.dataset.dropPosition = before ? "before" : "after";
      pin.classList.toggle("drag-before", before);
      pin.classList.toggle("drag-after", !before);
      pin.classList.add("drag-over");
    });

    pin.addEventListener("dragleave", () => {
      pin.classList.remove("drag-over", "drag-before", "drag-after");
      delete pin.dataset.dropPosition;
    });

    pin.addEventListener("drop", (event) => {
      if (!activeVisionDragId || activeVisionDragId === pin.dataset.visionId) return;
      event.preventDefault();

      const targetIndex = visionEntries.findIndex((item) => item.id === pin.dataset.visionId);
      const dropPosition = pin.dataset.dropPosition || "before";
      const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex;

      moveVisionItemToIndex(activeVisionDragId, insertIndex);
      activeVisionDragId = null;
    });
  });

  if (grid && grid.dataset.visionGridDragBound !== "true") {
    grid.dataset.visionGridDragBound = "true";

    grid.addEventListener("dragover", (event) => {
      if (activeVisionDragId) event.preventDefault();
    });

    grid.addEventListener("drop", (event) => {
      if (!activeVisionDragId) return;
      if (event.target.closest?.(".vision-pin")) return;
      event.preventDefault();
      moveVisionItemToEnd(activeVisionDragId);
      clearVisionDragIndicators();
      activeVisionDragId = null;
    });
  }

  document.querySelectorAll(".vision-rename-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.closest(".vision-pin")?.dataset?.visionId;
      (globalThis.controllerServices || globalThis).closeMenus();
      openVisionRenameModal(id);
    });
  });

  document.querySelectorAll(".vision-tag-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.closest(".vision-pin")?.dataset?.visionId;
      (globalThis.controllerServices || globalThis).closeMenus();
      openVisionTagModal(id);
    });
  });

  document.querySelectorAll(".vision-move-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.closest(".vision-pin")?.dataset?.visionId;
      (globalThis.controllerServices || globalThis).closeMenus();
      moveVisionItem(id);
    });
  });

  document.querySelectorAll(".vision-copy-universe-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.closest(".vision-pin")?.dataset?.visionId;
      (globalThis.controllerServices || globalThis).closeMenus();
      openCopyToUniverseModal("vision", id);
    });
  });

  document.querySelectorAll(".vision-delete-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.closest(".vision-pin")?.dataset?.visionId;
      (globalThis.controllerServices || globalThis).closeMenus();
      openVisionDeleteConfirm(id);
    });
  });

  (globalThis.controllerServices || globalThis).syncAllAppButtonStates(document.getElementById("visionBoardGrid"));
}

function openVisionRenameModal(itemId) {
  const item = getVisionItem(itemId);
  if (!item) return;

  activeVisionRenameId = itemId;
  document.getElementById("visionRenameError").classList.remove("show");
  document.getElementById("visionRenameInput").value =
    item.title || item.sourceName || "Untitled Vision";
  document.getElementById("visionRenameModal").classList.add("open");
  setTimeout(() => document.getElementById("visionRenameInput").focus(), 0);
}

function closeVisionRenameModal() {
  const modal = document.getElementById("visionRenameModal");
  modal?.classList.remove("open");
  activeVisionRenameId = null;
}

async function saveVisionRename() {
  const item = getVisionItem(activeVisionRenameId);
  if (!item) return false;

  const titleInput = document.getElementById("visionRenameInput");
  const title = titleInput.value.trim();
  if (!title) {
    document.getElementById("visionRenameError").classList.add("show");
    titleInput.focus();
    return false;
  }

  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      previousValue: item.title || "",
      fieldName: "image title",
      operation: "rename this image",
    }).ok
  )
    return false;

  const previousItem = JSON.parse(JSON.stringify(item));
  const message = document.getElementById("visionBoardMessage");
  let folderRename = null;
  let folderWarning = "";

  item.title = title;

  try {
    if (
      item.storage === "folder" &&
      item.folderFileName &&
      visionFolderHandle &&
      (await (globalThis.controllerServices || globalThis).requestFolderPermission(visionFolderHandle))
    ) {
      const oldName = item.folderFileName;
      const oldHandle = await visionFolderHandle.getFileHandle(oldName);
      const oldFile = await oldHandle.getFile();
      const extension =
        item.fileType === "pdf"
          ? ".pdf"
          : (globalThis.controllerServices || globalThis).extensionForStoredFileName(oldName, ".jpg");
      await (globalThis.controllerServices || globalThis).renameFolderBackedRecordFile(
        item,
        visionFolderHandle,
        title || item.sourceName || "vision",
        extension,
        oldFile,
      );
      folderRename = {oldName, newName: item.folderFileName, oldFile};
    }
  } catch (e) {
    folderWarning = "Renamed in app. Folder rename failed.";
    rememberFolderSaveFailure(
      "Vision image renamed in app, but could not rename the local folder file",
      e,
      folderWarning,
    );
  }

  if (!saveVisionBoardToStorage().ok) {
    if (folderRename?.newName && folderRename.newName !== folderRename.oldName) {
      try {
        if (folderRename.oldName)
          await (globalThis.controllerServices || globalThis).writeBlobToFolder(
            visionFolderHandle,
            folderRename.oldName,
            folderRename.oldFile,
          );
        await (globalThis.controllerServices || globalThis).removeFileFromFolder(visionFolderHandle, folderRename.newName);
      } catch (e) {
        rememberFolderSaveFailure(
          "Vision image rename could not be rolled back in the local folder",
          e,
          "The image title was not saved, and the local folder may need attention.",
        );
      }
    }

    restoreVisionItemSnapshot(item, previousItem);
    if (message)
      message.textContent = "Image rename could not be saved. Your previous title was kept.";
    reportAppError(
      "Could not save Vision Board rename",
      new Error("Vision Board rename persistence failed"),
      {
        userMessage: "Image rename could not be saved. Your previous title was kept.",
      },
    );
    titleInput.focus();
    return false;
  }

  if (message) message.textContent = folderWarning;
  visionMoveMode = false;
  activeVisionDragId = null;
  closeVisionRenameModal();
  closeVisionDeleteConfirm();
  (globalThis.controllerServices || globalThis).closeMenus();
  await renderVisionBoard();
  (globalThis.controllerServices || globalThis).syncAllAppButtonStates(document.getElementById("visionBoardGrid"));
  (globalThis.controllerServices || globalThis).renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active"))
    (globalThis.controllerServices || globalThis).renderConnectionsMap();
  if (document.getElementById("wormholesModal")?.classList.contains("open"))
    (globalThis.controllerServices || globalThis).renderWormholesMap();
  showSavedToast("Image renamed");
  return true;
}

function moveVisionItem(itemId) {
  const resetView = resetVisionViewForMoving();
  visionMoveMode = true;
  const message = document.getElementById("visionBoardMessage");
  if (message) message.textContent = resetView ? "Showing Custom Order while moving images." : "";
  renderVisionBoard().then(() => {
    const pin = document.querySelector(`.vision-pin[data-vision-id="${CSS.escape(itemId || "")}"]`);
    pin?.classList.add("drag-over");
    setTimeout(() => pin?.classList.remove("drag-over"), 1200);
  });
}

function finishVisionMoveMode() {
  visionMoveMode = false;
  activeVisionDragId = null;
  const message = document.getElementById("visionBoardMessage");
  if (message) message.textContent = "";
  renderVisionBoard();
}

function moveVisionItemToIndex(sourceId, targetIndex) {
  const fromIndex = visionEntries.findIndex((item) => item.id === sourceId);
  if (fromIndex < 0) return false;

  const previousOrder = visionEntries.slice();
  const [item] = visionEntries.splice(fromIndex, 1);
  const adjustedIndex = Math.max(
    0,
    Math.min(visionEntries.length, fromIndex < targetIndex ? targetIndex - 1 : targetIndex),
  );
  visionEntries.splice(adjustedIndex, 0, item);

  if (!saveVisionBoardToStorage().ok) {
    visionEntries = previousOrder;
    renderVisionBoard();
    reportAppError(
      "Could not save image order",
      new Error("Vision Board reorder persistence failed"),
      {
        userMessage: "Image order could not be saved. The previous order was restored.",
      },
    );
    return false;
  }

  renderVisionBoard();
  showSavedToast("Image moved");
  return true;
}

function moveVisionItemToTarget(sourceId, targetId) {
  const toIndex = visionEntries.findIndex((item) => item.id === targetId);
  if (toIndex < 0) return;
  moveVisionItemToIndex(sourceId, toIndex);
}

function moveVisionItemToEnd(sourceId) {
  const fromIndex = visionEntries.findIndex((item) => item.id === sourceId);
  if (fromIndex < 0 || fromIndex === visionEntries.length - 1) return;

  moveVisionItemToIndex(sourceId, visionEntries.length);
}

function openVisionDeleteConfirm(itemId) {
  const item = getVisionItem(itemId);
  if (!item) return;

  activeVisionDeleteId = itemId;
  const title = item.title || item.sourceName || "this image";
  document.getElementById("visionDeleteConfirmTitle").textContent = `Delete “${title}”?`;
  document.getElementById("visionDeleteConfirmText").textContent =
    "This removes the image and its tags. You can restore it from the notification or Recent Activity for two minutes.";
  document.getElementById("visionDeleteConfirmModal").classList.add("open");
}

function closeVisionDeleteConfirm() {
  document.getElementById("visionDeleteConfirmModal")?.classList.remove("open");
  activeVisionDeleteId = null;
}

async function confirmVisionDelete() {
  const itemId = activeVisionDeleteId;
  if (!itemId) return false;

  const item = getVisionItem(itemId);
  closeVisionDeleteConfirm();
  if (!item) return false;
  const undoState = window.WormholesUndo?.captureState?.();
  const deletedItem = JSON.parse(JSON.stringify(item));
  const deletedUniverse = (globalThis.controllerServices || globalThis).getCurrentUniverse();
  const deletedVisionFolderHandle = visionFolderHandle;
  const previousEntries = visionEntries.slice();

  visionEntries = visionEntries.filter((entry) => entry.id !== itemId);
  if (!saveVisionBoardToStorage().ok) {
    visionEntries = previousEntries;
    await renderVisionBoard();
    (globalThis.controllerServices || globalThis).renderArchive();
    reportAppError(
      "Could not delete Vision Board image",
      new Error("Vision Board deletion persistence failed"),
      {
        userMessage: "The image could not be deleted. It remains on your Vision Board.",
      },
    );
    return false;
  }

  renderVisionBoard();
  (globalThis.controllerServices || globalThis).renderArchive();
  if (document.getElementById("connectionsScreen")?.classList.contains("active"))
    (globalThis.controllerServices || globalThis).renderConnectionsMap();
  if (document.getElementById("wormholesModal")?.classList.contains("open"))
    (globalThis.controllerServices || globalThis).renderWormholesMap();

  const finalize = async () => {
    if (localFoldersEnabled && deletedItem.storage === "folder" && deletedItem.folderFileName) {
      await (globalThis.controllerServices || globalThis).ensureWormholesFolderReadyForDestructiveSync();
      let folderHandle = deletedVisionFolderHandle;
      if (!folderHandle) {
        const folders = deletedUniverse ? await ensureUniverseFolders(deletedUniverse) : null;
        folderHandle = folders?.images || null;
      }
      await (globalThis.controllerServices || globalThis).deleteFolderBackedRecordFile(deletedItem, folderHandle);
    }
    await deleteVisionLargeData(deletedItem);
    await (globalThis.controllerServices || globalThis).pruneWormholesFolderToAppState();
  };

  if (window.WormholesUndo && undoState) {
    await window.WormholesUndo.offer({
      message: "Image deleted",
      restoredMessage: "Image restored",
      state: undoState,
      finalize,
    });
  } else {
    await finalize();
    showSavedToast("Image deleted");
  }
  return true;
}

async function deleteVisionItem(itemId) {
  openVisionDeleteConfirm(itemId);
}

async function openVisionLinksModal(type, universeId, entryId = "") {
  const rows =
    type === "universe"
      ? visionItemsForUniverseTag(universeId)
      : type === "groupChildren"
        ? visionItemsForGroupChildrenTag(universeId, entryId)
        : visionItemsForEntryTag(universeId, entryId);

  const title =
    type === "universe"
      ? (globalThis.controllerServices || globalThis).getUniverseTitle(universeId)
      : type === "groupChildren"
        ? `${(globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(universeId, entryId)} children`
        : (globalThis.controllerServices || globalThis).visibleEntryTitleForUniverseEntry(universeId, entryId);

  document.getElementById("visionLinksTitle").textContent = `Images tagged to ${title}`;
  document.getElementById("visionLinksSubtitle").textContent =
    `${rows.length} image${rows.length === 1 ? "" : "s"} tagged here.`;
  document.getElementById("visionLinksList").innerHTML = rows.length
    ? rows
        .map(
          (row) => `
        <div class="vision-link-card">
          <button class="vision-link-thumb" type="button" data-home-universe-id="${escapeHtml(row.homeUniverseId)}" data-vision-id="${escapeHtml(row.item.id)}" aria-label="Open expanded view of ${escapeHtml(row.item.title || row.item.sourceName || "image")}">
            <span>${row.item.fileType === "pdf" ? "PDF" : "Image"}</span>
          </button>
          <span class="vision-link-title">${escapeHtml(row.item.title || row.item.sourceName || "Image")}</span>
          <span class="vision-link-meta">${escapeHtml((globalThis.controllerServices || globalThis).getUniverseTitle(row.homeUniverseId))}</span>
        </div>
      `,
        )
        .join("")
    : `<p class="empty-archive">No images are tagged here yet.</p>`;

  document.getElementById("visionLinksModal").classList.add("open");
  await populateVisionLinksThumbnails();
  (globalThis.controllerServices || globalThis).protectAllControls(document.getElementById("visionLinksModal"));
}

async function populateVisionLinksThumbnails() {
  visionLinksObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  visionLinksObjectUrls = [];

  const thumbs = Array.from(document.querySelectorAll("#visionLinksList .vision-link-thumb"));
  for (const thumb of thumbs) {
    const item = getVisionItemFromUniverse(thumb.dataset.homeUniverseId, thumb.dataset.visionId);
    if (!item) continue;

    if (item.fileType === "pdf") {
      thumb.innerHTML = `<span>PDF</span>`;
      thumb.disabled = true;
      thumb.setAttribute("aria-disabled", "true");
      thumb.setAttribute(
        "aria-label",
        `${item.title || item.sourceName || "PDF"} cannot be expanded as an image preview`,
      );
      continue;
    }

    thumb.disabled = false;
    thumb.removeAttribute("aria-disabled");
    thumb.setAttribute(
      "aria-label",
      `Open expanded view of ${item.title || item.sourceName || "image"}`,
    );

    await populateVisionThumbnailButton(
      thumb,
      item,
      thumb.dataset.homeUniverseId,
      visionLinksObjectUrls,
    );
  }
}

function closeVisionLinksModal() {
  document.getElementById("visionLinksModal")?.classList.remove("open");
  visionLinksObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  visionLinksObjectUrls = [];
}

function clearVisionImageViewerObjectUrl() {
  if (visionImageViewerObjectUrl) {
    URL.revokeObjectURL(visionImageViewerObjectUrl);
    visionImageViewerObjectUrl = "";
  }
}

function resetVisionImageViewer() {
  visionImageViewerLoadVersion += 1;
  clearVisionImageViewerObjectUrl();
  const img = document.getElementById("visionImageViewerImg");
  const frame = document.getElementById("visionImageViewerFrame");
  const status = document.getElementById("visionImageViewerStatus");
  if (img) {
    img.onload = null;
    img.onerror = null;
    img.removeAttribute("src");
    img.alt = "";
  }
  frame?.classList.remove("has-image");
  if (status) status.textContent = "Loading image…";
}

async function openVisionImageViewer(homeUniverseId, visionId) {
  const item = getVisionItemFromUniverse(homeUniverseId, visionId);
  if (!item || item.fileType === "pdf") return;

  const modal = document.getElementById("visionImageViewerModal");
  const title = document.getElementById("visionImageViewerTitle");
  const subtitle = document.getElementById("visionImageViewerSubtitle");
  const frame = document.getElementById("visionImageViewerFrame");
  const status = document.getElementById("visionImageViewerStatus");
  const img = document.getElementById("visionImageViewerImg");
  if (!modal || !img) return;

  resetVisionImageViewer();
  const loadVersion = visionImageViewerLoadVersion;
  const imageTitle = item.title || item.sourceName || "Image";
  if (title) title.textContent = imageTitle;
  if (subtitle)
    subtitle.textContent = `From ${(globalThis.controllerServices || globalThis).getUniverseTitle(homeUniverseId)}`;
  if (status) status.textContent = "Loading image…";

  modal.classList.add("open");
  (globalThis.controllerServices || globalThis).protectAllControls(modal);

  try {
    const src = await visionItemDisplaySrc(item, homeUniverseId);
    if (loadVersion !== visionImageViewerLoadVersion || !modal.classList.contains("open")) return;
    if (!src) {
      if (status) status.textContent = "This image could not be loaded.";
      return;
    }

    if (src.startsWith("blob:")) visionImageViewerObjectUrl = src;
    img.alt = imageTitle;
    const decoded = await decodeVisionFullImageIntoElement(img, src);
    if (loadVersion !== visionImageViewerLoadVersion || !modal.classList.contains("open")) return;
    if (!decoded) {
      if (status) status.textContent = "This image could not be displayed.";
      clearVisionImageViewerObjectUrl();
      img.removeAttribute("src");
      return;
    }

    frame?.classList.add("has-image");
    if (status) status.textContent = "";
  } catch (e) {
    if (loadVersion !== visionImageViewerLoadVersion) return;
    frame?.classList.remove("has-image");
    if (status) status.textContent = "This image could not be loaded.";
    clearVisionImageViewerObjectUrl();
    img.removeAttribute("src");
    reportAppError("Could not open expanded image preview", e, {
      userMessage: "Could not open this image preview.",
    });
  }
}

function closeVisionImageViewerModal() {
  document.getElementById("visionImageViewerModal")?.classList.remove("open");
  resetVisionImageViewer();
}

function bindVisionBadgeClickHandlers(root = document) {
  root.querySelectorAll?.(".svg-vision-indicator").forEach((badge) => {
    if (badge.dataset.visionBadgeBound === "true") return;
    badge.dataset.visionBadgeBound = "true";

    badge.addEventListener(
      "pointerdown",
      (event) => {
        event.stopPropagation();
      },
      true,
    );

    badge.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        openVisionLinksModal(
          badge.dataset.visionLinkType,
          badge.dataset.universeId,
          badge.dataset.entryId || "",
        );
        return false;
      },
      true,
    );
  });
}

function openVisionUploadModal() {
  const note = document.querySelector("#visionUploadModal .literature-upload-note");
  if (note) {
    note.textContent =
      "Accepts JPEG and PNG up to 75 MB each; up to 300 MB per selection. PDFs are not supported.";
  }
  document.getElementById("visionUploadModal")?.classList.add("open");
}

function closeVisionUploadModal() {
  document.getElementById("visionUploadModal")?.classList.remove("open");
}

function chooseVisionUploadFiles() {
  closeVisionUploadModal();
  (globalThis.controllerServices || globalThis).closeLocalFolderDeletionWarningModal();
  (globalThis.controllerServices || globalThis).closeLocalFolderNotFoundModal();
  document.getElementById("visionFileInput").click();
}

async function uploadVisionFiles(files) {
  const fileList = Array.from(files || []);
  if (fileList.length === 0) return;

  const message = document.getElementById("visionBoardMessage");
  const sizeResult = window.WormholesFileLimits?.enforce?.(fileList, "vision", {
    label: "Vision Board image",
  });
  if (sizeResult && !sizeResult.ok) {
    if (message)
      message.textContent =
        "Images were not added because the selected file or batch is too large.";
    const input = document.getElementById("visionFileInput");
    if (input) input.value = "";
    return;
  }
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("vision", visionEntries.length, fileList.length, {
      context: (globalThis.controllerServices || globalThis).getCurrentUniverse()?.title || "",
      operation: "add these images",
    }).ok
  ) {
    if (message)
      message.textContent =
        "Images were not added because this Vision Board has reached its supported item limit.";
    const input = document.getElementById("visionFileInput");
    if (input) input.value = "";
    return;
  }
  if (window.WormholesStorageCapacity?.preflight) {
    const capacityResult = await window.WormholesStorageCapacity.preflight({
      operationLabel: `adding ${fileList.length} image${fileList.length === 1 ? "" : "s"}`,
      requiredBytes: window.WormholesStorageCapacity.estimateFileBatchBytes(fileList, {
        kind: "vision",
        folderBacked: !!(localFoldersEnabled && visionFolderHandle),
      }),
      continueLabel: "Add Anyway",
    });
    if (!capacityResult.approved) {
      if (message)
        message.textContent =
          capacityResult.status === "block"
            ? "Images were not added because there is not enough estimated browser storage."
            : "Adding images was canceled.";
      const input = document.getElementById("visionFileInput");
      if (input) input.value = "";
      return;
    }
  }
  if (message) message.textContent = "Adding image files...";

  const skipped = [];
  let savedCount = 0;
  const usedAppOnlyImageStorage = !localFoldersEnabled;

  for (const file of fileList) {
    let item = null;
    try {
      item = await convertUploadedVisionFile(file);
      visionEntries.unshift(item);
      await persistVisionLargeData(currentUniverseId, item);

      const saveResult = saveVisionBoardToStorage();
      if (saveResult.ok) {
        savedCount += 1;
      } else {
        visionEntries = visionEntries.filter((entry) => entry.id !== item.id);
        await deleteVisionLargeData(item);
        if (item.storage === "folder" && item.folderFileName && visionFolderHandle) {
          await (globalThis.controllerServices || globalThis).removeFileFromFolder(visionFolderHandle, item.folderFileName);
        }
        skipped.push(
          `${file.name}: ${saveResult.userMessage || "Could not save this image. Try again."}`,
        );
      }
    } catch (e) {
      if (item) {
        visionEntries = visionEntries.filter((entry) => entry.id !== item.id);
        await deleteVisionLargeData(item);
        if (item.storage === "folder" && item.folderFileName && visionFolderHandle) {
          await (globalThis.controllerServices || globalThis).removeFileFromFolder(visionFolderHandle, item.folderFileName);
        }
      }
      skipped.push(`${file.name}: ${e?.message || "Could not add this file."}`);
    }

    renderVisionBoard();
  }

  renderVisionBoard();

  if (message) {
    if (skipped.length) {
      message.textContent = `Added ${savedCount}. Skipped ${skipped.length}: ${skipped.join(" | ")}`;
    } else {
      message.textContent = savedCount ? `Added ${savedCount}.` : "";
    }
  }

  if (savedCount > 0) {
    showBrowserStorageUploadPrompt("vision");
    showSavedToast("Images added");
  }
  document.getElementById("visionFileInput").value = "";
}

async function connectVisionLocalFolder() {
  await chooseLocalFolderFromCheckbox();
}

function visionBadgeSvg(type, universeId, entryId, localX = 0, count = null) {
  const total =
    count ??
    (type === "universe"
      ? visionCountForUniverseTag(universeId)
      : type === "groupChildren"
        ? visionCountForGroupChildrenTag(universeId, entryId)
        : visionCountForEntryTag(universeId, entryId));
  if (total <= 0) return "";
  return `
    <g class="svg-vision-indicator" data-vision-link-type="${escapeHtml(type)}" data-universe-id="${escapeHtml(universeId)}" data-entry-id="${escapeHtml(entryId || "")}" data-badge-local-x="${localX}" transform="${svgBadgeIconTransform(localX)}">
      <path class="svg-vision-camera-body" d="M -14 -9 H -7 L -4 -13 H 5 L 8 -9 H 14 V 12 H -14 Z"></path>
      <text x="0" y="5" text-anchor="middle">${total}</text>
    </g>
  `;
}

function visionTagTargets(item) {
  if (!item) return [];

  const universeTags = (item.tags?.universes || [])
    .map((id) => {
      const universeTitle = (globalThis.controllerServices || globalThis).getUniverseTitle(id);
      return universeTitle
        ? {
            type: "universe",
            universeId: id,
            entryId: "",
            title: `Universe: ${universeTitle}`,
          }
        : null;
    })
    .filter(Boolean);

  const entryTags = (item.tags?.entries || [])
    .map((tag) => {
      const archive =
        tag.universeId === currentUniverseId
          ? archiveEntries
          : readArchiveForUniverse(tag.universeId);
      const entry = archive.find((row) => row.id === tag.entryId);
      if (!entry) return null;

      const universeTitle = (globalThis.controllerServices || globalThis).getUniverseTitle(tag.universeId);
      const prefix = (globalThis.controllerServices || globalThis).isGroupEntry(entry) ? "Group" : "Creation";
      return {
        type: "entry",
        universeId: tag.universeId,
        entryId: tag.entryId,
        title: `${prefix}: ${entry.title}${universeTitle ? ` (${universeTitle})` : ""}`,
      };
    })
    .filter(Boolean);

  return [...universeTags, ...entryTags];
}

function visionTagLabels(item) {
  return visionTagTargets(item).map((target) => target.title);
}

function visionTagCount(item) {
  return visionTagTargets(item).length;
}

function visionTagCountBadgeHtml(item) {
  const total = visionTagCount(item);
  if (total <= 0) return "";
  const label = `${total} tagged ${total === 1 ? "entity" : "entities"}`;
  return `<span class="vision-tag-count-badge" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${total}</span>`;
}

function renderVisionTagsHtml(item) {
  const targets = visionTagTargets(item);
  if (!targets.length) {
    return `<span class="vision-pin-tag-empty">No tags</span>`;
  }

  return targets
    .map(
      (target) => `
    <button class="vision-pin-tag" type="button"
      data-tag-type="${escapeHtml(target.type)}"
      data-universe-id="${escapeHtml(target.universeId)}"
      data-entry-id="${escapeHtml(target.entryId || "")}"
      data-tag-title="${escapeHtml(target.title)}">${escapeHtml(target.title)}</button>
  `,
    )
    .join("");
}

function openVisionTagGoModal(target) {
  if (!target?.universeId) return;
  activeVisionTagGoTarget = target;
  closeExpandedVisionImage();
  document.getElementById("visionTagGoText").textContent = `Go to ${target.title}?`;
  document.getElementById("visionTagGoModal").classList.add("open");
}

function closeVisionTagGoModal() {
  document.getElementById("visionTagGoModal")?.classList.remove("open");
  activeVisionTagGoTarget = null;
}

function goToVisionTagTarget() {
  const target = activeVisionTagGoTarget;
  if (!target?.universeId) {
    closeVisionTagGoModal();
    return;
  }

  const revealEntryId = target.type === "entry" ? target.entryId || "" : "";

  closeVisionTagGoModal();
  (globalThis.controllerServices || globalThis).closeMenus();
  closeExpandedVisionImage();

  if (target.universeId !== currentUniverseId) {
    (globalThis.controllerServices || globalThis).enterUniverse(target.universeId);
  }

  switchTab("archive");
  (globalThis.controllerServices || globalThis).revealArchiveEntryForTag(revealEntryId);
}

function openVisionTagModal(itemId) {
  const item = getVisionItem(itemId);
  if (!item) return;
  activeVisionTagId = itemId;
  activeLiteratureTagId = null;
  expandedLiteratureTagGroups = new Set([
    (globalThis.controllerServices || globalThis).nestedPickerKey("literature-universe", currentUniverseId),
  ]);
  initializeTagPickerDraft(item);
  document.getElementById("literatureTagTitle").textContent = `Tag Image: ${item.title}`;
  document.getElementById("literatureTagSubtitle").textContent =
    "Choose tags, then Save and Close.";
  (globalThis.controllerServices || globalThis).renderLiteratureTagList();
  document.getElementById("literatureTagModal").classList.add("open");
}

function toggleVisionUniverseTag(universeId) {
  toggleDraftUniverseTag(universeId);
}

function toggleVisionEntryTag(universeId, entryId) {
  toggleDraftEntryTag(universeId, entryId);
}

function normalizeImportedVisionItem(item, universeId) {
  const canonicalBuilder = window.WormholesCanonicalPersistence?.builders?.vision;
  if (canonicalBuilder) {
    const canonical = canonicalBuilder(item || {}, {
      scope: universeId,
      idFactory: makeId,
      sanitizeDataUrl: safeImportedVisionImageDataUrl,
      normalizeMimeType: safeImportedVisionMimeType,
      normalizeTags: (globalThis.controllerServices || globalThis).normalizeImportedTags,
      dataStoreKeyFor: visionDataStoreKeyFor,
      thumbnailStoreKeyFor: visionThumbnailStoreKeyFor,
      dropInvalidReferences: true,
    });
    return {
      ...canonical,
      tags: {
        universes: [...canonical.tags.universes],
        entries: canonical.tags.entries.map((tag) => ({...tag})),
      },
    };
  }
  const now = new Date().toISOString();
  const id = item?.id || makeId();
  const dataUrl = safeImportedVisionImageDataUrl(item?.dataUrl || "", "visionImage");
  const thumbnailDataUrl = safeImportedVisionImageDataUrl(
    item?.thumbnailDataUrl || "",
    "visionThumbnail",
  );
  const mimeType = safeImportedVisionMimeType(item, dataUrl, thumbnailDataUrl);
  return {
    id,
    title: item?.title || item?.sourceName || "Untitled Vision",
    sourceName: item?.sourceName || item?.title || "",
    fileType: item?.fileType || "image",
    mimeType,
    thumbnailDataUrl,
    dataUrl,
    storage: item?.storage || "",
    folderFileName: item?.folderFileName || "",
    dataStoreKey: visionDataStoreKeyFor(universeId, id),
    thumbnailStoreKey: thumbnailDataUrl ? visionThumbnailStoreKeyFor(universeId, id) : "",
    dataStored: dataUrl ? item?.dataStored || "" : "",
    thumbnailStored: thumbnailDataUrl ? item?.thumbnailStored || "" : "",
    fileSize: item?.fileSize || 0,
    tags: (globalThis.controllerServices || globalThis).normalizeImportedTags(item?.tags),
    createdAt: item?.createdAt || now,
  };
}

async function materializeVisionItemForAppDataExport(item, universeId) {
  await materializeVisionItemLargeData(item, universeId);
  if (item.dataUrl) return item;

  if (item.storage === "folder" && item.folderFileName) {
    const file = await (globalThis.controllerServices || globalThis).folderFileForAppDataExport(
      "images",
      universeId,
      item.folderFileName,
    );
    if (file) {
      try {
        const mimeType = visionMimeTypeForFolderFile(file, item);
        item.dataUrl = dataUrlWithMimeType(await readFileAsDataUrl(file), mimeType);
        item.mimeType = item.mimeType || mimeType || file.type || item.mimeType;
        item.dataStored = "embedded-export";
        if (!item.thumbnailDataUrl && String(mimeType || file.type || "").startsWith("image/")) {
          item.thumbnailDataUrl = await imageFileToThumbnailDataUrl(file);
          item.thumbnailStored = "embedded-export";
        }
      } catch (e) {}
    }
  }

  return item;
}

async function materializeVisionForExport(items, universeId) {
  const result = [];
  for (const original of items || []) {
    const item = normalizeImportedVisionItem(
      (globalThis.controllerServices || globalThis).cloneForAppDataExport(original),
      universeId,
    );
    await materializeVisionItemForAppDataExport(item, universeId);
    result.push({
      ...item,
      dataStored: item.dataUrl ? "embedded-export" : item.dataStored || "",
      thumbnailStored: item.thumbnailDataUrl ? "embedded-export" : item.thumbnailStored || "",
    });
  }
  return result;
}

function prepareImportedVisionForUniverse(universeId, items) {
  return (items || []).map((item) => normalizeImportedVisionItem(item, universeId));
}

async function persistPreparedVisionLargeData(universeId, items) {
  if (!largeDataStoreAvailable()) return true;
  for (const item of items || []) {
    await persistVisionLargeData(universeId, item);
  }
  return true;
}

function writePreparedVisionMetadata(universeId, items) {
  return writeVisionMetadataOnly(universeId, items || []);
}

async function saveImportedVisionForUniverse(universeId, items) {
  const normalized = prepareImportedVisionForUniverse(universeId, items);
  if (!(await persistPreparedVisionLargeData(universeId, normalized))) {
    return {
      ok: false,
      code: "storage_unavailable",
      userMessage: "Imported images could not be saved.",
    };
  }
  return writePreparedVisionMetadata(universeId, normalized);
}

function readVisionBoardForUniverse(universeId) {
  if (universeId === currentUniverseId) return visionEntries;
  try {
    const savedEntries =
      (typeof wormholesRepository === "function" ? wormholesRepository("vision") : null)?.read(
        universeId,
        [],
      ) ??
      readPersistedDatasetData(visionStorageKey(universeId), oldVisionStorageKey(universeId), []);
    const normalized = Array.isArray(savedEntries)
      ? savedEntries.map((item) => ({
          ...normalizeVisionEntry(item),
          dataStoreKey:
            item.dataStoreKey || (item.id ? visionDataStoreKeyFor(universeId, item.id) : ""),
          thumbnailStoreKey:
            item.thumbnailStoreKey ||
            (item.id ? visionThumbnailStoreKeyFor(universeId, item.id) : ""),
        }))
      : [];
    return (
      window.WormholesRenderValidation?.validateVision?.(normalized, {
        storageKey: visionStorageKey(universeId),
        universeId,
        report: false,
        releaseProtection: true,
      })?.value || normalized
    );
  } catch (e) {
    reportAppError("Could not load vision metadata for a universe", e);
    return [];
  }
}

function saveVisionBoardForUniverse(universeId, entries) {
  const preparedEntries = entries || [];
  const ok = writeVisionMetadataOnly(universeId, preparedEntries);
  if (universeId === currentUniverseId) requestStorageFootnoteUpdate();
  if (ok) scheduleVisionLargeDataSave(universeId, preparedEntries);
  return ok;
}

async function migrateAllVisionBoardsToFolder(options = false) {
  const migrationOptions = (globalThis.controllerServices || globalThis).normalizeFolderMigrationOptions(options);
  const force = migrationOptions.force;
  if (!localFoldersEnabled || !wormholesImagesRootHandle) return;

  for (const universe of universes) {
    const folders = await ensureUniverseFolders(universe);
    if (!folders?.images) continue;

    const entries = readVisionBoardForUniverse(universe.id);
    let changed = false;

    for (const item of entries) {
      if (item.storage === "folder" && !force) continue;

      const extension = visionExtensionForStoredItem(item, ".jpg");

      const folderFileName = await (globalThis.controllerServices || globalThis).folderMigrationFileName(
        item,
        folders.images,
        item.title || item.sourceName || "vision",
        extension,
        migrationOptions,
      );

      if (!item.dataUrl) await materializeVisionItemLargeData(item, universe.id);

      if (item.dataUrl) {
        const blob = (globalThis.controllerServices || globalThis).dataUrlToBlob(item.dataUrl);
        await (globalThis.controllerServices || globalThis).writeBlobToFolder(folders.images, folderFileName, blob);
        item.storage = "folder";
        item.folderFileName = folderFileName;
        item.mimeType = item.mimeType || blob.type || visionStoredMimeType(item);
        item.dataUrl = "";
        changed = true;
        continue;
      }

      const sourceFile = await (globalThis.controllerServices || globalThis).sourceFileFromPreviousFolder(
        "images",
        universe,
        item.folderFileName,
      );
      if (sourceFile) {
        await (globalThis.controllerServices || globalThis).writeBlobToFolder(folders.images, folderFileName, sourceFile);
        item.storage = "folder";
        item.folderFileName = folderFileName;
        item.mimeType =
          item.mimeType ||
          visionMimeTypeForFolderFile(sourceFile, item) ||
          sourceFile.type ||
          item.mimeType;
        changed = true;
      }
    }

    if (changed) {
      if (universe.id === currentUniverseId) {
        visionEntries = entries;
        saveVisionBoardToStorage();
      } else {
        saveVisionBoardForUniverse(universe.id, entries);
      }
    }
  }
}

async function syncAllVisionFolderEntries() {
  // Intentionally no-op: vision metadata stays in the app; strict folder cleanup happens in pruneWormholesFolderToAppState().
  return;
}

/* Rendering boundary: callers request a named view; DOM implementation stays behind the coordinator. */
window.WormholesRendering?.register?.("vision", renderVisionBoardView, {domains: ["vision"]});
async function renderVisionBoard() {
  const coordinator = window.WormholesRendering;
  if (coordinator?.has?.("vision")) return await coordinator.render("vision");
  return await renderVisionBoardView();
}

/* Public controller surface for served ES-module builds. */
const VISION_BOARD_CONTROLLER_API = Object.freeze({
  getVisionPage,
  setVisionPage,
  resetVisionPage,
  scrollVisionPageToTop,
  renderVisionPagination,
  defaultVisionFilterState,
  getVisionFilterState,
  visionFilterActiveCount,
  getVisionSortMode,
  setVisionSortMode,
  visionSortModeLabel,
  sanitizeVisionFilterState,
  visionItemFormat,
  visionItemMatchesFilters,
  visionSortComparator,
  buildVisionViewRows,
  syncVisionViewControls,
  setVisionFilterPanelOpen,
  toggleVisionFilterPanel,
  closeVisionFilterPanel,
  applyVisionFiltersFromControls,
  resetVisionFilters,
  setVisionSortPanelOpen,
  toggleVisionSortPanel,
  closeVisionSortPanel,
  applyVisionSortFromControl,
  resetVisionSort,
  resetVisionViewForMoving,
  applyVisionPinActionLabels,
  visionDataStoreKeyFor,
  visionThumbnailStoreKeyFor,
  visionMetadataStorageKeyFor,
  trimVisionItemForLocalStorage,
  writeVisionMetadataOnly,
  persistVisionLargeData,
  scheduleVisionLargeDataSave,
  materializeVisionItemImageData,
  materializeVisionItemThumbnailData,
  materializeVisionItemLargeData,
  deleteVisionLargeData,
  allVisionItemsWithHomeUniverse,
  getVisionItem,
  restoreVisionItemSnapshot,
  getVisionItemFromUniverse,
  visionItemHasUniverseTag,
  visionItemHasEntryTag,
  visionItemsForUniverseTag,
  visionItemsForEntryTag,
  visionItemsForUniverseAndEntriesTag,
  visionItemsForGroupChildrenTag,
  visionCountForUniverseTag,
  visionCountForUniverseAndEntriesTag,
  visionCountForEntryTag,
  visionCountForGroupChildrenTag,
  normalizeVisionEntry,
  loadVisionBoardFromStorage,
  saveVisionBoardToStorage,
  visionFileKind,
  mimeTypeFromDataUrl,
  normalizedImportedVisionImageMimeType,
  importedVisionDataUrlMimeType,
  isSafeImportedVisionImageDataUrl,
  safeImportedVisionImageDataUrl,
  safeImportedVisionMimeType,
  dataUrlWithMimeType,
  visionMimeTypeForFolderFile,
  visionOutputMimeTypeForFile,
  visionExtensionForMimeType,
  visionStoredMimeType,
  visionExtensionForStoredItem,
  readFileAsDataUrl,
  loadImageElementFromFile,
  imageFileToCanvasDataUrl,
  imageFileToPinboardDataUrl,
  imageFileToThumbnailDataUrl,
  regenerateVisionThumbnailDataUrl,
  imageBlobToThumbnailBlob,
  convertUploadedVisionFile,
  migrateVisionBoardToFolder,
  syncVisionFolderEntries,
  visionItemDisplaySrc,
  decodeVisionFullImageIntoElement,
  visionItemThumbnailSource,
  populateVisionThumbnailButton,
  renderVisionBoardView,
  clearExpandedVisionObjectUrl,
  restoreVisionPinPreview,
  closeExpandedVisionImage,
  openExpandedVisionImage,
  toggleExpandedVisionImage,
  handleVisionBoardDelegatedClick,
  clearVisionDragIndicators,
  findVisionDropPinAtPoint,
  setVisionDropIndicator,
  updateVisionPointerDrag,
  finishVisionPointerDrag,
  startVisionPointerDrag,
  installVisionBoardMenuHandlers,
  openVisionRenameModal,
  closeVisionRenameModal,
  saveVisionRename,
  moveVisionItem,
  finishVisionMoveMode,
  moveVisionItemToIndex,
  moveVisionItemToTarget,
  moveVisionItemToEnd,
  openVisionDeleteConfirm,
  closeVisionDeleteConfirm,
  confirmVisionDelete,
  deleteVisionItem,
  openVisionLinksModal,
  populateVisionLinksThumbnails,
  closeVisionLinksModal,
  clearVisionImageViewerObjectUrl,
  resetVisionImageViewer,
  openVisionImageViewer,
  closeVisionImageViewerModal,
  bindVisionBadgeClickHandlers,
  openVisionUploadModal,
  closeVisionUploadModal,
  chooseVisionUploadFiles,
  uploadVisionFiles,
  connectVisionLocalFolder,
  visionBadgeSvg,
  visionTagTargets,
  visionTagLabels,
  visionTagCount,
  visionTagCountBadgeHtml,
  renderVisionTagsHtml,
  openVisionTagGoModal,
  closeVisionTagGoModal,
  goToVisionTagTarget,
  openVisionTagModal,
  toggleVisionUniverseTag,
  toggleVisionEntryTag,
  normalizeImportedVisionItem,
  materializeVisionItemForAppDataExport,
  materializeVisionForExport,
  prepareImportedVisionForUniverse,
  persistPreparedVisionLargeData,
  writePreparedVisionMetadata,
  saveImportedVisionForUniverse,
  readVisionBoardForUniverse,
  saveVisionBoardForUniverse,
  migrateAllVisionBoardsToFolder,
  syncAllVisionFolderEntries,
  renderVisionBoard,
});
(globalThis.registerControllerServices || (() => {}))(VISION_BOARD_CONTROLLER_API);

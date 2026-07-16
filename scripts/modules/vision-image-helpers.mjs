/* Wormholes Beta 261 — Vision image validation, MIME handling, conversion, and thumbnail generation.
   Extracted from an oversized feature controller so this subsystem has a clear owner. */

import {controllerServices} from "./controller-service-registry.mjs";

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

  const storedExtension = controllerServices
    .extensionForStoredFileName(item?.folderFileName || "", "")
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
    [controllerServices.dataUrlToBlob(safeDataUrl)],
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
  return controllerServices.dataUrlToBlob(dataUrl);
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
    (await controllerServices.requestFolderPermission(visionFolderHandle))
  ) {
    try {
      const folderFileName = await controllerServices.uniqueFolderFileName(
        visionFolderHandle,
        title,
        extension,
      );
      const blob = controllerServices.dataUrlToBlob(dataUrl);

      await controllerServices.writeBlobToFolder(visionFolderHandle, folderFileName, blob);

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

export function installLegacyVisionImageHelpersBindings(target = globalThis) {
  Object.assign(target, VISION_IMAGE_HELPERS_API);
  target.WormholesVisionImageHelpers = VISION_IMAGE_HELPERS_API;
  return VISION_IMAGE_HELPERS_API;
}

if (typeof window !== "undefined") installLegacyVisionImageHelpersBindings(window);

export {
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
};

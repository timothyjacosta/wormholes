/* GENERATED from scripts/modules/media-limits.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    const MIB = 1024 * 1024;
    const MAX_DATA_URL_HEADER_CHARS = 512;
    const LIMITS = Object.freeze({
      visionImage: Object.freeze({
        label: "embedded Vision Board image",
        maxDecodedBytes: 75 * MIB,
        allowedMimeTypes: Object.freeze(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
      }),
      visionThumbnail: Object.freeze({
        label: "embedded Vision Board thumbnail",
        maxDecodedBytes: 10 * MIB,
        allowedMimeTypes: Object.freeze(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
      }),
      literatureFile: Object.freeze({
        label: "embedded Literature source file",
        maxDecodedBytes: 50 * MIB,
        allowedMimeTypes: Object.freeze([
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/octet-stream",
        ]),
      }),
    });
    const MAX_TOTAL_EMBEDDED_BYTES = 225 * MIB;
  
    function formatBytes(bytes) {
      const value = Math.max(0, Number(bytes) || 0);
      const fileLimits =
        typeof importedFileLimitsApi !== "undefined"
          ? importedFileLimitsApi
          : window.WormholesFileLimits;
      if (fileLimits?.formatBytes) return fileLimits.formatBytes(value);
      if (value < 1024) return `${Math.round(value)} B`;
      if (value < MIB) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
      if (value < 1024 * MIB) return `${(value / MIB).toFixed(value < 10 * MIB ? 1 : 0)} MB`;
      return `${(value / (1024 * MIB)).toFixed(1)} GB`;
    }
  
    function config(kind) {
      return LIMITS[kind] || LIMITS.visionImage;
    }
  
    function normalizedMimeType(value) {
      const mime = String(value || "")
        .trim()
        .toLowerCase();
      return mime === "image/jpg" ? "image/jpeg" : mime;
    }
  
    function expectedKindForKey(key) {
      const lower = String(key || "").toLowerCase();
      if (lower === "dataurl") return "visionImage";
      if (lower === "thumbnaildataurl") return "visionThumbnail";
      if (lower === "filedata") return "literatureFile";
      return "";
    }
  
    function estimateDecodedBytes(payload) {
      const clean = String(payload || "").replace(/\s+/g, "");
      if (!clean) return 0;
      let padding = 0;
      if (clean.endsWith("==")) padding = 2;
      else if (clean.endsWith("=")) padding = 1;
      return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
    }
  
    function dataUrlResult(value, kind, options = {}) {
      const raw = String(value || "").trim();
      const limit = config(kind);
      const maxDecodedBytes =
        Number(options.maxDecodedBytes) > 0
          ? Math.floor(Number(options.maxDecodedBytes))
          : limit.maxDecodedBytes;
      const context = options.context || "";
      if (!raw) {
        return {
          ok: true,
          kind,
          label: limit.label,
          mimeType: "",
          decodedBytes: 0,
          maxDecodedBytes,
          context,
        };
      }
      if (!/^data:/i.test(raw)) {
        return {
          ok: false,
          issue: "not-data-url",
          kind,
          label: limit.label,
          mimeType: "",
          decodedBytes: 0,
          maxDecodedBytes,
          context,
        };
      }
  
      const commaIndex = raw.indexOf(",");
      if (commaIndex < 5 || commaIndex > MAX_DATA_URL_HEADER_CHARS) {
        return {
          ok: false,
          issue: "malformed",
          kind,
          label: limit.label,
          mimeType: "",
          decodedBytes: 0,
          maxDecodedBytes,
          context,
        };
      }
  
      const header = raw.slice(5, commaIndex);
      const parts = header
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean);
      const mimeType = normalizedMimeType(parts.shift() || "");
      const hasBase64 = parts.some((part) => part.toLowerCase() === "base64");
      if (!mimeType || !hasBase64) {
        return {
          ok: false,
          issue: "malformed",
          kind,
          label: limit.label,
          mimeType,
          decodedBytes: 0,
          maxDecodedBytes,
          context,
        };
      }
  
      const allowed = new Set(limit.allowedMimeTypes.map(normalizedMimeType));
      if (!allowed.has(mimeType)) {
        return {
          ok: false,
          issue: "mime",
          kind,
          label: limit.label,
          mimeType,
          decodedBytes: 0,
          maxDecodedBytes,
          context,
        };
      }
  
      const payload = raw.slice(commaIndex + 1).replace(/\s+/g, "");
      const maxEncodedChars = Math.ceil(maxDecodedBytes / 3) * 4 + 4;
      if (payload.length > maxEncodedChars) {
        return {
          ok: false,
          issue: "size",
          kind,
          label: limit.label,
          mimeType,
          decodedBytes: estimateDecodedBytes(payload),
          maxDecodedBytes,
          context,
        };
      }
      if (!payload || !/^[a-z0-9+/]+={0,2}$/i.test(payload)) {
        return {
          ok: false,
          issue: "malformed",
          kind,
          label: limit.label,
          mimeType,
          decodedBytes: 0,
          maxDecodedBytes,
          context,
        };
      }
  
      const decodedBytes = estimateDecodedBytes(payload);
      return {
        ok: decodedBytes <= maxDecodedBytes,
        issue: decodedBytes <= maxDecodedBytes ? "" : "size",
        kind,
        label: limit.label,
        mimeType,
        decodedBytes,
        maxDecodedBytes,
        context,
      };
    }
  
    function unexpectedDataUrlResult(value, options = {}) {
      return {
        ok: false,
        issue: "unexpected",
        kind: "unexpected",
        label: "data URL",
        mimeType: "",
        decodedBytes: estimateDecodedBytes(
          String(value || "")
            .split(",")
            .slice(1)
            .join(","),
        ),
        maxDecodedBytes: 0,
        context: options.context || "",
      };
    }
  
    function validateAppData(data, options = {}) {
      if (options.allowOverLimit) return true;
      const stack = [{value: data, path: "$"}];
      const seen = typeof WeakSet === "function" ? new WeakSet() : null;
      let totalDecodedBytes = 0;
      const maxTotalEmbeddedBytes =
        Number(options.maxTotalEmbeddedBytes) > 0
          ? Math.floor(Number(options.maxTotalEmbeddedBytes))
          : MAX_TOTAL_EMBEDDED_BYTES;
  
      while (stack.length) {
        const current = stack.pop();
        const value = current.value;
        if (!value || typeof value !== "object") continue;
        if (seen) {
          if (seen.has(value)) continue;
          seen.add(value);
        }
  
        if (Array.isArray(value)) {
          for (let index = value.length - 1; index >= 0; index -= 1) {
            const child = value[index];
            const path = `${current.path}[${index}]`;
            if (typeof child === "string") {
              if (/^\s*data:/i.test(child))
                throw errorFor(unexpectedDataUrlResult(child, {context: path}));
            } else if (child && typeof child === "object") stack.push({value: child, path});
          }
          continue;
        }
  
        for (const [key, child] of Object.entries(value)) {
          const path = `${current.path}.${key}`;
          if (typeof child === "string") {
            const kind = expectedKindForKey(key);
            if (!kind && !/^\s*data:/i.test(child)) continue;
            if (kind && !child.trim()) continue;
            const result = kind
              ? dataUrlResult(child, kind, {context: path})
              : unexpectedDataUrlResult(child, {context: path});
            if (!result.ok) throw errorFor(result);
            totalDecodedBytes += result.decodedBytes;
            if (totalDecodedBytes > maxTotalEmbeddedBytes) {
              throw errorFor({
                ok: false,
                issue: "total",
                kind: "total",
                label: "embedded media",
                decodedBytes: totalDecodedBytes,
                maxDecodedBytes: maxTotalEmbeddedBytes,
                context: path,
              });
            }
          } else if (child && typeof child === "object") stack.push({value: child, path});
        }
      }
      return true;
    }
  
    function dialogCopy(result) {
      const context = result.context ? ` at ${result.context}` : "";
      if (result.issue === "unexpected") {
        return {
          title: "Embedded data URL is not allowed here",
          text: `This backup contains a data URL in an unsupported field${context}.`,
          detail:
            "Nothing was imported. Wormholes accepts portable media only in its dedicated Vision Board image, thumbnail, and legacy Literature-file fields. Existing work was preserved.",
        };
      }
      if (result.issue === "mime") {
        return {
          title: "Embedded media type is not supported",
          text: `This ${result.label}${context} uses ${result.mimeType || "an unknown media type"}.`,
          detail:
            "Nothing was imported. Vision Board data URLs must be PNG or JPEG images. Existing work was preserved.",
        };
      }
      if (result.issue === "malformed" || result.issue === "not-data-url") {
        return {
          title: "Embedded media is invalid",
          text: `This ${result.label}${context} is not a valid supported base64 data URL.`,
          detail:
            "Nothing was imported. Re-export the backup from Wormholes or replace the damaged embedded media before trying again. Existing work was preserved.",
        };
      }
      if (result.issue === "total") {
        return {
          title: "Backup contains too much embedded media",
          text: `This backup contains more than ${formatBytes(result.maxDecodedBytes)} of embedded media.`,
          detail:
            "Nothing was imported. Split the project into smaller portable backups, reduce image sizes, or use a connected folder for large media collections. Existing work was preserved.",
        };
      }
      return {
        title: "Embedded media is too large",
        text: `This ${result.label}${context} is approximately ${formatBytes(result.decodedBytes)}. Wormholes supports up to ${formatBytes(result.maxDecodedBytes)} for this embedded item.`,
        detail:
          "Nothing was imported. Reduce the media size or use a smaller source file. Existing work was preserved.",
      };
    }
  
    function closeDialog() {
      document?.getElementById?.("mediaLimitModal")?.classList?.remove?.("open");
    }
  
    function showDialog(result) {
      if (!result || result.ok) return false;
      const copy = dialogCopy(result);
      const modal = document?.getElementById?.("mediaLimitModal");
      const title = document?.getElementById?.("mediaLimitTitle");
      const text = document?.getElementById?.("mediaLimitText");
      const detail = document?.getElementById?.("mediaLimitDetail");
      const closeButton = document?.getElementById?.("closeMediaLimitBtn");
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
      const code =
        result.issue === "size" || result.issue === "total"
          ? "WORMHOLES_EMBEDDED_MEDIA_TOO_LARGE"
          : "WORMHOLES_EMBEDDED_MEDIA_INVALID";
      const appErrors =
        typeof importedAppErrorsApi !== "undefined"
          ? importedAppErrorsApi
          : window.WormholesAppErrors;
      const error = appErrors?.createError
        ? appErrors.createError(code, `${copy.text} ${copy.detail}`, {
            name: "WormholesEmbeddedMediaLimitError",
            details: result,
          })
        : new Error(`${copy.text} ${copy.detail}`);
      error.name = "WormholesEmbeddedMediaLimitError";
      error.code = code;
      error.mediaLimitResult = result;
      return error;
    }
  
    function safeDataUrl(value, kind) {
      const result = dataUrlResult(value, kind, {showDialog: false});
      return result.ok ? String(value || "").trim() : "";
    }
  
    document?.getElementById?.("closeMediaLimitBtn")?.addEventListener?.("click", closeDialog);
  
    window.WormholesMediaLimits = {
      MIB,
      limits: LIMITS,
      maxTotalEmbeddedBytes: MAX_TOTAL_EMBEDDED_BYTES,
      maxDataUrlHeaderChars: MAX_DATA_URL_HEADER_CHARS,
      formatBytes,
      estimateDecodedBytes,
      dataUrlResult,
      validateAppData,
      safeDataUrl,
      showDialog,
      closeDialog,
      errorFor,
    };
    return window.WormholesMediaLimits;
  }
  
  const api = install(globalThis);
})();

/* Wormholes Beta 248 URL and external-link safeguards.
 * Keeps unsafe or misleading links out of imports and applies one external-link
 * policy at the point of navigation without adding routine UI noise.
 */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

import importedAppErrorsApi from "./app-errors.mjs";

import {api as importedSafeRenderApi} from "./safe-render.mjs";

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;

  ("use strict");

  const EMBEDDED_MEDIA_KEYS = new Set(["dataUrl", "thumbnailDataUrl", "fileData"]);
  const SAFE_DOWNLOAD_ATTRIBUTE = "data-wormholes-safe-download";
  let guardInstalled = false;

  function safeRender() {
    return typeof importedSafeRenderApi !== "undefined"
      ? importedSafeRenderApi
      : global.WormholesSafeRender;
  }
  function text(value) {
    return value == null ? "" : String(value);
  }

  function isUrlFieldName(key) {
    const raw = String(key || "");
    if (EMBEDDED_MEDIA_KEYS.has(raw)) return false;
    const lower = raw.toLowerCase();
    return lower === "url" || lower.endsWith("url") || lower === "href" || lower.endsWith("href");
  }

  function resultFor(value, options = {}) {
    const raw = text(value).trim();
    if (!raw)
      return {ok: true, value: "", safeValue: "", reason: "", context: options.context || ""};
    const checked = safeRender()?.urlResult?.(raw, {
      allowEmpty: false,
      allowRelative: false,
      allowHash: false,
      allowBlob: false,
      allowDataImage: false,
      externalOnly: true,
      maxLength: 8000,
    }) || {ok: false, url: "", reason: "unavailable"};
    return {
      ok: !!checked.ok,
      value: raw,
      safeValue: checked.ok ? checked.url : "",
      reason: checked.reason || "",
      hostname: checked.hostname || "",
      context: options.context || "",
      operation: options.operation || "use this link",
    };
  }

  function decodeHtmlAttribute(value) {
    const raw = text(value);
    try {
      const textarea = global.document?.createElement?.("textarea");
      if (textarea) {
        textarea.innerHTML = raw;
        return textarea.value || textarea.textContent || raw;
      }
    } catch (error) {}
    return raw
      .replace(/&#(\d+);?/g, (_, decimal) => String.fromCodePoint(Number(decimal) || 0))
      .replace(/&#x([0-9a-f]+);?/gi, (_, hexadecimal) =>
        String.fromCodePoint(parseInt(hexadecimal, 16) || 0),
      )
      .replace(/&colon;/gi, ":")
      .replace(/&tab;/gi, "\t")
      .replace(/&newline;/gi, "\n")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'");
  }

  function literatureLinkValues(html) {
    const source = text(html);
    if (!source) return [];
    try {
      const template = global.document?.createElement?.("template");
      if (template) {
        template.innerHTML = source;
        const root = template.content || template;
        if (typeof root.querySelectorAll === "function") {
          return Array.from(root.querySelectorAll("a[href]")).map(
            (anchor) => anchor.getAttribute("href") || "",
          );
        }
      }
    } catch (error) {}

    const values = [];
    const pattern = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let match;
    while ((match = pattern.exec(source))) {
      values.push(decodeHtmlAttribute(match[1] ?? match[2] ?? match[3] ?? ""));
    }
    return values;
  }

  function validateLiteratureHtml(html, options = {}) {
    const values = literatureLinkValues(html);
    for (let index = 0; index < values.length; index += 1) {
      const result = resultFor(values[index], {
        context: `${options.context || "Literature"} link ${index + 1}`,
        operation: options.operation || "import this backup",
      });
      if (!result.ok) return result;
    }
    return {ok: true};
  }

  function dialogCopy(result, options = {}) {
    const importing = options.importing || /import|restore|backup/i.test(result?.operation || "");
    return importing
      ? {
          title: "Unsafe link found",
          text: "This backup contains a link Wormholes cannot open safely.",
          detail: "Nothing was imported. Use standard http:// or https:// links.",
        }
      : {
          title: "This link cannot be used",
          text: "Use a standard http:// or https:// address.",
          detail: "The link was not opened.",
        };
  }

  function closeDialog() {
    global.document?.getElementById?.("urlSafetyModal")?.classList?.remove?.("open");
  }

  function showDialog(result, options = {}) {
    if (!result || result.ok) return false;
    const copy = dialogCopy(result, options);
    const modal = global.document?.getElementById?.("urlSafetyModal");
    const title = global.document?.getElementById?.("urlSafetyTitle");
    const message = global.document?.getElementById?.("urlSafetyText");
    const detail = global.document?.getElementById?.("urlSafetyDetail");
    const closeButton = global.document?.getElementById?.("closeUrlSafetyBtn");
    if (!modal || !title || !message || !detail || !closeButton) {
      try {
        global.alert?.(`${copy.title}\n\n${copy.text}\n\n${copy.detail}`);
      } catch (error) {}
      return true;
    }
    title.textContent = copy.title;
    message.textContent = copy.text;
    detail.textContent = copy.detail;
    modal.classList.add("open");
    setTimeout(() => closeButton.focus?.(), 0);
    return true;
  }

  function errorFor(result) {
    const copy = dialogCopy(result, {importing: true});
    const appErrors =
      typeof importedAppErrorsApi !== "undefined"
        ? importedAppErrorsApi
        : window.WormholesAppErrors;
    const error = appErrors?.createError
      ? appErrors.createError("WORMHOLES_UNSAFE_URL", `${copy.text} ${copy.detail}`, {
          name: "WormholesUnsafeUrlError",
          details: result,
        })
      : new Error(`${copy.text} ${copy.detail}`);
    error.name = "WormholesUnsafeUrlError";
    error.code = "WORMHOLES_UNSAFE_URL";
    error.urlSafetyResult = result;
    return error;
  }

  function assertExternalUrl(value, options = {}) {
    const result = resultFor(value, options);
    if (!result.ok) throw errorFor(result);
    return result;
  }

  function validateAppData(data, options = {}) {
    if (options.allowUnsafeUrls) return true;
    const stack = [{value: data, path: "$", parentKey: ""}];
    const seen = typeof WeakSet === "function" ? new WeakSet() : null;
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
          if (child && typeof child === "object")
            stack.push({
              value: child,
              path: `${current.path}[${index}]`,
              parentKey: current.parentKey,
            });
        }
        continue;
      }
      for (const [key, child] of Object.entries(value)) {
        const path = `${current.path}.${key}`;
        if (typeof child === "string") {
          if (isUrlFieldName(key))
            assertExternalUrl(child, {context: path, operation: "import this backup"});
          else if (String(key).toLowerCase() === "content") {
            const htmlResult = validateLiteratureHtml(child, {
              context: path,
              operation: "import this backup",
            });
            if (!htmlResult.ok) throw errorFor(htmlResult);
          }
        } else if (child && typeof child === "object") {
          stack.push({value: child, path, parentKey: key});
        }
      }
    }
    return true;
  }

  function isSafeDownload(anchor) {
    return !!anchor?.closest?.(`[${SAFE_DOWNLOAD_ATTRIBUTE}="true"]`);
  }

  function closestAnchor(target) {
    if (!target) return null;
    if (typeof target.closest === "function") return target.closest("a[href]");
    let current = target;
    while (current) {
      if (String(current.tagName || "").toLowerCase() === "a" && current.getAttribute?.("href"))
        return current;
      current = current.parentNode;
    }
    return null;
  }

  function guardExternalLinkEvent(event) {
    if (event.defaultPrevented) return;
    const anchor = closestAnchor(event.target);
    if (!anchor || isSafeDownload(anchor)) return;
    const rawHref = anchor.getAttribute?.("href") || "";
    if (!rawHref || rawHref.startsWith("#")) return;

    const relative = safeRender()?.safeUrl?.(rawHref, {allowRelative: true, allowHash: true});
    const external = safeRender()?.safeExternalUrl?.(rawHref);
    if (!external) {
      if (relative && !/^https?:/i.test(relative)) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      showDialog(resultFor(rawHref, {operation: "open this link"}));
      return;
    }

    safeRender()?.configureExternalLink?.(anchor, external);
  }

  function installLinkGuard() {
    if (guardInstalled || !global.document?.addEventListener) return false;
    guardInstalled = true;
    global.document.addEventListener("click", guardExternalLinkEvent, true);
    global.document.addEventListener("auxclick", guardExternalLinkEvent, true);
    return true;
  }

  global.document?.getElementById?.("closeUrlSafetyBtn")?.addEventListener?.("click", closeDialog);

  global.WormholesUrlSafety = Object.freeze({
    isUrlFieldName,
    resultFor,
    literatureLinkValues,
    validateLiteratureHtml,
    assertExternalUrl,
    validateAppData,
    showDialog,
    closeDialog,
    errorFor,
    installLinkGuard,
    guardExternalLinkEvent,
  });
  return global.WormholesUrlSafety;
}

export const api = install(globalThis);
export default api;

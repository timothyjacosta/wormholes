/* GENERATED from scripts/modules/content-limits.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    const LIMITS = Object.freeze({
      identifier: Object.freeze({label: "identifier or storage key", hard: 500}),
      objectKey: Object.freeze({label: "object key", hard: 2048}),
      title: Object.freeze({label: "title or name", hard: 500}),
      shortLabel: Object.freeze({label: "short label", hard: 200}),
      fileName: Object.freeze({label: "filename", hard: 500}),
      url: Object.freeze({label: "URL", hard: 8000}),
      description: Object.freeze({label: "description", hard: 20000}),
      note: Object.freeze({label: "note or summary", hard: 250000}),
      creationText: Object.freeze({label: "creation text", hard: 1000000}),
      literature: Object.freeze({label: "Literature document", hard: 15000000}),
      generic: Object.freeze({label: "text field", hard: 1000000}),
    });
    const MAX_DATA_DEPTH = 32;
    const MAX_LITERATURE_HTML_DEPTH = 64;
    const EMBEDDED_MEDIA_KEYS = new Set(["dataUrl", "thumbnailDataUrl", "fileData"]);
  
    function config(kind) {
      return LIMITS[kind] || LIMITS.generic;
    }
    function stringValue(value) {
      return value == null ? "" : String(value);
    }
    function lengthOf(value) {
      return stringValue(value).length;
    }
    function formatCount(value) {
      return Math.max(0, Number(value) || 0).toLocaleString();
    }
  
    function stringResult(kind, value, options = {}) {
      const limit = config(kind);
      const length = lengthOf(value);
      const previousLength =
        options.previousValue === undefined ? 0 : lengthOf(options.previousValue);
      const existingOverLimitIsNotGrowing = previousLength > limit.hard && length <= previousLength;
      return {
        ok: length <= limit.hard || existingOverLimitIsNotGrowing,
        kind,
        label: options.label || limit.label,
        hard: limit.hard,
        length,
        previousLength,
        context: options.context || "",
        fieldName: options.fieldName || limit.label,
        operation: options.operation || "save this value",
        existingOverLimitIsNotGrowing,
      };
    }
  
    function htmlDepth(html) {
      const text = stringValue(html);
      let depth = 0;
      let maximum = 0;
      const voidTags = new Set([
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
      ]);
      const tokenPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?\s*([a-zA-Z][\w:-]*)\b[^>]*>/g;
      let match;
      while ((match = tokenPattern.exec(text))) {
        const token = match[0];
        const name = String(match[1] || "").toLowerCase();
        if (!name || token.startsWith("<!")) continue;
        if (/^<\s*\//.test(token)) {
          depth = Math.max(0, depth - 1);
        } else if (!/\/\s*>$/.test(token) && !voidTags.has(name)) {
          depth += 1;
          if (depth > maximum) maximum = depth;
        }
      }
      return maximum;
    }
  
    function htmlResult(value, options = {}) {
      const lengthResult = stringResult("literature", value, options);
      if (!lengthResult.ok) return {...lengthResult, issue: "length"};
      const depth = htmlDepth(value);
      const previousDepth =
        options.previousValue === undefined ? 0 : htmlDepth(options.previousValue);
      const existingOverLimitIsNotGrowing =
        previousDepth > MAX_LITERATURE_HTML_DEPTH && depth <= previousDepth;
      return {
        ...lengthResult,
        ok: depth <= MAX_LITERATURE_HTML_DEPTH || existingOverLimitIsNotGrowing,
        issue:
          depth <= MAX_LITERATURE_HTML_DEPTH || existingOverLimitIsNotGrowing ? "" : "html-depth",
        depth,
        previousDepth,
        maxDepth: MAX_LITERATURE_HTML_DEPTH,
        existingOverLimitIsNotGrowing:
          lengthResult.existingOverLimitIsNotGrowing || existingOverLimitIsNotGrowing,
      };
    }
  
    function structureResult(value, options = {}) {
      const maxDepth =
        Number(options.maxDepth) > 0 ? Math.floor(Number(options.maxDepth)) : MAX_DATA_DEPTH;
      const stack = [{value, depth: 0, path: "$"}];
      const seen = typeof WeakSet === "function" ? new WeakSet() : null;
      let deepest = 0;
      while (stack.length) {
        const current = stack.pop();
        const item = current.value;
        if (!item || typeof item !== "object") continue;
        if (seen) {
          if (seen.has(item)) continue;
          seen.add(item);
        }
        if (current.depth > deepest) deepest = current.depth;
        if (current.depth > maxDepth) {
          return {
            ok: false,
            issue: "data-depth",
            depth: current.depth,
            maxDepth,
            path: current.path,
          };
        }
        if (Array.isArray(item)) {
          for (let index = item.length - 1; index >= 0; index -= 1) {
            const child = item[index];
            if (child && typeof child === "object")
              stack.push({
                value: child,
                depth: current.depth + 1,
                path: `${current.path}[${index}]`,
              });
          }
        } else {
          const entries = Object.entries(item);
          for (let index = entries.length - 1; index >= 0; index -= 1) {
            const [key, child] = entries[index];
            if (child && typeof child === "object")
              stack.push({value: child, depth: current.depth + 1, path: `${current.path}.${key}`});
          }
        }
      }
      return {ok: true, depth: deepest, maxDepth};
    }
  
    function dialogCopy(result) {
      const context = result.context ? ` in “${result.context}”` : "";
      if (result.issue === "data-depth") {
        return {
          title: "Imported data is too deeply nested",
          text: `This data reaches at least ${formatCount(result.depth)} object or array levels. Wormholes supports up to ${formatCount(result.maxDepth)} levels.`,
          detail:
            "Nothing was imported. Simplify the nested structure and try again. Existing Wormholes work was not changed.",
        };
      }
      if (result.issue === "html-depth") {
        return {
          title: "Literature formatting is too deeply nested",
          text: `This Literature content reaches ${formatCount(result.depth)} nested formatting levels${context}. Wormholes supports up to ${formatCount(result.maxDepth)}.`,
          detail:
            "The document was not saved. Remove excessive nested formatting or paste the affected section as plain text. Existing saved work was preserved.",
        };
      }
      return {
        title: `${String(result.fieldName || result.label || "Text").replace(/^./, (character) => character.toUpperCase())} is too long`,
        text: `This ${result.fieldName || result.label}${context} contains ${formatCount(result.length)} characters. Wormholes supports up to ${formatCount(result.hard)}.`,
        detail: `${/import|restore/i.test(result.operation || "") ? "Nothing was imported." : "This change was not saved."} Shorten or split the content before trying to ${result.operation}. Existing work was preserved.`,
      };
    }
  
    function closeDialog() {
      document?.getElementById?.("contentLimitModal")?.classList?.remove?.("open");
    }
  
    function showDialog(result) {
      if (!result || result.ok) return false;
      const copy = dialogCopy(result);
      const modal = document?.getElementById?.("contentLimitModal");
      const title = document?.getElementById?.("contentLimitTitle");
      const text = document?.getElementById?.("contentLimitText");
      const detail = document?.getElementById?.("contentLimitDetail");
      const closeButton = document?.getElementById?.("closeContentLimitBtn");
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
  
    function ensureString(kind, value, options = {}) {
      const result = stringResult(kind, value, options);
      if (!result.ok && options.showDialog !== false) showDialog(result);
      return result;
    }
  
    function ensureHtml(value, options = {}) {
      const result = htmlResult(value, options);
      if (!result.ok && options.showDialog !== false) showDialog(result);
      return result;
    }
  
    function errorFor(result) {
      const copy = dialogCopy(result);
      const name =
        result.issue === "data-depth" ? "WormholesNestingDepthError" : "WormholesStringLengthError";
      const code =
        result.issue === "data-depth" ? "WORMHOLES_NESTING_TOO_DEEP" : "WORMHOLES_STRING_TOO_LONG";
      const appErrors =
        typeof importedAppErrorsApi !== "undefined"
          ? importedAppErrorsApi
          : window.WormholesAppErrors;
      const error = appErrors?.createError
        ? appErrors.createError(code, `${copy.text} ${copy.detail}`, {name, details: result})
        : new Error(`${copy.text} ${copy.detail}`);
      error.name = name;
      error.code = code;
      error.contentLimitResult = result;
      return error;
    }
  
    function assertString(kind, value, options = {}) {
      const result = stringResult(kind, value, options);
      if (!result.ok) throw errorFor(result);
      return result;
    }
  
    function assertHtml(value, options = {}) {
      const result = htmlResult(value, options);
      if (!result.ok) throw errorFor(result);
      return result;
    }
  
    function classifyString(key, parentKey, path) {
      const lower = String(key || "").toLowerCase();
      const parent = String(parentKey || "").toLowerCase();
      if (EMBEDDED_MEDIA_KEYS.has(key)) return null;
      if (lower === "content") return "literature";
      if (lower === "title" || lower === "name") return "title";
      if (lower.includes("filename") || lower === "sourcename" || lower === "diskfoldername")
        return "fileName";
      if (lower === "url" || lower.endsWith("url")) return "url";
      if (
        lower === "summary" ||
        lower === "note" ||
        parent === "connectionnotes" ||
        parent === "bridgenotes"
      )
        return "note";
      if (
        lower === "val" ||
        lower === "mimetype" ||
        lower === "filetype" ||
        lower === "storage" ||
        lower === "contentstored" ||
        lower === "datastored" ||
        lower === "thumbnailstored" ||
        lower === "format" ||
        lower === "appversion"
      )
        return "shortLabel";
      if (
        lower === "id" ||
        lower.endsWith("id") ||
        lower.endsWith("storekey") ||
        lower === "currentuniverseid"
      )
        return "identifier";
      if (/description|detail|subtitle|pressure|attribute|convertedfrom/.test(lower))
        return "description";
      if (/createdat|updatedat|exportedat|timestamp/.test(lower)) return "shortLabel";
      if (/\.tags\./.test(path)) return "identifier";
      return "generic";
    }
  
    function validateAppData(data, options = {}) {
      if (options.allowOverLimit) return true;
      const structure = structureResult(data, {maxDepth: MAX_DATA_DEPTH});
      if (!structure.ok) throw errorFor(structure);
  
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
            const childPath = `${current.path}[${index}]`;
            if (typeof child === "string") {
              const parent = String(current.parentKey || "").toLowerCase();
              const kind =
                parent === "notes"
                  ? "note"
                  : ["groupids", "connections", "universes"].includes(parent)
                    ? "identifier"
                    : "generic";
              assertString(kind, child, {
                fieldName:
                  kind === "identifier" ? "identifier" : kind === "note" ? "note" : "text field",
                context: childPath,
                operation: "import this backup",
              });
            } else if (child && typeof child === "object")
              stack.push({value: child, path: childPath, parentKey: current.parentKey});
          }
        } else {
          for (const [key, child] of Object.entries(value)) {
            assertString("objectKey", key, {
              fieldName: "object key",
              context: current.path,
              operation: "import this backup",
            });
            const childPath = `${current.path}.${key}`;
            if (typeof child === "string") {
              const kind = classifyString(key, current.parentKey, childPath);
              if (!kind) continue;
              if (kind === "literature")
                assertHtml(child, {
                  fieldName: "Literature document",
                  context: childPath,
                  operation: "import this backup",
                });
              else
                assertString(kind, child, {
                  fieldName: config(kind).label,
                  context: childPath,
                  operation: "import this backup",
                });
            } else if (child && typeof child === "object")
              stack.push({value: child, path: childPath, parentKey: key});
          }
        }
      }
      return true;
    }
  
    document?.getElementById?.("closeContentLimitBtn")?.addEventListener?.("click", closeDialog);
  
    window.WormholesContentLimits = {
      limits: LIMITS,
      maxDataDepth: MAX_DATA_DEPTH,
      maxLiteratureHtmlDepth: MAX_LITERATURE_HTML_DEPTH,
      lengthOf,
      htmlDepth,
      stringResult,
      htmlResult,
      structureResult,
      ensureString,
      ensureHtml,
      assertString,
      assertHtml,
      validateAppData,
      showDialog,
      closeDialog,
      errorFor,
    };
    return window.WormholesContentLimits;
  }
  
  const api = install(globalThis);
})();

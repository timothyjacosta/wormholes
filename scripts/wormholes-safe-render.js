/* GENERATED from scripts/modules/safe-render.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  /* Canonical ES-module source. The direct-file build uses a generated classic adapter. */
  
  function install(root = globalThis) {
    const global = root.window || root;
    const window = global;
    const document = root.document || global.document;
  
    ("use strict");
  
    const SAFE_MARKUP_BRAND = Symbol("WormholesSafeMarkup");
    const SAFE_URL_PROTOCOLS = new Set(["http:", "https:"]);
    const MAX_SAFE_URL_CHARACTERS = 8000;
    const UNSAFE_URL_CHARACTERS =
      /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/;
    const BLOCKED_ELEMENT_NAMES = new Set([
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "link",
      "meta",
      "base",
      "svg",
      "math",
    ]);
    const BLOCKED_ATTRIBUTE_NAMES = new Set(["style", "srcdoc"]);
    const URL_ATTRIBUTE_NAMES = new Set([
      "href",
      "src",
      "action",
      "formaction",
      "poster",
      "cite",
      "background",
      "xlink:href",
    ]);
  
    class SafeMarkup {
      constructor(value) {
        this.value = String(value || "");
        Object.defineProperty(this, SAFE_MARKUP_BRAND, {value: true});
        Object.freeze(this);
      }
      toString() {
        return this.value;
      }
    }
  
    function text(value, fallback = "") {
      if (value === null || value === undefined) return String(fallback ?? "");
      return String(value);
    }
  
    function escapeHtml(value) {
      return text(value).replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[character],
      );
    }
  
    function isSafeMarkup(value) {
      return !!(value && value[SAFE_MARKUP_BRAND] === true);
    }
  
    function raw(markup) {
      if (!isSafeMarkup(markup)) {
        throw new TypeError("WormholesSafeRender.raw accepts SafeMarkup only.");
      }
      return markup;
    }
  
    function interpolate(value) {
      if (isSafeMarkup(value)) return value.toString();
      if (Array.isArray(value)) return value.map(interpolate).join("");
      return escapeHtml(value);
    }
  
    function html(strings, ...values) {
      let output = "";
      strings.forEach((part, index) => {
        output += part;
        if (index < values.length) output += interpolate(values[index]);
      });
      return new SafeMarkup(output);
    }
  
    function setHtml(element, markup) {
      if (!element) return null;
      if (!isSafeMarkup(markup)) {
        throw new TypeError("WormholesSafeRender.setHtml requires SafeMarkup.");
      }
      element.innerHTML = markup.toString();
      return element;
    }
  
    function setText(element, value, fallback = "") {
      if (!element) return null;
      element.textContent = text(value, fallback);
      return element;
    }
  
    function clear(element) {
      if (!element) return null;
      if (typeof element.replaceChildren === "function") element.replaceChildren();
      else element.textContent = "";
      return element;
    }
  
    function isRelativeUrl(value) {
      return (
        /^(?:[./]|[^:/?#]+(?:[/?#]|$))/.test(value) &&
        !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
        !/^\/\//.test(value) &&
        !value.includes("\\")
      );
    }
  
    function urlResult(value, options = {}) {
      const original = text(value);
      const candidate = original.trim();
      const maxLength = Math.max(1, Number(options.maxLength) || MAX_SAFE_URL_CHARACTERS);
      if (!candidate) {
        return {
          ok: !!options.allowEmpty,
          url: "",
          reason: options.allowEmpty ? "" : "empty",
          original,
        };
      }
      if (UNSAFE_URL_CHARACTERS.test(candidate)) {
        return {ok: false, url: "", reason: "unsafe-characters", original};
      }
      if (candidate.includes("\\")) {
        return {ok: false, url: "", reason: "backslash", original};
      }
      if (/^\/\//.test(candidate)) {
        return {ok: false, url: "", reason: "protocol-relative", original};
      }
      if (candidate.startsWith("#")) {
        const allowed = options.allowHash !== false && !options.externalOnly;
        return {
          ok: allowed,
          url: allowed ? candidate : "",
          reason: allowed ? "" : "hash-not-allowed",
          original,
          relative: allowed,
        };
      }
      if (options.externalOnly && isRelativeUrl(candidate)) {
        return {ok: false, url: "", reason: "relative-not-allowed", original};
      }
      if (options.allowRelative !== false && !options.externalOnly && isRelativeUrl(candidate)) {
        return {ok: true, url: candidate, reason: "", original, relative: true};
      }
  
      if (options.allowBlob && /^blob:/i.test(candidate)) {
        try {
          const parsedBlob = new URL(candidate);
          return parsedBlob.protocol === "blob:"
            ? {ok: true, url: parsedBlob.href, reason: "", original, blob: true}
            : {ok: false, url: "", reason: "protocol", original};
        } catch (error) {
          return {ok: false, url: "", reason: "malformed", original};
        }
      }
  
      if (options.allowDataImage && /^data:/i.test(candidate)) {
        // Embedded image data is intentionally governed by the media-specific
        // decoded-byte limits, not the much smaller ordinary URL character cap.
        // Real Vision Board thumbnails routinely exceed 8,000 characters.
        const media = global.WormholesMediaLimits;
        const imageUrl = media?.safeDataUrl
          ? media.safeDataUrl(candidate, options.imageKind || "full")
          : /^data:image\/(?:png|jpeg);base64,[a-z0-9+/=\s]+$/i.test(candidate)
            ? candidate
            : "";
        return imageUrl
          ? {ok: true, url: imageUrl, reason: "", original, dataImage: true}
          : {ok: false, url: "", reason: "unsafe-data-url", original};
      }
  
      if (candidate.length > maxLength) {
        return {
          ok: false,
          url: "",
          reason: "too-long",
          original,
          length: candidate.length,
          maxLength,
        };
      }
  
      let parsed;
      try {
        parsed = new URL(candidate, global.location?.href || "https://wormholes.invalid/");
      } catch (error) {
        return {ok: false, url: "", reason: "malformed", original};
      }
  
      if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
        return {ok: false, url: "", reason: "protocol", original, protocol: parsed.protocol};
      }
      if (!parsed.hostname) {
        return {ok: false, url: "", reason: "missing-host", original};
      }
      if (parsed.username || parsed.password) {
        return {ok: false, url: "", reason: "credentials", original, hostname: parsed.hostname};
      }
      if (options.requireHttps && parsed.protocol !== "https:") {
        return {ok: false, url: "", reason: "https-required", original, hostname: parsed.hostname};
      }
  
      return {
        ok: true,
        url: parsed.href,
        reason: "",
        original,
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        external: true,
      };
    }
  
    function safeUrl(value, options = {}) {
      const result = urlResult(value, options);
      return result.ok ? result.url : "";
    }
  
    function safeExternalUrl(value, options = {}) {
      return safeUrl(value, {
        ...options,
        allowRelative: false,
        allowHash: false,
        allowBlob: false,
        allowDataImage: false,
        externalOnly: true,
      });
    }
  
    function safeImageUrl(value, options = {}) {
      return safeUrl(value, {
        allowRelative: options.allowRelative !== false,
        allowBlob: true,
        allowDataImage: true,
        imageKind: options.imageKind || "full",
      });
    }
  
    function safeAttributeName(name) {
      const normalized = text(name).trim();
      if (
        !/^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(normalized) ||
        /^on/i.test(normalized) ||
        BLOCKED_ATTRIBUTE_NAMES.has(normalized.toLowerCase())
      ) {
        throw new TypeError(`Unsafe attribute name: ${normalized || "(empty)"}`);
      }
      return normalized;
    }
  
    function setAttribute(element, name, value, options = {}) {
      if (!element) return null;
      const attribute = safeAttributeName(name);
      if (value === false || value === null || value === undefined) {
        element.removeAttribute(attribute);
        return element;
      }
      if (value === true) {
        element.setAttribute(attribute, "");
        return element;
      }
  
      let normalizedValue = text(value);
      const lowerAttribute = attribute.toLowerCase();
      if (URL_ATTRIBUTE_NAMES.has(lowerAttribute)) {
        normalizedValue =
          lowerAttribute === "src" && options.image
            ? safeImageUrl(value, options)
            : safeUrl(value, options);
      }
      if (URL_ATTRIBUTE_NAMES.has(lowerAttribute) && !normalizedValue) {
        element.removeAttribute(attribute);
        return element;
      }
      element.setAttribute(attribute, normalizedValue);
      return element;
    }
  
    function configureExternalLink(element, value, options = {}) {
      if (!element) return false;
      const safe = safeExternalUrl(value, options);
      if (!safe) {
        element.removeAttribute?.("href");
        element.removeAttribute?.("target");
        element.removeAttribute?.("rel");
        element.removeAttribute?.("referrerpolicy");
        return false;
      }
      element.setAttribute("href", safe);
      element.setAttribute("target", options.newTab === false ? "_self" : "_blank");
      element.setAttribute("rel", "noopener noreferrer");
      element.setAttribute("referrerpolicy", "no-referrer");
      return true;
    }
  
    function openExternalUrl(value, options = {}) {
      const safe = safeExternalUrl(value, options);
      if (!safe) return false;
      const opened = global.open?.(safe, "_blank", "noopener,noreferrer");
      try {
        if (opened) opened.opener = null;
      } catch (error) {}
      return true;
    }
  
    function createElement(tagName, options = {}) {
      if (!global.document?.createElement) return null;
      const tag = text(tagName).trim().toLowerCase();
      if (!/^[a-z][a-z0-9-]*$/.test(tag) || BLOCKED_ELEMENT_NAMES.has(tag))
        throw new TypeError(`Unsafe element name: ${tag || "(empty)"}`);
      const element = global.document.createElement(tag);
      if (options.className) element.className = text(options.className);
      if (Object.prototype.hasOwnProperty.call(options, "text")) setText(element, options.text);
      Object.entries(options.attributes || {}).forEach(([name, value]) => {
        setAttribute(element, name, value, {
          ...(options.attributeOptions?.[name] || {}),
          image: tag === "img" && name === "src",
        });
      });
      if (options.children) {
        const children = Array.isArray(options.children) ? options.children : [options.children];
        children.filter(Boolean).forEach((child) => element.appendChild(child));
      }
      return element;
    }
  
    function replaceWithImage(container, source, altText = "Image", options = {}) {
      if (!container) return false;
      const safeSource = safeImageUrl(source, options);
      if (!safeSource) return false;
      const image = createElement("img", {
        attributes: {src: safeSource, alt: text(altText, "Image")},
        attributeOptions: {src: {imageKind: options.imageKind || "full"}},
      });
      if (!image) return false;
      if (typeof container.replaceChildren === "function") container.replaceChildren(image);
      else {
        container.textContent = "";
        container.appendChild(image);
      }
      return true;
    }
  
    const api = Object.freeze({
      SafeMarkup,
      text,
      escapeHtml,
      isSafeMarkup,
      raw,
      html,
      setHtml,
      setText,
      clear,
      urlResult,
      safeUrl,
      safeExternalUrl,
      safeImageUrl,
      configureExternalLink,
      openExternalUrl,
      setAttribute,
      createElement,
      replaceWithImage,
    });
  
    global.WormholesSafeRender = api;
    global.escapeHtml = escapeHtml;
    return global.WormholesSafeRender;
  }
  
  const api = install(globalThis);
})();

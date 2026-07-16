/* GENERATED from scripts/modules/focus.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 centralized focus restoration.
   When a dialog, menu, or panel closes, focus returns to a visible enabled control. */

const focusEscapePolicyApi =
  typeof importedEscapePolicyApi !== "undefined" ? importedEscapePolicyApi : window.WormholesEscape;
(function () {
  const LAYER_SELECTOR = ".modal-backdrop, .menu, #settingsPanel, [data-escape-dismiss]";
  const CONTROL_SELECTOR = [
    "button:not([disabled])",
    "a[href]",
    'input:not([disabled]):not([type="hidden"])',
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="checkbox"]',
    '[role="option"]',
  ].join(",");
  const layerStates = new WeakMap();
  const returnRecords = new WeakMap();
  let installed = false;
  let lastStableControl = null;

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/([\\"'\[\]#.:>+~*=\s])/g, "\\$1");
  }

  function isLayer(element) {
    return !!element?.matches?.(LAYER_SELECTOR);
  }

  function isLayerOpen(layer) {
    if (!layer || layer.isConnected === false) return false;
    if (layer.classList?.contains("modal-backdrop")) return layer.classList.contains("open");
    if (layer.classList?.contains("menu")) return layer.classList.contains("open");
    if (layer.id === "settingsPanel") return layer.hidden === false;
    if (layer.hasAttribute?.("hidden")) return layer.hidden === false;
    if (layer.dataset?.escapeDismiss) return layer.getAttribute?.("aria-hidden") !== "true";
    return false;
  }

  function isInsideClosedLayer(element) {
    const modal = element?.closest?.(".modal-backdrop");
    if (modal && !modal.classList.contains("open")) return true;
    const menu = element?.closest?.(".menu");
    if (menu && !menu.classList.contains("open")) return true;
    const hiddenLayer = element?.closest?.("[hidden]");
    return !!hiddenLayer;
  }

  function isVisible(element) {
    if (!element || element.isConnected === false) return false;
    if (
      element.hidden ||
      element.closest?.("[hidden]") ||
      element.closest?.('[aria-hidden="true"]')
    )
      return false;
    if (isInsideClosedLayer(element)) return false;
    const style = window.getComputedStyle?.(element);
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    if (typeof element.getClientRects === "function" && element.getClientRects().length === 0) {
      // Test doubles and document-level controls may not expose layout boxes.
      if (
        element !== document.body &&
        element !== document.documentElement &&
        element.offsetParent === null
      )
        return false;
    }
    return true;
  }

  function isEnabled(element) {
    if (!element) return false;
    if (element.disabled || element.hasAttribute?.("disabled")) return false;
    if (element.getAttribute?.("aria-disabled") === "true") return false;
    if (element.inert || element.closest?.("[inert]")) return false;
    return true;
  }

  function isControl(element) {
    if (!element) return false;
    if (element.matches?.(CONTROL_SELECTOR)) return true;
    return typeof element.focus === "function" && element.tabIndex >= 0;
  }

  function isUsableControl(element) {
    return isControl(element) && isVisible(element) && isEnabled(element);
  }

  function focusControl(element) {
    if (!isUsableControl(element)) return false;
    try {
      element.focus({preventScroll: true});
    } catch (_error) {
      element.focus?.();
    }
    return document.activeElement === element || typeof document.activeElement === "undefined";
  }

  function firstUsable(root) {
    if (!root) return null;
    if (isUsableControl(root)) return root;
    return (
      Array.from(root.querySelectorAll?.(CONTROL_SELECTOR) || []).find(isUsableControl) || null
    );
  }

  function containingLayer(element) {
    return element?.closest?.(LAYER_SELECTOR) || null;
  }

  function associatedOpener(layer) {
    if (!layer) return null;
    const explicit = String(layer.dataset?.focusReturn || "").trim();
    if (explicit) {
      const candidate = explicit.startsWith("#")
        ? document.querySelector?.(explicit)
        : document.getElementById?.(explicit) || document.querySelector?.(explicit);
      if (candidate) return candidate;
    }
    if (layer.id === "settingsPanel") return document.getElementById?.("settingsGearBtn");
    if (layer.classList?.contains("menu")) {
      return (
        layer.closest?.(".menu-wrap")?.querySelector?.(".menu-button") ||
        layer.previousElementSibling ||
        null
      );
    }
    if (layer.id) {
      try {
        const opener = document.querySelector?.(`[aria-controls="${cssEscape(layer.id)}"]`);
        if (opener) return opener;
      } catch (_error) {}
    }
    return null;
  }

  function entityAnchor(element) {
    const entity = element?.closest?.(
      ".entry, .universe-entry, .vision-pin, [data-id], [data-vision-id], [data-entry-id]",
    );
    if (!entity) return null;
    const attributes = ["data-id", "data-vision-id", "data-entry-id", "data-universe-id"];
    const attribute = attributes.find((name) => entity.hasAttribute?.(name));
    const value = attribute ? entity.getAttribute(nameOr(attribute)) : "";
    const parent = entity.parentElement;
    let itemSelector = "";
    if (entity.classList?.contains("vision-pin")) itemSelector = ".vision-pin";
    else if (entity.classList?.contains("universe-entry")) itemSelector = ".universe-entry";
    else if (entity.classList?.contains("entry")) itemSelector = ".entry";
    else if (attribute) itemSelector = `[${attribute}]`;
    const siblings =
      itemSelector && parent
        ? Array.from(
            parent.querySelectorAll?.(`:scope > ${itemSelector}`) ||
              parent.querySelectorAll?.(itemSelector) ||
              [],
          )
        : [];
    return {
      attribute,
      value,
      itemSelector,
      parentId: parent?.id || "",
      index: Math.max(0, siblings.indexOf(entity)),
    };
  }

  // Kept separate to make malformed/custom DOM shims harmless.
  function nameOr(name) {
    return name;
  }

  function captureRecord(layer) {
    const active = document.activeElement;
    const opener = associatedOpener(layer);
    return {
      target:
        active && active !== document.body && active !== document.documentElement ? active : null,
      opener,
      anchor: entityAnchor(active || opener),
      openedAt: Date.now(),
    };
  }

  function preferredControlInEntity(entity) {
    if (!entity) return null;
    const preferred = entity.querySelector?.(
      '.entry-title, .universe-entry-main, .universe-entry-button, .menu-button, button, [tabindex="0"]',
    );
    return isUsableControl(preferred)
      ? preferred
      : isUsableControl(entity)
        ? entity
        : firstUsable(entity);
  }

  function resolveAnchor(anchor) {
    if (!anchor) return null;
    if (anchor.attribute && anchor.value) {
      try {
        const exact = document.querySelector?.(
          `[${anchor.attribute}="${cssEscape(anchor.value)}"]`,
        );
        const control = preferredControlInEntity(exact);
        if (control) return control;
      } catch (_error) {}
    }
    const parent = anchor.parentId ? document.getElementById?.(anchor.parentId) : null;
    if (parent && anchor.itemSelector) {
      let items = [];
      try {
        items = Array.from(parent.querySelectorAll?.(`:scope > ${anchor.itemSelector}`) || []);
      } catch (_error) {
        items = Array.from(parent.querySelectorAll?.(anchor.itemSelector) || []);
      }
      if (!items.length) items = Array.from(parent.querySelectorAll?.(anchor.itemSelector) || []);
      const sameOrNext = items[Math.min(anchor.index, Math.max(0, items.length - 1))];
      const nearby = preferredControlInEntity(sameOrNext);
      if (nearby) return nearby;
    }
    return null;
  }

  function topOpenLayer() {
    const fromEscape = focusEscapePolicyApi?.topLayer?.();
    if (fromEscape && isLayerOpen(fromEscape)) return fromEscape;
    const layers = Array.from(document.querySelectorAll?.(LAYER_SELECTOR) || []).filter(
      isLayerOpen,
    );
    return layers[layers.length - 1] || null;
  }

  function pageFallback() {
    const activeTab = document.querySelector?.(
      '.tab-button.active[role="tab"], .tab-button.active',
    );
    if (isUsableControl(activeTab)) return activeTab;
    const activePanel = document.querySelector?.('.tab-content.active, [role="tabpanel"].active');
    const panelControl = firstUsable(activePanel);
    if (panelControl) return panelControl;
    for (const id of ["globalSearchBtn", "settingsGearBtn"]) {
      const control = document.getElementById?.(id);
      if (isUsableControl(control)) return control;
    }
    return null;
  }

  function shouldKeepCurrentFocus(closedLayer) {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) return false;
    if (closedLayer?.contains?.(active)) return false;
    return isUsableControl(active);
  }

  function restoreAfterClose(layer, record) {
    if (shouldKeepCurrentFocus(layer)) return true;

    const underlying = topOpenLayer();
    if (underlying && underlying !== layer) {
      const underlyingTarget = [record?.target, record?.opener, firstUsable(underlying)].find(
        (candidate) => candidate && underlying.contains?.(candidate) && isUsableControl(candidate),
      );
      if (underlyingTarget && focusControl(underlyingTarget)) return true;
      const first = firstUsable(underlying);
      if (first && focusControl(first)) return true;
    }

    const candidates = [
      record?.opener,
      record?.target,
      resolveAnchor(record?.anchor),
      lastStableControl,
      pageFallback(),
    ];
    for (const candidate of candidates) {
      if (focusControl(candidate)) return true;
    }
    return false;
  }

  function scheduleRestore(layer, record) {
    const attempt = () => restoreAfterClose(layer, record);
    window.setTimeout?.(() => {
      if (attempt()) return;
      window.setTimeout?.(attempt, 40);
    }, 0);
  }

  function noteLayerState(layer) {
    if (!layer || !isLayer(layer)) return;
    const open = isLayerOpen(layer);
    const wasOpen = layerStates.get(layer) === true;
    if (open && !wasOpen) returnRecords.set(layer, captureRecord(layer));
    if (!open && wasOpen) scheduleRestore(layer, returnRecords.get(layer) || null);
    layerStates.set(layer, open);
  }

  function scanLayers(root = document) {
    if (root?.matches?.(LAYER_SELECTOR)) noteLayerState(root);
    root?.querySelectorAll?.(LAYER_SELECTOR)?.forEach?.(noteLayerState);
  }

  function handleFocusIn(event) {
    const target = event?.target;
    if (!isUsableControl(target)) return;
    const layer = containingLayer(target);
    if (!layer || !isLayerOpen(layer)) lastStableControl = target;
  }

  function install() {
    if (installed) return;
    installed = true;
    scanLayers(document);
    document.addEventListener?.("focusin", handleFocusIn, true);
    if (typeof MutationObserver === "function" && document.documentElement) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes") noteLayerState(mutation.target);
          mutation.addedNodes?.forEach?.((node) => {
            if (node?.nodeType === 1) scanLayers(node);
          });
        });
      });
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "hidden", "aria-hidden", "disabled", "aria-disabled", "inert"],
      });
    }
  }

  window.WormholesFocus = Object.freeze({
    install,
    isVisible,
    isEnabled,
    isUsableControl,
    focusControl,
    associatedOpener,
    captureRecord,
    resolveAnchor,
    noteLayerState,
    scanLayers,
    restoreAfterClose,
    pageFallback,
  });

  install();
})();

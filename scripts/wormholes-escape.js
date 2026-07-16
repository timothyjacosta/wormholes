/* GENERATED from scripts/modules/escape-policy.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 centralized Escape-key dismissal policy.
   Closes only the most recently opened safe layer and consumes one Escape per layer. */
const escapePolicyApi = (function () {
  const LAYER_SELECTOR = ".modal-backdrop, .menu, [data-escape-dismiss]";
  const layerOrder = new WeakMap();
  const layerOpenState = new WeakMap();
  let orderCounter = 0;
  let installed = false;

  function isLayerOpen(layer) {
    if (!layer || layer.isConnected === false) return false;
    if (layer.classList?.contains("modal-backdrop")) return layer.classList.contains("open");
    if (layer.classList?.contains("menu")) return layer.classList.contains("open");
    if (layer.id === "settingsPanel" || layer.hasAttribute?.("hidden"))
      return layer.hidden === false;
    if (layer.dataset?.escapeDismiss)
      return layer.hidden !== true && !layer.getAttribute?.("aria-hidden")?.includes?.("true");
    return false;
  }

  function noteLayerState(layer) {
    if (!layer) return;
    const open = isLayerOpen(layer);
    const wasOpen = layerOpenState.get(layer) === true;
    if (open && !wasOpen) {
      layerOrder.set(layer, ++orderCounter);
    }
    layerOpenState.set(layer, open);
  }

  function scanLayers(root = document) {
    if (root?.matches?.(LAYER_SELECTOR)) noteLayerState(root);
    root?.querySelectorAll?.(LAYER_SELECTOR)?.forEach?.(noteLayerState);
  }

  function visibleOpenLayers() {
    const layers = Array.from(document.querySelectorAll?.(LAYER_SELECTOR) || []);
    layers.forEach(noteLayerState);
    return layers
      .filter(isLayerOpen)
      .sort((a, b) => (layerOrder.get(a) || 0) - (layerOrder.get(b) || 0));
  }

  function topLayer() {
    const layers = visibleOpenLayers();
    return layers[layers.length - 1] || null;
  }

  function menuOpener(menu) {
    const wrap = menu?.closest?.(".menu-wrap");
    return wrap?.querySelector?.(".menu-button") || menu?.previousElementSibling || null;
  }

  function dismissMenu(menu) {
    const opener = menuOpener(menu);
    menu.classList.remove("open", "open-left");
    opener?.setAttribute?.("aria-expanded", "false");
    menu.closest?.(".menu-wrap")?.classList?.remove?.("menu-wrap-active");
    menu.closest?.(".entry, .universe-entry, .vision-pin")?.classList?.remove?.("menu-active");
    setTimeout(() => opener?.focus?.(), 0);
    return true;
  }

  function dismissSettings() {
    const gear = document.getElementById?.("settingsGearBtn");
    if (typeof window.toggleSettingsMenu === "function") window.toggleSettingsMenu(false);
    else {
      const panel = document.getElementById?.("settingsPanel");
      if (panel) panel.hidden = true;
      gear?.setAttribute?.("aria-expanded", "false");
    }
    setTimeout(() => gear?.focus?.(), 0);
    return true;
  }

  function dismissByPolicy(layer) {
    if (!layer) return false;
    if (layer.classList?.contains("menu")) return dismissMenu(layer);

    const policy = String(layer.dataset?.escapeDismiss || "").trim();
    if (policy === "none") return false;
    if (policy === "@settings") return dismissSettings();
    if (!policy) return false;

    const control = document.getElementById?.(policy);
    if (!control || control.disabled || control.getAttribute?.("aria-disabled") === "true")
      return false;
    control.click?.();
    return true;
  }

  function dismissTop() {
    const layer = topLayer();
    if (!layer) return {handled: false, dismissed: false, layer: null};
    const dismissed = dismissByPolicy(layer);
    return {handled: true, dismissed, layer};
  }

  function handleKeydown(event) {
    if (event?.key !== "Escape" || event.isComposing) return false;
    const result = dismissTop();
    if (!result.handled) return false;
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    return true;
  }

  function install() {
    if (installed) return;
    installed = true;
    scanLayers(document);
    document.addEventListener?.("keydown", handleKeydown, true);

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
        attributeFilter: ["class", "hidden", "aria-hidden"],
      });
    }
  }

  const api = Object.freeze({
    install,
    isLayerOpen,
    scanLayers,
    topLayer,
    dismissTop,
    handleKeydown,
  });
  window.WormholesEscape = api;

  install();
  return api;
})();

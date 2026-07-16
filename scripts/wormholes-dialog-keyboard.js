/* GENERATED from scripts/modules/dialog-keyboard.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 dialog keyboard lifecycle helpers.
   Every dialog uses the same declared opening focus and Tab/Shift+Tab containment rules. */
const dialogKeyboardApi = (function () {
  const FOCUSABLE_SELECTOR = [
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    'input:not([disabled]):not([type="hidden"])',
    "select:not([disabled])",
    "textarea:not([disabled])",
    "iframe",
    "object",
    "embed",
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  function isEnabled(el) {
    return (
      !!el &&
      !el.disabled &&
      !el.hasAttribute?.("disabled") &&
      el.getAttribute?.("aria-disabled") !== "true"
    );
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.closest?.('[hidden], [aria-hidden="true"]')) return false;
    const style = window.getComputedStyle?.(el);
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    return !!(
      el.getClientRects?.().length ||
      el === document.body ||
      el === document.documentElement
    );
  }

  function isFocusable(el) {
    if (!isEnabled(el) || !isVisible(el)) return false;
    return !!el.matches?.(FOCUSABLE_SELECTOR);
  }

  function getFocusableElements(root) {
    return Array.from(root?.querySelectorAll?.(FOCUSABLE_SELECTOR) || []).filter(isFocusable);
  }

  function declaredInitialFocus(modal) {
    const targetId = String(modal?.dataset?.dialogInitialFocus || "").trim();
    if (!targetId) return null;
    const target = document.getElementById?.(targetId) || null;
    if (!target || !modal.contains?.(target) || !isFocusable(target)) return null;
    return target;
  }

  function fallbackFocusTarget(modal) {
    const focusables = getFocusableElements(modal);
    if (focusables.length) return focusables[0];
    return modal?.querySelector?.(".modal") || modal || null;
  }

  function initialFocusTarget(modal) {
    return declaredInitialFocus(modal) || fallbackFocusTarget(modal);
  }

  function focusInitial(modal, options = {}) {
    const target = initialFocusTarget(modal);
    if (!target) return null;
    if (!target.hasAttribute?.("tabindex") && !target.matches?.(FOCUSABLE_SELECTOR)) {
      target.setAttribute?.("tabindex", "-1");
      if (target.dataset) target.dataset.wormholesModalFallbackFocus = "true";
    }
    target.focus?.({preventScroll: options.preventScroll !== false});
    return target;
  }

  function trapTab(event, modal) {
    if (!modal || event?.key !== "Tab") return false;
    const focusables = getFocusableElements(modal);
    if (!focusables.length) {
      event.preventDefault?.();
      focusInitial(modal);
      return true;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (!modal.contains?.(current) || current === first)) {
      event.preventDefault?.();
      last.focus?.();
      return true;
    }
    if (!event.shiftKey && (!modal.contains?.(current) || current === last)) {
      event.preventDefault?.();
      first.focus?.();
      return true;
    }
    return false;
  }

  const api = Object.freeze({
    FOCUSABLE_SELECTOR,
    isEnabled,
    isVisible,
    isFocusable,
    getFocusableElements,
    declaredInitialFocus,
    fallbackFocusTarget,
    initialFocusTarget,
    focusInitial,
    trapTab,
  });
  window.WormholesDialogKeyboard = api;
  return api;
})();

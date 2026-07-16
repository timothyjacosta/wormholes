/* Wormholes Beta 110: native buttons where possible + complete ARIA semantics and modal focus management. */

import {api as importedDialogKeyboardApi} from "./dialog-keyboard.mjs";
const accessibilityDialogKeyboardApi =
  typeof importedDialogKeyboardApi !== "undefined"
    ? importedDialogKeyboardApi
    : window.WormholesDialogKeyboard;
(function () {
  const CONTROL_SELECTOR = [
    '[data-app-button="true"]',
    ".app-button",
    ".home-safe-control",
    ".tab-button",
    ".entry-title",
    ".menu-button",
    ".universe-entry-main",
    ".universe-entry-button",
    ".migrate-universe-button",
    ".copy-universe-target",
    ".bridge-universe-button",
    ".bridge-target-creation-button",
    ".bridge-no-specific-button",
    ".group-choice",
    ".literature-tag-choice",
    ".nested-picker-select",
    ".nested-picker-expander",
    ".literature-title-toggle",
    ".vision-pin.expandable",
    ".vision-pin-tag[data-tag-type]",
  ].join(",");

  const TAB_MAP = {
    currentTabBtn: "currentTab",
    createTabBtn: "createTab",
    archiveTabBtn: "archiveTab",
    literatureTabBtn: "literatureTab",
    visionTabBtn: "visionTab",
  };

  function isNativeInteractive(el) {
    return !!el?.matches?.("button, input, select, textarea, a[href], summary");
  }

  function isDisabled(el) {
    return !!(
      el?.disabled ||
      el?.hasAttribute?.("disabled") ||
      el?.getAttribute?.("aria-disabled") === "true"
    );
  }

  function setDisabledSemantics(el) {
    if (!el) return;
    if (isDisabled(el)) {
      el.setAttribute("aria-disabled", "true");
      if (!isNativeInteractive(el)) el.tabIndex = -1;
    } else {
      el.removeAttribute("aria-disabled");
      if (
        !isNativeInteractive(el) &&
        el.getAttribute("role") !== "tab" &&
        !el.hasAttribute("tabindex")
      )
        el.tabIndex = 0;
    }
  }

  function upgradeControl(el) {
    if (!el) return;
    if (el.matches("button")) {
      if (!el.hasAttribute("type")) el.setAttribute("type", "button");
      setDisabledSemantics(el);
      return;
    }
    if (isNativeInteractive(el)) {
      setDisabledSemantics(el);
      return;
    }
    if (!el.hasAttribute("role")) el.setAttribute("role", "button");
    if (!isDisabled(el) && !el.hasAttribute("tabindex")) el.tabIndex = 0;
    setDisabledSemantics(el);
  }

  function syncTabs() {
    const tabList = document.querySelector(".tabs");
    if (tabList) {
      tabList.setAttribute("role", "tablist");
      tabList.setAttribute("aria-label", "Wormholes sections");
    }
    Object.entries(TAB_MAP).forEach(([buttonId, panelId]) => {
      const button = document.getElementById(buttonId);
      const panel = document.getElementById(panelId);
      if (!button || !panel) return;
      const active = button.classList.contains("active") && panel.classList.contains("active");
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panelId);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", buttonId);
      if (active) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
  }

  function syncMenus(root = document) {
    root.querySelectorAll?.(".menu-wrap").forEach((wrap, index) => {
      const button = wrap.querySelector(".menu-button");
      const menu = wrap.querySelector(".menu");
      if (!button || !menu) return;
      const menuId = menu.id || `wormholes-menu-${index}-${Math.random().toString(36).slice(2, 8)}`;
      menu.id = menuId;
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-controls", menuId);
      button.setAttribute("aria-expanded", menu.classList.contains("open") ? "true" : "false");
      menu.setAttribute("role", "menu");
      menu.querySelectorAll('.app-button, button, [role="button"]').forEach((item) => {
        if (!item.matches("button")) item.setAttribute("role", "menuitem");
        else item.setAttribute("role", "menuitem");
        setDisabledSemantics(item);
      });
    });
  }

  function syncEntries(root = document) {
    root.querySelectorAll?.(".entry").forEach((entry, index) => {
      const title = entry.querySelector(".entry-title");
      const details = entry.querySelector(".entry-details");
      if (!title || !details) return;
      const detailsId = details.id || `entry-details-${entry.dataset.id || index}`;
      details.id = detailsId;
      title.setAttribute("aria-expanded", entry.classList.contains("open") ? "true" : "false");
      title.setAttribute("aria-controls", detailsId);
    });
  }

  function syncModals(root = document) {
    root.querySelectorAll?.(".modal-backdrop").forEach((modal, index) => {
      if (!modal.hasAttribute("role")) modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-hidden", modal.classList.contains("open") ? "false" : "true");
      const heading = modal.querySelector('h2, h3, [id$="Heading"]');
      if (heading) {
        if (!heading.id) heading.id = `wormholes-modal-heading-${index}`;
        modal.setAttribute("aria-labelledby", heading.id);
      }
    });
  }

  const dialogKeyboard = accessibilityDialogKeyboardApi || null;
  const FOCUSABLE_SELECTOR =
    dialogKeyboard?.FOCUSABLE_SELECTOR ||
    [
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
  const MODAL_BACKGROUND_ROOT_SELECTOR = "#homeScreen, #appScreen, #settingsDock, #searchDock";
  const modalOpenSet = new Set();
  const modalStack = [];
  const modalReturnFocus = new WeakMap();
  let activeModal = null;
  let restoringModalFocus = false;

  function isVisibleForFocus(el) {
    if (dialogKeyboard) return dialogKeyboard.isVisible(el);
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

  function getFocusableElements(root) {
    if (dialogKeyboard) return dialogKeyboard.getFocusableElements(root);
    return Array.from(root?.querySelectorAll?.(FOCUSABLE_SELECTOR) || []).filter(
      (el) => isVisibleForFocus(el) && !el.closest?.('[aria-hidden="true"]'),
    );
  }

  function focusFirstInModal(modal) {
    if (!modal || restoringModalFocus) return;
    restoringModalFocus = true;
    if (dialogKeyboard) {
      dialogKeyboard.focusInitial(modal);
      restoringModalFocus = false;
      return;
    }
    const focusables = getFocusableElements(modal);
    const target = focusables[0] || modal.querySelector?.(".modal") || modal;
    if (target) {
      if (!target.hasAttribute("tabindex") && !target.matches?.(FOCUSABLE_SELECTOR)) {
        target.setAttribute("tabindex", "-1");
        target.dataset.wormholesModalFallbackFocus = "true";
      }
      target.focus?.({preventScroll: true});
    }
    restoringModalFocus = false;
  }

  function restoreFocusTarget(target) {
    if (!target || !target.isConnected || !isVisibleForFocus(target)) return false;
    restoringModalFocus = true;
    target.focus?.({preventScroll: true});
    restoringModalFocus = false;
    return document.activeElement === target;
  }

  function setManagedInert(el, shouldInert) {
    if (!el) return;
    if (shouldInert) {
      if (!el.dataset.wormholesModalManagedInert) {
        el.dataset.wormholesModalManagedInert = el.hasAttribute("inert") ? "true" : "false";
      }
      el.inert = true;
      return;
    }
    if (!el.dataset.wormholesModalManagedInert) return;
    const wasInert = el.dataset.wormholesModalManagedInert === "true";
    if (wasInert) el.inert = true;
    else el.inert = false;
    delete el.dataset.wormholesModalManagedInert;
  }

  function restoreFocusableOutside() {
    document.querySelectorAll("[data-wormholes-modal-tabindex-lock]").forEach((el) => {
      const original = el.dataset.wormholesModalTabindexOriginal;
      if (original === "__none__") el.removeAttribute("tabindex");
      else if (original != null) el.setAttribute("tabindex", original);
      delete el.dataset.wormholesModalTabindexLock;
      delete el.dataset.wormholesModalTabindexOriginal;
    });
    document
      .querySelectorAll("[data-wormholes-modal-managed-inert]")
      .forEach((el) => setManagedInert(el, false));
  }

  function lockFocusableOutside(modal) {
    restoreFocusableOutside();
    document.querySelectorAll(MODAL_BACKGROUND_ROOT_SELECTOR).forEach((root) => {
      if (!root.contains(modal)) setManagedInert(root, true);
    });
    document.querySelectorAll(".modal-backdrop.open").forEach((otherModal) => {
      if (otherModal !== modal) setManagedInert(otherModal, true);
    });
    document.querySelectorAll(FOCUSABLE_SELECTOR).forEach((el) => {
      if (modal.contains(el)) return;
      if (el.dataset.wormholesModalTabindexLock) return;
      el.dataset.wormholesModalTabindexOriginal = el.hasAttribute("tabindex")
        ? el.getAttribute("tabindex")
        : "__none__";
      el.dataset.wormholesModalTabindexLock = "true";
      el.setAttribute("tabindex", "-1");
    });
  }

  function ensureActiveModalFocus(modal) {
    if (!modal) return;
    window.setTimeout(() => {
      if (activeModal !== modal || !modal.classList.contains("open")) return;
      if (!modal.contains(document.activeElement)) focusFirstInModal(modal);
    }, 0);
  }

  function syncModalFocusState() {
    const currentOpen = Array.from(document.querySelectorAll(".modal-backdrop.open"));
    const currentOpenSet = new Set(currentOpen);
    const previouslyActive = activeModal;
    const closedModals = [];

    currentOpen.forEach((modal) => {
      if (modalOpenSet.has(modal)) return;
      modalOpenSet.add(modal);
      modalStack.push(modal);
      const returnTarget =
        document.activeElement && !modal.contains(document.activeElement)
          ? document.activeElement
          : previouslyActive;
      if (returnTarget) modalReturnFocus.set(modal, returnTarget);
    });

    Array.from(modalOpenSet).forEach((modal) => {
      if (currentOpenSet.has(modal)) return;
      modalOpenSet.delete(modal);
      closedModals.push(modal);
    });

    for (let i = modalStack.length - 1; i >= 0; i -= 1) {
      if (!currentOpenSet.has(modalStack[i])) modalStack.splice(i, 1);
    }

    activeModal = modalStack[modalStack.length - 1] || null;

    if (activeModal) {
      lockFocusableOutside(activeModal);
      const closedActive =
        previouslyActive &&
        previouslyActive !== activeModal &&
        closedModals.includes(previouslyActive);
      const returnTarget = closedActive ? modalReturnFocus.get(previouslyActive) : null;
      if (returnTarget && activeModal.contains(returnTarget)) restoreFocusTarget(returnTarget);
      ensureActiveModalFocus(activeModal);
      return;
    }

    restoreFocusableOutside();
    const closedActive = previouslyActive && closedModals.includes(previouslyActive);
    const returnTarget = closedActive ? modalReturnFocus.get(previouslyActive) : null;
    if (returnTarget) window.setTimeout(() => restoreFocusTarget(returnTarget), 0);
  }

  function trapModalTab(event) {
    if (!activeModal || event.key !== "Tab") return;
    if (dialogKeyboard) {
      dialogKeyboard.trapTab(event, activeModal);
      return;
    }
    const focusables = getFocusableElements(activeModal);
    if (!focusables.length) {
      event.preventDefault();
      focusFirstInModal(activeModal);
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (!activeModal.contains(current) || current === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!activeModal.contains(current) || current === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  function keepFocusInActiveModal(event) {
    if (restoringModalFocus || !activeModal) return;
    if (activeModal.contains(event.target)) return;
    event.stopPropagation();
    focusFirstInModal(activeModal);
  }

  function elementLabelText(el) {
    return (el.querySelector?.(".group-choice-title")?.textContent || el.textContent || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function syncSelectableCards(root = document) {
    root.querySelectorAll?.("#groupCreationList .group-choice").forEach((card) => {
      const selected = card.classList.contains("selected");
      const locked = card.classList.contains("locked");
      card.setAttribute("role", "checkbox");
      card.setAttribute("aria-checked", selected ? "true" : "false");
      if (locked) card.setAttribute("aria-disabled", "true");
      else card.removeAttribute("aria-disabled");
      if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
      if (!card.hasAttribute("aria-label")) {
        const label = elementLabelText(card) || "group item";
        card.setAttribute(
          "aria-label",
          `${selected ? "Selected" : "Select"} item for group: ${label}`,
        );
      }
    });

    root.querySelectorAll?.("#groupConnectionList").forEach((list) => {
      list.setAttribute("role", "listbox");
      if (!list.hasAttribute("aria-label"))
        list.setAttribute("aria-label", "Choose group connection target");
    });

    root.querySelectorAll?.("#groupConnectionList .group-connection-choice").forEach((card) => {
      card.setAttribute("role", "option");
      if (!card.hasAttribute("aria-selected")) card.setAttribute("aria-selected", "false");
      if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
      if (!card.hasAttribute("aria-label")) {
        const label = elementLabelText(card) || "group connection choice";
        card.setAttribute("aria-label", `Choose something to connect: ${label}`);
      }
    });

    root.querySelectorAll?.(".literature-tag-choice").forEach((card) => {
      const selected =
        card.classList.contains("selected") ||
        card.closest?.(".nested-picker-row")?.classList.contains("selected") ||
        card.getAttribute("aria-pressed") === "true" ||
        card.getAttribute("aria-checked") === "true";
      card.setAttribute("role", "checkbox");
      card.setAttribute("aria-checked", selected ? "true" : "false");
      card.removeAttribute("aria-pressed");
      if (!card.hasAttribute("tabindex") && !isNativeInteractive(card)) card.tabIndex = 0;
    });

    root
      .querySelectorAll?.(
        '.nested-picker-select[data-picker-action="connect-entry"], .nested-picker-select[data-picker-action="bridge-entry"], .nested-picker-select[data-picker-action="bridge-universe"]',
      )
      .forEach((control) => {
        const row = control.closest?.(".nested-picker-row");
        const selected =
          row?.classList.contains("selected") || control.getAttribute("aria-pressed") === "true";
        control.setAttribute("aria-pressed", selected ? "true" : "false");
      });
  }

  function syncPressedStates(root = document) {
    root.querySelectorAll?.(".selected[aria-pressed], .app-button[aria-pressed]").forEach((el) => {
      if (el.getAttribute("role") === "checkbox") return;
      if (el.classList.contains("selected") || el.closest?.(".selected"))
        el.setAttribute("aria-pressed", "true");
    });
  }

  function addAriaReference(element, attribute, id) {
    if (!element || !attribute || !id) return;
    const values = new Set(
      String(element.getAttribute(attribute) || "")
        .split(/\s+/)
        .filter(Boolean),
    );
    values.add(id);
    element.setAttribute(attribute, Array.from(values).join(" "));
  }

  function syncFormErrors(root = document) {
    root.querySelectorAll?.(".error[data-error-for]").forEach((error) => {
      const target = document.getElementById(error.dataset.errorFor || "");
      if (!target || !error.id) return;

      error.setAttribute("role", "alert");
      error.setAttribute("aria-live", "assertive");
      error.setAttribute("aria-atomic", "true");
      addAriaReference(target, "aria-describedby", error.id);
      addAriaReference(target, "aria-errormessage", error.id);

      if (error.classList.contains("show")) target.setAttribute("aria-invalid", "true");
      else target.removeAttribute("aria-invalid");
    });
  }

  function syncControls(root = document) {
    root.querySelectorAll?.(CONTROL_SELECTOR).forEach(upgradeControl);
    syncTabs();
    syncMenus(root);
    syncEntries(root);
    syncModals(root);
    syncSelectableCards(root);
    syncPressedStates(root);
    syncFormErrors(root);
  }

  function activateKeyboard(event) {
    const el = event.target.closest?.(CONTROL_SELECTOR);
    if (!el || isNativeInteractive(el)) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    if (!isDisabled(el)) el.click();
  }

  function moveTab(event) {
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab) return;
    const tabs = Array.from(document.querySelectorAll('[role="tab"]')).filter(
      (t) => !isDisabled(t),
    );
    const index = tabs.indexOf(tab);
    if (index < 0) return;
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = tabs[(index + 1) % tabs.length];
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === "Home") next = tabs[0];
    if (event.key === "End") next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    next.focus();
    next.click();
  }

  let syncQueued = false;
  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      syncControls(document);
      syncModalFocusState();
    });
  }

  document.addEventListener("keydown", trapModalTab, true);
  document.addEventListener("keydown", activateKeyboard, true);
  document.addEventListener("keydown", moveTab, true);
  document.addEventListener("focusin", keepFocusInActiveModal, true);
  document.addEventListener("click", queueSync, true);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" || mutation.type === "attributes") {
        queueSync();
        break;
      }
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    syncControls(document);
    syncModalFocusState();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "disabled",
        "aria-disabled",
        "aria-pressed",
        "aria-checked",
        "hidden",
      ],
    });
  });
})();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};

/* GENERATED from scripts/modules/settings-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 301 modal, settings, build-diagnostics, menu, and control-guard helpers. */

function installOnboardingTooltips(root = document) {
  // Beta 31: Hover help is intentionally limited to selected gear-menu backup controls.
  // Static settings-tooltip-button markup handles those tooltips without adding global hover text.
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

function setModalErrorText(errorId, message) {
  const error = document.getElementById(errorId);
  if (!error) return;

  error.setAttribute("role", "alert");
  error.setAttribute("aria-live", "assertive");
  error.setAttribute("aria-atomic", "true");

  const targetId = error.dataset.errorFor || "";
  const target = targetId ? document.getElementById(targetId) : null;
  if (target) {
    addAriaReference(target, "aria-describedby", errorId);
    addAriaReference(target, "aria-errormessage", errorId);
    target.setAttribute("aria-invalid", "true");
  }

  if (message) error.textContent = message;
  error.classList.add("show");
}

function getCompactSettingsStatusText(text = "") {
  const value = String(text || "").trim();
  if (!value) return "";
  const compactRules = [
    [/^Backup folder created:/i, "Backup folder created"],
    [/^Backup folder restored/i, "Backup folder restored"],
    [/^App data exported\./i, "App data exported"],
    [/^App data imported\./i, "App data imported"],
    [/^Importing app data/i, "Importing app data…"],
    [/^Preparing app data export/i, "Preparing app data export…"],
  ];
  for (const [pattern, replacement] of compactRules) {
    if (pattern.test(value)) return replacement;
  }
  return value;
}

function setSettingsStatus(message = "", options = {}) {
  const element = document.getElementById("settingsStatus");
  if (element) {
    element.textContent = "";
    element.title = "";
    element.hidden = true;
    element.classList.remove("settings-status--visible");
  }
  const text = String(message || "").trim();
  if (!text) return;
  const visibleText = options.compact === false ? text : getCompactSettingsStatusText(text);
  if (visibleText) showSavedToast(visibleText);
}

const SETTINGS_SECTION_TOGGLE_SELECTOR = ".settings-section-toggle";

function settingsSectionToggles(panel = document.getElementById("settingsPanel")) {
  return Array.from(panel?.querySelectorAll?.(SETTINGS_SECTION_TOGGLE_SELECTOR) || []);
}

function setSettingsSectionExpanded(toggle, expanded) {
  if (!toggle) return;
  const bodyId = toggle.getAttribute("aria-controls") || "";
  const body = bodyId ? document.getElementById(bodyId) : null;
  toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  if (body) body.hidden = !expanded;
}

function toggleSettingsSection(toggle) {
  const panel = document.getElementById("settingsPanel");
  if (!panel || !toggle) return;
  const shouldExpand = toggle.getAttribute("aria-expanded") !== "true";

  settingsSectionToggles(panel).forEach((candidate) => {
    setSettingsSectionExpanded(candidate, candidate === toggle && shouldExpand);
  });

  prepareMenuAccessibility(panel, document.getElementById("settingsGearBtn"));
}

function installSettingsSectionHandlers() {
  const panel = document.getElementById("settingsPanel");
  if (!panel || panel.dataset.settingsSectionsBound === "true") return;
  panel.dataset.settingsSectionsBound = "true";

  settingsSectionToggles(panel).forEach((toggle) => {
    setSettingsSectionExpanded(toggle, false);
    toggle.addEventListener("click", () => toggleSettingsSection(toggle));
  });
}

function toggleSettingsMenu(forceOpen) {
  const panel = document.getElementById("settingsPanel");
  const button = document.getElementById("settingsGearBtn");
  if (!panel || !button) return;
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.hidden;
  panel.hidden = !shouldOpen;
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", button.id || "settingsGearBtn");
  if (shouldOpen) {
    wormholesLastMenuOpener = button;
    window.WormholesBackupStatus?.render?.();
    prepareMenuAccessibility(panel, button);
    setSettingsStatus("");
  } else {
    menuControlItems(panel).forEach((item) => {
      item.tabIndex = -1;
    });
  }
}

function openQuickStartModal() {
  toggleSettingsMenu(false);
  document.getElementById("quickStartModal")?.classList.add("open");
}

function closeQuickStartModal() {
  document.getElementById("quickStartModal")?.classList.remove("open");
}

const BUILD_META_NAMES = Object.freeze({
  version: "wormholes-build-version",
  layout: "wormholes-layout-mode",
  commit: "wormholes-build-commit",
  timestamp: "wormholes-build-timestamp",
  buildId: "wormholes-build-id",
});

let buildDiagnosticsReturnOpener = null;

function readBuildMeta(name) {
  const value = document.querySelector?.(`meta[name="${name}"]`)?.getAttribute?.("content") || "";
  return String(value).trim();
}

function isUnexpandedBuildPlaceholder(value = "") {
  return String(value).includes("$Format:");
}

function usableBuildMeta(value = "") {
  const text = String(value || "").trim();
  return text && !isUnexpandedBuildPlaceholder(text) ? text : "";
}

function formatBuildTimestamp(value = "") {
  const raw = usableBuildMeta(value);
  if (!raw) return "Local copy";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function getBuildDiagnosticsInfo() {
  const titleMatch = String(document.title || "").match(/Wormholes Beta \d+/i);
  const version =
    usableBuildMeta(readBuildMeta(BUILD_META_NAMES.version)) || titleMatch?.[0] || "Wormholes";
  const layout =
    usableBuildMeta(readBuildMeta(BUILD_META_NAMES.layout)) || "Desktop only — fluid window";
  const commit = usableBuildMeta(readBuildMeta(BUILD_META_NAMES.commit));
  const timestamp = usableBuildMeta(readBuildMeta(BUILD_META_NAMES.timestamp));
  const buildId = usableBuildMeta(readBuildMeta(BUILD_META_NAMES.buildId));
  return {
    version,
    layout,
    buildId: buildId || "Local copy",
    commit: commit || "Local copy",
    timestamp: timestamp || "",
    timestampLabel: formatBuildTimestamp(timestamp),
  };
}

function buildDiagnosticsText(info = getBuildDiagnosticsInfo()) {
  return [
    `Version: ${info.version}`,
    `Layout: ${info.layout}`,
    `Build ID: ${info.buildId}`,
    `Source commit: ${info.commit}`,
    `Built: ${info.timestamp || info.timestampLabel}`,
  ].join("\n");
}

function renderBuildDiagnostics() {
  const info = getBuildDiagnosticsInfo();
  const fields = {
    buildDiagnosticsVersion: info.version,
    buildDiagnosticsLayout: info.layout,
    buildDiagnosticsId: info.buildId,
    buildDiagnosticsCommit: info.commit,
    buildDiagnosticsTimestamp: info.timestampLabel,
  };
  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
  const commitElement = document.getElementById("buildDiagnosticsCommit");
  if (commitElement) commitElement.title = info.commit;
  const timestampElement = document.getElementById("buildDiagnosticsTimestamp");
  if (timestampElement) timestampElement.title = info.timestamp || info.timestampLabel;
  return info;
}

function openBuildDiagnosticsModal(event) {
  const modal = document.getElementById("buildDiagnosticsModal");
  if (!modal) return;
  buildDiagnosticsReturnOpener = event?.currentTarget || document.activeElement || null;
  toggleSettingsMenu(false);
  renderBuildDiagnostics();
  const status = document.getElementById("buildDiagnosticsCopyStatus");
  if (status) status.textContent = "";
  modal.classList.add("open");
  setTimeout(() => document.getElementById("copyBuildDiagnosticsBtn")?.focus(), 0);
}

function closeBuildDiagnosticsModal(options = {}) {
  document.getElementById("buildDiagnosticsModal")?.classList.remove("open");
  const status = document.getElementById("buildDiagnosticsCopyStatus");
  if (status) status.textContent = "";
  const opener = buildDiagnosticsReturnOpener;
  buildDiagnosticsReturnOpener = null;
  if (options.returnToSettings !== false) toggleSettingsMenu(true);
  setTimeout(() => opener?.focus?.(), 0);
}

async function writeBuildDiagnosticsToClipboard(text) {
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to the browser-compatible fallback below.
  }

  if (!document.createElement || !document.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select?.();
  let copied = false;
  try {
    copied = document.execCommand?.("copy") === true;
  } catch {
    copied = false;
  }
  textarea.remove?.();
  return copied;
}

async function copyBuildDiagnostics() {
  const info = renderBuildDiagnostics();
  const copied = await writeBuildDiagnosticsToClipboard(buildDiagnosticsText(info));
  const status = document.getElementById("buildDiagnosticsCopyStatus");
  if (status) {
    status.textContent = copied
      ? "Build details copied."
      : "Copy did not work. You can select the details above.";
  }
  return copied;
}

let localDataHelpReturnContext = null;

function openLocalDataHelpModal(options = {}) {
  const modal = document.getElementById("localDataHelpModal");
  if (!modal) return;

  const opener = options.opener || document.activeElement || null;
  const returnModalId = String(options.returnModalId || "");
  const returnToSettings = options.returnToSettings === true;
  localDataHelpReturnContext = {opener, returnModalId, returnToSettings};

  toggleSettingsMenu(false);
  if (returnModalId) document.getElementById(returnModalId)?.classList.remove("open");
  modal.classList.add("open");
  setTimeout(() => document.getElementById("closeLocalDataHelpBtn")?.focus(), 0);
}

function closeLocalDataHelpModal(options = {}) {
  const modal = document.getElementById("localDataHelpModal");
  modal?.classList.remove("open");

  const context = localDataHelpReturnContext;
  localDataHelpReturnContext = null;
  if (options.restoreContext === false) return;

  if (context?.returnModalId) {
    const returnModal = document.getElementById(context.returnModalId);
    returnModal?.classList.add("open");
  } else if (context?.returnToSettings) {
    toggleSettingsMenu(true);
  }
  setTimeout(() => context?.opener?.focus?.(), 0);
}

let wormholesLastMenuOpener = null;
let wormholesGeneratedMenuId = 0;

const APP_MENU_ITEM_SELECTOR = [
  "button:not([disabled])",
  "[role='menuitem']:not([aria-disabled='true'])",
  "input[type='checkbox']:not([disabled])",
].join(",");

function isElementHiddenFromMenuNavigation(element) {
  if (!element) return true;
  if (element.hidden || element.getAttribute?.("aria-hidden") === "true") return true;

  let current = element;
  while (current && current !== document.documentElement) {
    if (current.hidden || current.getAttribute?.("aria-hidden") === "true") return true;
    current = current.parentElement;
  }

  return false;
}

function menuControlItems(menu) {
  if (!menu) return [];
  return Array.from(menu.querySelectorAll?.(APP_MENU_ITEM_SELECTOR) || [])
    .filter((item) => !isElementHiddenFromMenuNavigation(item))
    .filter((item) => item.disabled !== true && item.getAttribute?.("aria-disabled") !== "true");
}

function ensureMenuId(menu, prefix = "wormholes-menu") {
  if (!menu) return "";
  if (!menu.id) {
    wormholesGeneratedMenuId += 1;
    menu.id = `${prefix}-${wormholesGeneratedMenuId}`;
  }
  return menu.id;
}

function prepareMenuAccessibility(menu, opener = null) {
  if (!menu) return;
  const button = opener || menu.previousElementSibling || null;
  const isSettingsPanel = menu.id === "settingsPanel";
  menu.setAttribute("role", isSettingsPanel ? "dialog" : "menu");
  const menuId = ensureMenuId(menu);
  if (button) {
    if (!button.id) {
      wormholesGeneratedMenuId += 1;
      button.id = `${menuId}-button-${wormholesGeneratedMenuId}`;
    }
    const isOpen = isSettingsPanel ? !menu.hidden : menu.classList.contains("open");
    button.setAttribute("aria-haspopup", isSettingsPanel ? "dialog" : "menu");
    button.setAttribute("aria-controls", menuId);
    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    menu.setAttribute("aria-labelledby", button.id);
  }

  menuControlItems(menu).forEach((item) => {
    if (item.matches?.("button")) {
      if (isSettingsPanel) item.removeAttribute("role");
      else if (!item.getAttribute("role")) item.setAttribute("role", "menuitem");
    }
    const isOpen = isSettingsPanel ? !menu.hidden : menu.classList.contains("open");
    item.tabIndex = isOpen ? 0 : -1;
  });
}

function focusMenuItem(menu, direction = 1) {
  const items = menuControlItems(menu);
  if (!items.length) return false;

  const activeIndex = items.indexOf(document.activeElement);
  const nextIndex =
    activeIndex < 0
      ? direction < 0
        ? items.length - 1
        : 0
      : (activeIndex + direction + items.length) % items.length;

  items[nextIndex]?.focus?.();
  return true;
}

function focusFirstMenuItem(menu) {
  const items = menuControlItems(menu);
  items[0]?.focus?.();
}

function focusLastMenuItem(menu) {
  const items = menuControlItems(menu);
  items[items.length - 1]?.focus?.();
}

function menuFromOpener(opener) {
  if (!opener) return null;
  if (opener.id === "settingsGearBtn") return document.getElementById("settingsPanel");
  if (opener.classList?.contains("menu-button"))
    return (
      opener.nextElementSibling || opener.closest?.(".menu-wrap")?.querySelector?.(".menu") || null
    );
  return null;
}

function openerForMenu(menu) {
  if (!menu) return null;
  if (menu.id === "settingsPanel") return document.getElementById("settingsGearBtn");
  return (
    menu.previousElementSibling ||
    menu.closest?.(".menu-wrap")?.querySelector?.(".menu-button") ||
    wormholesLastMenuOpener ||
    null
  );
}

function activeKeyboardElement(event) {
  return event?.target?.nodeType === 1 ? event.target : document.activeElement;
}

function openSettingsPanel() {
  const panel = document.getElementById("settingsPanel");
  return panel && !panel.hidden ? panel : null;
}

function openPositionedMenuElement() {
  return document.querySelector?.(".menu.open") || null;
}

function activeMenuForKeyboard(event) {
  const target = activeKeyboardElement(event);
  const directMenu = target?.closest?.("#settingsPanel, .menu.open");
  if (directMenu) return directMenu;

  const active = document.activeElement;
  const activeMenu = active?.closest?.("#settingsPanel, .menu.open");
  if (activeMenu) return activeMenu;

  const settingsPanel = openSettingsPanel();
  if (settingsPanel && (settingsPanel.contains?.(active) || settingsPanel.contains?.(target))) {
    return settingsPanel;
  }

  const positioned = openPositionedMenuElement();
  if (positioned && (positioned.contains?.(active) || positioned.contains?.(target))) {
    return positioned;
  }

  return settingsPanel || positioned || null;
}

function menuOpenerForKeyboard(event) {
  const target = activeKeyboardElement(event);
  const directOpener = target?.closest?.("#settingsGearBtn, .menu-button");
  if (directOpener) return directOpener;

  const active = document.activeElement;
  return active?.closest?.("#settingsGearBtn, .menu-button") || null;
}

function openKeyboardMenuFromButton(button, direction = 1) {
  const menu = menuFromOpener(button);
  if (!menu) return false;

  if (menu.id === "settingsPanel") {
    toggleSettingsMenu(true);
    prepareMenuAccessibility(menu, button);
  } else {
    closeMenus();
    openPositionedMenu(menu, button);
  }

  wormholesLastMenuOpener = button;
  if (direction < 0) focusLastMenuItem(menu);
  else focusFirstMenuItem(menu);
  return true;
}

function handleMenuKeyboardNavigation(event) {
  const key = event.key;
  const menuNavigationKeys = ["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"];
  if (!menuNavigationKeys.includes(key)) return false;

  const opener = menuOpenerForKeyboard(event);
  const activeMenu = activeMenuForKeyboard(event);

  if (opener && ["Enter", " ", "ArrowDown", "ArrowUp"].includes(key)) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    openKeyboardMenuFromButton(opener, key === "ArrowUp" ? -1 : 1);
    return true;
  }

  if (!activeMenu) return false;

  if (key === "ArrowDown") {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    focusMenuItem(activeMenu, 1);
    return true;
  }

  if (key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    focusMenuItem(activeMenu, -1);
    return true;
  }

  if (key === "Home") {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    focusFirstMenuItem(activeMenu);
    return true;
  }

  if (key === "End") {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    focusLastMenuItem(activeMenu);
    return true;
  }

  return false;
}

let wormholesMenuKeyboardNavigationInstalled = false;

function installMenuKeyboardNavigationHandlers() {
  if (wormholesMenuKeyboardNavigationInstalled) return;
  wormholesMenuKeyboardNavigationInstalled = true;
  document.addEventListener(
    "keydown",
    (event) => {
      handleMenuKeyboardNavigation(event);
    },
    true,
  );
}

const APP_LIST_KEYBOARD_GROUPS = [
  {container: "#universeArchiveList", items: ".universe-entry-main, .universe-entry-button"},
  {container: "#migrateUniverseList", items: ".migrate-universe-button"},
  {container: "#copyToUniverseList", items: ".copy-universe-target"},
  {container: "#deleteUniverseMigrateList", items: ".delete-migrate-target"},
  {
    container: "#connectPickerList",
    items: ".nested-picker-select, .nested-picker-expander:not([aria-disabled='true'])",
  },
  {
    container: "#bridgeUniverseList",
    items: ".nested-picker-select, .nested-picker-expander:not([aria-disabled='true'])",
  },
  {container: "#archiveList", items: ".entry-title"},
  {container: "#literatureList", items: ".literature-title-toggle"},
];

function isArrowListTextControl(element) {
  return !!(
    element &&
    (element.matches?.("input, select, textarea") ||
      element.isContentEditable ||
      element.closest?.("[contenteditable='true']"))
  );
}

function focusableListItemsForGroup(group) {
  if (!group?.container) return [];
  return Array.from(group.container.querySelectorAll?.(group.items) || [])
    .filter((item) => !isElementHiddenFromMenuNavigation(item))
    .filter((item) => item.disabled !== true && item.getAttribute?.("aria-disabled") !== "true");
}

function listKeyboardGroupForTarget(target) {
  if (!target?.closest) return null;
  for (const group of APP_LIST_KEYBOARD_GROUPS) {
    const container = target.closest(group.container);
    if (container) {
      return {...group, container};
    }
  }
  return null;
}

function focusListItem(group, direction = 1) {
  const items = focusableListItemsForGroup(group);
  if (!items.length) return false;

  const activeIndex = items.indexOf(document.activeElement);
  const nextIndex =
    activeIndex < 0
      ? direction < 0
        ? items.length - 1
        : 0
      : (activeIndex + direction + items.length) % items.length;

  items[nextIndex]?.focus?.();
  return true;
}

function focusFirstListItem(group) {
  const items = focusableListItemsForGroup(group);
  items[0]?.focus?.();
  return !!items.length;
}

function focusLastListItem(group) {
  const items = focusableListItemsForGroup(group);
  items[items.length - 1]?.focus?.();
  return !!items.length;
}

function handleListKeyboardNavigation(event) {
  const key = event.key;
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return false;

  const target = activeKeyboardElement(event);
  if (isArrowListTextControl(target)) return false;

  const group =
    listKeyboardGroupForTarget(target) || listKeyboardGroupForTarget(document.activeElement);
  if (!group) return false;

  if (key === "ArrowDown") {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return focusListItem(group, 1);
  }

  if (key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return focusListItem(group, -1);
  }

  if (key === "Home") {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return focusFirstListItem(group);
  }

  if (key === "End") {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return focusLastListItem(group);
  }

  return false;
}

let wormholesListKeyboardNavigationInstalled = false;

function installListKeyboardNavigationHandlers() {
  if (wormholesListKeyboardNavigationInstalled) return;
  wormholesListKeyboardNavigationInstalled = true;
  document.addEventListener(
    "keydown",
    (event) => {
      if (handleMenuKeyboardNavigation(event)) return;
      handleListKeyboardNavigation(event);
    },
    true,
  );
}

function closeMenus(options = {}) {
  let focusTarget = null;
  document.querySelectorAll(".menu.open").forEach((menu) => {
    const opener = openerForMenu(menu);
    if (!focusTarget && opener) focusTarget = opener;
    menu.classList.remove("open", "open-left");
    prepareMenuAccessibility(menu, opener);
    if (opener) opener.setAttribute("aria-expanded", "false");
    const menuWrap = menu.closest(".menu-wrap");
    if (menuWrap) menuWrap.classList.remove("menu-wrap-active");
    const menuOwner = menu.closest(".entry, .universe-entry, .vision-pin");
    if (menuOwner) menuOwner.classList.remove("menu-active");
  });
  if (options.restoreFocus) {
    (focusTarget || wormholesLastMenuOpener)?.focus?.();
  }
}

function openPositionedMenu(menu, opener = null) {
  if (!menu) return;
  const button = opener || openerForMenu(menu);
  const menuWrap = menu.closest(".menu-wrap");
  if (menuWrap) menuWrap.classList.add("menu-wrap-active");
  const menuOwner = menu.closest(".entry, .universe-entry, .vision-pin");
  if (menuOwner) menuOwner.classList.add("menu-active");

  menu.classList.add("open", "open-left");
  prepareMenuAccessibility(menu, button);
  if (button) {
    button.setAttribute("aria-expanded", "true");
    wormholesLastMenuOpener = button;
  }

  const rect = menu.getBoundingClientRect();

  if (rect.left < 8) {
    menu.classList.remove("open-left");
  }
}

function togglePositionedMenu(menu, opener = null) {
  if (!menu) return;
  const button = opener || openerForMenu(menu);
  const wasOpen = menu.classList.contains("open");
  closeMenus();

  if (!wasOpen) {
    openPositionedMenu(menu, button);
  } else if (button) {
    button.setAttribute("aria-expanded", "false");
  }
}

function openLocalFolderDeletionWarningModal() {
  document.getElementById("localFolderDeletionWarningModal")?.classList.add("open");
}

function closeLocalFolderDeletionWarningModal() {
  document.getElementById("localFolderDeletionWarningModal")?.classList.remove("open");
}

function acknowledgeLocalFolderDeletionWarning() {
  closeLocalFolderDeletionWarningModal();
  openLocalFolderSyncModal();
}

function openLocalFolderSyncModal() {
  document.getElementById("localFolderSyncModal")?.classList.add("open");
}

function closeLocalFolderSyncModal() {
  document.getElementById("localFolderSyncModal")?.classList.remove("open");
  localFolderPendingSync = false;
}

function openLocalFolderNotFoundModal(message = "") {
  const messageEl = document.getElementById("localFolderNotFoundMessage");
  if (messageEl && message) {
    messageEl.textContent = message;
  }
  document.getElementById("localFolderNotFoundModal")?.classList.add("open");
}

function closeLocalFolderNotFoundModal() {
  document.getElementById("localFolderNotFoundModal")?.classList.remove("open");
}

async function findLocalFolderFromNotFoundModal() {
  closeLocalFolderNotFoundModal();
  await chooseLocalFolderFromCheckbox();
}

function useAppOnlyFromNotFoundModal() {
  closeLocalFolderNotFoundModal();
  localFoldersEnabled = false;
  localFolderPendingSync = false;
  localFolderSwitchInProgress = false;
  (globalThis.controllerServices || globalThis).clearWormholesFolderHandles();
  (globalThis.controllerServices || globalThis).saveLocalFolderEnabled();
  (globalThis.controllerServices || globalThis).renderLiteratureList();
  (globalThis.controllerServices || globalThis).renderVisionBoard();
}

const APP_CONTROL_SELECTOR = [
  "button",
  ".app-button",
  ".home-safe-control",
  "[role='button']",
  ".tab-button",
  ".small-archive-button",
  ".home-return-button",
  ".entry-title",
  ".menu-button",
  ".universe-entry-main",
  ".universe-entry-button",
  ".migrate-universe-button",
  ".copy-universe-target",
  ".bridge-universe-button",
  ".bridge-target-creation-button",
  ".bridge-no-specific-button",
  ".bridge-back-button",
  ".connection-node",
  ".connection-edge-group",
  ".connection-edge-click",
  ".connection-note-dot",
  ".wormhole-cluster-title",
  ".wormhole-creation",
  ".wormhole-bridge-note-group",
  ".literature-title-toggle",
  ".literature-tag-choice",
  ".literature-expand-group",
  ".literature-link-indicator",
  ".svg-literature-indicator",
  ".literature-link-row",
].join(",");

let wormholesUiProtectionGuardsInstalled = false;

function swallowDownloadBehavior(event) {
  event.preventDefault();
  event.stopPropagation();
  if (event.stopImmediatePropagation) event.stopImmediatePropagation();
}

function installSafeControl(element, action) {
  if (!element) return;
  if (element.dataset.safeControlBound === "true") return;
  element.dataset.safeControlBound = "true";

  ["pointerdown", "mousedown", "mouseup", "touchstart", "touchend"].forEach((type) => {
    element.addEventListener(
      type,
      (event) => {
        swallowDownloadBehavior(event);
      },
      true,
    );
  });

  element.addEventListener(
    "click",
    (event) => {
      swallowDownloadBehavior(event);
      action();
      return false;
    },
    true,
  );

  element.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        swallowDownloadBehavior(event);
        action();
        return false;
      }
    },
    true,
  );
}

function syncAppButtonState(element) {
  if (!element || !element.matches?.(".app-button")) return;

  if (!element.matches?.("button, input, select, textarea, a[href], [role]")) {
    element.setAttribute("role", "button");
  }

  const hasExplicitDisabledProperty = typeof element.disabled === "boolean";
  const disabled = hasExplicitDisabledProperty
    ? element.disabled === true
    : element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";

  if (disabled) {
    element.disabled = true;
    element.setAttribute("aria-disabled", "true");
    element.setAttribute("disabled", "");
    element.tabIndex = -1;
  } else {
    element.disabled = false;
    element.removeAttribute("aria-disabled");
    element.removeAttribute("disabled");
    element.tabIndex = 0;
  }
}

function setAppButtonDisabled(element, disabled) {
  if (!element) return;
  element.disabled = !!disabled;
  syncAppButtonState(element);
}

function syncAllAppButtonStates(root = document) {
  root.querySelectorAll?.(".app-button").forEach(syncAppButtonState);
  root.querySelectorAll?.(".tab-button").forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");
  });
}

function preserveSafeExternalLink(element) {
  const anchor = element?.matches?.("a[href], area[href]")
    ? element
    : element?.closest?.("a[href], area[href]");
  if (!anchor || (globalThis.controllerServices || globalThis).isWormholesSafeDownloadElement(anchor)) return false;

  const safeRender = window.WormholesSafeRender;
  const safeHref = safeRender?.safeExternalUrl?.(anchor.getAttribute("href") || "") || "";
  if (!safeHref) return false;

  // Imported and edited Literature may contain ordinary https links. Keep
  // those links usable, but remove download behavior and reapply the app's
  // isolated external-link policy every time the UI guard encounters them.
  anchor.removeAttribute("download");
  safeRender.configureExternalLink?.(anchor, safeHref);
  return true;
}

function disableNativeDownloadBehaviors() {
  document.querySelectorAll("a, area").forEach((element) => {
    if ((globalThis.controllerServices || globalThis).isWormholesSafeDownloadElement(element)) return;
    if (preserveSafeExternalLink(element)) return;
    element.removeAttribute("href");
    element.removeAttribute("download");
    element.removeAttribute("target");
    element.removeAttribute("title");
  });

  document.querySelectorAll("[download]").forEach((element) => {
    if ((globalThis.controllerServices || globalThis).isWormholesSafeDownloadElement(element)) return;
    element.removeAttribute("download");
  });

  document.querySelectorAll("[title]").forEach((element) => {
    if ((globalThis.controllerServices || globalThis).isWormholesSafeDownloadElement(element)) return;
    if (/download\s+file/i.test(element.getAttribute("title") || "")) {
      element.removeAttribute("title");
    }
  });
}

function activateAppButtonFromKeyboard(event) {
  if (handleMenuKeyboardNavigation(event)) return;

  const target = event.target.closest?.(".app-button");
  if (!target) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    syncAppButtonState(target);
    if (target.disabled || target.getAttribute("aria-disabled") === "true") return;
    target.click();
  }
}

function installPrimarySafeControls() {
  installSafeControl(
    document.getElementById("createUniverseBtn"),
    (globalThis.controllerServices || globalThis).openUniverseTitleModal,
  );
  installSafeControl(
    document.getElementById("enterUniverseBtn"),
    (globalThis.controllerServices || globalThis).openUniverseArchiveModal,
  );
  installSafeControl(
    document.getElementById("manageWormholesBtn"),
    (globalThis.controllerServices || globalThis).openWormholesModal,
  );
}

function isFormLikeControl(element) {
  return !!(element && element.matches?.("input, select, textarea, option, label"));
}

function getProtectedControlTarget(event) {
  return event.target.closest?.(APP_CONTROL_SELECTOR);
}

function removeDownloadAttributesNear(element) {
  let current = element;
  while (current && current !== document.documentElement) {
    if (current.tagName === "A" && !(globalThis.controllerServices || globalThis).isWormholesSafeDownloadElement(current)) {
      if (preserveSafeExternalLink(current)) {
        current = current.parentElement;
        continue;
      }
      current.removeAttribute("href");
      current.removeAttribute("download");
      current.removeAttribute("title");
      current.removeAttribute("target");
    }

    if (
      !(globalThis.controllerServices || globalThis).isWormholesSafeDownloadElement(current) &&
      /download\s+file/i.test(current.getAttribute?.("title") || "")
    ) {
      current.setAttribute("title", "");
    }

    current = current.parentElement;
  }
}

function protectControlElement(element) {
  if (!element) return;

  if (!element.matches?.("button, input, select, textarea, a[href], [role]")) {
    element.setAttribute("role", "button");
  }

  if (element.matches?.(".tab-button")) {
    element.setAttribute("aria-selected", element.classList.contains("active") ? "true" : "false");
  }

  element.setAttribute("title", "");
  removeDownloadAttributesNear(element);
  syncAppButtonState(element);

  if (element.dataset.downloadSafe === "true") return;
  element.dataset.downloadSafe = "true";

  element.addEventListener(
    "click",
    (event) => {
      syncAppButtonState(element);
      if (element.disabled || element.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
      if (!isFormLikeControl(element)) {
        event.preventDefault();
      }
    },
    true,
  );

  element.addEventListener(
    "auxclick",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    },
    true,
  );

  element.addEventListener(
    "dragstart",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    },
    true,
  );
}

function protectAllControls(root = document) {
  disableNativeDownloadBehaviors();
  applyContextualActionAriaLabels(root);
  root.querySelectorAll?.(APP_CONTROL_SELECTOR).forEach(protectControlElement);
  syncAllAppButtonStates(root);
  installOnboardingTooltips(root);
}

function guardAgainstDownloadWrapper(event) {
  if ((globalThis.controllerServices || globalThis).isWormholesSafeDownloadElement(event.target)) return;
  if (preserveSafeExternalLink(event.target)) return;

  disableNativeDownloadBehaviors();

  const safeTarget = getProtectedControlTarget(event);
  if (!safeTarget) return;

  protectControlElement(safeTarget);
  removeDownloadAttributesNear(safeTarget);
  syncAppButtonState(safeTarget);

  if (safeTarget.disabled || safeTarget.getAttribute("aria-disabled") === "true") {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }

  if (event.type === "dragstart" || event.type === "auxclick") {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
}

function installUiProtectionGuards() {
  if (wormholesUiProtectionGuardsInstalled) return;
  wormholesUiProtectionGuardsInstalled = true;

  document.addEventListener("keydown", activateAppButtonFromKeyboard, true);

  [
    "click",
    "dblclick",
    "auxclick",
    "pointerdown",
    "mousedown",
    "mouseup",
    "touchstart",
    "touchend",
    "dragstart",
  ].forEach((type) => {
    window.addEventListener(type, guardAgainstDownloadWrapper, true);
    document.addEventListener(type, guardAgainstDownloadWrapper, true);
  });

  if (typeof MutationObserver !== "function" || !document.documentElement) return;

  const downloadGuardObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          protectAllControls(node);
        }
      });
    });
  });

  downloadGuardObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.wormholesDownloadGuardObserver = downloadGuardObserver;
}

function installSettingsMenuHandlers() {
  const root = document.documentElement;
  installMenuKeyboardNavigationHandlers();
  installListKeyboardNavigationHandlers();
  installSettingsSectionHandlers();

  if (root?.dataset.settingsMenuHandlersBound === "true") return;
  if (root?.dataset) root.dataset.settingsMenuHandlersBound = "true";

  document.getElementById("settingsGearBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSettingsMenu();
  });

  document.getElementById("settingsPanel")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.getElementById("quickStartMenuBtn")?.addEventListener("click", openQuickStartModal);
  document
    .getElementById("buildDiagnosticsBtn")
    ?.addEventListener("click", openBuildDiagnosticsModal);
  document.getElementById("copyBuildDiagnosticsBtn")?.addEventListener("click", () => {
    void copyBuildDiagnostics();
  });
  document.getElementById("closeBuildDiagnosticsBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeBuildDiagnosticsModal();
  });
  document.getElementById("privacyLocalDataBtn")?.addEventListener("click", (event) =>
    openLocalDataHelpModal({
      opener: event.currentTarget,
      returnToSettings: true,
    }),
  );
  document.getElementById("closeQuickStartBtn")?.addEventListener("click", closeQuickStartModal);
  document.getElementById("closeLocalDataHelpBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLocalDataHelpModal();
  });

  document
    .getElementById("exportAppDataBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).exportAppDataFromSettings);
  document
    .getElementById("importAppDataBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).importAppDataFromSettings);
  document
    .getElementById("recoverySnapshotsBtn")
    ?.addEventListener("click", () => window.WormholesSnapshots?.openRecoverySnapshotsModal?.());
  document.getElementById("recoveryLocalDataHelpBtn")?.addEventListener("click", (event) =>
    openLocalDataHelpModal({
      opener: event.currentTarget,
      returnModalId: "recoverySnapshotsModal",
    }),
  );
  document
    .getElementById("closeRecoverySnapshotsBtn")
    ?.addEventListener("click", () => window.WormholesSnapshots?.closeRecoverySnapshotsModal?.());
  document
    .getElementById("clearAppDataBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).openClearAppDataConfirmModal);
  document
    .getElementById("appDataImportInput")
    ?.addEventListener("change", (globalThis.controllerServices || globalThis).handleAppDataImportFile);
  document
    .getElementById("cancelAppDataImportBtn")
    ?.addEventListener("click", () => (globalThis.controllerServices || globalThis).closeAppDataImportConfirmModal(false));
  document
    .getElementById("confirmAppDataImportBtn")
    ?.addEventListener("click", () => (globalThis.controllerServices || globalThis).closeAppDataImportConfirmModal(true));
  document
    .getElementById("cancelClearAppDataBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).closeClearAppDataConfirmModal);
  document
    .getElementById("confirmClearAppDataBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).proceedClearAppDataConfirm);
  document
    .getElementById("closeAppDataExportSummaryBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).closeAppDataExportSummaryModal);
  document
    .getElementById("createBackupBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).createBackupFromSettings);
  document
    .getElementById("restoreBackupBtn")
    ?.addEventListener("click", (globalThis.controllerServices || globalThis).restoreBackupFromSettings);
  document
    .getElementById("changeTargetStorageBtn")
    ?.addEventListener("click", changeTargetStorageFromSettings);
}

/* Public controller surface for served ES-module builds. */
const SETTINGS_CONTROLLER_API = Object.freeze({
  installOnboardingTooltips,
  setModalErrorText,
  getCompactSettingsStatusText,
  setSettingsStatus,
  toggleSettingsMenu,
  openQuickStartModal,
  closeQuickStartModal,
  readBuildMeta,
  isUnexpandedBuildPlaceholder,
  usableBuildMeta,
  formatBuildTimestamp,
  getBuildDiagnosticsInfo,
  buildDiagnosticsText,
  renderBuildDiagnostics,
  openBuildDiagnosticsModal,
  closeBuildDiagnosticsModal,
  writeBuildDiagnosticsToClipboard,
  copyBuildDiagnostics,
  openLocalDataHelpModal,
  closeLocalDataHelpModal,
  isElementHiddenFromMenuNavigation,
  menuControlItems,
  ensureMenuId,
  prepareMenuAccessibility,
  focusMenuItem,
  focusFirstMenuItem,
  focusLastMenuItem,
  menuFromOpener,
  openerForMenu,
  activeKeyboardElement,
  openSettingsPanel,
  openPositionedMenuElement,
  activeMenuForKeyboard,
  menuOpenerForKeyboard,
  openKeyboardMenuFromButton,
  handleMenuKeyboardNavigation,
  installMenuKeyboardNavigationHandlers,
  isArrowListTextControl,
  focusableListItemsForGroup,
  listKeyboardGroupForTarget,
  focusListItem,
  focusFirstListItem,
  focusLastListItem,
  handleListKeyboardNavigation,
  installListKeyboardNavigationHandlers,
  closeMenus,
  openPositionedMenu,
  togglePositionedMenu,
  openLocalFolderDeletionWarningModal,
  closeLocalFolderDeletionWarningModal,
  acknowledgeLocalFolderDeletionWarning,
  openLocalFolderSyncModal,
  closeLocalFolderSyncModal,
  openLocalFolderNotFoundModal,
  closeLocalFolderNotFoundModal,
  findLocalFolderFromNotFoundModal,
  useAppOnlyFromNotFoundModal,
  swallowDownloadBehavior,
  installSafeControl,
  syncAppButtonState,
  setAppButtonDisabled,
  syncAllAppButtonStates,
  disableNativeDownloadBehaviors,
  activateAppButtonFromKeyboard,
  installPrimarySafeControls,
  isFormLikeControl,
  getProtectedControlTarget,
  removeDownloadAttributesNear,
  protectControlElement,
  protectAllControls,
  guardAgainstDownloadWrapper,
  installUiProtectionGuards,
  installSettingsMenuHandlers,
});
(globalThis.registerControllerServices || (() => {}))(SETTINGS_CONTROLLER_API);

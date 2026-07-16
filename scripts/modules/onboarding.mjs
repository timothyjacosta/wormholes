/* Wormholes Beta 301 contextual onboarding, first-use tips, and terminology help. */

const ONBOARDING_STORAGE_PREFIX = "wormholesOnboardingSeen:";
const ONBOARDING_DISABLED_KEY = "wormholesOnboardingTipsDisabled";

const SCREEN_TIPS = Object.freeze([
  Object.freeze({
    key: "screen:bridges",
    elementId: "wormholesModal",
    title: "Manage Bridges",
    body: "Bridges connect items in different universes. Select an item, then select an item in another universe to add or remove a Bridge.",
    priority: 100,
  }),
  Object.freeze({
    key: "screen:settings",
    elementId: "settingsPanel",
    title: "Settings",
    body: "Use these sections to review help, storage, backups, activity, and advanced options. Open only the section you need.",
    priority: 90,
  }),
  Object.freeze({
    key: "screen:connections",
    elementId: "connectionsScreen",
    title: "Connections",
    body: "Connections link items inside this universe. Select one item, then another, to add or remove a Connection.",
    priority: 80,
  }),
  Object.freeze({
    key: "screen:literature-editor",
    elementId: "literatureEditorScreen",
    title: "Literature editor",
    body: "Give the document a title, write or format the text, then save it. Wormholes keeps your draft while you work.",
    priority: 75,
  }),
  Object.freeze({
    key: "screen:home",
    elementId: "homeScreen",
    title: "Welcome to Wormholes",
    body: "Create a universe to begin, enter one you already made, or manage Bridges between universes.",
    priority: 60,
  }),
  Object.freeze({
    key: "screen:generate",
    elementId: "currentTab",
    title: "Build with rolls",
    body: "Roll one part at a time, or use Quick Roll for a complete idea. Archive a result when you want to keep it.",
    priority: 50,
  }),
  Object.freeze({
    key: "screen:create",
    elementId: "createTab",
    title: "Create manually",
    body: "Choose each part yourself. Select Custom when you want to write an option that is not in the list.",
    priority: 50,
  }),
  Object.freeze({
    key: "screen:archive",
    elementId: "archiveListScreen",
    title: "Archive and Connections",
    body: "Open a saved item to see its details. Use its menu to edit, organize, connect, copy, move, or delete it.",
    priority: 50,
  }),
  Object.freeze({
    key: "screen:literature",
    elementId: "literatureListScreen",
    title: "Literature",
    body: "Create a document in Wormholes or add a file you already have. Open an item to read it or use its menu for more actions.",
    priority: 50,
  }),
  Object.freeze({
    key: "screen:vision",
    elementId: "visionTab",
    title: "Vision Board",
    body: "Add images for visual reference. Open an image to view it, or use its menu to rename, tag, move, copy, or delete it.",
    priority: 40,
  }),
]);

const CONTROL_TIPS = Object.freeze({
  createUniverseBtn: Object.freeze({
    title: "Create a universe",
    body: "Name the new universe. You can change its title and summary later.",
  }),
  enterUniverseBtn: Object.freeze({
    title: "Enter a universe",
    body: "Choose a saved universe to continue working where you left off.",
  }),
  manageWormholesBtn: Object.freeze({
    title: "Manage Bridges",
    body: "Use this map to connect items that live in different universes.",
  }),
  whatBtn: Object.freeze({
    title: "Roll What",
    body: "This chooses the kind of place, person, object, group, or idea you are creating.",
  }),
  attrBtn: Object.freeze({
    title: "Roll Attributes",
    body: "Each roll adds a describing trait. You can roll two attributes for each creation.",
  }),
  storyBtn: Object.freeze({
    title: "Roll Story",
    body: "This adds a pressure, problem, or possibility that can make the idea useful in a story.",
  }),
  quickFullRollBtn: Object.freeze({
    title: "Quick Roll",
    body: "Quick Roll creates What, two Attributes, and Story in one step.",
  }),
  newBtn: Object.freeze({
    title: "Start a new creation",
    body: "This clears the current roll so you can begin a different idea. Archive anything you want to keep first.",
  }),
  archiveBtn: Object.freeze({
    title: "Archive this creation",
    body: "Give the result a title and save it in the current universe.",
  }),
  skipRollAnimationToggle: Object.freeze({
    title: "Skip animation",
    body: "Turn this on when you want roll results to appear immediately.",
  }),
  manualTitle: Object.freeze({
    title: "Creation title",
    body: "Use a clear name that will be easy to find later in the Archive and maps.",
  }),
  manualWhat: Object.freeze({
    title: "Choose What",
    body: "Choose the kind of creation, or select Custom to write your own.",
  }),
  manualAttr1: Object.freeze({
    title: "Choose an Attribute",
    body: "Add a trait that makes the creation more specific or memorable.",
  }),
  manualAttr2: Object.freeze({
    title: "Choose another Attribute",
    body: "Add a second trait, or leave it simple by choosing an option that fits the first.",
  }),
  manualStory: Object.freeze({
    title: "Choose Story",
    body: "Add a pressure or possibility that gives the creation something to do in the world.",
  }),
  saveManualBtn: Object.freeze({
    title: "Archive the creation",
    body: "Save this manually built creation in the current universe.",
  }),
  clearManualBtn: Object.freeze({
    title: "Clear the draft",
    body: "This removes the current manual choices. It does not delete anything already in the Archive.",
  }),
  archiveFilterBtn: Object.freeze({
    title: "Filter the Archive",
    body: "Narrow the list by type, group, Connections, notes, or summaries.",
  }),
  archiveSortBtn: Object.freeze({
    title: "Sort the Archive",
    body: "Change the order without changing the saved items themselves.",
  }),
  archiveDensitySlider: Object.freeze({
    title: "Change list density",
    body: "Move the slider to show more detail or fit more saved items on the screen.",
  }),
  connectionsBtn: Object.freeze({
    title: "Open Connections",
    body: "Connections link items inside the current universe. Bridges link items across universes.",
  }),
  literatureFilterBtn: Object.freeze({
    title: "Filter Literature",
    body: "Narrow the list by item type, group, tags, or available text content.",
  }),
  literatureSortBtn: Object.freeze({
    title: "Sort Literature",
    body: "Change the order without changing the documents themselves.",
  }),
  literatureDensitySlider: Object.freeze({
    title: "Change list density",
    body: "Move the slider to show more detail or fit more documents on the screen.",
  }),
  uploadLiteratureBtn: Object.freeze({
    title: "Add Literature Files",
    body: "Choose a supported document from your device. Wormholes will preview the import before saving it.",
  }),
  createLiteratureBtn: Object.freeze({
    title: "Create Literature",
    body: "Open the editor to write a new document directly in Wormholes.",
  }),
  saveLiteratureBtn: Object.freeze({
    title: "Save Document",
    body: "Save the current title and text in this universe.",
  }),
  visionFilterBtn: Object.freeze({
    title: "Filter the Vision Board",
    body: "Narrow the board by tags, storage location, or image format.",
  }),
  visionSortBtn: Object.freeze({
    title: "Sort the Vision Board",
    body: "Change the display order without changing the images themselves.",
  }),
  visionDensitySlider: Object.freeze({
    title: "Change board density",
    body: "Move the slider to make image cards larger or fit more on the screen.",
  }),
  uploadVisionBtn: Object.freeze({
    title: "Add Images",
    body: "Choose an image from your device, then give it a useful title before adding it to the board.",
  }),
});

const DELEGATED_TIPS = Object.freeze([
  Object.freeze({
    selector: ".entry-title:not(.literature-title-toggle)",
    key: "control:archive-entry-title",
    title: "Open an Archive item",
    body: "Select the title to show or hide the item’s saved details.",
  }),
  Object.freeze({
    selector: ".literature-title-toggle",
    key: "control:literature-entry-title",
    title: "Open a Literature item",
    body: "Select the title to open the document or expand a Literature group.",
  }),
  Object.freeze({
    selector: ".menu-button",
    key: "control:item-menu",
    title: "More actions",
    body: "This menu holds actions for the item, such as edit, tag, connect, copy, move, or delete.",
  }),
  Object.freeze({
    selector: ".vision-pin.expandable",
    key: "control:vision-image",
    title: "Open a Vision Board image",
    body: "Select the image to view it larger. Select it again or use the close control to return to the board.",
  }),
]);

const TERMINOLOGY_TOOLTIPS = Object.freeze([
  Object.freeze({
    selector: "#manageWormholesBtn, #bridgesHelpBtn",
    text: "Bridges link items across different universes.",
  }),
  Object.freeze({
    selector: "#connectionsBtn, #connectionsHelpBtn",
    text: "Connections link items inside the current universe.",
  }),
  Object.freeze({
    selector: ".bridge-action",
    text: "Create or review a link to an item in another universe.",
  }),
  Object.freeze({
    selector: ".connect-action",
    text: "Create or review a link to another item in this universe.",
  }),
  Object.freeze({selector: "#whatBtn", text: "Roll the kind of thing you are creating."}),
  Object.freeze({selector: "#attrBtn", text: "Roll a trait that describes the creation."}),
  Object.freeze({selector: "#storyBtn", text: "Roll a story pressure or possibility."}),
  Object.freeze({
    selector: ".collection-density-control input, #archiveDensitySlider",
    text: "Adjust how much content appears in each list or card.",
  }),
]);

let onboardingPanel = null;
let onboardingHelpButton = null;
let onboardingTitle = null;
let onboardingBody = null;
let onboardingDisableCheckbox = null;
let currentTopic = null;
let lastActiveScreenKey = "";
let refreshQueued = false;

function storageGet(key) {
  try {
    return window.localStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function storageSet(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Onboarding remains usable when browser storage is unavailable.
  }
}

function storageRemove(key) {
  try {
    window.localStorage?.removeItem(key);
  } catch {
    // Onboarding remains usable when browser storage is unavailable.
  }
}

function automaticTipsDisabled() {
  return storageGet(ONBOARDING_DISABLED_KEY) === "true";
}

function setAutomaticTipsDisabled(disabled) {
  if (disabled) storageSet(ONBOARDING_DISABLED_KEY, "true");
  else storageRemove(ONBOARDING_DISABLED_KEY);
  if (onboardingDisableCheckbox) onboardingDisableCheckbox.checked = !!disabled;
}

function disableAutomaticTips() {
  setAutomaticTipsDisabled(true);
}

function topicWasSeen(key) {
  return storageGet(`${ONBOARDING_STORAGE_PREFIX}${key}`) === "true";
}

function rememberTopic(key) {
  if (key) storageSet(`${ONBOARDING_STORAGE_PREFIX}${key}`, "true");
}

function elementIsVisible(element) {
  if (!element || element.hidden || element.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle?.(element);
  if (style && (style.display === "none" || style.visibility === "hidden")) return false;
  return element.getClientRects().length > 0;
}

function activeScreenTip() {
  return (
    SCREEN_TIPS.filter((topic) => elementIsVisible(document.getElementById(topic.elementId))).sort(
      (left, right) => right.priority - left.priority,
    )[0] || null
  );
}

function topicHostElement(topic = null) {
  if (topic?.elementId) {
    const topicElement = document.getElementById(topic.elementId);
    if (topicElement) return topicElement.querySelector(".modal") || topicElement;
  }

  const visibleModal = Array.from(document.querySelectorAll(".modal-backdrop"))
    .filter(elementIsVisible)
    .pop();
  if (visibleModal) return visibleModal.querySelector(".modal") || visibleModal;

  const activeTopic = activeScreenTip();
  if (!activeTopic) return document.body;
  const activeElement = document.getElementById(activeTopic.elementId);
  return activeElement?.querySelector(".modal") || activeElement || document.body;
}

function hideTip({restoreHelpButton = true} = {}) {
  if (!onboardingPanel) return;
  onboardingPanel.hidden = true;
  currentTopic = null;
  if (onboardingHelpButton && restoreHelpButton) {
    updateContextualHelpButton(activeScreenTip());
  }
}

function showTip(topic, {automatic = true} = {}) {
  if (!topic || !onboardingPanel || !onboardingTitle || !onboardingBody) return false;
  if (automatic && (automaticTipsDisabled() || topicWasSeen(topic.key))) return false;

  if (automatic) rememberTopic(topic.key);
  currentTopic = topic;
  const panelHost = topicHostElement(topic);
  if (onboardingPanel.parentElement !== panelHost) panelHost.append(onboardingPanel);
  onboardingTitle.textContent = topic.title;
  onboardingBody.textContent = topic.body;
  onboardingDisableCheckbox.checked = automaticTipsDisabled();
  onboardingPanel.hidden = false;
  if (onboardingHelpButton) onboardingHelpButton.hidden = true;
  return true;
}

function updateContextualHelpButton(screenTip) {
  if (!onboardingHelpButton) return;
  onboardingHelpButton.hidden = !screenTip || !onboardingPanel?.hidden;
  if (!screenTip) return;
  const helpHost = topicHostElement(screenTip);
  if (onboardingHelpButton.parentElement !== helpHost) helpHost.append(onboardingHelpButton);
  onboardingHelpButton.setAttribute("aria-label", `Help for ${screenTip.title}`);
  onboardingHelpButton.title = `Help for ${screenTip.title}`;
}

function applyTerminologyTooltips(root = document) {
  TERMINOLOGY_TOOLTIPS.forEach(({selector, text}) => {
    root.querySelectorAll?.(selector).forEach((element) => {
      if (!element.hasAttribute("title")) element.setAttribute("title", text);
    });
  });
}

function refreshActiveScreen({allowAutomatic = true} = {}) {
  const screenTip = activeScreenTip();
  if (onboardingPanel && !onboardingPanel.hidden && !elementIsVisible(onboardingPanel)) {
    hideTip({restoreHelpButton: false});
  }
  updateContextualHelpButton(screenTip);
  const screenKey = screenTip?.key || "";
  if (!allowAutomatic || !screenTip || screenKey === lastActiveScreenKey) return;
  lastActiveScreenKey = screenKey;
  showTip(screenTip, {automatic: true});
}

function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  window.setTimeout(() => {
    refreshQueued = false;
    applyTerminologyTooltips();
    refreshActiveScreen();
  }, 0);
}

function createOnboardingControls() {
  onboardingPanel = document.createElement("aside");
  onboardingPanel.id = "contextualOnboardingFooter";
  onboardingPanel.className = "contextual-onboarding-footer";
  onboardingPanel.setAttribute("aria-labelledby", "contextualOnboardingTitle");
  onboardingPanel.setAttribute("aria-describedby", "contextualOnboardingBody");
  onboardingPanel.setAttribute("aria-live", "polite");
  onboardingPanel.hidden = true;
  onboardingPanel.innerHTML = `
    <div class="contextual-onboarding-copy">
      <span class="contextual-onboarding-label">Helpful tip</span>
      <h2 id="contextualOnboardingTitle"></h2>
      <p id="contextualOnboardingBody"></p>
    </div>
    <div class="contextual-onboarding-actions">
      <label class="contextual-onboarding-disable">
        <input id="contextualOnboardingDisable" type="checkbox">
        <span>Don’t show any more tips</span>
      </label>
      <button id="hideContextualOnboardingBtn" class="app-button contextual-onboarding-hide" data-app-button="true" type="button">Hide help</button>
    </div>
  `;

  onboardingHelpButton = document.createElement("button");
  onboardingHelpButton.id = "contextualHelpBtn";
  onboardingHelpButton.className = "app-button contextual-help-button";
  onboardingHelpButton.type = "button";
  onboardingHelpButton.textContent = "?";
  onboardingHelpButton.setAttribute("data-app-button", "true");
  onboardingHelpButton.hidden = true;

  document.body.append(onboardingPanel, onboardingHelpButton);
  onboardingTitle = document.getElementById("contextualOnboardingTitle");
  onboardingBody = document.getElementById("contextualOnboardingBody");
  onboardingDisableCheckbox = document.getElementById("contextualOnboardingDisable");

  document.getElementById("hideContextualOnboardingBtn")?.addEventListener("click", () => {
    hideTip();
    onboardingHelpButton?.focus({preventScroll: true});
  });

  onboardingDisableCheckbox?.addEventListener("change", () => {
    setAutomaticTipsDisabled(onboardingDisableCheckbox.checked);
  });

  onboardingHelpButton.addEventListener("click", () => {
    const screenTip = activeScreenTip();
    if (screenTip) showTip(screenTip, {automatic: false});
  });
}

function clickedTipTarget(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest("#contextualOnboardingFooter, #contextualHelpBtn")) return null;

  const identifiedControl = target.closest("[id]");
  const controlId = identifiedControl?.id || "";
  if (controlId && CONTROL_TIPS[controlId]) {
    return Object.freeze({
      key: `control:${controlId}`,
      ...CONTROL_TIPS[controlId],
    });
  }

  for (const topic of DELEGATED_TIPS) {
    if (target.closest(topic.selector)) return topic;
  }
  return null;
}

function initializeOnboarding() {
  if (document.getElementById("contextualOnboardingFooter")) return;
  createOnboardingControls();
  applyTerminologyTooltips();

  document.addEventListener(
    "click",
    (event) => {
      const topic = clickedTipTarget(event);
      if (!topic || automaticTipsDisabled() || topicWasSeen(topic.key)) return;
      window.setTimeout(() => showTip(topic, {automatic: true}), 0);
    },
    true,
  );

  const observer = new MutationObserver(queueRefresh);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "style", "aria-hidden"],
  });

  refreshActiveScreen();
}

function resetOnboardingTips() {
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(ONBOARDING_STORAGE_PREFIX) || key === ONBOARDING_DISABLED_KEY) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Reset is best effort when browser storage is unavailable.
  }
  lastActiveScreenKey = "";
  setAutomaticTipsDisabled(false);
  refreshActiveScreen();
}

const onboardingApi = Object.freeze({
  automaticTipsDisabled,
  setAutomaticTipsDisabled,
  disableAutomaticTips,
  resetOnboardingTips,
});

window.WormholesOnboarding = onboardingApi;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeOnboarding, {once: true});
} else {
  initializeOnboarding();
}

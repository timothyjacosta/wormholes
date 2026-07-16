import assert from "node:assert/strict";
import {fileURLToPath, pathToFileURL} from "node:url";
import path from "node:path";

const elementsById = new Map();
const documentListeners = new Map();
const timers = [];
let mutationCallback = null;

function splitClasses(value = "") {
  return String(value)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchesSelector(element, selector) {
  const trimmed = String(selector || "").trim();
  if (!trimmed) return false;
  if (trimmed.includes(",")) {
    return trimmed.split(",").some((part) => matchesSelector(element, part));
  }
  if (trimmed === "[id]") return !!element.id;
  if (trimmed.startsWith("#")) return element.id === trimmed.slice(1);
  if (trimmed.startsWith(".")) {
    const classes = trimmed
      .split(".")
      .filter(Boolean)
      .map((part) => part.replace(/:not\(.+$/, ""));
    return classes.every((className) => element.classList.contains(className));
  }
  return false;
}

class MockClassList {
  constructor(element) {
    this.element = element;
  }
  values() {
    return new Set(splitClasses(this.element.className));
  }
  contains(value) {
    return this.values().has(String(value));
  }
  add(...values) {
    const current = this.values();
    values.forEach((value) => current.add(String(value)));
    this.element.className = Array.from(current).join(" ");
  }
  remove(...values) {
    const current = this.values();
    values.forEach((value) => current.delete(String(value)));
    this.element.className = Array.from(current).join(" ");
  }
}

class MockElement {
  constructor(tagName = "div") {
    this.tagName = String(tagName).toUpperCase();
    this._id = "";
    this.className = "";
    this.classList = new MockClassList(this);
    this.hidden = false;
    this.checked = false;
    this.title = "";
    this.type = "";
    this.textContent = "";
    this.parentElement = null;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {};
    this._innerHTML = "";
  }

  set id(value) {
    if (this._id) elementsById.delete(this._id);
    this._id = String(value || "");
    if (this._id) elementsById.set(this._id, this);
  }

  get id() {
    return this._id;
  }

  set innerHTML(value) {
    this._innerHTML = String(value || "");
    const tagPattern = /<(h2|p|input|button)[^>]*\sid="([^"]+)"[^>]*>/g;
    let match;
    while ((match = tagPattern.exec(this._innerHTML))) {
      if (elementsById.has(match[2])) continue;
      const child = new MockElement(match[1]);
      child.id = match[2];
      child.type = /type="([^"]+)"/.exec(match[0])?.[1] || "";
      this.append(child);
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  append(...nodes) {
    nodes.forEach((node) => {
      if (!node) return;
      if (node.parentElement) {
        node.parentElement.children = node.parentElement.children.filter((child) => child !== node);
      }
      node.parentElement = this;
      this.children.push(node);
    });
  }

  appendChild(node) {
    this.append(node);
    return node;
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
    if (name === "id") this.id = value;
  }

  getAttribute(name) {
    return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(String(name));
  }

  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }

  dispatchEvent(event) {
    const normalized = event || {type: ""};
    normalized.target ||= this;
    normalized.stopPropagation ||= () => {};
    for (const callback of this.listeners.get(normalized.type) || []) callback(normalized);
    return true;
  }

  focus() {
    globalThis.document.activeElement = this;
  }

  getClientRects() {
    let current = this;
    while (current) {
      if (current.hidden || current.style.display === "none" || current.style.visibility === "hidden") {
        return [];
      }
      current = current.parentElement;
    }
    return [{left: 0, top: 0, right: 10, bottom: 10}];
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) results.push(child);
        visit(child);
      }
    };
    visit(this);
    return results;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentElement;
    }
    return null;
  }
}

const body = new MockElement("body");
const homeScreen = new MockElement("div");
homeScreen.id = "homeScreen";
homeScreen.className = "home-screen active";
body.append(homeScreen);

const appScreen = new MockElement("div");
appScreen.id = "appScreen";
appScreen.hidden = true;
body.append(appScreen);

const currentTab = new MockElement("section");
currentTab.id = "currentTab";
appScreen.append(currentTab);

const createUniverseBtn = new MockElement("button");
createUniverseBtn.id = "createUniverseBtn";
homeScreen.append(createUniverseBtn);

const universeTitleModal = new MockElement("div");
universeTitleModal.id = "universeTitleModal";
universeTitleModal.className = "modal-backdrop";
universeTitleModal.hidden = true;
const universeTitleModalBody = new MockElement("div");
universeTitleModalBody.className = "modal";
universeTitleModal.append(universeTitleModalBody);
body.append(universeTitleModal);

const storage = new Map();
const localStorage = {
  getItem(key) {
    return storage.has(String(key)) ? storage.get(String(key)) : null;
  },
  setItem(key, value) {
    storage.set(String(key), String(value));
  },
  removeItem(key) {
    storage.delete(String(key));
  },
  key(index) {
    return Array.from(storage.keys())[index] || null;
  },
  get length() {
    return storage.size;
  },
};

const document = {
  readyState: "complete",
  body,
  activeElement: body,
  createElement(tagName) {
    return new MockElement(tagName);
  },
  getElementById(id) {
    return elementsById.get(String(id)) || null;
  },
  querySelectorAll(selector) {
    const results = [];
    if (matchesSelector(body, selector)) results.push(body);
    return results.concat(body.querySelectorAll(selector));
  },
  addEventListener(type, callback) {
    if (!documentListeners.has(type)) documentListeners.set(type, []);
    documentListeners.get(type).push(callback);
  },
};

function dispatchDocumentClick(target) {
  const event = {type: "click", target, stopPropagation() {}};
  for (const callback of documentListeners.get("click") || []) callback(event);
}

function flushTimers() {
  while (timers.length) timers.shift()();
}

Object.assign(globalThis, {
  window: globalThis,
  document,
  Element: MockElement,
  localStorage,
  MutationObserver: class {
    constructor(callback) {
      mutationCallback = callback;
    }
    observe() {}
  },
  getComputedStyle(element) {
    return {
      display: element.style.display || "block",
      visibility: element.style.visibility || "visible",
    };
  },
});

globalThis.setTimeout = (callback) => {
  timers.push(callback);
  return timers.length;
};
globalThis.clearTimeout = () => {};

const modulePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
  "scripts/modules/onboarding.mjs",
);
await import(`${pathToFileURL(modulePath).href}?behavior-test=1`);

const footer = document.getElementById("contextualOnboardingFooter");
const footerTitle = document.getElementById("contextualOnboardingTitle");
const hideButton = document.getElementById("hideContextualOnboardingBtn");
const disableCheckbox = document.getElementById("contextualOnboardingDisable");
const helpButton = document.getElementById("contextualHelpBtn");

assert.ok(footer);
assert.equal(footer.parentElement, homeScreen);
assert.equal(footer.hidden, false);
assert.equal(footerTitle.textContent, "Welcome to Wormholes");
assert.equal(localStorage.getItem("wormholesOnboardingSeen:screen:home"), "true");

hideButton.dispatchEvent({type: "click", target: hideButton});
assert.equal(footer.hidden, true);
assert.equal(helpButton.hidden, false);
assert.equal(helpButton.parentElement, homeScreen);

helpButton.dispatchEvent({type: "click", target: helpButton});
assert.equal(footer.hidden, false);
assert.equal(footerTitle.textContent, "Welcome to Wormholes");

disableCheckbox.checked = true;
disableCheckbox.dispatchEvent({type: "change", target: disableCheckbox});
assert.equal(localStorage.getItem("wormholesOnboardingTipsDisabled"), "true");
hideButton.dispatchEvent({type: "click", target: hideButton});

globalThis.WormholesOnboarding.setAutomaticTipsDisabled(false);
universeTitleModal.hidden = false;
dispatchDocumentClick(createUniverseBtn);
flushTimers();
assert.equal(footer.hidden, false);
assert.equal(footerTitle.textContent, "Create a universe");
assert.equal(footer.parentElement, universeTitleModalBody);
assert.equal(localStorage.getItem("wormholesOnboardingSeen:control:createUniverseBtn"), "true");

universeTitleModal.hidden = true;
mutationCallback?.([]);
flushTimers();
assert.equal(footer.hidden, true);
assert.equal(helpButton.hidden, false);
assert.equal(helpButton.parentElement, homeScreen);

console.log("contextual-onboarding-behavior.unit.mjs passed");

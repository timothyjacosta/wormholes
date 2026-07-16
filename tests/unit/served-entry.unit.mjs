import assert from 'node:assert/strict';

const loaded = [];
const listeners = new Map();
const elementStore = new Map();

function createClassList(){
  const values = new Set();
  return {
    add(...items){ items.forEach(item => values.add(String(item))); },
    remove(...items){ items.forEach(item => values.delete(String(item))); },
    contains(item){ return values.has(String(item)); },
    toggle(item, force){
      const key = String(item);
      if(force === true){ values.add(key); return true; }
      if(force === false){ values.delete(key); return false; }
      if(values.has(key)){ values.delete(key); return false; }
      values.add(key); return true;
    }
  };
}

function createElement(tag = 'div'){
  const attributes = new Map();
  const localListeners = new Map();
  const children = [];
  const element = {
    tagName:String(tag || '').toUpperCase(),
    id:'',
    className:'',
    classList:createClassList(),
    dataset:{},
    style:{},
    hidden:false,
    inert:false,
    disabled:false,
    isConnected:true,
    tabIndex:0,
    offsetParent:{},
    children,
    parentElement:null,
    previousElementSibling:null,
    textContent:'',
    innerHTML:'',
    appendChild(child){
      children.push(child);
      child.parentElement = element;
      if(child.id) elementStore.set(child.id, child);
      return child;
    },
    remove(){ this.isConnected = false; },
    addEventListener(type, callback){ localListeners.set(type, callback); },
    removeEventListener(type){ localListeners.delete(type); },
    dispatchEvent(event){ localListeners.get(event?.type)?.(event); return true; },
    setAttribute(name, value){
      attributes.set(String(name), String(value));
      if(name === 'id'){ this.id = String(value); elementStore.set(this.id, this); }
      if(name === 'hidden') this.hidden = true;
    },
    getAttribute(name){ return attributes.has(String(name)) ? attributes.get(String(name)) : null; },
    hasAttribute(name){ return attributes.has(String(name)); },
    removeAttribute(name){ attributes.delete(String(name)); if(name === 'hidden') this.hidden = false; },
    matches(){ return false; },
    closest(){ return null; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    getClientRects(){ return [{left:0, top:0, right:1, bottom:1}]; },
    focus(){ document.activeElement = this; },
    click(){},
    async:true,
    get _listeners(){ return localListeners; },
    set src(value){ this._src = value; },
    get src(){ return this._src; }
  };
  return element;
}

globalThis.window = globalThis;
globalThis.addEventListener = (type, callback) => listeners.set(type, callback);
globalThis.removeEventListener = type => listeners.delete(type);
globalThis.localStorage = {
  getItem(){ return null; },
  setItem(key){
    // Make the single-tab guard fail closed immediately in this isolated unit
    // environment so it does not create a background heartbeat interval.
    if(key === 'wormholesSingleTabLease') throw new Error('single-tab test lease unavailable');
  },
  removeItem(){}, key(){ return null; }, get length(){ return 0; }
};
globalThis.sessionStorage = {getItem(){return null;}, setItem(){}, removeItem(){}};
Object.defineProperty(globalThis, 'navigator', {
  configurable:true,
  value:{storage:{estimate:async () => ({usage:0, quota:1_000_000_000})}}
});
globalThis.CustomEvent = class { constructor(type, options = {}){ this.type = type; this.detail = options.detail; } };
globalThis.dispatchEvent = () => true;
globalThis.requestAnimationFrame = callback => { if(typeof callback === 'function') callback(0); return 1; };
globalThis.cancelAnimationFrame = () => {};
globalThis.getComputedStyle = () => ({display:'block', visibility:'visible'});
globalThis.BroadcastChannel = undefined;
globalThis.MutationObserver = class {
  constructor(callback){ this.callback = callback; }
  observe(){}
  disconnect(){}
};

const documentElement = createElement('html');
const body = createElement('body');
const head = createElement('head');
head.appendChild = script => {
  loaded.push(script.src);
  queueMicrotask(() => script._listeners.get('load')?.());
  return script;
};

globalThis.document = {
  documentElement,
  body,
  head,
  activeElement:body,
  createElement,
  createComment(text = ''){ return {nodeType:8, textContent:String(text), parentNode:null}; },
  getElementById(id){
    const key = String(id);
    if(!elementStore.has(key)){
      const element = createElement(key.toLowerCase().includes('input') ? 'input' : 'div');
      element.id = key;
      elementStore.set(key, element);
    }
    return elementStore.get(key);
  },
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
  addEventListener(type, callback){ listeners.set(`document:${type}`, callback); },
  removeEventListener(type){ listeners.delete(`document:${type}`); }
};

await import('../../scripts/modules/served-entry.mjs?unit-test=1');
assert.equal(globalThis.WormholesServedRuntime?.mode, 'esm-entry');
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('shell-interface'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('domain-state'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('foundation-utilities'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('dialog-and-focus-infrastructure'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('observability-and-history'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('persistence-and-recovery'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('canonical-persistence'));
assert.equal(loaded.length, globalThis.WormholesServedRuntime.transitionalAdapterCount);
assert.ok(!loaded.includes('scripts/wormholes-app.js'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('app-workflow-orchestration'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('map-inspector-orchestration'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('app-core'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('document-zip-helpers'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('controller-services'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('tagging-helpers'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('map-presentation-helpers'));
assert.ok(globalThis.WormholesServedRuntime.nativeBoundaries.includes('feature-controllers'));
assert.equal(globalThis.WormholesServedRuntime.nativeControllerCount, 12);
assert.equal(globalThis.WormholesServedRuntime.nativeRuntimeModuleCount, 68);
assert.equal(globalThis.WormholesServedRuntime.transitionalAdapterCount, 0);
assert.ok(!loaded.includes('scripts/wormholes-shell-interface.js'));
assert.ok(!loaded.includes('scripts/wormholes-app-state-domain.js'));
assert.ok(!loaded.includes('scripts/wormholes-safe-render.js'));
assert.ok(!loaded.includes('scripts/wormholes-dialogs.js'));
assert.ok(!loaded.includes('scripts/wormholes-activity-log.js'));
assert.ok(!loaded.includes('scripts/wormholes-support-report.js'));
assert.ok(!loaded.includes('scripts/wormholes-error-reporting.js'));
assert.ok(!loaded.includes('scripts/wormholes-app-errors.js'));
assert.ok(!loaded.includes('scripts/wormholes-recent-roll-history.js'));
assert.ok(!loaded.includes('scripts/wormholes-duplicate-creations.js'));
assert.ok(!loaded.includes('scripts/storage.js'));
assert.ok(!loaded.includes('scripts/wormholes-entity-limits.js'));
assert.ok(!loaded.includes('scripts/wormholes-id-integrity.js'));
assert.ok(!loaded.includes('scripts/wormholes-render-validation.js'));
assert.ok(!loaded.includes('scripts/wormholes-manual-drafts.js'));
assert.ok(!loaded.includes('scripts/wormholes-snapshots.js'));
assert.ok(!loaded.includes('scripts/wormholes-storage-dashboard.js'));
assert.ok(!loaded.includes('scripts/wormholes-write-ahead-journal.js'));
assert.ok(!loaded.includes('scripts/wormholes-storage-recovery.js'));
assert.ok(!loaded.includes('scripts/wormholes-indexeddb-recovery.js'));
console.log('served-entry.unit.mjs passed');

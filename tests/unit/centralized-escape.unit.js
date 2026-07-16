const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

function makeClassList(initial = []){
  const values = new Set(initial);
  return {
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); }
  };
}

function makeElement({id = '', classes = [], dismiss = '', hidden = false, tagName = 'DIV'} = {}){
  const element = {
    id,
    tagName,
    hidden,
    disabled:false,
    isConnected:true,
    nodeType:1,
    dataset:dismiss ? {escapeDismiss:dismiss} : {},
    attributes:{},
    classList:makeClassList(classes),
    parentElement:null,
    previousElementSibling:null,
    children:[],
    clicked:0,
    focused:0,
    click(){ this.clicked += 1; if(typeof this.onclick === 'function') this.onclick(); },
    focus(){ this.focused += 1; context.document.activeElement = this; },
    setAttribute(name, value){ this.attributes[name] = String(value); },
    getAttribute(name){ return this.attributes[name] || ''; },
    hasAttribute(name){
      if(name === 'hidden') return this.hidden;
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    matches(selector){
      if(selector === '.modal-backdrop, .menu, [data-escape-dismiss]'){
        return this.classList.contains('modal-backdrop') || this.classList.contains('menu') || !!this.dataset.escapeDismiss;
      }
      return false;
    },
    closest(selector){
      let current = this;
      while(current){
        if(selector === '.menu-wrap' && current.classList?.contains('menu-wrap')) return current;
        if(selector === '.entry, .universe-entry, .vision-pin' && (current.classList?.contains('entry') || current.classList?.contains('universe-entry') || current.classList?.contains('vision-pin'))) return current;
        current = current.parentElement;
      }
      return null;
    },
    querySelector(selector){
      if(selector === '.menu-button') return this.children.find(child => child.classList?.contains('menu-button')) || null;
      return null;
    },
    querySelectorAll(){ return []; }
  };
  return element;
}

const modalA = makeElement({id:'modalA', classes:['modal-backdrop','open'], dismiss:'cancelA'});
const modalB = makeElement({id:'modalB', classes:['modal-backdrop','open'], dismiss:'cancelB'});
const cancelA = makeElement({id:'cancelA', tagName:'BUTTON'});
const cancelB = makeElement({id:'cancelB', tagName:'BUTTON'});
cancelA.onclick = () => modalA.classList.remove('open');
cancelB.onclick = () => modalB.classList.remove('open');

const warning = makeElement({id:'warningModal', classes:['modal-backdrop'], dismiss:'none'});
const blocked = makeElement({id:'blockedModal', classes:['modal-backdrop'], dismiss:'blockedCancel'});
const blockedCancel = makeElement({id:'blockedCancel', tagName:'BUTTON'});
blockedCancel.disabled = true;

const settingsPanel = makeElement({id:'settingsPanel', dismiss:'@settings', hidden:true});
const settingsGear = makeElement({id:'settingsGearBtn', tagName:'BUTTON'});

const menuWrap = makeElement({classes:['menu-wrap']});
const menuOpener = makeElement({id:'menuOpener', classes:['menu-button'], tagName:'BUTTON'});
const menu = makeElement({id:'menu', classes:['menu']});
menuWrap.children = [menuOpener, menu];
menuOpener.parentElement = menuWrap;
menu.parentElement = menuWrap;
menu.previousElementSibling = menuOpener;

const layers = [modalA, modalB, warning, blocked, settingsPanel, menu];
const ids = {modalA, modalB, cancelA, cancelB, warningModal:warning, blockedModal:blocked, blockedCancel, settingsPanel, settingsGearBtn:settingsGear, menuOpener, menu};
let keydownListener = null;

const context = {
  console,
  setTimeout(fn){ fn(); },
  MutationObserver:undefined,
  document:{
    documentElement:{},
    activeElement:null,
    querySelectorAll(selector){
      if(selector === '.modal-backdrop, .menu, [data-escape-dismiss]') return layers;
      return [];
    },
    getElementById(id){ return ids[id] || null; },
    addEventListener(type, listener, capture){ if(type === 'keydown' && capture) keydownListener = listener; }
  },
  window:{
    toggleSettingsMenu(open){
      settingsPanel.hidden = !open;
      settingsGear.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }
};
context.globalThis = context;
vm.createContext(context);
const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-escape.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-escape.js'});

function escapeEvent(){
  return {
    key:'Escape',
    isComposing:false,
    prevented:false,
    stopped:false,
    immediate:false,
    preventDefault(){ this.prevented = true; },
    stopPropagation(){ this.stopped = true; },
    stopImmediatePropagation(){ this.immediate = true; }
  };
}

assert.strictEqual(typeof keydownListener, 'function', 'central Escape handler should install once in capture phase');

let event = escapeEvent();
keydownListener(event);
assert.strictEqual(cancelB.clicked, 1, 'first Escape should dismiss only the topmost modal');
assert.strictEqual(cancelA.clicked, 0, 'underlying modal should remain open');
assert.strictEqual(modalA.classList.contains('open'), true);
assert.strictEqual(modalB.classList.contains('open'), false);
assert.ok(event.prevented && event.stopped && event.immediate, 'handled Escape should be consumed');

event = escapeEvent();
keydownListener(event);
assert.strictEqual(cancelA.clicked, 1, 'second Escape should dismiss the next modal');

// A later-opened menu should close before an underlying modal.
modalA.classList.add('open');
context.window.WormholesEscape.scanLayers(context.document);
menu.classList.add('open');
context.window.WormholesEscape.scanLayers(menu);
event = escapeEvent();
keydownListener(event);
assert.strictEqual(menu.classList.contains('open'), false, 'Escape should close the top menu layer');
assert.strictEqual(modalA.classList.contains('open'), true, 'menu Escape should not close its underlying modal');
assert.strictEqual(menuOpener.attributes['aria-expanded'], 'false');
assert.strictEqual(menuOpener.focused, 1, 'menu focus should return to its opener');

// A non-dismissible top layer consumes Escape without exposing the layer beneath it.
warning.classList.add('open');
context.window.WormholesEscape.scanLayers(warning);
event = escapeEvent();
keydownListener(event);
assert.strictEqual(warning.classList.contains('open'), true, 'required warning should remain open');
assert.strictEqual(modalA.classList.contains('open'), true, 'underlying modal should not close through a required warning');
assert.ok(event.prevented, 'Escape should still be consumed by a non-dismissible top layer');
warning.classList.remove('open');
context.window.WormholesEscape.scanLayers(warning);

// Disabled Cancel means an operation is in progress: consume Escape but do not dismiss.
blocked.classList.add('open');
context.window.WormholesEscape.scanLayers(blocked);
event = escapeEvent();
keydownListener(event);
assert.strictEqual(blocked.classList.contains('open'), true, 'busy modal should remain open while Cancel is disabled');
assert.strictEqual(blockedCancel.clicked, 0);
blocked.classList.remove('open');
context.window.WormholesEscape.scanLayers(blocked);

// Settings uses the same centralized route and restores focus to the gear.
modalA.classList.remove('open');
context.window.WormholesEscape.scanLayers(modalA);
settingsPanel.hidden = false;
context.window.WormholesEscape.scanLayers(settingsPanel);
event = escapeEvent();
keydownListener(event);
assert.strictEqual(settingsPanel.hidden, true, 'Escape should close Settings');
assert.strictEqual(settingsGear.focused, 1, 'Settings Escape should return focus to the gear');

// No open layer: Escape is untouched.
event = escapeEvent();
const result = keydownListener(event);
assert.strictEqual(result, false);
assert.strictEqual(event.prevented, false);

// Every shipped modal and collection panel must explicitly declare its policy.
const html = fs.readFileSync(latestDirectHtmlPath(path.resolve(__dirname, '..', '..')), 'utf8');
const modalTags = html.match(/<div\b[^>]*class="[^"]*modal-backdrop[^"]*"[^>]*>/g) || [];
assert.ok(modalTags.length > 40, 'test should inspect the full dialog set');
modalTags.forEach(tag => assert.ok(/data-escape-dismiss="[^"]+"/.test(tag), `missing Escape policy: ${tag.slice(0, 120)}`));
modalTags.forEach(tag => {
  const policy = tag.match(/data-escape-dismiss="([^"]+)"/)?.[1] || '';
  if(!policy || policy === 'none' || policy.startsWith('@')) return;
  assert.ok(new RegExp(`id="${policy}"`).test(html), `Escape policy target ${policy} should exist`);
});
[
  'archiveFilterPanel','archiveSortPanel','literatureFilterPanel','literatureSortPanel',
  'visionFilterPanel','visionSortPanel','settingsPanel'
].forEach(id => {
  const tag = html.match(new RegExp(`<div\\b[^>]*id="${id}"[^>]*>`))?.[0] || '';
  assert.ok(/data-escape-dismiss="[^"]+"/.test(tag), `${id} should declare an Escape policy`);
});
assert.ok(html.includes('scripts/wormholes-escape.js'), 'central Escape module should be loaded');

const bootstrap = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'bootstrap.js'), 'utf8');
const settings = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'modals-settings.js'), 'utf8');
const search = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'global-search.js'), 'utf8');
const accessibility = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-accessibility.js'), 'utf8');
[bootstrap, settings, search, accessibility].forEach(text => {
  assert.ok(!/key\s*===\s*["']Escape["']/.test(text), 'feature scripts should not own Escape dismissal');
});
assert.ok(!bootstrap.includes('closeLiteratureEditor();\n});\n\ndocument.getElementById("literatureEditor")'), 'Literature title Escape should not abandon editor work');

console.log('centralized-escape.unit.js passed');

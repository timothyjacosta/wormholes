const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function classList(initial = []){
  const values = new Set(initial);
  return {
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); }
  };
}

function element({id = '', tagName = 'DIV', classes = []} = {}){
  const el = {
    id,
    tagName,
    hidden:false,
    disabled:false,
    dataset:{},
    attributes:{},
    style:{},
    children:[],
    parentElement:null,
    previousElementSibling:null,
    nextElementSibling:null,
    classList:classList(classes),
    nodeType:1,
    tabIndex:0,
    focus(){ context.document.activeElement = this; },
    setAttribute(name, value){ this.attributes[name] = String(value); if(name === 'id') this.id = String(value); },
    getAttribute(name){ return this.attributes[name] || ''; },
    removeAttribute(name){ delete this.attributes[name]; },
    hasAttribute(name){ return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    getBoundingClientRect(){ return {left:20}; },
    matches(selector){
      if(selector === 'button') return this.tagName === 'BUTTON';
      if(selector === 'button:not([disabled])') return this.tagName === 'BUTTON' && !this.disabled;
      if(selector === "[role='menuitem']:not([aria-disabled='true'])") return this.attributes.role === 'menuitem' && this.attributes['aria-disabled'] !== 'true';
      if(selector === "input[type='checkbox']:not([disabled])") return this.tagName === 'INPUT' && this.type === 'checkbox' && !this.disabled;
      if(selector === '.app-button') return this.classList.contains('app-button');
      if(selector === 'input, select, textarea, option, label') return ['INPUT','SELECT','TEXTAREA','OPTION','LABEL'].includes(this.tagName);
      if(selector === 'button, input, select, textarea, a[href], [role]') return ['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(this.tagName) || !!this.attributes.role;
      return false;
    },
    contains(node){
      let current = node;
      while(current){
        if(current === this) return true;
        current = current.parentElement;
      }
      return false;
    },
    closest(selector){
      if(selector === '#settingsGearBtn, .menu-button'){
        let node = this;
        while(node){
          if(node.id === 'settingsGearBtn' || node.classList?.contains('menu-button')) return node;
          node = node.parentElement;
        }
      }
      if(selector === '#settingsPanel, .menu.open'){
        let node = this;
        while(node){
          if(node.id === 'settingsPanel' || (node.classList?.contains('menu') && node.classList?.contains('open'))) return node;
          node = node.parentElement;
        }
      }
      if(selector === '.menu-wrap'){
        let node = this;
        while(node){
          if(node.classList?.contains('menu-wrap')) return node;
          node = node.parentElement;
        }
      }
      if(selector === '.entry, .universe-entry, .vision-pin') return null;
      if(selector === '.app-button' && this.classList.contains('app-button')) return this;
      return null;
    },
    querySelector(selector){
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector){
      const all = [];
      function walk(node){
        node.children.forEach(child => {
          if(selector === '.menu.open' && child.classList.contains('menu') && child.classList.contains('open')) all.push(child);
          if(selector === "button:not([disabled]),[role='menuitem']:not([aria-disabled='true']),input[type='checkbox']:not([disabled])" || selector === APP_MENU_SELECTOR){
            if(child.matches("button:not([disabled])") || child.matches("[role='menuitem']:not([aria-disabled='true'])") || child.matches("input[type='checkbox']:not([disabled])")) all.push(child);
          }
          walk(child);
        });
      }
      walk(this);
      return all;
    }
  };
  return el;
}

const APP_MENU_SELECTOR = "button:not([disabled]),[role='menuitem']:not([aria-disabled='true']),input[type='checkbox']:not([disabled])";

const opener = element({id:'archiveMenuBtn', tagName:'BUTTON', classes:['menu-button','app-button']});
const menu = element({id:'archiveMenu', classes:['menu']});
const itemA = element({id:'editAction', tagName:'BUTTON', classes:['app-button']});
const itemB = element({id:'deleteAction', tagName:'BUTTON', classes:['app-button']});
const wrap = element({classes:['menu-wrap']});
wrap.children = [opener, menu];
opener.parentElement = wrap;
menu.parentElement = wrap;
opener.nextElementSibling = menu;
menu.previousElementSibling = opener;
menu.children = [itemA, itemB];
itemA.parentElement = menu;
itemB.parentElement = menu;

const settingsGear = element({id:'settingsGearBtn', tagName:'BUTTON', classes:['app-button']});
const settingsPanel = element({id:'settingsPanel', classes:[]});
settingsPanel.hidden = true;
const settingsFirst = element({id:'quickStartMenuBtn', tagName:'BUTTON', classes:['app-button']});
settingsPanel.children = [settingsFirst];
settingsFirst.parentElement = settingsPanel;

const htmlRoot = element({id:'html'});
htmlRoot.children = [wrap, settingsGear, settingsPanel];

const context = {
  console,
  Date,
  JSON,
  Object,
  Number,
  String,
  Math,
  Map,
  Set,
  Array,
  Promise,
  document:{
    documentElement:htmlRoot,
    activeElement:null,
    getElementById(id){
      return {settingsGearBtn:settingsGear, settingsPanel, settingsStatus:null}[id] || null;
    },
    querySelector(selector){
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector){
      return htmlRoot.querySelectorAll(selector);
    },
    addEventListener(){}
  },
  window:{ addEventListener(){} },
  requestStorageFootnoteUpdate(){ context.__storageFootnote = true; },
  showSavedToast(){},
  isWormholesSafeDownloadElement(){ return false; },
  applyContextualActionAriaLabels(){},
  MutationObserver:undefined
};
context.globalThis = context;

vm.createContext(context);
const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'modals-settings.js'), 'utf8');
vm.runInContext(script, context, {filename:'scripts/modals-settings.js'});

function keyEvent(target, key){
  return {
    target,
    key,
    defaultPrevented:false,
    propagationStopped:false,
    immediateStopped:false,
    preventDefault(){ this.defaultPrevented = true; },
    stopPropagation(){ this.propagationStopped = true; },
    stopImmediatePropagation(){ this.immediateStopped = true; }
  };
}

assert.strictEqual(typeof context.handleMenuKeyboardNavigation, 'function', 'menu keyboard handler should be globally available');

let event = keyEvent(opener, 'ArrowDown');
assert.strictEqual(context.handleMenuKeyboardNavigation(event), true, 'ArrowDown on menu opener should be handled');
assert.strictEqual(menu.classList.contains('open'), true, 'positioned menu should open from keyboard');
assert.strictEqual(opener.attributes['aria-expanded'], 'true', 'opener should reflect expanded state');
assert.strictEqual(menu.attributes.role, 'menu', 'positioned menu should get menu role');
assert.strictEqual(itemA.attributes.role, 'menuitem', 'menu item buttons should get menuitem role');
assert.strictEqual(context.document.activeElement, itemA, 'ArrowDown should focus first menu item');

event = keyEvent(itemA, 'ArrowDown');
assert.strictEqual(context.handleMenuKeyboardNavigation(event), true, 'ArrowDown inside menu should be handled');
assert.strictEqual(context.document.activeElement, itemB, 'ArrowDown should move to next item');

event = keyEvent(itemB, 'ArrowUp');
context.handleMenuKeyboardNavigation(event);
assert.strictEqual(context.document.activeElement, itemA, 'ArrowUp should move to previous item');

event = keyEvent(itemA, 'End');
context.handleMenuKeyboardNavigation(event);
assert.strictEqual(context.document.activeElement, itemB, 'End should move to last item');

event = keyEvent(settingsGear, 'Enter');
context.handleMenuKeyboardNavigation(event);
assert.strictEqual(settingsPanel.hidden, false, 'Enter should open settings menu');
assert.strictEqual(settingsGear.attributes['aria-expanded'], 'true', 'settings gear should reflect expanded state');
assert.strictEqual(context.document.activeElement, settingsFirst, 'settings menu should focus its first item');

assert.strictEqual(context.handleMenuKeyboardNavigation(keyEvent(itemB, 'Escape')), false, 'Escape dismissal is owned by the centralized Escape manager');

console.log('menu-keyboard-navigation.unit.js passed');

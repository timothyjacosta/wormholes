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
    isContentEditable:false,
    focus(){ context.document.activeElement = this; },
    setAttribute(name, value){ this.attributes[name] = String(value); },
    getAttribute(name){ return this.attributes[name] || ''; },
    removeAttribute(name){ delete this.attributes[name]; },
    hasAttribute(name){ return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    matches(selector){
      if(selector === 'input, select, textarea') return ['INPUT','SELECT','TEXTAREA'].includes(this.tagName);
      if(selector === 'button:not([disabled])') return this.tagName === 'BUTTON' && !this.disabled;
      if(selector === "[role='menuitem']:not([aria-disabled='true'])") return this.attributes.role === 'menuitem' && this.attributes['aria-disabled'] !== 'true';
      if(selector === "input[type='checkbox']:not([disabled])") return this.tagName === 'INPUT' && this.type === 'checkbox' && !this.disabled;
      if(selector === '.app-button') return this.classList.contains('app-button');
      if(selector === 'button, input, select, textarea, a[href], [role]') return ['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(this.tagName) || !!this.attributes.role;
      if(selector === 'input, select, textarea, option, label') return ['INPUT','SELECT','TEXTAREA','OPTION','LABEL'].includes(this.tagName);
      return false;
    },
    closest(selector){
      const options = selector.split(',').map(item => item.trim());
      let node = this;
      while(node){
        for(const option of options){
          if(option.startsWith('#') && node.id === option.slice(1)) return node;
          if(option.startsWith('.') && node.classList?.contains(option.slice(1))) return node;
          if(option === "[contenteditable='true']" && node.attributes.contenteditable === 'true') return node;
          if(option === '#settingsGearBtn' && node.id === 'settingsGearBtn') return node;
          if(option === '.menu-button' && node.classList?.contains('menu-button')) return node;
          if(option === '#settingsPanel' && node.id === 'settingsPanel') return node;
          if(option === '.menu.open' && node.classList?.contains('menu') && node.classList?.contains('open')) return node;
        }
        node = node.parentElement;
      }
      return null;
    },
    contains(node){
      let current = node;
      while(current){
        if(current === this) return true;
        current = current.parentElement;
      }
      return false;
    },
    querySelectorAll(selector){
      const all = [];
      function matchesListItem(node){
        if(selector === '.entry-title') return node.classList.contains('entry-title');
        if(selector === '.literature-title-toggle') return node.classList.contains('literature-title-toggle');
        if(selector === '.universe-entry-main, .universe-entry-button') return node.classList.contains('universe-entry-main') || node.classList.contains('universe-entry-button');
        if(selector === '.migrate-universe-button') return node.classList.contains('migrate-universe-button');
        if(selector === '.delete-migrate-target') return node.classList.contains('delete-migrate-target');
        if(selector === ".nested-picker-select, .nested-picker-expander:not([aria-disabled='true'])"){
          return node.classList.contains('nested-picker-select') || (node.classList.contains('nested-picker-expander') && node.attributes['aria-disabled'] !== 'true');
        }
        if(selector === "button:not([disabled]),[role='menuitem']:not([aria-disabled='true']),input[type='checkbox']:not([disabled])"){
          return node.matches("button:not([disabled])") || node.matches("[role='menuitem']:not([aria-disabled='true'])") || node.matches("input[type='checkbox']:not([disabled])");
        }
        if(selector === '.menu.open') return node.classList.contains('menu') && node.classList.contains('open');
        return false;
      }
      function walk(node){
        node.children.forEach(child => {
          if(matchesListItem(child)) all.push(child);
          walk(child);
        });
      }
      walk(this);
      return all;
    },
    querySelector(selector){
      return this.querySelectorAll(selector)[0] || null;
    },
    addEventListener(){}
  };
  return el;
}

const archiveList = element({id:'archiveList'});
const archiveA = element({tagName:'BUTTON', classes:['entry-title']});
const archiveB = element({tagName:'BUTTON', classes:['entry-title']});
const archiveC = element({tagName:'BUTTON', classes:['entry-title']});
archiveList.children = [archiveA, archiveB, archiveC];
archiveA.parentElement = archiveList;
archiveB.parentElement = archiveList;
archiveC.parentElement = archiveList;

const bridgeList = element({id:'bridgeUniverseList'});
const bridgeA = element({tagName:'BUTTON', classes:['nested-picker-select']});
const bridgeExpand = element({tagName:'BUTTON', classes:['nested-picker-expander']});
const bridgeB = element({tagName:'BUTTON', classes:['nested-picker-select']});
bridgeList.children = [bridgeA, bridgeExpand, bridgeB];
bridgeA.parentElement = bridgeList;
bridgeExpand.parentElement = bridgeList;
bridgeB.parentElement = bridgeList;

const input = element({id:'manualTitle', tagName:'INPUT'});
const htmlRoot = element({id:'html'});
htmlRoot.children = [archiveList, bridgeList, input];
archiveList.parentElement = htmlRoot;
bridgeList.parentElement = htmlRoot;
input.parentElement = htmlRoot;

const documentListeners = {};
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
    getElementById(id){ return {settingsPanel:null, settingsGearBtn:null}[id] || null; },
    querySelector(selector){ return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector){ return htmlRoot.querySelectorAll(selector); },
    addEventListener(type, fn){
      if(!documentListeners[type]) documentListeners[type] = [];
      documentListeners[type].push(fn);
    }
  },
  window:{ addEventListener(){} },
  requestStorageFootnoteUpdate(){},
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

assert.strictEqual(typeof context.handleListKeyboardNavigation, 'function', 'list keyboard handler should be globally available');

archiveA.focus();
let event = keyEvent(archiveA, 'ArrowDown');
assert.strictEqual(context.handleListKeyboardNavigation(event), true, 'ArrowDown should be handled in archive list');
assert.strictEqual(context.document.activeElement, archiveB, 'ArrowDown should focus next archive row');

event = keyEvent(archiveB, 'ArrowUp');
context.handleListKeyboardNavigation(event);
assert.strictEqual(context.document.activeElement, archiveA, 'ArrowUp should focus previous archive row');

event = keyEvent(archiveA, 'End');
context.handleListKeyboardNavigation(event);
assert.strictEqual(context.document.activeElement, archiveC, 'End should focus last archive row');

event = keyEvent(archiveC, 'Home');
context.handleListKeyboardNavigation(event);
assert.strictEqual(context.document.activeElement, archiveA, 'Home should focus first archive row');

bridgeA.focus();
event = keyEvent(bridgeA, 'ArrowDown');
context.handleListKeyboardNavigation(event);
assert.strictEqual(context.document.activeElement, bridgeExpand, 'picker ArrowDown should include expander controls');

event = keyEvent(bridgeExpand, 'ArrowDown');
context.handleListKeyboardNavigation(event);
assert.strictEqual(context.document.activeElement, bridgeB, 'picker ArrowDown should move to next selectable row');

input.focus();
event = keyEvent(input, 'ArrowDown');
assert.strictEqual(context.handleListKeyboardNavigation(event), false, 'text inputs should preserve native arrow-key behavior');
assert.strictEqual(context.document.activeElement, input, 'text input focus should remain unchanged');

context.installListKeyboardNavigationHandlers();
context.installListKeyboardNavigationHandlers();
assert.strictEqual((documentListeners.keydown || []).length, 1, 'list keyboard handler should bind only once when installed directly');

console.log('list-keyboard-navigation.unit.js passed');

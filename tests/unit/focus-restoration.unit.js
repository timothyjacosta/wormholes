const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

function classList(initial = []){
  const values = new Set(initial);
  return {
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); }
  };
}

let context;
function makeElement({id='', tag='DIV', classes=[], hidden=false, attrs={}, dataset={}} = {}){
  const el = {
    id,
    tagName:tag,
    hidden,
    disabled:false,
    inert:false,
    isConnected:true,
    tabIndex:tag === 'BUTTON' ? 0 : -1,
    parentElement:null,
    children:[],
    attributes:{...attrs},
    dataset:{...dataset},
    classList:classList(classes),
    focused:0,
    offsetParent:{},
    append(child){ child.parentElement = this; this.children.push(child); return child; },
    focus(){ this.focused += 1; context.document.activeElement = this; },
    getClientRects(){ return [1]; },
    setAttribute(name,value){ this.attributes[name] = String(value); if(name === 'disabled') this.disabled = true; },
    getAttribute(name){
      if(name === 'id') return this.id;
      if(name.startsWith('data-')){
        const key = name.slice(5).replace(/-([a-z])/g, (_,letter) => letter.toUpperCase());
        return this.dataset[key] ?? this.attributes[name] ?? '';
      }
      return this.attributes[name] ?? '';
    },
    hasAttribute(name){
      if(name === 'hidden') return this.hidden;
      if(name.startsWith('data-')) return this.getAttribute(name) !== '';
      return Object.prototype.hasOwnProperty.call(this.attributes,name);
    },
    contains(node){
      if(node === this) return true;
      return this.children.some(child => child.contains(node));
    },
    matches(selector){
      if(selector === '.modal-backdrop, .menu, #settingsPanel, [data-escape-dismiss]'){
        return this.classList.contains('modal-backdrop') || this.classList.contains('menu') || this.id === 'settingsPanel' || !!this.dataset.escapeDismiss;
      }
      if(selector.includes('button:not') && this.tagName === 'BUTTON' && !this.disabled) return true;
      if(selector.includes('[tabindex]') && this.tabIndex >= 0) return true;
      if(selector === '.entry') return this.classList.contains('entry');
      if(selector === '.vision-pin') return this.classList.contains('vision-pin');
      if(selector === '.universe-entry') return this.classList.contains('universe-entry');
      return false;
    },
    closest(selector){
      let current = this;
      while(current){
        if(selector === '[hidden]' && current.hidden) return current;
        if(selector === '[aria-hidden="true"]' && current.getAttribute('aria-hidden') === 'true') return current;
        if(selector === '[inert]' && current.inert) return current;
        if(selector === '.modal-backdrop' && current.classList.contains('modal-backdrop')) return current;
        if(selector === '.menu' && current.classList.contains('menu')) return current;
        if(selector === '.menu-wrap' && current.classList.contains('menu-wrap')) return current;
        if(selector === '.modal-backdrop, .menu, #settingsPanel, [data-escape-dismiss]' && current.matches(selector)) return current;
        if(selector.includes('.entry') && current.classList.contains('entry')) return current;
        if(selector.includes('.universe-entry') && current.classList.contains('universe-entry')) return current;
        if(selector.includes('.vision-pin') && current.classList.contains('vision-pin')) return current;
        if(selector.includes('[data-id]') && current.hasAttribute('data-id')) return current;
        current = current.parentElement;
      }
      return null;
    },
    querySelector(selector){ return queryAll(this, selector)[0] || null; },
    querySelectorAll(selector){ return queryAll(this, selector); }
  };
  return el;
}

function descendants(root){
  return root.children.flatMap(child => [child, ...descendants(child)]);
}
function queryAll(root, selector){
  let pool = descendants(root);
  if(selector.startsWith(':scope > ')){
    pool = root.children.slice();
    selector = selector.slice(9);
  }
  if(selector.includes(',')){
    const selectors = selector.split(',').map(value => value.trim());
    return pool.filter(el => selectors.some(part => matchesSimple(el,part)));
  }
  return pool.filter(el => matchesSimple(el,selector));
}
function matchesSimple(el, selector){
  if(selector === '.entry') return el.classList.contains('entry');
  if(selector === '.vision-pin') return el.classList.contains('vision-pin');
  if(selector === '.universe-entry') return el.classList.contains('universe-entry');
  if(selector === '.entry-title') return el.classList.contains('entry-title');
  if(selector === '.menu-button') return el.classList.contains('menu-button');
  if(selector === 'button') return el.tagName === 'BUTTON';
  if(selector === '[tabindex="0"]') return el.tabIndex === 0;
  if(selector.startsWith('[data-id]')) return el.hasAttribute('data-id');
  if(selector.startsWith('[data-vision-id]')) return el.hasAttribute('data-vision-id');
  if(selector.startsWith('[data-entry-id]')) return el.hasAttribute('data-entry-id');
  if(selector.includes('button:not') || selector.includes('[role="button"]')) return el.tagName === 'BUTTON' && !el.disabled;
  return false;
}

const body = makeElement({id:'body', tag:'BODY'});
const html = makeElement({id:'html', tag:'HTML'});
html.append(body);
const activeTab = body.append(makeElement({id:'archiveTabBtn', tag:'BUTTON', classes:['tab-button','active']}));
activeTab.attributes.role = 'tab';
const filterBtn = body.append(makeElement({id:'archiveFilterBtn', tag:'BUTTON', attrs:{'aria-controls':'archiveFilterPanel'}}));
const filterPanel = body.append(makeElement({id:'archiveFilterPanel', hidden:true, dataset:{escapeDismiss:'closeArchiveFiltersBtn'}}));
const list = body.append(makeElement({id:'archiveList'}));
const first = list.append(makeElement({classes:['entry'], dataset:{id:'first'}}));
first.attributes['data-id'] = 'first';
const firstTitle = first.append(makeElement({tag:'BUTTON', classes:['entry-title']}));
const second = list.append(makeElement({classes:['entry'], dataset:{id:'second'}}));
second.attributes['data-id'] = 'second';
const secondTitle = second.append(makeElement({tag:'BUTTON', classes:['entry-title']}));
const modal = body.append(makeElement({id:'deleteModal', classes:['modal-backdrop']}));
const cancel = modal.append(makeElement({id:'cancelDelete', tag:'BUTTON'}));

const all = () => [html,body,activeTab,filterBtn,filterPanel,list,first,firstTitle,second,secondTitle,modal,cancel];
const ids = () => Object.fromEntries(all().filter(el => el.id).map(el => [el.id,el]));
const documentObject = {
  body,
  documentElement:html,
  activeElement:body,
  addEventListener(){},
  getElementById(id){ return ids()[id] || null; },
  querySelector(selector){
    if(selector === '.tab-button.active[role="tab"], .tab-button.active') return activeTab;
    if(selector === '.tab-content.active, [role="tabpanel"].active') return null;
    const aria = selector.match(/^\[aria-controls="(.+)"\]$/);
    if(aria) return all().find(el => el.getAttribute('aria-controls') === aria[1]) || null;
    const data = selector.match(/^\[(data-[^=]+)="(.+)"\]$/);
    if(data) return all().find(el => el.getAttribute(data[1]) === data[2]) || null;
    return null;
  },
  querySelectorAll(selector){
    if(selector === '.modal-backdrop, .menu, #settingsPanel, [data-escape-dismiss]') return [modal,filterPanel];
    return [];
  }
};
context = {
  console,
  Date,
  MutationObserver:undefined,
  setTimeout(fn){ fn(); },
  document:documentObject,
  window:{
    setTimeout(fn){ fn(); },
    getComputedStyle(){ return {display:'block',visibility:'visible'}; },
    CSS:{escape(value){ return String(value); }},
    WormholesEscape:{topLayer(){ return modal.classList.contains('open') ? modal : (!filterPanel.hidden ? filterPanel : null); }}
  }
};
context.globalThis = context;
vm.createContext(context);
const source = fs.readFileSync(path.resolve(__dirname,'..','..','scripts','wormholes-focus.js'),'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-focus.js'});
const focus = context.window.WormholesFocus;

assert.ok(focus, 'focus manager should be installed');
assert.strictEqual(focus.associatedOpener(filterPanel), filterBtn, 'aria-controls should identify a panel opener');

// Closing a panel returns focus to its visible opener.
documentObject.activeElement = filterBtn;
filterPanel.hidden = false;
focus.noteLayerState(filterPanel);
documentObject.activeElement = body;
filterPanel.hidden = true;
focus.noteLayerState(filterPanel);
assert.strictEqual(documentObject.activeElement, filterBtn, 'closed filter should restore focus to Filter');

// A deleted entry returns focus to the next surviving item rather than the removed control.
modal.classList.add('open');
documentObject.activeElement = firstTitle;
focus.noteLayerState(modal);
first.isConnected = false;
firstTitle.isConnected = false;
list.children = [second];
documentObject.activeElement = body;
modal.classList.remove('open');
focus.noteLayerState(modal);
assert.strictEqual(documentObject.activeElement, secondTitle, 'deleting an item should focus the next visible item');

// If an opener is disabled before close, fall back to the active tab control.
filterBtn.disabled = true;
filterPanel.hidden = false;
documentObject.activeElement = filterBtn;
focus.noteLayerState(filterPanel);
documentObject.activeElement = body;
filterPanel.hidden = true;
focus.noteLayerState(filterPanel);
assert.strictEqual(documentObject.activeElement, activeTab, 'disabled return targets should fall back to the active tab');
filterBtn.disabled = false;

// Do not steal focus when the user has already moved to another usable control.
filterPanel.hidden = false;
documentObject.activeElement = filterBtn;
focus.noteLayerState(filterPanel);
documentObject.activeElement = activeTab;
filterPanel.hidden = true;
focus.noteLayerState(filterPanel);
assert.strictEqual(documentObject.activeElement, activeTab, 'an already valid focus destination should be preserved');

const appHtml = fs.readFileSync(latestDirectHtmlPath(path.resolve(__dirname, '..', '..')),'utf8');
assert.ok(appHtml.includes('scripts/wormholes-focus.js'), 'focus restoration module should load in the app');
assert.ok(appHtml.indexOf('scripts/wormholes-dialogs.js') < appHtml.indexOf('scripts/wormholes-focus.js'));
assert.ok(appHtml.indexOf('scripts/wormholes-focus.js') < appHtml.indexOf('scripts/bootstrap.js'));

console.log('focus-restoration.unit.js passed');

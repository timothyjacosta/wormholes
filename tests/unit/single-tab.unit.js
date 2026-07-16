const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {latestDirectHtmlName, latestDirectHtmlPath} = require('../support/release-path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(root, 'scripts', 'single-tab.js');
const htmlPath = latestDirectHtmlPath(root);
const cssPath = path.join(root, 'styles', 'wormholes.css');
const script = fs.readFileSync(scriptPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

const warning = 'Wormholes is already open in another tab. To prevent lost work, return to the existing Wormholes tab.';

assert.ok(html.includes('scripts/single-tab.js'), 'HTML should load the single-tab guard');
assert.ok(html.indexOf('scripts/single-tab.js') < html.indexOf('scripts/storage.js'), 'single-tab guard should load before persistence');
assert.ok(script.includes(warning), 'single-tab guard should contain the approved warning');
assert.ok(css.includes('.wormholes-duplicate-tab-blocker'), 'duplicate-tab blocker should have in-app styling');

function classList(){
  const values = new Set();
  return {
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); },
  };
}

function makeContext(lockAvailable){
  const storage = new Map();
  const elements = new Map();
  const appended = [];
  const htmlElement = {classList:classList()};
  const main = {
    inert:false,
    attrs:{},
    setAttribute(name, value){ this.attrs[name] = value; },
  };

  function makeElement(tagName){
    const element = {
      tagName,
      id:'',
      className:'',
      textContent:'',
      innerHTML:'',
      attrs:{},
      classList:classList(),
      setAttribute(name, value){ this.attrs[name] = value; },
      focus(){ this.focused = true; },
    };
    return element;
  }

  const body = {
    appendChild(element){
      appended.push(element);
      if(element.id) elements.set(element.id, element);
      return element;
    },
  };

  const windowListeners = {};
  const context = {
    console,
    Date,
    Math,
    Promise,
    JSON,
    setTimeout(fn){ fn(); return 1; },
    clearTimeout(){},
    setInterval(){ return 1; },
    clearInterval(){},
    localStorage:{
      getItem(key){ return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value){ storage.set(key, String(value)); },
      removeItem(key){ storage.delete(key); },
    },
    document:{
      documentElement:htmlElement,
      body,
      querySelector(selector){ return selector === 'main' ? main : null; },
      getElementById(id){ return elements.get(id) || null; },
      createElement:makeElement,
    },
    navigator:{
      locks:{
        request(name, options, callback){
          return Promise.resolve(callback(lockAvailable ? {name} : null));
        },
      },
    },
    BroadcastChannel:class {
      constructor(){ this.onmessage = null; }
      postMessage(){}
      close(){}
    },
    window:{
      addEventListener(type, handler){ windowListeners[type] = handler; },
    },
  };
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.localStorage = context.localStorage;
  context.window.navigator = context.navigator;
  context.globalThis = context;
  return {context, main, appended, htmlElement};
}

(async () => {
  {
    const {context, htmlElement} = makeContext(true);
    vm.createContext(context);
    vm.runInContext(script, context, {filename:'scripts/single-tab.js'});
    const active = await context.window.WormholesSingleTab.ready;
    assert.strictEqual(active, true, 'first tab should become active');
    assert.strictEqual(context.window.WormholesSingleTab.canWrite(), true, 'active tab should have write permission');
    assert.ok(htmlElement.classList.contains('wormholes-active-tab'), 'active-tab class should be applied');
  }

  {
    const {context, main, appended, htmlElement} = makeContext(false);
    vm.createContext(context);
    vm.runInContext(script, context, {filename:'scripts/single-tab.js'});
    const active = await context.window.WormholesSingleTab.ready;
    assert.strictEqual(active, false, 'second tab should be blocked');
    assert.strictEqual(context.window.WormholesSingleTab.canWrite(), false, 'blocked tab should not have write permission');
    assert.strictEqual(main.inert, true, 'the underlying app should be inert in a duplicate tab');
    assert.ok(htmlElement.classList.contains('wormholes-duplicate-tab'), 'duplicate-tab class should be applied');
    const blocker = appended.find(element => element.id === 'wormholesDuplicateTabBlocker');
    assert.ok(blocker, 'an in-app duplicate-tab blocker should be appended');
    assert.ok(blocker.innerHTML.includes(warning), 'the blocker should show the approved warning');
  }

  console.log('single-tab.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

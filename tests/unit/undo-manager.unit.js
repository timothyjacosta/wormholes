const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function classList(){
  const values = new Set();
  return {
    add(...names){ names.forEach(name => values.add(name)); },
    remove(...names){ names.forEach(name => values.delete(name)); },
    contains(name){ return values.has(name); }
  };
}

function element(tagName = 'div'){
  const children = [];
  return {
    tagName:tagName.toUpperCase(),
    className:'',
    textContent:'',
    type:'',
    disabled:false,
    style:{setProperty(){}, removeProperty(){}},
    classList:classList(),
    dataset:{},
    attributes:{},
    listeners:{},
    append(...nodes){ children.push(...nodes); },
    replaceChildren(...nodes){ children.splice(0, children.length, ...nodes); },
    addEventListener(type, handler){ this.listeners[type] = handler; },
    setAttribute(name, value){ this.attributes[name] = String(value); if(name === 'disabled') this.disabled = true; },
    querySelector(selector){
      if(selector === '.undo-toast-button') return children.find(child => child.className === 'undo-toast-button') || null;
      return null;
    },
    get children(){ return children; }
  };
}

(async () => {
  const toast = element('div');
  const windowListeners = {};
  const timers = new Map();
  const animationFrames = new Map();
  let nextTimerId = 1;
  let nextFrameId = 1;
  const context = {
    console,
    Date,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Promise,
    Math,
    setTimeout(fn, delay = 0){ const id = nextTimerId++; timers.set(id, {fn, delay}); return id; },
    clearTimeout(id){ timers.delete(id); },
    requestAnimationFrame(fn){ const id = nextFrameId++; animationFrames.set(id, fn); return id; },
    cancelAnimationFrame(id){ animationFrames.delete(id); },
    document:{
      getElementById(id){ return id === 'savedToast' ? toast : null; },
      createElement(tag){ return element(tag); }
    },
    window:{
      addEventListener(type, handler){ windowListeners[type] = handler; }
    },
    showSavedToast(message){ context.lastToast = message; }
  };
  context.globalThis = context;
  context.window.window = context.window;
  vm.createContext(context);
  const script = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-undo.js'), 'utf8');
  vm.runInContext(script, context, {filename:'scripts/wormholes-undo.js'});

  assert.ok(context.window.WormholesUndo, 'Undo API should be exposed');
  assert.strictEqual(context.window.WormholesUndo.durationMs, 8000);
  assert.strictEqual(context.window.WormholesUndo.logDurationMs, 120000);

  let undoCalls = 0;
  await context.window.WormholesUndo.offer({
    message:'Creation deleted',
    restoredMessage:'Creation restored',
    undo:async () => { undoCalls += 1; return true; }
  });
  assert.strictEqual(context.window.WormholesUndo.hasActive(), true);
  assert.strictEqual(toast.classList.contains('undo-toast'), true);
  assert.strictEqual(toast.querySelector('.undo-toast-button').textContent, 'Undo');

  // The toast can finish while the same transaction remains actionable from Log.
  context.window.WormholesUndo.activeTransaction.toastExpiresAt = Date.now() - 1;
  const progress = [...animationFrames.values()][0];
  progress();
  assert.strictEqual(toast.classList.contains('undo-toast'), false, 'toast should disappear after eight seconds');
  assert.strictEqual(context.window.WormholesUndo.hasActive(), true, 'Log Undo should remain available after the toast ends');

  await context.window.WormholesUndo.undoActive();
  assert.strictEqual(undoCalls, 1);
  assert.strictEqual(context.lastToast, 'Creation restored');
  assert.strictEqual(context.window.WormholesUndo.hasActive(), false);

  let finalizeCalls = 0;
  await context.window.WormholesUndo.offer({message:'Image deleted', finalize:async () => { finalizeCalls += 1; }});
  context.window.WormholesUndo.notePersistedMutation('some-key');
  await Promise.resolve();
  assert.strictEqual(finalizeCalls, 1, 'a later persisted mutation should commit delayed cleanup');
  assert.strictEqual(context.window.WormholesUndo.hasActive(), false);

  assert.strictEqual(typeof windowListeners.keydown, 'function', 'keyboard Undo listener should be installed');
  console.log('undo-manager.unit.js passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

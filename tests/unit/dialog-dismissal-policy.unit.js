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

function makeElement({id = '', classes = [], escapeDismiss = '', backdropDismiss = '', disabled = false} = {}){
  return {
    id,
    disabled,
    nodeType:1,
    dataset:{escapeDismiss, backdropDismiss},
    classList:makeClassList(classes),
    attributes:{},
    clicked:0,
    click(){ this.clicked += 1; if(typeof this.onclick === 'function') this.onclick(); },
    getAttribute(name){ return this.attributes[name] || ''; },
    setAttribute(name, value){ this.attributes[name] = String(value); }
  };
}

const closeInfo = makeElement({id:'closeInfo'});
const cancelConfirm = makeElement({id:'cancelConfirm'});
const cancelEditor = makeElement({id:'cancelEditor'});
const disabledCancel = makeElement({id:'disabledCancel', disabled:true});
const info = makeElement({id:'infoModal', classes:['modal-backdrop','open'], escapeDismiss:'closeInfo', backdropDismiss:'same'});
const confirm = makeElement({id:'confirmModal', classes:['modal-backdrop'], escapeDismiss:'cancelConfirm', backdropDismiss:'same'});
const editor = makeElement({id:'editorModal', classes:['modal-backdrop'], escapeDismiss:'cancelEditor', backdropDismiss:'none'});
const busy = makeElement({id:'busyModal', classes:['modal-backdrop'], escapeDismiss:'disabledCancel', backdropDismiss:'same'});
closeInfo.onclick = () => info.classList.remove('open');
cancelConfirm.onclick = () => confirm.classList.remove('open');
cancelEditor.onclick = () => editor.classList.remove('open');

const ids = {closeInfo, cancelConfirm, cancelEditor, disabledCancel, infoModal:info, confirmModal:confirm, editorModal:editor, busyModal:busy};
let clickListener = null;
const documentObject = {
  querySelectorAll(selector){
    if(selector === '.modal-backdrop.open') return [info, confirm, editor, busy].filter(item => item.classList.contains('open'));
    return [];
  },
  getElementById(id){ return ids[id] || null; },
  addEventListener(type, listener, capture){ if(type === 'click' && capture) clickListener = listener; }
};
const context = {
  console,
  document:documentObject,
  window:{
    WormholesEscape:{
      topLayer(){
        const open = documentObject.querySelectorAll('.modal-backdrop.open');
        return open[open.length - 1] || null;
      }
    }
  }
};
context.globalThis = context;
vm.createContext(context);
const source = fs.readFileSync(path.resolve(__dirname, '..', '..', 'scripts', 'wormholes-dialogs.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-dialogs.js'});
assert.strictEqual(typeof clickListener, 'function', 'dialog policy should install one capture-phase backdrop handler');

function backdropEvent(target){
  return {
    target,
    currentTarget:documentObject,
    prevented:false,
    stopped:false,
    immediate:false,
    preventDefault(){ this.prevented = true; },
    stopPropagation(){ this.stopped = true; },
    stopImmediatePropagation(){ this.immediate = true; }
  };
}

let event = backdropEvent(info);
assert.strictEqual(clickListener(event), true);
assert.strictEqual(closeInfo.clicked, 1, 'informational backdrop should activate its Close control');
assert.strictEqual(info.classList.contains('open'), false);
assert.ok(event.prevented && event.stopped && event.immediate, 'handled backdrop click should be consumed');

editor.classList.add('open');
event = backdropEvent(editor);
assert.strictEqual(clickListener(event), true);
assert.strictEqual(cancelEditor.clicked, 0, 'editor backdrop should not discard work');
assert.strictEqual(editor.classList.contains('open'), true);

// An underlying modal cannot dismiss while another modal is on top.
confirm.classList.add('open');
context.window.WormholesEscape.topLayer = () => confirm;
event = backdropEvent(editor);
assert.strictEqual(clickListener(event), false);
assert.strictEqual(editor.classList.contains('open'), true);
assert.strictEqual(confirm.classList.contains('open'), true);

event = backdropEvent(confirm);
assert.strictEqual(clickListener(event), true);
assert.strictEqual(cancelConfirm.clicked, 1, 'confirmation backdrop should behave like Cancel');
assert.strictEqual(confirm.classList.contains('open'), false);

busy.classList.add('open');
event = backdropEvent(busy);
assert.strictEqual(clickListener(event), true);
assert.strictEqual(disabledCancel.clicked, 0, 'busy dialog should stay open when its dismiss control is disabled');
assert.strictEqual(busy.classList.contains('open'), true);

// Static audit: every modal explicitly declares its type and backdrop policy.
const htmlPath = latestDirectHtmlPath(path.resolve(__dirname, '..', '..'));
const html = fs.readFileSync(htmlPath, 'utf8');
const modalTags = html.match(/<div\b[^>]*class="[^"]*modal-backdrop[^"]*"[^>]*>/g) || [];
assert.ok(modalTags.length > 40, 'audit should cover the complete dialog set');
modalTags.forEach(tag => {
  assert.ok(/data-dialog-kind="[^"]+"/.test(tag), `missing dialog kind: ${tag.slice(0, 130)}`);
  assert.ok(/data-backdrop-dismiss="(?:same|none)"/.test(tag), `missing backdrop policy: ${tag.slice(0, 130)}`);
});

const expectedNoBackdrop = new Set(['editor','picker','required','choice']);
modalTags.forEach(tag => {
  const kind = tag.match(/data-dialog-kind="([^"]+)"/)?.[1] || '';
  const policy = tag.match(/data-backdrop-dismiss="([^"]+)"/)?.[1] || '';
  if(expectedNoBackdrop.has(kind)) assert.strictEqual(policy, 'none', `${kind} dialogs should require an explicit action`);
  else assert.strictEqual(policy, 'same', `${kind} dialogs should dismiss like their Escape/Cancel policy`);
});

assert.ok(html.includes('scripts/wormholes-dialogs.js'), 'central dialog-policy module should be loaded');
assert.ok(html.indexOf('scripts/wormholes-escape.js') < html.indexOf('scripts/wormholes-dialogs.js'));
assert.ok(html.indexOf('scripts/wormholes-dialogs.js') < html.indexOf('scripts/bootstrap.js'));

// Ambiguous button wording should be replaced with simple actions.
['>Save &amp; Exit<','>Exit<','>Yes<','>No<'].forEach(label => {
  assert.ok(!html.includes(label), `ambiguous dialog label should be removed: ${label}`);
});
[
  'Save and Close',
  'Sync Existing Files',
  'Skip Existing Files',
  'Stay Here',
  'Open Archive'
].forEach(label => assert.ok(html.includes(label), `clear dialog label should exist: ${label}`));

// Feature modules should no longer own backdrop dismissal.
['scripts/bootstrap.js','scripts/modals-settings.js','scripts/global-search.js'].forEach(relative => {
  const sourceText = fs.readFileSync(path.resolve(__dirname, '..', '..', relative), 'utf8');
  assert.ok(!/target\??\.id === "[^"]+Modal"/.test(sourceText), `${relative} should not own modal backdrop dismissal`);
});

console.log('dialog-dismissal-policy.unit.js passed');

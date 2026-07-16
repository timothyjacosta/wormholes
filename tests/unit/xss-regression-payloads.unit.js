const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  htmlPayloads,
  dangerousUrls,
  dangerousAttributes,
  dangerousElements
} = require('../security/xss-payloads');

class MockElement {
  constructor(tagName){
    this.tagName = String(tagName || '').toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
  }
  setAttribute(name, value){ this.attributes.set(String(name), String(value)); }
  getAttribute(name){ return this.attributes.get(String(name)) ?? null; }
  removeAttribute(name){ this.attributes.delete(String(name)); }
  appendChild(child){ this.children.push(child); return child; }
  append(...children){ children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children){ this.children = [...children]; this.innerHTML = ''; this.textContent = ''; }
}

const context = {
  console,
  URL,
  Symbol,
  Object,
  String,
  Array,
  Set,
  TypeError,
  location:{href:'https://wormholes.example/app/'},
  document:{createElement(tag){ return new MockElement(tag); }},
  window:null,
  globalThis:null
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
vm.runInContext(
  fs.readFileSync(path.join(root, 'scripts', 'wormholes-safe-render.js'), 'utf8'),
  context,
  {filename:'scripts/wormholes-safe-render.js'}
);

const safe = context.WormholesSafeRender;
assert.ok(safe, 'safe-render API should be available');

for(const payload of htmlPayloads){
  const escaped = safe.escapeHtml(payload);
  assert.ok(!escaped.includes('<script'), `script markup should be escaped: ${payload}`);
  assert.ok(!escaped.includes('<img'), `image markup should be escaped: ${payload}`);
  assert.ok(!escaped.includes('<svg'), `SVG markup should be escaped: ${payload}`);

  const markup = safe.html`<div data-value="${payload}">${payload}</div>`;
  const rendered = markup.toString();
  assert.ok(rendered.startsWith('<div data-value="'), 'safe template should preserve trusted structure');
  assert.ok(!rendered.includes(`<script>`), 'safe template must not interpolate executable script markup');
  assert.ok(!rendered.includes(`<img src=x`), 'safe template must not interpolate executable image markup');
}

assert.throws(
  () => safe.raw('<img src=x onerror=alert(1)>'),
  /accepts SafeMarkup only/,
  'plain strings must not be promoted to trusted markup'
);
const reviewed = safe.html`<span>Reviewed</span>`;
assert.strictEqual(safe.raw(reviewed), reviewed, 'already-safe markup may pass through raw');

for(const url of dangerousUrls){
  assert.strictEqual(safe.safeUrl(url), '', `dangerous URL should be rejected: ${JSON.stringify(url)}`);
  assert.strictEqual(safe.safeImageUrl(url), '', `dangerous image URL should be rejected: ${JSON.stringify(url)}`);

  const anchor = new MockElement('a');
  safe.setAttribute(anchor, 'href', url);
  assert.strictEqual(anchor.getAttribute('href'), null, `unsafe href should be removed: ${JSON.stringify(url)}`);

  const button = new MockElement('button');
  safe.setAttribute(button, 'formaction', url);
  assert.strictEqual(button.getAttribute('formaction'), null, `unsafe formaction should be removed: ${JSON.stringify(url)}`);
}

for(const attribute of dangerousAttributes){
  assert.throws(
    () => safe.createElement('div', {attributes:{[attribute]:'unsafe'}}),
    /Unsafe attribute name/,
    `${attribute} should not be accepted by the shared renderer`
  );
}

for(const elementName of dangerousElements){
  assert.throws(
    () => safe.createElement(elementName),
    /Unsafe element name/,
    `${elementName} should not be created by the shared renderer`
  );
}

const validImage = 'data:image/png;base64,iVBORw0KGgo=';
assert.strictEqual(safe.safeImageUrl(validImage), validImage, 'approved PNG data URLs should remain supported');
assert.strictEqual(safe.safeUrl('/relative/path'), '/relative/path', 'normal relative URLs should remain supported');
assert.strictEqual(safe.safeUrl('https://example.com/path'), 'https://example.com/path', 'normal HTTPS URLs should remain supported');

const pagination = fs.readFileSync(path.join(root, 'scripts', 'wormholes-pagination.js'), 'utf8');
assert.doesNotMatch(
  pagination,
  /safeRender\.raw\(\s*['"`]/,
  'application code should not promote plain strings to SafeMarkup'
);

console.log(`xss-regression-payloads.unit.js passed (${htmlPayloads.length} markup payloads, ${dangerousUrls.length} URL payloads)`);

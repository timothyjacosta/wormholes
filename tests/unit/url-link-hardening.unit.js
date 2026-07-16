const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MockElement {
  constructor(tagName = 'a'){
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map();
    this.parentNode = null;
  }
  setAttribute(name, value){ this.attributes.set(String(name), String(value)); }
  getAttribute(name){ return this.attributes.get(String(name)) ?? null; }
  hasAttribute(name){ return this.attributes.has(String(name)); }
  removeAttribute(name){ this.attributes.delete(String(name)); }
  closest(selector){
    if(selector === 'a[href]' && this.tagName === 'A' && this.hasAttribute('href')) return this;
    if(selector.includes('data-wormholes-safe-download') && this.hasAttribute('data-wormholes-safe-download')) return this;
    return null;
  }
}

const root = path.resolve(__dirname, '..', '..');
const context = {
  console,
  URL,
  Symbol,
  Object,
  String,
  Array,
  Set,
  WeakSet,
  TypeError,
  Error,
  location:{href:'https://wormholes.example/app/index.html'},
  setTimeout(fn){ fn(); },
  window:null,
  globalThis:null
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-safe-render.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-url-safety.js'), 'utf8'), context);

const safe = context.WormholesSafeRender;
const urls = context.WormholesUrlSafety;
assert.ok(safe && urls, 'URL safety APIs should load');

assert.strictEqual(safe.safeExternalUrl('https://Example.com/a b'), 'https://example.com/a%20b');
assert.strictEqual(safe.safeExternalUrl('http://example.com/path'), 'http://example.com/path');
assert.strictEqual(safe.safeExternalUrl('/relative/path'), '', 'external links should not accept relative paths');
assert.strictEqual(safe.safeUrl('/relative/path'), '/relative/path', 'internal relative assets should remain supported');
assert.strictEqual(safe.safeExternalUrl('//evil.example/path'), '', 'protocol-relative links should be rejected');
assert.strictEqual(safe.safeExternalUrl('https:\\evil.example/path'), '', 'backslash-obfuscated links should be rejected');
assert.strictEqual(safe.safeExternalUrl('https://user:pass@example.com/path'), '', 'credential-bearing links should be rejected');
assert.strictEqual(safe.safeExternalUrl('javascript:alert(1)'), '');
assert.strictEqual(safe.safeExternalUrl('java\nscript:alert(1)'), '');
assert.strictEqual(safe.safeExternalUrl('data:text/html,<script>alert(1)</script>'), '');
assert.strictEqual(safe.safeExternalUrl('file:///tmp/private.txt'), '');
assert.strictEqual(safe.safeExternalUrl('mailto:test@example.com'), '');
assert.strictEqual(safe.safeExternalUrl(`https://example.com/\u202Eevil`), '', 'bidi-control URLs should be rejected');
assert.strictEqual(safe.safeExternalUrl('https://example.com\u0000.evil.test'), '', 'control-character URLs should be rejected');

const anchor = new MockElement('a');
assert.strictEqual(safe.configureExternalLink(anchor, 'https://example.com/path'), true);
assert.strictEqual(anchor.getAttribute('href'), 'https://example.com/path');
assert.strictEqual(anchor.getAttribute('target'), '_blank');
assert.strictEqual(anchor.getAttribute('rel'), 'noopener noreferrer');
assert.strictEqual(anchor.getAttribute('referrerpolicy'), 'no-referrer');
assert.strictEqual(safe.configureExternalLink(anchor, 'javascript:alert(1)'), false);
assert.strictEqual(anchor.getAttribute('href'), null);
assert.strictEqual(anchor.getAttribute('target'), null);

assert.doesNotThrow(() => urls.validateAppData({websiteUrl:'https://example.com', content:'<p>Safe</p>'}));
assert.doesNotThrow(() => urls.validateAppData({dataUrl:'data:image/png;base64,iVBORw0KGgo='}), 'dedicated media fields are handled by media validation');
assert.throws(
  () => urls.validateAppData({websiteUrl:'javascript:alert(1)'}),
  error => error && error.code === 'WORMHOLES_UNSAFE_URL',
  'unsafe URL fields should stop imports'
);
assert.throws(
  () => urls.validateAppData({content:'<p><a href="javascript:alert(1)">Open</a></p>'}),
  error => error && error.code === 'WORMHOLES_UNSAFE_URL',
  'unsafe Literature links should stop imports'
);
assert.throws(
  () => urls.validateAppData({content:'<a href="jav&#x61;script:alert(1)">Open</a>'}),
  error => error && error.code === 'WORMHOLES_UNSAFE_URL',
  'entity-obfuscated Literature links should stop imports'
);
assert.doesNotThrow(() => urls.validateAppData({content:'<a href="https://example.com/reference">Reference</a>'}));
assert.doesNotThrow(() => urls.validateAppData({websiteUrl:'javascript:alert(1)'}, {allowUnsafeUrls:true}), 'internal historical restoration may preserve old data');

const event = {
  target:Object.assign(new MockElement('a'), {}),
  defaultPrevented:false,
  prevented:false,
  stopped:false,
  preventDefault(){ this.prevented = true; },
  stopPropagation(){ this.stopped = true; }
};
event.target.setAttribute('href', 'javascript:alert(1)');
urls.guardExternalLinkEvent(event);
assert.strictEqual(event.prevented, true, 'unsafe navigation should be stopped at click time');

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const html = fs.readFileSync(path.join(root, htmlName), 'utf8');
const exportImport = fs.readFileSync(path.join(root, 'scripts', 'export-import.js'), 'utf8');
const literature = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'scripts', 'bootstrap.js'), 'utf8');
assert.ok(html.includes('id="urlSafetyModal"'), 'simple unsafe-link dialog should exist');
assert.ok(html.includes('scripts/wormholes-url-safety.js'), 'URL safety module should be loaded');
assert.ok(html.indexOf('scripts/wormholes-safe-render.js') < html.indexOf('scripts/wormholes-url-safety.js'), 'safe renderer must load before URL policy');
assert.match(exportImport, /WormholesUrlSafety\?\.validateAppData/, 'imports and restores should validate URLs before staging');
assert.match(exportImport, /WORMHOLES_UNSAFE_URL/, 'imports and restores should present the simple unsafe-link failure');
assert.match(literature, /safeExternalUrl/, 'Literature links should use the centralized external URL policy');
assert.match(literature, /configureExternalLink/, 'Literature links should receive the centralized external-link protections');
assert.match(fs.readFileSync(path.join(root, 'scripts', 'wormholes-safe-render.js'), 'utf8'), /noopener noreferrer/, 'external links should not expose window.opener');
assert.match(bootstrap, /installLinkGuard/, 'navigation-time link guard should be installed');

console.log('url-link-hardening.unit.js passed');

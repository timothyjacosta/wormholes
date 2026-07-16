const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  document:{
    createElement(tag){ return new MockElement(tag); }
  },
  WormholesMediaLimits:{
    safeDataUrl(value, kind){
      const text = String(value || '');
      const allowed = kind === 'visionThumbnail' ? 10 * 1024 * 1024 : 75 * 1024 * 1024;
      const match = text.match(/^data:image\/(?:png|jpeg);base64,([a-z0-9+/=]+)$/i);
      if(!match) return '';
      return Math.floor(match[1].length * 3 / 4) <= allowed ? text : '';
    }
  },
  window:null,
  globalThis:null
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'scripts', 'wormholes-safe-render.js'), 'utf8');
vm.runInContext(source, context, {filename:'scripts/wormholes-safe-render.js'});

const safe = context.WormholesSafeRender;
assert.ok(safe, 'central safe-render API should be exposed');
assert.strictEqual(context.escapeHtml, safe.escapeHtml, 'legacy escapeHtml calls should use the centralized helper');
assert.strictEqual(safe.escapeHtml(`<script>"&'</script>`), '&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;');

const markup = safe.html`<p title="${`bad" onclick="alert(1)`}">${'<img src=x onerror=alert(1)>'}</p>`;
assert.strictEqual(
  markup.toString(),
  '<p title="bad&quot; onclick=&quot;alert(1)">&lt;img src=x onerror=alert(1)&gt;</p>',
  'safe template interpolations should be escaped in both text and attribute contexts'
);
assert.ok(safe.isSafeMarkup(markup));
assert.throws(() => safe.raw('<b>unreviewed</b>'), /accepts SafeMarkup only/);
assert.strictEqual(safe.raw(markup), markup);

const container = new MockElement('div');
safe.setHtml(container, markup);
assert.strictEqual(container.innerHTML, markup.toString());
assert.throws(() => safe.setHtml(container, '<b>plain string</b>'), /requires SafeMarkup/);

const listMarkup = safe.html`<ul>${[
  safe.html`<li>${'One & only'}</li>`,
  safe.html`<li>${'<Two>'}</li>`
]}</ul>`;
assert.strictEqual(listMarkup.toString(), '<ul><li>One &amp; only</li><li>&lt;Two&gt;</li></ul>');

assert.strictEqual(safe.safeUrl('javascript:alert(1)'), '', 'script URLs should be rejected');
assert.strictEqual(safe.safeUrl('data:text/html,<script>alert(1)</script>'), '', 'non-image data URLs should be rejected');
assert.strictEqual(safe.safeUrl('/relative/path'), '/relative/path');
assert.strictEqual(safe.safeUrl('https://example.com/page'), 'https://example.com/page');
assert.strictEqual(safe.safeImageUrl('blob:https://example.com/id'), 'blob:https://example.com/id');
assert.ok(safe.safeImageUrl('data:image/png;base64,iVBORw0KGgo=').startsWith('data:image/png'));
const realisticThumbnail = `data:image/png;base64,${'A'.repeat(12000)}`;
assert.ok(realisticThumbnail.length > 8000, 'regression fixture should exceed the ordinary URL cap');
assert.strictEqual(
  safe.safeImageUrl(realisticThumbnail, {imageKind:'visionThumbnail'}),
  realisticThumbnail,
  'valid embedded thumbnails should use media byte limits instead of the ordinary URL character limit'
);
assert.strictEqual(
  safe.urlResult('https://example.com/' + 'a'.repeat(9000)).reason,
  'too-long',
  'ordinary URLs should remain bounded by the URL character limit'
);
assert.strictEqual(safe.safeImageUrl('data:image/svg+xml,<svg onload=alert(1)>'), '', 'SVG data URLs should be rejected');

const button = safe.createElement('button', {
  className:'app-button',
  text:'Open',
  attributes:{type:'button', 'aria-label':'Open item'}
});
assert.strictEqual(button.tagName, 'BUTTON');
assert.strictEqual(button.className, 'app-button');
assert.strictEqual(button.textContent, 'Open');
assert.strictEqual(button.getAttribute('aria-label'), 'Open item');
assert.throws(() => safe.createElement('button', {attributes:{onclick:'alert(1)'}}), /Unsafe attribute name/);
assert.throws(() => safe.createElement('script>alert(1)</script>'), /Unsafe element name/);
assert.throws(() => safe.createElement('script'), /Unsafe element name/);
assert.throws(() => safe.createElement('iframe'), /Unsafe element name/);
assert.throws(() => safe.createElement('div', {attributes:{style:'background:url(javascript:alert(1))'}}), /Unsafe attribute name/);
assert.throws(() => safe.createElement('iframe', {attributes:{srcdoc:'<script>alert(1)</script>'}}), /Unsafe element name/);

const imageHost = new MockElement('button');
assert.strictEqual(safe.replaceWithImage(imageHost, 'blob:https://example.com/id', 'Preview'), true);
assert.strictEqual(imageHost.children.length, 1);
assert.strictEqual(imageHost.children[0].tagName, 'IMG');
assert.strictEqual(imageHost.children[0].getAttribute('alt'), 'Preview');
assert.strictEqual(safe.replaceWithImage(imageHost, 'javascript:alert(1)', 'Unsafe'), false);

const scriptsDir = path.join(root, 'scripts');
const scriptFiles = fs.readdirSync(scriptsDir).filter(name => name.endsWith('.js'));
for(const file of scriptFiles){
  if(file === 'wormholes-safe-render.js') continue;
  const text = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
  assert.doesNotMatch(text, /function\s+escapeHtml\s*\(/, `${file} should not define a competing escapeHtml helper`);
  assert.doesNotMatch(text, /function\s+escapeSearchHtml\s*\(/, `${file} should not define a search-only escape helper`);
}

const htmlName = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
const appHtml = fs.readFileSync(path.join(root, htmlName), 'utf8');
assert.ok(appHtml.includes('scripts/wormholes-safe-render.js'), 'safe-render helper should be loaded by the app');
assert.ok(
  appHtml.indexOf('scripts/wormholes-safe-render.js') < appHtml.indexOf('scripts/wormholes-error-reporting.js'),
  'safe-render helper should load before dynamic render consumers'
);
assert.ok(
  appHtml.indexOf('scripts/wormholes-safe-render.js') < appHtml.indexOf('scripts/archive.js'),
  'safe-render helper should load before collection renderers'
);

const errorReporting = fs.readFileSync(path.join(scriptsDir, 'wormholes-error-reporting.js'), 'utf8');
const globalSearch = fs.readFileSync(path.join(scriptsDir, 'global-search.js'), 'utf8');
const pagination = fs.readFileSync(path.join(scriptsDir, 'wormholes-pagination.js'), 'utf8');
const archive = fs.readFileSync(path.join(scriptsDir, 'archive.js'), 'utf8');
const vision = fs.readFileSync(path.join(scriptsDir, 'vision-board.js'), 'utf8');
assert.match(errorReporting, /WormholesSafeRender/, 'error details should use centralized safe DOM helpers');
assert.match(globalSearch, /WormholesSafeRender/, 'Global Search results should use centralized safe DOM helpers');
assert.match(pagination, /safeRender\.setHtml/, 'pagination markup should require centralized SafeMarkup');
assert.match(archive, /populateVisionThumbnailButton/, 'Archive image previews should use the shared thumbnail renderer');
assert.match(vision, /safeRender\.replaceWithImage/, 'Vision previews should use centralized URL-safe image insertion');

console.log('safe-render-helpers.unit.js passed');

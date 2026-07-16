'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { inputPaths, nonTextControls } = require('../security/input-paths');
const { htmlPayloads, dangerousUrls } = require('../security/xss-payloads');

const root = path.resolve(__dirname, '..', '..');
const htmlPath = fs.readdirSync(root).find(name => /^Wormholes_Beta_\d+\.html$/.test(name));
assert.ok(htmlPath, 'current Beta HTML should exist');
const html = fs.readFileSync(path.join(root, htmlPath), 'utf8');

const controlIds = new Set();
for(const match of html.matchAll(/<(input|textarea|select)\b[^>]*\bid="([^"]+)"[^>]*>/gi)){
  const tag = match[1].toLowerCase();
  const markup = match[0];
  const id = match[2];
  const type = (markup.match(/\btype="([^"]+)"/i)?.[1] || '').toLowerCase();
  if(tag === 'textarea' || tag === 'select' || ['text', 'search', 'file', ''].includes(type)) controlIds.add(id);
}
for(const match of html.matchAll(/<[^>]+\bcontenteditable="true"[^>]*\bid="([^"]+)"[^>]*>/gi)) controlIds.add(match[1]);

const coveredControlIds = new Set(inputPaths.flatMap(pathItem => pathItem.controls));
for(const id of nonTextControls) coveredControlIds.add(id);

const missing = Array.from(controlIds).filter(id => !coveredControlIds.has(id));
assert.deepStrictEqual(missing, [], `every writable control should be classified; missing: ${missing.join(', ')}`);

const pathIds = inputPaths.map(item => item.id);
assert.strictEqual(new Set(pathIds).size, pathIds.length, 'input-path IDs should be unique');
assert.ok(inputPaths.length >= 34, 'the manifest should cover the complete user-input surface');
assert.ok(htmlPayloads.length >= 20, 'the markup attack corpus should remain broad');
assert.ok(dangerousUrls.length >= 12, 'the URL attack corpus should remain broad');

const productionSource = fs.readdirSync(path.join(root, 'scripts'))
  .filter(name => name.endsWith('.js'))
  .map(name => fs.readFileSync(path.join(root, 'scripts', name), 'utf8'))
  .join('\n');

for(const pathItem of inputPaths){
  assert.ok(pathItem.controls.length > 0, `${pathItem.id} should identify its source control`);
  if(pathItem.handler === 'paste event'){
    assert.match(productionSource, /literatureEditor"\)\s*\.addEventListener\("paste"/, 'Literature paste handler should remain installed');
  } else if(pathItem.handler === 'drop event'){
    assert.match(productionSource, /literatureEditor"\)\s*\.addEventListener\("drop"/, 'Literature drop handler should remain installed');
  } else {
    const escaped = pathItem.handler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(productionSource, new RegExp(`\\b${escaped}\\b`), `${pathItem.id} should reference an existing production handler`);
  }
}

assert.match(productionSource, /sanitizeLiteratureHtml\(/, 'rich-text input paths should retain HTML sanitization');
assert.match(productionSource, /escapeHtml\(/, 'plain-text rendering paths should retain output escaping');
assert.match(productionSource, /WormholesUrlSafety/, 'URL-bearing input paths should retain centralized URL checks');

console.log(`malicious-input-paths.unit.js passed (${inputPaths.length} paths × ${htmlPayloads.length + dangerousUrls.length} payloads)`);

'use strict';

const fs = require('fs');
const path = require('path');
const { appHtmlPath, appRoot } = require('./app');

function inlineSource(filename){
  return fs.readFileSync(path.join(appRoot(), filename), 'utf8').replace(/<\/script/gi, '<\\/script');
}

function selfContainedAppHtml(options = {}){
  let html = fs.readFileSync(appHtmlPath(), 'utf8');
  // The self-contained harness inlines scripts and CSS for environments that block
  // localhost/file navigation. Remove the release CSP here; CSP behavior has its
  // own test that reapplies the exact policy after the app scripts have loaded.
  html = html.replace(/<meta\s+content="[^"]+"\s+http-equiv="Content-Security-Policy"\s*\/>/i, '');
  const scripts = Array.from(html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/gi), match => match[1]);

  if(options.inlineStyles){
    html = html.replace(/<link\b[^>]*>/gi, match => {
      if(!/\brel=["']stylesheet["']/i.test(match)) return match;
      const href = match.match(/\bhref=["']([^"']+)["']/i)?.[1];
      if(!href) return '';
      const css = fs.readFileSync(path.join(appRoot(), href), 'utf8').replace(/<\/style/gi, '<\/style');
      return `<style data-self-contained-source="${href}">\n${css}\n</style>`;
    });
  } else {
    html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
  }
  html = html.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/gi, '');

  const storageShim = `
    <script>
      (() => {
        const makeStore = () => {
          const values = new Map();
          return {
            get length(){ return values.size; },
            key(index){ return Array.from(values.keys())[index] ?? null; },
            getItem(key){ key = String(key); return values.has(key) ? values.get(key) : null; },
            setItem(key, value){ values.set(String(key), String(value)); },
            removeItem(key){ values.delete(String(key)); },
            clear(){ values.clear(); }
          };
        };
        try{ Object.defineProperty(window, 'localStorage', {configurable:true, value:makeStore()}); }catch(error){}
        try{ Object.defineProperty(window, 'sessionStorage', {configurable:true, value:makeStore()}); }catch(error){}
        const makeRecordAdapter = () => {
          const records = new Map();
          return {
            async put(record){ records.set(record.id, structuredClone(record)); return true; },
            async get(id){ return records.has(id) ? structuredClone(records.get(id)) : null; },
            async list(){ return Array.from(records.values()).map(record => structuredClone(record)); },
            async del(id){ records.delete(id); return true; }
          };
        };
        window.WormholesWriteAheadJournalStorageAdapter = makeRecordAdapter();
        window.WormholesSnapshotStorageAdapter = makeRecordAdapter();
        window.WormholesCorruptionStorageAdapter = makeRecordAdapter();
        window.__wormholesXssExecutions = 0;
        window.alert = () => { window.__wormholesXssExecutions += 1; };
        window.confirm = () => true;
        window.prompt = () => '';
        if(!navigator.storage){
          Object.defineProperty(navigator, 'storage', {value:{estimate:async () => ({usage:0, quota:1_000_000_000})}});
        }
        ${options.beforeScripts || ''}
      })();
    <\/script>
  `;
  html = html.replace('</head>', () => `${storageShim}</head>`);

  const inlined = scripts.map(filename => `<script>\n${inlineSource(filename)}\n<\/script>`).join('\n');
  return html.replace('</body>', () => `${inlined}\n</body>`);
}

async function openSelfContainedApp(page, options = {}){
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if(message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.setContent(selfContainedAppHtml(options), {waitUntil:'load', timeout:60000});
  await page.waitForFunction(() => !!window.WormholesStartup && document.body.classList.contains('home-mode'));
  return runtimeErrors;
}

module.exports = { selfContainedAppHtml, openSelfContainedApp };

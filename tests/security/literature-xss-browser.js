'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { htmlPayloads } = require('./xss-payloads');

function extractFunction(source, functionName){
  const start = source.indexOf(`function ${functionName}(`);
  if(start < 0) throw new Error(`Could not find ${functionName}()`);
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for(let index = braceStart; index < source.length; index += 1){
    const character = source[index];
    if(quote){
      if(escaped){ escaped = false; continue; }
      if(character === '\\'){ escaped = true; continue; }
      if(character === quote) quote = '';
      continue;
    }
    if(character === '"' || character === "'" || character === '`'){
      quote = character;
      continue;
    }
    if(character === '{') depth += 1;
    if(character === '}'){
      depth -= 1;
      if(depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${functionName}()`);
}

(async () => {
  const root = path.resolve(__dirname, '..', '..');
  const literatureSource = fs.readFileSync(path.join(root, 'scripts', 'literature.js'), 'utf8');
  const safeRenderSource = fs.readFileSync(path.join(root, 'scripts', 'wormholes-safe-render.js'), 'utf8');
  const sanitizerSource = extractFunction(literatureSource, 'sanitizeLiteratureHtml');
  const launchOptions = {headless:true};
  if(process.env.WORMHOLES_CHROMIUM_PATH){
    launchOptions.executablePath = process.env.WORMHOLES_CHROMIUM_PATH;
    launchOptions.args = ['--no-sandbox'];
  }

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  try{
    await page.setContent('<!doctype html><html><body><main id="host"></main></body></html>');
    await page.addScriptTag({content:safeRenderSource});
    await page.addScriptTag({content:`${sanitizerSource}\nwindow.sanitizeLiteratureHtml = sanitizeLiteratureHtml;`});

    const results = await page.evaluate(async payloads => {
      const outcomes = [];
      for(const payload of payloads){
        window.__wormholesXssExecutions = 0;
        window.alert = () => { window.__wormholesXssExecutions += 1; };
        const cleaned = window.sanitizeLiteratureHtml(payload);
        const host = document.getElementById('host');
        host.replaceChildren();
        const article = document.createElement('article');
        article.innerHTML = cleaned;
        host.appendChild(article);
        await new Promise(resolve => setTimeout(resolve, 20));

        const unsafeAttributes = [];
        article.querySelectorAll('*').forEach(element => {
          element.getAttributeNames().forEach(name => {
            const value = element.getAttribute(name) || '';
            if(/^on/i.test(name)) unsafeAttributes.push(`${element.tagName.toLowerCase()}[${name}]`);
            if(['href', 'src', 'action', 'formaction', 'xlink:href'].includes(name.toLowerCase()) && /^(?:\s*javascript:|\s*vbscript:|\s*data:text\/html|\s*data:image\/svg\+xml)/i.test(value)){
              unsafeAttributes.push(`${element.tagName.toLowerCase()}[${name}]`);
            }
            if(name.toLowerCase() === 'srcdoc' || name.toLowerCase() === 'style') unsafeAttributes.push(`${element.tagName.toLowerCase()}[${name}]`);
          });
        });

        outcomes.push({
          payload,
          cleaned,
          executions:window.__wormholesXssExecutions,
          blockedCount:article.querySelectorAll('script,style,iframe,object,embed,svg,math,link,meta,base').length,
          unsafeAttributes
        });
      }
      return outcomes;
    }, htmlPayloads);

    for(const result of results){
      if(result.executions !== 0 || result.blockedCount !== 0 || result.unsafeAttributes.length){
        throw new Error(`Literature XSS sanitizer regression for ${JSON.stringify(result.payload)}: ${JSON.stringify(result)}`);
      }
    }

    const linkResults = await page.evaluate(() => {
      const safe = document.createElement('article');
      safe.innerHTML = window.sanitizeLiteratureHtml('<p><a href="https://Example.com/reference">Reference</a></p>');
      const safeLink = safe.querySelector('a');
      const unsafe = document.createElement('article');
      unsafe.innerHTML = window.sanitizeLiteratureHtml('<p><a href="jav&#x61;script:alert(1)">Unsafe</a></p>');
      const unsafeLink = unsafe.querySelector('a');
      return {
        safeHref:safeLink?.getAttribute('href') || '',
        safeTarget:safeLink?.getAttribute('target') || '',
        safeRel:safeLink?.getAttribute('rel') || '',
        safeReferrerPolicy:safeLink?.getAttribute('referrerpolicy') || '',
        unsafeHref:unsafeLink?.getAttribute('href') || ''
      };
    });
    if(linkResults.safeHref !== 'https://example.com/reference'
      || linkResults.safeTarget !== '_blank'
      || linkResults.safeRel !== 'noopener noreferrer'
      || linkResults.safeReferrerPolicy !== 'no-referrer'
      || linkResults.unsafeHref){
      throw new Error(`Literature link hardening regression: ${JSON.stringify(linkResults)}`);
    }
    console.log(`literature-xss-browser.js passed (${results.length} payloads plus safe-link policy)`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});

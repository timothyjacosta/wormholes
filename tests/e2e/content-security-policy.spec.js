const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { appHtmlPath, appUrl, createUniverse } = require('../support/app');
const { selfContainedAppHtml } = require('../support/self-contained-app');

test('restrictive CSP keeps core runtime behavior working and blocks injected scripts', async ({ page }) => {
  const sourceHtml = fs.readFileSync(appHtmlPath(), 'utf8');
  const policy = (sourceHtml.match(/<meta\s+content="([^"]+)"\s+http-equiv="Content-Security-Policy"\s*\/>/i) || [])[1];
  expect(policy).toBeTruthy();

  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if(message.type() === 'error' && !/Content Security Policy/i.test(message.text())) runtimeErrors.push(message.text());
  });

  const registerViolationCollector = () => {
    window.__wormholesCspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__wormholesCspViolations.push({
        directive:event.effectiveDirective,
        blockedURI:event.blockedURI,
        disposition:event.disposition
      });
    });
  };

  if(process.env.WORMHOLES_CSP_NAVIGATION === 'served'){
    await page.addInitScript(registerViolationCollector);
    const response = await page.goto(appUrl(), {waitUntil:'domcontentloaded'});
    expect((await response.allHeaders())['content-security-policy']).toContain("frame-ancestors 'none'");
    await expect(page.locator('#homeScreen')).toBeVisible();
  } else {
    // This execution environment blocks browser navigation to localhost and file URLs.
    // Load the self-contained harness, then apply the exact release policy before
    // exercising runtime actions and attempted injections. CI uses the served branch.
    const html = selfContainedAppHtml({inlineStyles:true});
    await page.setContent(html, {waitUntil:'load', timeout:60000});
    await page.waitForFunction(() => !!window.WormholesStartup && document.body.classList.contains('home-mode'));
    await page.evaluate(registerViolationCollector);
    await page.evaluate(releasePolicy => {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = releasePolicy;
      document.head.prepend(meta);
    }, policy);
  }

  await createUniverse(page, 'CSP Test Universe');
  await page.locator('#createTabBtn').click();
  await page.locator('#manualTitle').fill('CSP Test Creation');
  await page.locator('#manualWhat').selectOption('__custom__');
  await page.locator('#manualWhatCustom').fill('Protected local record');
  await page.locator('#saveManualBtn').click();
  await expect(page.locator('#manualError')).toContainText('Archived');
  expect(runtimeErrors).toEqual([]);

  const allowedCapabilities = await page.evaluate(async () => {
    const styleProbe = document.createElement('div');
    styleProbe.style.position = 'absolute';
    styleProbe.style.left = '17px';
    document.body.appendChild(styleProbe);
    const dynamicStyleWorks = getComputedStyle(styleProbe).left === '17px';
    styleProbe.remove();

    const imageProbe = new Image();
    const dataImageLoaded = await new Promise(resolve => {
      imageProbe.onload = () => resolve(true);
      imageProbe.onerror = () => resolve(false);
      imageProbe.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="2" height="2"%3E%3Crect width="2" height="2" fill="black"/%3E%3C/svg%3E';
    });

    const blobUrl = URL.createObjectURL(new Blob(['local'], {type:'text/plain'}));
    let blobFetchWorked = false;
    try{
      blobFetchWorked = (await (await fetch(blobUrl)).text()) === 'local';
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
    return {dynamicStyleWorks, dataImageLoaded, blobFetchWorked};
  });
  expect(allowedCapabilities).toEqual({dynamicStyleWorks:true, dataImageLoaded:true, blobFetchWorked:true});

  const blockedCapabilities = await page.evaluate(async () => {
    window.__inlineCspRan = false;
    const inline = document.createElement('script');
    inline.textContent = 'window.__inlineCspRan = true;';
    document.body.appendChild(inline);

    window.__dataCspRan = false;
    const dataScript = document.createElement('script');
    dataScript.src = 'data:text/javascript,window.__dataCspRan=true';
    document.body.appendChild(dataScript);

    window.__handlerCspRan = false;
    const button = document.createElement('button');
    button.setAttribute('onclick', 'window.__handlerCspRan = true');
    document.body.appendChild(button);
    button.click();

    await new Promise(resolve => setTimeout(resolve, 100));
    return {inlineRan:window.__inlineCspRan, dataRan:window.__dataCspRan, handlerRan:window.__handlerCspRan};
  });
  expect(blockedCapabilities).toEqual({inlineRan:false, dataRan:false, handlerRan:false});

  const violations = await page.evaluate(() => window.__wormholesCspViolations || []);
  expect(violations.some(item => item.directive === 'script-src-elem')).toBeTruthy();
  expect(violations.some(item => item.directive === 'script-src-attr')).toBeTruthy();
});

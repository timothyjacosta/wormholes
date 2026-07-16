const { test, expect } = require('@playwright/test');
const { openCleanApp, createUniverse } = require('../support/app');
const { htmlPayloads } = require('../security/xss-payloads');

const corpus = htmlPayloads.slice(0, 18);
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XxZKAAAAAElFTkSuQmCC';

async function expectNoExecution(page){
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => window.__wormholesXssExecutions || 0)).toBe(0);
}

async function expectNoDangerousDom(page, selector = 'body'){
  const findings = await page.locator(selector).evaluate(root => {
    const bad = [];
    root.querySelectorAll('*').forEach(element => {
      const tag = element.tagName.toLowerCase();
      if(['script', 'iframe', 'object', 'embed', 'svg', 'math'].includes(tag) && !element.closest('.connections-map-wrap, .wormholes-map-wrap')){
        bad.push(`<${tag}>`);
      }
      for(const attribute of element.getAttributeNames()){
        const value = element.getAttribute(attribute) || '';
        if(/^on/i.test(attribute)) bad.push(`${tag}[${attribute}]`);
        if(['href', 'src', 'action', 'formaction', 'poster', 'xlink:href'].includes(attribute.toLowerCase()) && /^\s*(?:javascript|vbscript|data:text\/html|data:image\/svg\+xml)/i.test(value)){
          bad.push(`${tag}[${attribute}=${value.slice(0, 40)}]`);
        }
        if(attribute.toLowerCase() === 'srcdoc') bad.push(`${tag}[srcdoc]`);
      }
    });
    return bad;
  });
  expect(findings).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__wormholesXssExecutions = 0;
    window.alert = () => { window.__wormholesXssExecutions += 1; };
    window.confirm = () => true;
    window.prompt = () => '';
  });
});

test('payload corpus stays inert across Archive, Literature, Vision Board, Search, errors, and Connections map', async ({ page }) => {
  await openCleanApp(page);
  await createUniverse(page, corpus[1]);
  await expectNoExecution(page);
  await expect(page.locator('#currentUniverseLabel')).toHaveText(corpus[1]);

  const saveResults = await page.evaluate(({ payloads, image }) => {
    const now = new Date().toISOString();
    archiveEntries = payloads.map((payload, index) => normalizeSchemaArchiveEntry({
      id:`xss-archive-${index}`,
      title:payload,
      what:{val:payload},
      attr1:{val:payload},
      attr2:{val:payload},
      pressure:{val:payload},
      summary:payload,
      notes:[payload],
      connections:[],
      bridges:[],
      createdAt:now,
      updatedAt:now
    }));
    const archiveSaved = saveArchiveToStorage();

    literatureEntries = [normalizeLiteratureDoc({
      id:'xss-literature',
      title:payloads[2],
      content:payloads.join('<p>separator</p>'),
      fileType:'html',
      fileSize:payloads.join('').length,
      tags:{universes:[], entries:[]},
      createdAt:now,
      updatedAt:now
    })];
    const literatureSaved = saveLiteratureToStorage();

    visionEntries = payloads.slice(0, 6).map((payload, index) => normalizeVisionEntry({
      id:`xss-vision-${index}`,
      title:payload,
      sourceName:`${payload}.png`,
      fileType:'image',
      mimeType:'image/png',
      thumbnailDataUrl:image,
      dataUrl:image,
      fileSize:100,
      tags:{universes:[], entries:[]},
      createdAt:now
    }));
    const visionSaved = saveVisionBoardToStorage();

    return {
      archiveSaved,
      literatureSaved,
      visionSaved
    };
  }, { payloads:corpus, image:tinyPng });
  expect(saveResults.archiveSaved).toBe(true);
  expect(saveResults.literatureSaved?.ok).toBe(true);
  expect(saveResults.visionSaved?.ok).toBe(true);

  await page.locator('#archiveTabBtn').click();
  await page.evaluate(() => renderArchive());
  await expect(page.locator('#archiveList .entry')).toHaveCount(corpus.length);
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#archiveList');
  await expect(page.locator('#archiveList')).toContainText('window.__wormholesXssExecutions');

  await page.locator('#literatureTabBtn').click();
  await page.evaluate(() => renderLiteratureList());
  await expect(page.locator('#literatureList .entry')).toHaveCount(1);
  await page.locator('#literatureList .entry-title').click();
  await expect(page.locator('#literatureViewerModal')).toHaveClass(/open/);
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#literatureViewerContent');
  const viewerUnsafe = await page.locator('#literatureViewerContent').evaluate(root => ({
    events:Array.from(root.querySelectorAll('*')).flatMap(el => el.getAttributeNames().filter(name => /^on/i.test(name))),
    blocked:root.querySelectorAll('script,style,iframe,object,embed,svg,math,link,meta').length,
    javascript:Array.from(root.querySelectorAll('[href],[src],[action],[formaction]')).filter(el => /javascript:/i.test(el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('action') || el.getAttribute('formaction') || '')).length
  }));
  expect(viewerUnsafe).toEqual({ events:[], blocked:0, javascript:0 });
  await page.locator('#closeLiteratureViewerBtn').click();

  await page.locator('#visionTabBtn').click();
  await page.evaluate(() => renderVisionBoard());
  await expect(page.locator('#visionBoardGrid .vision-pin')).toHaveCount(6);
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#visionBoardGrid');

  await page.locator('#globalSearchBtn').click();
  await page.locator('#globalSearchInput').fill('__wormholesXssExecutions');
  await expect(page.locator('#globalSearchResults .global-search-result').first()).toBeVisible();
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#globalSearchResults');
  await page.locator('#closeGlobalSearchBtn').click();

  await page.evaluate(payload => {
    WormholesErrorReporter.report(payload, new Error(payload), {userMessage:payload});
  }, corpus[3]);
  await expect(page.locator('#appErrorPanel')).toHaveClass(/open/);
  await expect(page.locator('#appErrorPanel')).toContainText('window.__wormholesXssExecutions');
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#appErrorPanel');
  await page.locator('#appErrorDismissBtn').click();

  await page.locator('#archiveTabBtn').click();
  await page.locator('#connectionsBtn').click();
  await expect(page.locator('#connectionsScreen')).toHaveClass(/active/);
  await expect(page.locator('#connectionsMapWrap')).toBeVisible();
  await expectNoExecution(page);
  const mapUnsafe = await page.locator('#connectionsMapWrap').evaluate(root => ({
    script:root.querySelectorAll('script,iframe,object,embed').length,
    events:Array.from(root.querySelectorAll('*')).flatMap(el => el.getAttributeNames().filter(name => /^on/i.test(name)))
  }));
  expect(mapUnsafe).toEqual({script:0, events:[]});
});

test('a full app-data import with malicious-looking text remains inert after rendering', async ({ page }) => {
  await openCleanApp(page);
  await createUniverse(page, 'Existing Universe');

  const payload = corpus[4];
  const now = new Date().toISOString();
  const imported = {
    format:'Wormholes App Data Export',
    schemaVersion:4,
    appVersion:'Beta 197',
    exportedAt:now,
    currentUniverseId:'xss-universe',
    universes:[{
      id:'xss-universe',
      title:payload,
      summary:corpus[5],
      bridges:[],
      createdAt:now,
      diskFolderName:'xss-universe'
    }],
    bridgeNotes:{},
    universeData:{
      'xss-universe':{
        archive:[{
          id:'xss-entry',
          title:corpus[6],
          what:{val:corpus[7]},
          attr1:{val:corpus[8]},
          attr2:{val:corpus[9]},
          pressure:{val:corpus[10]},
          summary:corpus[11],
          notes:[corpus[12]],
          connections:[],
          bridges:[],
          createdAt:now,
          updatedAt:now
        }],
        connectionNotes:{},
        literature:[{
          id:'xss-doc',
          kind:'',
          title:corpus[13],
          content:corpus.filter(item => !/<a\b[^>]*href/i.test(item)).join('<p>safe separator</p>'),
          sourceName:'',
          fileType:'html',
          mimeType:'text/html',
          fileData:'',
          fileSize:500,
          convertedFrom:'',
          storage:'',
          folderFileName:'',
          contentStoreKey:'literature:xss-universe:xss-doc:content',
          contentStored:'',
          tags:{universes:[], entries:[]},
          createdAt:now,
          updatedAt:now
        }],
        vision:[{
          id:'xss-image',
          title:corpus[14],
          sourceName:`${corpus[15]}.png`,
          fileType:'image',
          mimeType:'image/png',
          thumbnailDataUrl:tinyPng,
          dataUrl:tinyPng,
          storage:'',
          folderFileName:'',
          dataStoreKey:'vision:xss-universe:xss-image:dataUrl',
          thumbnailStoreKey:'vision:xss-universe:xss-image:thumbnailDataUrl',
          dataStored:'',
          thumbnailStored:'',
          fileSize:100,
          tags:{universes:[], entries:[]},
          createdAt:now
        }]
      }
    }
  };

  await page.evaluate(() => {
    const originalConfirm = window.confirmAppDataImportOverwrite;
    window.confirmAppDataImportOverwrite = function(importData, options){
      window.__wormholesStagedLiteratureContent = importData?.universeData?.['xss-universe']?.literature?.[0]?.content || '';
      return originalConfirm(importData, options);
    };
  });

  await page.locator('#appDataImportInput').setInputFiles({
    name:'xss-regression-import.json',
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(imported))
  });
  await expect(page.locator('#appDataImportConfirmModal')).toHaveClass(/open/);
  const stagedContent = await page.evaluate(() => window.__wormholesStagedLiteratureContent || '');
  expect(stagedContent).not.toMatch(/<script|<iframe|<object|<embed|<svg|\son[a-z]+\s*=|javascript:/i);
  await page.locator('#cancelAppDataImportBtn').click();
  await expect(page.locator('#appDataImportConfirmModal')).not.toHaveClass(/open/);
  const importedSuccessfully = await page.evaluate(async data => {
    return await applyWormholesAppDataImport(data, {
      skipConfirmation:true,
      persistentSnapshot:false,
      offerUndo:false,
      capacityPreflight:false,
      suppressSuccessToast:true
    });
  }, imported);
  expect(importedSuccessfully).toBe(true);
  await page.evaluate(() => enterUniverse('xss-universe'));
  await expect(page.locator('#currentUniverseLabel')).toHaveText(payload);

  await page.locator('#archiveTabBtn').click();
  await page.evaluate(() => renderArchive());
  await expect(page.locator('#archiveList .entry-title-main')).toHaveText(corpus[6]);
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#archiveList');

  await page.locator('#literatureTabBtn').click();
  await page.evaluate(() => renderLiteratureList());
  await page.locator('#literatureList .entry-title').click();
  await expect(page.locator('#literatureViewerModal')).toHaveClass(/open/);
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#literatureViewerContent');

  await page.locator('#closeLiteratureViewerBtn').click();
  await page.locator('#visionTabBtn').click();
  await page.evaluate(() => renderVisionBoard());
  await expect(page.locator('#visionBoardGrid .vision-pin')).toHaveCount(1);
  await expectNoExecution(page);
  await expectNoDangerousDom(page, '#visionBoardGrid');
});

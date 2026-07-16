'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {test, expect} = require('@playwright/test');
const {openCleanApp} = require('../support/app');
const {openSelfContainedApp} = require('../support/self-contained-app');
const {generateDataset, SCENARIOS} = require('../performance/representative-datasets');
const {BROWSER_BUDGETS_MS, effectiveBudget, performanceMultiplier} = require('../performance/performance-budgets');

const enabled = process.env.WORMHOLES_RUN_BROWSER_PERF === '1';
const selfContained = process.env.WORMHOLES_PERF_SELF_CONTAINED === '1';
const allScenarios = ['small', 'medium', 'large-single', 'dense-map'];
const requestedScenarios = String(process.env.WORMHOLES_BROWSER_PERF_SCENARIOS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
const scenarios = requestedScenarios.length
  ? allScenarios.filter(scenario => requestedScenarios.includes(scenario))
  : allScenarios;
const metrics = ['importMs', 'archiveTabMs', 'literatureTabMs', 'visionTabMs', 'globalSearchOpenMs', 'globalSearchQueryMs', 'connectionsMapMs'];
const reportPath = path.resolve(
  __dirname,
  '..',
  process.env.WORMHOLES_BROWSER_PERF_REPORT || 'performance/results/browser-performance.json'
);
const browserReport = {
  format:'Wormholes Browser Performance Budget Report',
  version:1,
  appVersion:'Beta 248',
  generatedAt:'',
  environment:{
    node:process.version,
    platform:process.platform,
    arch:process.arch,
    cpuCount:os.cpus()?.length || 0,
    ci:process.env.CI === 'true'
  },
  project:'chromium-desktop',
  scenarios,
  workers:1,
  retries:0,
  budgetMultiplier:performanceMultiplier(),
  passed:false,
  results:[]
};

function round(value){
  return Math.round(Number(value) * 100) / 100;
}

function recordWithinBudget(result, metric, scenarioReport){
  const rawBudget = BROWSER_BUDGETS_MS[scenarioReport.scenario][metric];
  const budget = effectiveBudget(rawBudget);
  const comparison = {
    metric,
    measuredMs:round(result),
    budgetMs:budget,
    passed:Number.isFinite(result) && result <= budget
  };
  scenarioReport.measurements[metric] = comparison.measuredMs;
  scenarioReport.comparisons.push(comparison);
  expect(result, `${scenarioReport.scenario} ${metric} took ${result.toFixed(2)} ms; budget is ${budget} ms`).toBeLessThanOrEqual(budget);
}

function persistReport(){
  if(!enabled) return;
  browserReport.generatedAt = new Date().toISOString();
  browserReport.passed = browserReport.results.length === scenarios.length
    && browserReport.results.every(result => result.passed);
  fs.mkdirSync(path.dirname(reportPath), {recursive:true});
  fs.writeFileSync(reportPath, JSON.stringify(browserReport, null, 2));
}

async function openPerformanceApp(page){
  if(selfContained){
    await openSelfContainedApp(page, {inlineStyles:true});
    return;
  }
  await openCleanApp(page);
}

async function twoFrames(page){
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.describe('Wormholes browser performance budgets', () => {
  test.skip(!enabled, 'Set WORMHOLES_RUN_BROWSER_PERF=1 or use npm run perf:browser to run browser performance budgets.');
  test.describe.configure({mode:'serial'});

  test.afterAll(() => {
    persistReport();
  });

  for(const scenario of scenarios){
    test(`${scenario} remains within initial interaction budgets`, async ({page}, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop', 'Performance budgets are calibrated for the desktop Chromium project.');
      test.setTimeout(180000);
      const scenarioReport = {
        scenario,
        label:SCENARIOS[scenario].label,
        startedAt:new Date().toISOString(),
        completedAt:'',
        measurements:{},
        comparisons:[],
        passed:false
      };
      browserReport.results.push(scenarioReport);

      try{
        await openPerformanceApp(page);
        const dataset = generateDataset(scenario);

        const importMs = await page.evaluate(async data => {
          const started = performance.now();
          const imported = await applyWormholesAppDataImport(data, {
            skipConfirmation:true,
            persistentSnapshot:false,
            offerUndo:false,
            capacityPreflight:false,
            suppressSuccessToast:true
          });
          if(!imported) throw new Error('Representative dataset import failed.');
          return performance.now() - started;
        }, dataset);
        recordWithinBudget(importMs, 'importMs', scenarioReport);

        await page.evaluate(() => enterUniverse(currentUniverseId));
        await twoFrames(page);

        const archiveTabMs = await page.evaluate(async () => {
          const started = performance.now();
          switchTab('archive', {skipLiteratureEditorClose:true});
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - started;
        });
        recordWithinBudget(archiveTabMs, 'archiveTabMs', scenarioReport);
        await expect(page.locator('#archiveTab')).toHaveClass(/active/);

        const literatureTabMs = await page.evaluate(async () => {
          const started = performance.now();
          switchTab('literature', {skipLiteratureEditorClose:true});
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - started;
        });
        recordWithinBudget(literatureTabMs, 'literatureTabMs', scenarioReport);
        await expect(page.locator('#literatureTab')).toHaveClass(/active/);

        const visionTabMs = await page.evaluate(async () => {
          const started = performance.now();
          switchTab('vision', {skipLiteratureEditorClose:true});
          await renderVisionBoard();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - started;
        });
        recordWithinBudget(visionTabMs, 'visionTabMs', scenarioReport);
        await expect(page.locator('#visionTab')).toHaveClass(/active/);

        const globalSearchOpenMs = await page.evaluate(async () => {
          const started = performance.now();
          WormholesGlobalSearch.open();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - started;
        });
        recordWithinBudget(globalSearchOpenMs, 'globalSearchOpenMs', scenarioReport);
        await expect(page.locator('#globalSearchModal')).toHaveClass(/open/);

        const globalSearchQueryMs = await page.evaluate(async () => {
          const input = document.getElementById('globalSearchInput');
          const started = performance.now();
          input.value = 'amber';
          input.dispatchEvent(new Event('input', {bubbles:true}));
          await new Promise(resolve => setTimeout(resolve, 150));
          await new Promise(resolve => requestAnimationFrame(resolve));
          return performance.now() - started;
        });
        recordWithinBudget(globalSearchQueryMs, 'globalSearchQueryMs', scenarioReport);
        await page.evaluate(() => WormholesGlobalSearch.close());

        await page.evaluate(() => switchTab('archive', {skipLiteratureEditorClose:true}));
        const connectionsMapMs = await page.evaluate(async () => {
          const started = performance.now();
          document.getElementById('connectionsBtn').click();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - started;
        });
        recordWithinBudget(connectionsMapMs, 'connectionsMapMs', scenarioReport);
        await expect(page.locator('#connectionsScreen')).toHaveClass(/active/);
      } finally {
        scenarioReport.completedAt = new Date().toISOString();
        scenarioReport.passed = scenarioReport.comparisons.length === metrics.length
          && scenarioReport.comparisons.every(comparison => comparison.passed);
        await testInfo.attach(`${scenario}-performance.json`, {
          body:Buffer.from(JSON.stringify(scenarioReport, null, 2)),
          contentType:'application/json'
        });
        persistReport();
      }
    });
  }
});

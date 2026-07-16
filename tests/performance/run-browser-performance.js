#!/usr/bin/env node
'use strict';

const path = require('path');
const {spawnSync} = require('child_process');

const testsRoot = path.resolve(__dirname, '..');
const reportPath = path.resolve(
  testsRoot,
  process.env.WORMHOLES_BROWSER_PERF_REPORT || 'performance/results/browser-performance.json'
);
const cliArgs = process.argv.slice(2);
const ciMode = cliArgs.includes('--ci');
const selfContainedMode = cliArgs.includes('--self-contained');

try{
  const cli = require.resolve('@playwright/test/cli');
  const result = spawnSync(process.execPath, [
    cli,
    'test',
    '-c',
    'playwright.config.js',
    'e2e/performance-budgets.spec.js',
    '--project=chromium-desktop',
    '--workers=1',
    '--retries=0'
  ], {
    cwd:testsRoot,
    env:{
      ...process.env,
      ...(ciMode ? {CI:'true'} : {}),
      WORMHOLES_RUN_BROWSER_PERF:'1',
      ...(selfContainedMode ? {WORMHOLES_PERF_SELF_CONTAINED:'1'} : {}),
      ...(ciMode ? {WORMHOLES_BROWSER_PERF_SCENARIOS:'small,medium'} : {}),
      WORMHOLES_BROWSER_PERF_REPORT:reportPath
    },
    stdio:'inherit'
  });
  process.exitCode = result.status ?? 1;
} catch(error){
  console.error('Browser performance tests require the locked test dependencies and Chromium. Run npm ci and npx playwright install chromium first.');
  console.error(error?.message || error);
  process.exitCode = 1;
}

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const ci = args.has('--ci');
const env = {...process.env, WORMHOLES_RUN_SOAK:'1'};

if(!env.WORMHOLES_SOAK_CYCLES){
  env.WORMHOLES_SOAK_CYCLES = quick ? '24' : (ci ? '240' : '120');
}
if(!env.WORMHOLES_SOAK_DURATION_MS){
  env.WORMHOLES_SOAK_DURATION_MS = quick ? '0' : (ci ? '300000' : '60000');
}
if(!env.WORMHOLES_SOAK_MAX_CYCLES){
  env.WORMHOLES_SOAK_MAX_CYCLES = ci ? '1200' : '600';
}
if(!env.WORMHOLES_SOAK_MAX_HEAP_GROWTH_MB){
  env.WORMHOLES_SOAK_MAX_HEAP_GROWTH_MB = '96';
}

const cli = path.resolve(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js');
const result = spawnSync(process.execPath, [
  cli,
  'test',
  '-c',
  'playwright.soak.config.js',
  'e2e/long-session-soak-self-contained.spec.js',
  '--project=chromium-soak',
  '--workers=1'
], {
  cwd:path.resolve(__dirname, '..'),
  env,
  stdio:'inherit'
});

process.exit(result.status == null ? 1 : result.status);

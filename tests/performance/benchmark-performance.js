#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {performance} = require('perf_hooks');
const {
  SCENARIOS,
  generateDataset,
  summarizeDataset,
  assertDatasetIntegrity
} = require('./representative-datasets');
const {
  NODE_BUDGETS_MS,
  performanceMultiplier,
  compareMeasurements
} = require('./performance-budgets');

const root = path.resolve(__dirname, '..', '..');
const SEARCH_QUERIES = Object.freeze([
  'amber', 'archive', 'city', 'secret', 'alliance',
  'section', 'universe', 'hidden', 'gate', 'collection'
]);

function parseArgs(argv){
  const args = {scenarios:[], all:false, check:false, json:false, output:'', iterations:3, help:false};
  for(let index = 0; index < argv.length; index += 1){
    const arg = argv[index];
    if(arg === '--scenario') args.scenarios.push(argv[++index]);
    else if(arg === '--all') args.all = true;
    else if(arg === '--check') args.check = true;
    else if(arg === '--json') args.json = true;
    else if(arg === '--output') args.output = argv[++index] || '';
    else if(arg === '--iterations') args.iterations = Math.max(1, Number.parseInt(argv[++index], 10) || 1);
    else if(arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return args;
}

function usage(){
  console.log(`Wormholes performance benchmark\n\n` +
    `Usage:\n` +
    `  node performance/benchmark-performance.js --all\n` +
    `  node performance/benchmark-performance.js --all --check\n` +
    `  node performance/benchmark-performance.js --scenario large-multi --iterations 5\n` +
    `  node performance/benchmark-performance.js --all --json --output performance/latest-results.json\n\n` +
    `Options:\n` +
    `  --scenario NAME       Benchmark one scenario (repeatable)\n` +
    `  --all                 Benchmark every representative scenario\n` +
    `  --iterations NUMBER   Median measurement count (default: 3)\n` +
    `  --check               Exit nonzero when a budget is exceeded\n` +
    `  --json                Print JSON instead of the human report\n` +
    `  --output FILE         Also write the JSON report to a file\n` +
    `\nOptional environment variable:\n` +
    `  WORMHOLES_PERF_MULTIPLIER=1.5  Scale budgets for a known slower runner\n`);
}

function nowMs(){ return performance.now(); }
function measured(operation){
  const started = nowMs();
  const value = operation();
  return {value, elapsedMs:nowMs() - started};
}
function median(values){
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function round(value){ return Math.round(Number(value) * 100) / 100; }

function loadGlobalSearchApi(dataset){
  const currentUniverseId = dataset.currentUniverseId;
  const context = {
    console,
    Object, Array, Map, Set, Math, Number, String, Promise, Date,
    setTimeout(){ return 1; },
    clearTimeout(){},
    universes:dataset.universes,
    currentUniverseId,
    archiveEntries:dataset.universeData[currentUniverseId]?.archive || [],
    literatureEntries:dataset.universeData[currentUniverseId]?.literature || [],
    visionEntries:dataset.universeData[currentUniverseId]?.vision || [],
    connectionNotes:dataset.universeData[currentUniverseId]?.connectionNotes || {},
    bridgeNotes:dataset.bridgeNotes || {},
    readArchiveForUniverse(id){ return dataset.universeData[id]?.archive || []; },
    readLiteratureForUniverse(id){ return dataset.universeData[id]?.literature || []; },
    readVisionBoardForUniverse(id){ return dataset.universeData[id]?.vision || []; },
    readConnectionNotesForUniverse(id){ return dataset.universeData[id]?.connectionNotes || {}; },
    normalizeBridges(value){ return Array.isArray(value) ? value : []; },
    isGroupEntry(entry){ return entry?.kind === 'group'; },
    isLiteratureGroup(entry){ return entry?.kind === 'literatureGroup'; },
    literaturePlainPreview(value){ return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); },
    document:{
      readyState:'loading',
      addEventListener(){},
      getElementById(){ return null; },
      querySelector(){ return null; }
    },
    window:null,
    globalThis:null
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-search-index.js'), 'utf8'), context, {filename:'scripts/wormholes-search-index.js'});
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'global-search.js'), 'utf8'), context, {filename:'scripts/global-search.js'});
  return {searchIndex:context.WormholesSearchIndex, globalSearch:context.WormholesGlobalSearch};
}

let paginationApiCache = null;
function paginationApi(){
  if(paginationApiCache) return paginationApiCache;
  const context = {Object, Array, Math, Number, String, window:null, globalThis:null};
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'scripts', 'wormholes-pagination.js'), 'utf8'), context, {filename:'scripts/wormholes-pagination.js'});
  paginationApiCache = context.WormholesPagination;
  return paginationApiCache;
}

function oneIteration(name){
  const generation = measured(() => generateDataset(name));
  const dataset = generation.value;
  const serialized = measured(() => JSON.stringify(dataset));
  const parsed = measured(() => JSON.parse(serialized.value));
  const summary = measured(() => summarizeDataset(dataset));
  const integrity = measured(() => assertDatasetIntegrity(dataset));
  const searchApis = loadGlobalSearchApi(dataset);
  const searchIndex = measured(() => searchApis.searchIndex.createIndex(searchApis.searchIndex.buildRecords(), 'performance benchmark'));
  const searchQueries = measured(() => {
    for(const query of SEARCH_QUERIES){
      searchApis.searchIndex.searchIndex(searchIndex.value, query, 'all', {currentUniverseId:dataset.currentUniverseId, maxResults:60});
    }
  });
  const archive = dataset.universeData[dataset.currentUniverseId]?.archive || [];
  const pagination = measured(() => {
    const api = paginationApi();
    for(let index = 0; index < 200; index += 1){
      api.paginateRows(archive, 50, (index % 20) + 1);
    }
  });

  return {
    generateMs:generation.elapsedMs,
    stringifyMs:serialized.elapsedMs,
    parseMs:parsed.elapsedMs,
    summarizeMs:summary.elapsedMs,
    integrityMs:integrity.elapsedMs,
    searchIndexMs:searchIndex.elapsedMs,
    searchQueriesMs:searchQueries.elapsedMs,
    paginationMs:pagination.elapsedMs,
    jsonBytes:Buffer.byteLength(serialized.value),
    searchRows:searchIndex.value.records.length,
    summary:summary.value,
    parsedUniverseCount:parsed.value.universes?.length || 0,
    integrityPassed:integrity.value === true
  };
}

function benchmarkScenario(name, options = {}){
  if(!SCENARIOS[name]) throw new Error(`Unknown scenario: ${name}`);
  const iterations = Math.max(1, Number.parseInt(options.iterations, 10) || 1);
  const samples = [];
  for(let index = 0; index < iterations; index += 1){
    if(global.gc) global.gc();
    samples.push(oneIteration(name));
  }
  const metricNames = Object.keys(NODE_BUDGETS_MS[name]);
  const measurements = {};
  metricNames.forEach(metric => {
    measurements[metric] = round(median(samples.map(sample => sample[metric])));
  });
  const representative = samples[Math.floor(samples.length / 2)];
  const comparisons = compareMeasurements(name, measurements);
  return {
    scenario:name,
    label:SCENARIOS[name].label,
    iterations,
    measurements,
    budgetMultiplier:performanceMultiplier(),
    comparisons,
    passed:comparisons.every(result => result.passed),
    jsonBytes:representative.jsonBytes,
    searchRows:representative.searchRows,
    summary:representative.summary
  };
}

function formatMs(value){ return `${Number(value).toFixed(2)} ms`; }
function printHumanReport(report){
  console.log(`Wormholes performance budgets · ${report.generatedAt}`);
  console.log(`Node ${report.environment.node} · ${report.environment.platform}/${report.environment.arch} · budget multiplier ${report.budgetMultiplier}x`);
  report.results.forEach(result => {
    console.log(`\n${result.scenario} — ${result.label}`);
    result.comparisons.forEach(comparison => {
      const status = comparison.passed ? 'PASS' : 'FAIL';
      console.log(`  ${status.padEnd(4)} ${comparison.label.padEnd(34)} ${formatMs(comparison.measuredMs).padStart(11)} / ${formatMs(comparison.budgetMs)}`);
    });
    console.log(`       ${(result.jsonBytes / 1048576).toFixed(2)} MB JSON · ${result.searchRows.toLocaleString()} search rows`);
  });
  console.log(`\n${report.passed ? 'PASS' : 'FAIL'} — ${report.results.filter(result => result.passed).length}/${report.results.length} scenarios stayed within budget.`);
}

function buildReport(names, iterations){
  const results = names.map(name => benchmarkScenario(name, {iterations}));
  return {
    format:'Wormholes Performance Budget Report',
    version:1,
    appVersion:'Beta 248',
    generatedAt:new Date().toISOString(),
    environment:{
      node:process.version,
      platform:process.platform,
      arch:process.arch,
      cpuCount:require('os').cpus()?.length || 0
    },
    budgetMultiplier:performanceMultiplier(),
    iterations,
    passed:results.every(result => result.passed),
    results
  };
}

function main(){
  const args = parseArgs(process.argv.slice(2));
  if(args.help){ usage(); return; }
  const names = args.all ? Object.keys(SCENARIOS) : args.scenarios.filter(Boolean);
  if(!names.length){ usage(); process.exitCode = 1; return; }
  names.forEach(name => {
    if(!SCENARIOS[name]) throw new Error(`Unknown scenario: ${name}`);
  });
  const report = buildReport(names, args.iterations);
  if(args.json) console.log(JSON.stringify(report, null, 2));
  else printHumanReport(report);
  if(args.output){
    const outputPath = path.resolve(process.cwd(), args.output);
    fs.mkdirSync(path.dirname(outputPath), {recursive:true});
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    if(!args.json) console.log(`Wrote JSON report to ${outputPath}`);
  }
  if(args.check && !report.passed) process.exitCode = 1;
}

if(require.main === module){
  try{ main(); }
  catch(error){
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
}

module.exports = {
  SEARCH_QUERIES,
  median,
  benchmarkScenario,
  buildReport
};

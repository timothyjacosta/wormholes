'use strict';

/*
 * Initial Wormholes performance budgets.
 *
 * These are intentionally generous release guards, not optimization targets.
 * They were established from Beta 197 measurements of the deterministic
 * representative datasets and leave room for ordinary hardware variation.
 * Tighten them only after measuring a stable faster baseline.
 */

const METRIC_LABELS = Object.freeze({
  generateMs:'Generate dataset',
  stringifyMs:'Serialize app data',
  parseMs:'Parse app data',
  summarizeMs:'Summarize app data',
  integrityMs:'Validate references',
  searchIndexMs:'Build Global Search index',
  searchQueriesMs:'Run 10 Global Search queries',
  paginationMs:'Run 200 pagination operations'
});

const NODE_BUDGETS_MS = Object.freeze({
  small:Object.freeze({
    generateMs:150,
    stringifyMs:150,
    parseMs:100,
    summarizeMs:100,
    integrityMs:100,
    searchIndexMs:500,
    searchQueriesMs:250,
    paginationMs:100
  }),
  medium:Object.freeze({
    generateMs:500,
    stringifyMs:500,
    parseMs:300,
    summarizeMs:300,
    integrityMs:250,
    searchIndexMs:2000,
    searchQueriesMs:500,
    paginationMs:100
  }),
  'large-single':Object.freeze({
    generateMs:700,
    stringifyMs:700,
    parseMs:400,
    summarizeMs:350,
    integrityMs:400,
    searchIndexMs:3000,
    searchQueriesMs:700,
    paginationMs:100
  }),
  'large-multi':Object.freeze({
    generateMs:2000,
    stringifyMs:2000,
    parseMs:1000,
    summarizeMs:800,
    integrityMs:800,
    searchIndexMs:7000,
    searchQueriesMs:1500,
    paginationMs:100
  }),
  'dense-map':Object.freeze({
    generateMs:2500,
    stringifyMs:1200,
    parseMs:700,
    summarizeMs:1500,
    integrityMs:800,
    searchIndexMs:5000,
    searchQueriesMs:1200,
    paginationMs:100
  }),
  'near-limit':Object.freeze({
    generateMs:7000,
    stringifyMs:5000,
    parseMs:3500,
    summarizeMs:3000,
    integrityMs:2000,
    searchIndexMs:20000,
    searchQueriesMs:4000,
    paginationMs:150
  })
});

/*
 * Browser budgets are exercised by the opt-in Playwright performance suite.
 * They use larger margins because rendering and IndexedDB timing vary more
 * across operating systems and CI hosts than the portable Node benchmarks.
 */
const BROWSER_BUDGETS_MS = Object.freeze({
  small:Object.freeze({
    importMs:3000,
    archiveTabMs:750,
    literatureTabMs:750,
    visionTabMs:1000,
    globalSearchOpenMs:1000,
    globalSearchQueryMs:500,
    connectionsMapMs:2500
  }),
  medium:Object.freeze({
    importMs:6000,
    archiveTabMs:1500,
    literatureTabMs:1500,
    visionTabMs:2000,
    globalSearchOpenMs:2500,
    globalSearchQueryMs:750,
    connectionsMapMs:25000
  }),
  'large-single':Object.freeze({
    importMs:10000,
    archiveTabMs:3000,
    literatureTabMs:3000,
    visionTabMs:4000,
    globalSearchOpenMs:5000,
    globalSearchQueryMs:1500,
    connectionsMapMs:9000
  }),
  'dense-map':Object.freeze({
    importMs:12000,
    archiveTabMs:3000,
    literatureTabMs:2000,
    visionTabMs:2500,
    globalSearchOpenMs:6000,
    globalSearchQueryMs:2000,
    connectionsMapMs:12000
  })
});

function performanceMultiplier(value = process.env.WORMHOLES_PERF_MULTIPLIER){
  const parsed = Number(value || 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function effectiveBudget(value, multiplier = performanceMultiplier()){
  return Math.ceil(Number(value || 0) * multiplier);
}

function compareMeasurements(scenario, measurements, budgets = NODE_BUDGETS_MS, multiplier = performanceMultiplier()){
  const scenarioBudgets = budgets[scenario];
  if(!scenarioBudgets) throw new Error(`No performance budget is defined for scenario: ${scenario}`);
  return Object.entries(scenarioBudgets).map(([metric, rawBudget]) => {
    const measured = Number(measurements?.[metric]);
    const budget = effectiveBudget(rawBudget, multiplier);
    return {
      metric,
      label:METRIC_LABELS[metric] || metric,
      measuredMs:measured,
      budgetMs:budget,
      passed:Number.isFinite(measured) && measured <= budget
    };
  });
}

module.exports = {
  METRIC_LABELS,
  NODE_BUDGETS_MS,
  BROWSER_BUDGETS_MS,
  performanceMultiplier,
  effectiveBudget,
  compareMeasurements
};

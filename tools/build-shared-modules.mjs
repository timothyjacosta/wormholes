#!/usr/bin/env node
/* Generates classic-script adapters from canonical ES modules.
   Wormholes keeps these adapters so the downloadable app still works when opened directly from file://,
   where browser module loading is not consistently available. */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const targets = [
  {
    module:'scripts/modules/schema-versions.mjs',
    legacy:'scripts/wormholes-schema-versions.js',
    wrapperStart:'(function(){\n  "use strict";\n',
    wrapperEnd:'\n  window.WormholesSchemaVersions = api;\n})();\n'
  },
  {
    module:'scripts/modules/generation-versioning.mjs',
    legacy:'scripts/wormholes-generation-versioning.js',
    wrapperStart:'(function(global){\n  "use strict";\n',
    wrapperEnd:'\n  global.WormholesGenerationVersioning = api;\n})(window);\n'
  },
  {
    module:'scripts/modules/map-dom-budget.mjs',
    legacy:'scripts/wormholes-map-dom-budget.js',
    wrapperStart:'(function(global){\n  "use strict";\n',
    wrapperEnd:'\n  global.createMapDomProfile = createMapDomProfile;\n  global.mapDomProfileAttributes = mapDomProfileAttributes;\n})(typeof window !== "undefined" ? window : globalThis);\n'
  }
];

const installModuleTargets = [
  ['scripts/modules/app-model.mjs', 'scripts/wormholes-app-model.js'],
  ['scripts/modules/canonical-persistence.mjs', 'scripts/wormholes-canonical-persistence.js'],
  ['scripts/modules/render-coordinator.mjs', 'scripts/wormholes-render-coordinator.js'],
  ['scripts/modules/persistence-repositories.mjs', 'scripts/wormholes-repositories.js'],
  ['scripts/modules/transactional-persistence.mjs', 'scripts/wormholes-transactional-persistence.js'],
  ['scripts/modules/safe-render.mjs', 'scripts/wormholes-safe-render.js'],
  ['scripts/modules/app-errors.mjs', 'scripts/wormholes-app-errors.js'],
  ['scripts/modules/url-safety.mjs', 'scripts/wormholes-url-safety.js'],
  ['scripts/modules/recent-roll-history.mjs', 'scripts/wormholes-recent-roll-history.js'],
  ['scripts/modules/storage-capacity.mjs', 'scripts/wormholes-storage-capacity.js'],
  ['scripts/modules/file-limits.mjs', 'scripts/wormholes-file-limits.js'],
  ['scripts/modules/media-limits.mjs', 'scripts/wormholes-media-limits.js'],
  ['scripts/modules/content-limits.mjs', 'scripts/wormholes-content-limits.js'],
  ['scripts/modules/entity-limits.mjs', 'scripts/wormholes-entity-limits.js'],
  ['scripts/modules/id-integrity.mjs', 'scripts/wormholes-id-integrity.js'],
  ['scripts/modules/reference-integrity.mjs', 'scripts/wormholes-reference-integrity.js'],
  ['scripts/modules/render-validation.mjs', 'scripts/wormholes-render-validation.js'],
  ['scripts/modules/pagination.mjs', 'scripts/wormholes-pagination.js'],
  ['scripts/modules/density.mjs', 'scripts/wormholes-density.js'],
  ['scripts/modules/manual-drafts.mjs', 'scripts/wormholes-manual-drafts.js'],
  ['scripts/modules/map-clustering.mjs', 'scripts/wormholes-map-clustering.js'],
  ['scripts/modules/map-lazy-render.mjs', 'scripts/wormholes-map-lazy-render.js']
].map(([module, legacy]) => ({
  module,
  legacy,
  wrapperStart:'(function(){\n  "use strict";\n',
  wrapperEnd:'\n})();\n'
}));

targets.push(...installModuleTargets);

const explicitModuleTargets = [
  ['scripts/modules/controller-service-registry.mjs', 'scripts/wormholes-controller-services.js'],
  ['scripts/modules/tagging-helpers.mjs', 'scripts/wormholes-tagging-helpers.js'],
  ['scripts/modules/map-presentation-helpers.mjs', 'scripts/wormholes-map-presentation-helpers.js'],
  ['scripts/modules/app-data-validation.mjs', 'scripts/wormholes-app-data-validation.js'],
  ['scripts/modules/theme-decks.mjs', 'scripts/wormholes-theme-decks.js'],
  ['scripts/modules/document-zip-helpers.mjs', 'scripts/wormholes-document-zip-helpers.js'],
  ['scripts/modules/app-workflow-orchestration.mjs', 'scripts/wormholes-app-workflow.js'],
  ['scripts/modules/map-inspector-orchestration.mjs', 'scripts/wormholes-map-inspector.js'],
  ['scripts/modules/activity-log.mjs', 'scripts/wormholes-activity-log.js'],
  ['scripts/modules/support-bundle.mjs', 'scripts/wormholes-support-report.js'],
  ['scripts/modules/duplicate-creations.mjs', 'scripts/wormholes-duplicate-creations.js'],
  ['scripts/modules/storage-facade.mjs', 'scripts/storage.js'],
  ['scripts/modules/recovery-snapshots.mjs', 'scripts/wormholes-snapshots.js'],
  ['scripts/modules/storage-dashboard.mjs', 'scripts/wormholes-storage-dashboard.js'],
  ['scripts/modules/write-ahead-journal.mjs', 'scripts/wormholes-write-ahead-journal.js'],
  ['scripts/modules/storage-recovery.mjs', 'scripts/wormholes-storage-recovery.js'],
  ['scripts/modules/indexeddb-recovery.mjs', 'scripts/wormholes-indexeddb-recovery.js'],
  ['scripts/modules/app-core.mjs', 'scripts/wormholes-app.js'],
  ['scripts/modules/app-state-domain.mjs', 'scripts/wormholes-app-state-domain.js'],
  ['scripts/modules/app-state-storage.mjs', 'scripts/wormholes-app-state-storage.js'],
  ['scripts/modules/app-state-ui.mjs', 'scripts/wormholes-app-state-ui.js'],
  ['scripts/modules/app-state-map.mjs', 'scripts/wormholes-app-state-map.js'],
  ['scripts/modules/shell-interface.mjs', 'scripts/wormholes-shell-interface.js']
].map(([module, legacy]) => ({module, legacy}));

const rawControllerFallbackModules = Object.freeze({
  "scripts/modules/archive-controller.mjs": [
    ["scripts/modules/archive-view-helpers.mjs", "WormholesArchiveViewHelpers", "installLegacyArchiveViewHelpersBindings"],
    ["scripts/modules/archive-integrity-helpers.mjs", "WormholesArchiveIntegrityHelpers", "installLegacyArchiveIntegrityHelpersBindings"],
  ],
  "scripts/modules/literature-controller.mjs": [
    ["scripts/modules/literature-view-helpers.mjs", "WormholesLiteratureViewHelpers", "installLegacyLiteratureViewHelpersBindings"],
    ["scripts/modules/literature-group-helpers.mjs", "WormholesLiteratureGroupHelpers", "installLegacyLiteratureGroupHelpersBindings"],
    ["scripts/modules/literature-content-helpers.mjs", "WormholesLiteratureContentHelpers", "installLegacyLiteratureContentHelpersBindings"],
    ["scripts/modules/literature-persistence-helpers.mjs", "WormholesLiteraturePersistenceHelpers", "installLegacyLiteraturePersistenceHelpersBindings"],
  ],
  "scripts/modules/vision-board-controller.mjs": [
    ["scripts/modules/vision-board-view-helpers.mjs", "WormholesVisionBoardViewHelpers", "installLegacyVisionBoardViewHelpersBindings"],
    ["scripts/modules/vision-image-helpers.mjs", "WormholesVisionImageHelpers", "installLegacyVisionImageHelpersBindings"],
  ],
  "scripts/modules/data-portability-controller.mjs": [
    ["scripts/modules/data-portability-backup-helpers.mjs", "WormholesDataPortabilityBackupHelpers", "installLegacyDataPortabilityBackupHelpersBindings"],
    ["scripts/modules/data-portability-transaction-helpers.mjs", "WormholesDataPortabilityTransactionHelpers", "installLegacyDataPortabilityTransactionHelpersBindings"],
    ["scripts/modules/theme-deck-portability.mjs", "WormholesThemeDeckPortability", "installLegacyThemeDeckPortabilityBindings"],
    ["scripts/modules/data-portability-storage-helpers.mjs", "WormholesDataPortabilityStorageHelpers", "installLegacyDataPortabilityStorageHelpersBindings"],
  ],
});

const rawClassicTargets = [
  ['scripts/modules/archive-controller.mjs', 'scripts/archive.js'],
  ['scripts/modules/literature-controller.mjs', 'scripts/literature.js'],
  ['scripts/modules/vision-board-controller.mjs', 'scripts/vision-board.js'],
  ['scripts/modules/universe-controller.mjs', 'scripts/universes.js'],
  ['scripts/modules/connections-controller.mjs', 'scripts/connections.js'],
  ['scripts/modules/bridges-controller.mjs', 'scripts/bridges.js'],
  ['scripts/modules/connections-map-controller.mjs', 'scripts/connections-map.js'],
  ['scripts/modules/bridges-map-controller.mjs', 'scripts/bridges-map.js'],
  ['scripts/modules/data-portability-controller.mjs', 'scripts/export-import.js'],
  ['scripts/modules/settings-controller.mjs', 'scripts/modals-settings.js'],
  ['scripts/modules/generation-controller.mjs', 'scripts/generation.js'],
  ['scripts/modules/folder-storage-controller.mjs', 'scripts/folder-storage.js'],
  ['scripts/modules/bootstrap.mjs', 'scripts/bootstrap.js'],
  ['scripts/modules/global-search.mjs', 'scripts/global-search.js'],
  ['scripts/modules/single-tab.mjs', 'scripts/single-tab.js'],
  ['scripts/modules/accessibility.mjs', 'scripts/wormholes-accessibility.js'],
  ['scripts/modules/backup-status.mjs', 'scripts/wormholes-backup-status.js'],
  ['scripts/modules/copy-to-universe.mjs', 'scripts/wormholes-copy-to-universe.js'],
  ['scripts/modules/dialog-keyboard.mjs', 'scripts/wormholes-dialog-keyboard.js'],
  ['scripts/modules/dialogs.mjs', 'scripts/wormholes-dialogs.js'],
  ['scripts/modules/error-reporting.mjs', 'scripts/wormholes-error-reporting.js'],
  ['scripts/modules/escape-policy.mjs', 'scripts/wormholes-escape.js'],
  ['scripts/modules/focus.mjs', 'scripts/wormholes-focus.js'],
  ['scripts/modules/large-data-store.mjs', 'scripts/wormholes-large-data-store.js'],
  ['scripts/modules/map-search.mjs', 'scripts/wormholes-map-search.js'],
  ['scripts/modules/onboarding.mjs', 'scripts/onboarding.js'],
  ['scripts/modules/persisted-schema.mjs', 'scripts/wormholes-persisted-schema.js'],
  ['scripts/modules/search-index.mjs', 'scripts/wormholes-search-index.js'],
  ['scripts/modules/startup-coordinator.mjs', 'scripts/wormholes-startup.js'],
  ['scripts/modules/undo.mjs', 'scripts/wormholes-undo.js'],
].map(([module, legacy]) => ({
  module,
  legacy,
  fallbackModules: rawControllerFallbackModules[module] || [],
}));


function transpileModule(source, modulePath){
  let body = source
    .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
    .replace(/(^|\n)\s*import\s+["'][^"']+["'];?\s*(?=\n|$)/g, '$1')
    .replace(/(^|\n)\s*import\s+[\s\S]*?\s+from\s+["'][^"']+["'];?\s*(?=\n|$)/g, '$1')
    .replace(/^export\s+default\s+api;?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  if(/^\s*import\s/m.test(body)){
    throw new Error(`${modulePath} contains an import form the classic adapter generator does not understand.`);
  }
  return body.trim();
}

let failed = false;
for(const target of targets){
  const modulePath = path.join(root, target.module);
  const legacyPath = path.join(root, target.legacy);
  const source = fs.readFileSync(modulePath, 'utf8');
  const generated = `/* GENERATED from ${target.module}. Do not edit this compatibility adapter directly. */\n${target.wrapperStart}${transpileModule(source, target.module).split('\n').map(line => `  ${line}`).join('\n')}${target.wrapperEnd}`;
  if(checkOnly){
    const existing = fs.existsSync(legacyPath) ? fs.readFileSync(legacyPath, 'utf8') : '';
    if(existing !== generated){
      console.error(`Out-of-date generated adapter: ${target.legacy}`);
      failed = true;
    }
  } else {
    fs.writeFileSync(legacyPath, generated);
    console.log(`Generated ${target.legacy}`);
  }
}


function transpileExplicitModuleForClassic(source, modulePath){
  let body = source;
  // Direct-file adapters share the classic global environment. Canonical modules
  // may use explicit imports, which are removed only for the generated adapter.
  body = body.replace(/(^|\n)\s*import\s+["'][^"']+["'];?\s*(?=\n|$)/g, '$1');
  body = body.replace(/(^|\n)\s*import\s+[\s\S]*?\s+from\s+["'][^"']+["'];?\s*(?=\n|$)/g, '$1');
  body = body.replace(/^\s*export\s+default\s+[^;]+;?\s*$/gm, '');
  body = body.replace(/^\s*export\s*\{[\s\S]*?\};?\s*$/gm, '');
  body = body.replace(/(^|\n)(\s*)export\s+(?=(?:async\s+)?function\b|class\b|const\b|let\b|var\b)/g, '$1$2');
  if(/(^|\n)\s*import\s/m.test(body)){
    throw new Error(`${modulePath} contains an import form the classic adapter generator does not understand.`);
  }
  if(/(^|\n)\s*export\s/m.test(body)){
    throw new Error(`${modulePath} contains unsupported export syntax for a direct-file adapter.`);
  }
  return body.trimEnd() + '\n';
}

for(const target of explicitModuleTargets){
  const modulePath = path.join(root, target.module);
  const legacyPath = path.join(root, target.legacy);
  const source = fs.readFileSync(modulePath, 'utf8');
  const generated = `/* GENERATED from ${target.module}. Do not edit this direct-file compatibility adapter. */\n${transpileExplicitModuleForClassic(source, target.module)}`;
  if(checkOnly){
    const existing = fs.existsSync(legacyPath) ? fs.readFileSync(legacyPath, 'utf8') : '';
    if(existing !== generated){
      console.error(`Out-of-date generated adapter: ${target.legacy}`);
      failed = true;
    }
  } else {
    fs.writeFileSync(legacyPath, generated);
    console.log(`Generated ${target.legacy}`);
  }
}

function transpileRawControllerModule(source, modulePath){
  let body = source
    .replace(/(^|\n)\s*import\s+["'][^"']+["'];?\s*(?=\n|$)/g, '$1')
    .replace(/(^|\n)\s*import\s+[\s\S]*?\s+from\s+["'][^"']+["'];?\s*(?=\n|$)/g, '$1')
    .replace(/\n\s*export\s*\{[\s\S]*?\};\s*$/m, '\n')
    .replace(/\n\s*\/\* ES-module source marker; runtime API remains the existing window namespace\. \*\/\s*$/m, '\n')
    // Isolated legacy unit tests execute one generated controller at a time.
    // Fall back to the classic global surface when the registry adapter is not
    // present, while full direct-file builds use the installed registry.
    .replace(/\bcontrollerServices\s*\./g, '(globalThis.controllerServices || globalThis).')
    .replace(/\bregisterControllerServices\s*\(/g, '(globalThis.registerControllerServices || (() => {}))(');
  if(/^\s*import\s/m.test(body)){
    throw new Error(`${modulePath} contains an import form the raw direct-file adapter generator does not understand.`);
  }
  if(/(^|\n)\s*export\s/m.test(body)){
    throw new Error(`${modulePath} contains unsupported export syntax outside the public controller surface.`);
  }
  return body.trimEnd() + '\n';
}

function rawControllerFallbackSource(target){
  return (target.fallbackModules || []).map(([module]) => {
    const modulePath = path.join(root, module);
    const source = fs.readFileSync(modulePath, "utf8");
    const body = transpileExplicitModuleForClassic(source, module)
      .replace(/\bcontrollerServices\s*\./g, "(globalThis.controllerServices || globalThis).");
    return `/* EMBEDDED from ${module} for direct-file compatibility. */\n${body}`;
  }).join("\n");
}

for(const target of rawClassicTargets){
  const modulePath = path.join(root, target.module);
  const legacyPath = path.join(root, target.legacy);
  const source = fs.readFileSync(modulePath, 'utf8');
  const fallbackSource = rawControllerFallbackSource(target);
  const generated = `/* GENERATED from ${target.module}. Do not edit this direct-file compatibility adapter. */\n${fallbackSource}${transpileRawControllerModule(source, target.module)}`;
  if(checkOnly){
    const existing = fs.existsSync(legacyPath) ? fs.readFileSync(legacyPath, 'utf8') : '';
    if(existing !== generated){
      console.error(`Out-of-date generated adapter: ${target.legacy}`);
      failed = true;
    }
  } else {
    fs.writeFileSync(legacyPath, generated);
    console.log(`Generated ${target.legacy}`);
  }
}

if(failed) process.exit(1);

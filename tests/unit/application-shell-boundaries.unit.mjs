import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as domainState from '../../scripts/modules/app-state-domain.mjs';
import * as storageState from '../../scripts/modules/app-state-storage.mjs';
import * as uiState from '../../scripts/modules/app-state-ui.mjs';


globalThis.window = globalThis.window || {};
globalThis.localStorage = globalThis.localStorage || {getItem(){return null;}, setItem(){}, removeItem(){}};
const mapState = await import('../../scripts/modules/app-state-map.mjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const directName = fs.readdirSync(root).filter(name => /^Wormholes_Beta_\d+\.html$/.test(name)).sort((a,b) => a.localeCompare(b, undefined, {numeric:true})).pop();
const servedName = directName.replace(/\.html$/, '.served.html');
const direct = fs.readFileSync(path.join(root, directName), 'utf8');
const served = fs.readFileSync(path.join(root, servedName), 'utf8');
const app = fs.readFileSync(path.join(root, 'scripts', 'modules', 'app-core.mjs'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'scripts', 'modules', 'shell-interface.mjs'), 'utf8');
const servedEntry = fs.readFileSync(path.join(root, 'scripts', 'modules', 'served-entry.mjs'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'scripts', 'modules', 'runtime-manifest.mjs'), 'utf8');

for(const declaration of ['universes','archiveEntries','literatureEntries','visionEntries','connectionNotes','bridgeNotes','selectedMapNodeId','connectionsMapZoom']){
  assert.ok(!new RegExp(`\\blet\\s+${declaration}\\b`).test(app), `${declaration} should no longer be owned by wormholes-app.js`);
}
for(const functionName of ['switchTab','renderCurrent','updateButtons','showSavedToast','reportAppError']){
  assert.ok(!new RegExp(`function\\s+${functionName}\\s*\\(`).test(app), `${functionName} should no longer be implemented in wormholes-app.js`);
  assert.ok(new RegExp(`export function\\s+${functionName}\\s*\\(`).test(shell), `${functionName} should be exported by shell-interface.mjs`);
}
const workflow = fs.readFileSync(path.join(root, 'scripts', 'modules', 'app-workflow-orchestration.mjs'), 'utf8');
for(const functionName of ['populateEditSelects','openEditModal','saveEditEntry','browserStorageUploadPromptDismissed','showBrowserStorageUploadPrompt']){
  assert.ok(!new RegExp(`function\\s+${functionName}\\s*\\(`).test(app), `${functionName} should no longer be implemented in app-core.mjs`);
  assert.ok(new RegExp(`function\\s+${functionName}\\s*\\(`).test(workflow), `${functionName} should be owned by app-workflow-orchestration.mjs`);
}
assert.match(workflow, /from "\.\/app-state-ui\.mjs"/, 'workflow orchestration should use the explicit UI-state boundary');
assert.match(workflow, /from "\.\/archive-controller\.mjs"/, 'workflow orchestration should import archive behavior explicitly');
assert.match(workflow, /from "\.\/generation-controller\.mjs"/, 'workflow orchestration should import generation form behavior explicitly');
assert.match(workflow, /from "\.\/content-limits\.mjs"/, 'workflow orchestration should import content limits explicitly');
assert.match(workflow, /from "\.\/duplicate-creations\.mjs"/, 'workflow orchestration should import duplicate review explicitly');
assert.match(workflow, /from "\.\/recent-roll-history\.mjs"/, 'workflow orchestration should import recent-roll synchronization explicitly');
assert.match(workflow, /from "\.\/persistence-repositories\.mjs"/, 'workflow orchestration should import persistence preferences explicitly');
assert.ok(!/window\.Wormholes(?:ContentLimits|DuplicateCreations|RecentRollHistory|Repositories)/.test(workflow), 'workflow orchestration should not reach those services through window globals');
const mapInspector = fs.readFileSync(path.join(root, 'scripts', 'modules', 'map-inspector-orchestration.mjs'), 'utf8');
for(const functionName of ['ensureMapListViewModal','refreshOpenMapListView','mapInspectorAllBridgeLedger','buildConnectionMapListViewHtml','openMapListView']){
  assert.ok(!new RegExp(`function\\s+${functionName}\\s*\\(`).test(app), `${functionName} should no longer be implemented in app-core.mjs`);
  assert.ok(new RegExp(`function\\s+${functionName}\\s*\\(`).test(mapInspector), `${functionName} should be owned by map-inspector-orchestration.mjs`);
}
assert.match(mapInspector, /from "\.\/app-state-domain\.mjs"/, 'map inspector should import owned domain state directly');
assert.match(mapInspector, /from "\.\/safe-render\.mjs"/, 'map inspector should import safe rendering explicitly');
assert.match(mapInspector, /from "\.\/controller-service-registry\.mjs"/, 'map inspector should use the controller-service contract for cross-feature behavior');
assert.match(mapInspector, /mapInspectorServices\.getUniverseTitle/, 'map inspector should resolve cross-feature title lookups through the service contract');
assert.match(shell, /from "\.\/app-state-storage\.mjs"/, 'shell interface should use an explicit state-module import');
assert.match(fs.readFileSync(path.join(root, 'scripts', 'modules', 'app-state-map.mjs'), 'utf8'), /import \{loadMapFilters\} from "\.\/storage-facade\.mjs"/, 'map state should import its persistence preference dependency explicitly');

const target = {};
domainState.installLegacyDomainStateBindings(target);
storageState.installLegacyStorageStateBindings(target);
uiState.installLegacyUiStateBindings(target);
mapState.installLegacyMapStateBindings(target);
target.archiveEntries = [{id:'a'}];
target.currentUniverseId = 'u1';
target.selectedMapNodeId = 'a';
assert.equal(domainState.archiveEntries[0].id, 'a');
assert.equal(domainState.currentUniverseId, 'u1');
assert.equal(mapState.selectedMapNodeId, 'a');

for(const adapter of [
  'wormholes-controller-services.js',
  'wormholes-tagging-helpers.js',
  'wormholes-map-presentation-helpers.js',
  'wormholes-app-data-validation.js',
  'wormholes-app-state-domain.js',
  'wormholes-app-state-storage.js',
  'wormholes-app-state-ui.js',
  'wormholes-app-state-map.js',
  'wormholes-shell-interface.js',
  'wormholes-app-workflow.js',
  'wormholes-map-inspector.js'
]){
  assert.ok(direct.includes(`src="scripts/${adapter}"`), `direct-file build should include ${adapter}`);
}
assert.ok(direct.includes('src="scripts/wormholes-document-zip-helpers.js"'), 'direct-file build should include the generated document/ZIP helper adapter');
assert.ok(direct.includes('src="scripts/wormholes-app.js"'), 'direct-file build should keep the generated classic application-core adapter');
assert.ok(served.includes('type="module" src="scripts/modules/served-entry.mjs"'), 'served build should use the ES-module entry point');
assert.ok(!served.includes('src="scripts/wormholes-app.js"'), 'served HTML should not hard-code the classic script chain');

for(const nativeImport of ['app-model.mjs','render-coordinator.mjs','persistence-repositories.mjs','app-state-domain.mjs','app-state-storage.mjs','app-state-ui.mjs','app-state-map.mjs','shell-interface.mjs','app-core.mjs']){
  assert.ok(servedEntry.includes(`./${nativeImport}`), `served entry should import ${nativeImport}`);
}
assert.match(servedEntry, /await import\("\.\/app-core\.mjs"\)/, 'served entry should import the application core natively');
assert.match(servedEntry, /return import\(step\.src\)/, 'served entry should load runtime steps as native modules');
assert.ok(!servedEntry.includes('loadClassicScript'), 'served entry should not retain a classic-script injection path once adapter count reaches zero');
for(const forbidden of ['wormholes-app-state-domain.js','wormholes-app-state-storage.js','wormholes-app-state-ui.js','wormholes-app-state-map.js','wormholes-shell-interface.js','wormholes-app-model.js','wormholes-render-coordinator.js','wormholes-repositories.js']){
  assert.ok(!manifest.includes(`"scripts/${forbidden}"`), `${forbidden} should be native in the served runtime, not loaded as a classic adapter`);
}
assert.ok(!manifest.includes('"scripts/wormholes-app.js"'), 'the application core should no longer be a transitional served-runtime adapter');

for(const nativeInfrastructure of [
  'single-tab.mjs','schema-versions.mjs','safe-render.mjs','url-safety.mjs','large-data-store.mjs',
  'generation-versioning.mjs','persisted-schema.mjs','storage-capacity.mjs','file-limits.mjs','media-limits.mjs',
  'content-limits.mjs','reference-integrity.mjs','backup-status.mjs','pagination.mjs','density.mjs',
  'map-clustering.mjs','map-dom-budget.mjs','map-lazy-render.mjs','escape-policy.mjs','dialogs.mjs',
  'dialog-keyboard.mjs','focus.mjs','accessibility.mjs','copy-to-universe.mjs','search-index.mjs',
  'global-search.mjs','map-search.mjs','undo.mjs','startup-coordinator.mjs','bootstrap.mjs','app-workflow-orchestration.mjs','map-inspector-orchestration.mjs'
]){
  assert.ok(manifest.includes(`./${nativeInfrastructure}`), `${nativeInfrastructure} should be a native served-runtime step`);
}
for(const migratedAdapter of [
  'single-tab.js','wormholes-schema-versions.js','wormholes-safe-render.js','wormholes-url-safety.js',
  'wormholes-large-data-store.js','wormholes-generation-versioning.js','wormholes-persisted-schema.js',
  'wormholes-storage-capacity.js','wormholes-file-limits.js','wormholes-media-limits.js','wormholes-content-limits.js',
  'wormholes-reference-integrity.js','wormholes-backup-status.js','wormholes-pagination.js','wormholes-density.js',
  'wormholes-map-clustering.js','wormholes-map-dom-budget.js','wormholes-map-lazy-render.js','wormholes-escape.js',
  'wormholes-dialogs.js','wormholes-dialog-keyboard.js','wormholes-focus.js','wormholes-accessibility.js',
  'wormholes-copy-to-universe.js','wormholes-search-index.js','global-search.js','wormholes-map-search.js','wormholes-undo.js',
  'wormholes-startup.js','bootstrap.js'
]){
  assert.ok(!manifest.includes(`"scripts/${migratedAdapter}"`), `${migratedAdapter} should no longer be a served-runtime classic adapter`);
}

for(const nativeController of [
  'folder-storage-controller.mjs','archive-controller.mjs','literature-controller.mjs','vision-board-controller.mjs',
  'connections-controller.mjs','bridges-controller.mjs','universe-controller.mjs','connections-map-controller.mjs',
  'bridges-map-controller.mjs','settings-controller.mjs','data-portability-controller.mjs','generation-controller.mjs'
]){
  assert.ok(manifest.includes(`./${nativeController}`), `${nativeController} should be a native served-runtime step`);
}
for(const legacyController of ['folder-storage.js','archive.js','literature.js','vision-board.js','connections.js','bridges.js','universes.js','connections-map.js','bridges-map.js','modals-settings.js','export-import.js','generation.js']){
  assert.ok(!manifest.includes(`"scripts/${legacyController}"`), `${legacyController} should not remain a served-runtime classic adapter`);
}

for(const args of [
  ['tools/build-shared-modules.mjs','--check'],
  ['tools/build-runtime.mjs','--check']
]){
  const result = spawnSync(process.execPath, args, {cwd:root, encoding:'utf8'});
  assert.equal(result.status, 0, `${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
}

console.log('application-shell-boundaries.unit.mjs passed');

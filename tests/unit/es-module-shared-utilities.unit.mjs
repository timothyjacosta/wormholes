import assert from 'node:assert/strict';
import schemaVersions, {sourceVersion, assertSupported} from '../../scripts/modules/schema-versions.mjs';
import generationVersioning from '../../scripts/modules/generation-versioning.mjs';
import mapDomBudget, {createMapDomProfile, mapDomProfileAttributes} from '../../scripts/modules/map-dom-budget.mjs';
import safeRender from '../../scripts/modules/safe-render.mjs';
import urlSafety from '../../scripts/modules/url-safety.mjs';
import recentRollHistory from '../../scripts/modules/recent-roll-history.mjs';
import storageCapacity from '../../scripts/modules/storage-capacity.mjs';
import fileLimits from '../../scripts/modules/file-limits.mjs';
import mediaLimits from '../../scripts/modules/media-limits.mjs';
import contentLimits from '../../scripts/modules/content-limits.mjs';
import entityLimits from '../../scripts/modules/entity-limits.mjs';
import idIntegrity from '../../scripts/modules/id-integrity.mjs';
import referenceIntegrity from '../../scripts/modules/reference-integrity.mjs';
import renderValidation from '../../scripts/modules/render-validation.mjs';
import pagination from '../../scripts/modules/pagination.mjs';
import density from '../../scripts/modules/density.mjs';
import manualDrafts from '../../scripts/modules/manual-drafts.mjs';
import mapClustering from '../../scripts/modules/map-clustering.mjs';
import mapLazyRender from '../../scripts/modules/map-lazy-render.mjs';

assert.equal(schemaVersions.current, 5);
assert.equal(sourceVersion(undefined), 1);
assert.equal(assertSupported(5), 5);
assert.throws(() => assertSupported(6), /newer Wormholes version/);

const diagnostic = generationVersioning.normalizeDiagnostic({
  version:generationVersioning.diagnosticVersion,
  seed:'deadbeef',
  algorithm:generationVersioning.algorithm,
  seedBehaviorVersion:generationVersioning.seedBehaviorVersion,
  generatorVersion:generationVersioning.generatorVersion,
  tableVersion:generationVersioning.tableVersion,
  tableFingerprint:'1234abcd',
  draws:3,
  actions:[{kind:'what', rolls:{type:4}}]
});
assert.ok(diagnostic);
assert.equal(diagnostic.generatorVersion, 'beta-297');
assert.equal(generationVersioning.compatibility(diagnostic, {
  generatorVersion:'beta-297',
  tableVersion:generationVersioning.tableVersion,
  tableFingerprint:'1234abcd'
}).reproducible, true);

const ordinary = createMapDomProfile({nodes:10, edges:9, details:4});
const crowded = createMapDomProfile({nodes:80, edges:120, details:80});
assert.equal(ordinary.compact, false);
assert.equal(crowded.compact, true);
assert.match(mapDomProfileAttributes(crowded), /data-map-dom-compact="true"/);
assert.equal(mapDomBudget.createMapDomProfile, createMapDomProfile);

assert.equal(safeRender.escapeHtml('<script>'), '&lt;script&gt;');
assert.equal(urlSafety.isUrlFieldName('sourceUrl'), true);
assert.equal(urlSafety.isUrlFieldName('thumbnailDataUrl'), false);
assert.equal(typeof recentRollHistory.recordCompleted, 'function');
assert.ok(storageCapacity.byteLength('abc') >= 3);
assert.equal(fileLimits.validate([{name:'small.txt', size:10}], 'literature').ok, true);
assert.equal(mediaLimits.safeDataUrl('not-a-data-url', 'thumbnail'), '');
assert.equal(contentLimits.stringResult('title', 'A title').ok, true);
assert.equal(entityLimits.makeResult('universes', 0, 1).ok, true);
assert.equal(idIntegrity.canonicalId('abc'), 'abc');
assert.equal(typeof referenceIntegrity.validateAppData, 'function');
assert.equal(typeof renderValidation.validArchiveEntry, 'function');
assert.deepEqual(pagination.paginateRows([1,2,3], 2, 2).rows, [3]);
assert.equal(density.DEFAULT_VALUE, 2);
assert.equal(manualDrafts.fieldsHaveData({manualTitle:'Draft'}), true);
assert.equal(typeof mapClustering.buildMapClusters, 'function');
assert.equal(mapLazyRender.mapLazyRectIntersects({left:0,top:0,right:10,bottom:10}, {left:5,top:5,right:15,bottom:15}), true);

console.log('ES module shared utility tests passed.');

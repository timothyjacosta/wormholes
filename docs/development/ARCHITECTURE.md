# Wormholes Beta 301 architecture boundaries

Wormholes separates runtime responsibilities into explicit canonical ES-module layers while preserving the generated downloadable `file://` build.

## 1. Model layer

Canonical source: `scripts/modules/app-model.mjs`

The model layer owns shared domain-state registration and pure collection operations. It does not read browser storage and does not manipulate the DOM.

Current domains include universes, current-universe selection, Archive creations/groups, Literature metadata/groups, Vision Board metadata, connection notes, and bridge notes.

Shared selectors such as ID lookup, group membership, top-level collection selection, child selection, replacement, update, and removal live here rather than being reimplemented by each feature.

## 2. Persistence layer

Canonical source: `scripts/modules/persistence-repositories.mjs`

Generated direct-file adapter: `scripts/wormholes-repositories.js`

Feature controllers do not access `localStorage`, IndexedDB, or the large-data backend directly. They use named repositories registered by the storage facade for universes, Archive, connection notes, bridge notes, Literature, Vision Board, and application-wide cleanup.

The repository layer owns storage envelopes, revisions, schema checks, legacy-key migration, blocked-dataset protection, local-storage writes, and large-data access. The storage facade remains responsible for app-specific persistence orchestration such as folder handles, storage status, and repository coordination.

## 3. Rendering layer

Canonical source: `scripts/modules/render-coordinator.mjs`

Generated direct-file adapter: `scripts/wormholes-render-coordinator.js`

Top-level views register their DOM renderer with `WormholesRendering`, and callers request a named render. Current registered views are Archive, Literature, Vision Board, Connections map, and Manage Bridges map.

The coordinator owns view dispatch, render statistics, and render batching. DOM implementation functions remain inside their feature controllers, but callers no longer need to know which implementation performs the render.

## 4. Application state and shell ownership

The application shell no longer owns one monolithic mutable-state block. State is split into four canonical ownership modules:

- `app-state-domain.mjs` — universes, Archive, Literature, Vision Board, and relationship-note data
- `app-state-storage.mjs` — folder handles, storage synchronization flags, notification runtime state, and image object URLs
- `app-state-ui.mjs` — modal selections, staged picker choices, and transient workflows
- `app-state-map.mjs` — map focus, isolation, viewport, drag, and filter state

`shell-interface.mjs` owns tab switching, Generate-view rendering/button state, notifications, and top-level error routing.

## 5. Feature-controller dependency contract

Beta 250 removes cross-controller bare function dependencies from the canonical feature-controller sources.

Canonical contract: `scripts/modules/controller-service-registry.mjs`

Each feature controller imports the controller-service contract, publishes its public controller surface through `registerControllerServices()`, and reaches other controllers through `controllerServices.<service>` rather than by assuming another controller's function exists as a bare global binding.

This contract avoids a dense cyclic static-import graph while still making cross-controller dependencies explicit in canonical module source. The generated classic adapters retain a compatibility fallback for isolated legacy tests and the direct-file runtime.

All 12 feature controllers now run as native ES modules in the served build:

- folder storage
- Archive
- Literature
- Vision Board
- Connections
- Bridges
- Universes
- Connections map
- Bridges map
- Settings
- data portability
- generation

Their `.js` files remain generated direct-file compatibility outputs only.


## 6. Native infrastructure, observability, and persistence migration

Beta 251 moved a dependency-ordered foundational batch from served classic adapters to native ES-module execution. The served runtime imports single-tab, schema, safe-rendering, URL-safety, large-data, generation-versioning, persisted-schema, storage-capacity, file/media/content/reference-limit, backup-status, pagination/density, map-clustering/DOM-budget/lazy-render, and dialog/focus/accessibility modules natively.

Beta 252 continues that migration through the observability/history and persistence/recovery boundaries:

- Activity Log now exports an importable API; error reporting imports safe rendering and Activity Log explicitly.
- Recent-roll history imports generation versioning and Activity Log explicitly.
- Duplicate-creation tracking imports Activity Log explicitly.
- The storage facade now publishes a named persistence surface through the controller-service contract and `WormholesStorageFacade` namespace.
- Entity limits, ID integrity, render validation, and manual drafts now run natively in the served build.
- Recovery snapshots, the storage dashboard, the write-ahead journal, corrupted-local-storage recovery, and IndexedDB recovery now run natively and use explicit storage/controller-service dependencies where ownership is clear.

Existing utility ownership remains explicit:

- `url-safety.mjs` and `pagination.mjs` import the safe-render API.
- `file-limits.mjs` imports storage-capacity formatting.
- `media-limits.mjs` imports file-limit formatting.
- `dialogs.mjs` and `focus.mjs` import the Escape-policy API.
- `accessibility.mjs` imports the dialog-keyboard API.

Beta 253 completes the served-runtime adapter retirement:

- Copy-to-universe, the search index, Global Search, map search, and Undo now execute as native served modules.
- Startup coordinator and bootstrap now execute natively after their dependencies.
- The served entry no longer contains a classic-script injection path; every served runtime step is a native ES-module import.
- Clear dependency edges are recorded with side-effect imports for search/action and startup orchestration while the direct-file adapter generator removes those imports for `file://` output.

The served transitional-adapter count is now **0**. The direct-file build still receives generated classic versions of every runtime module.

## 7. Application-core ownership

The residual application core is canonical ES-module source at `scripts/modules/app-core.mjs`. The direct-download runtime receives `scripts/wormholes-app.js` only as a generated adapter.

Focused helpers now separated from the core include:

- `document-zip-helpers.mjs` — document text conversion, DOCX creation/extraction, and ZIP helpers
- `tagging-helpers.mjs` — shared tag targeting, picker draft behavior, tag keys, and tagged-image delegation
- `map-presentation-helpers.mjs` — shared SVG badge scaling, geometry, text fitting, edge clipping, and collision-aware note placement

Beta 250 also separates pure imported app-data shape validation into `app-data-validation.mjs`, reducing the data-portability controller without creating an arbitrary size-only split.

## 8. Direct-file compatibility

Wormholes must continue to work when opened directly from a downloaded folder. ES-module loading from `file://` is not consistently supported across browsers, so canonical ES modules are converted into generated classic adapters by:

```sh
node tools/build-shared-modules.mjs
```

Verify adapter synchronization with:

```sh
node tools/build-shared-modules.mjs --check
```

Generated adapters are compatibility artifacts and should not be edited directly.

## Boundary rules

1. Domain/model utilities must not read browser storage or manipulate the DOM.
2. Feature controllers must not call `localStorage`, IndexedDB, or the large-data backend directly.
3. Browser persistence is accessed through repositories and the storage facade.
4. Top-level view updates are dispatched through the render coordinator.
5. Cross-controller calls in canonical feature controllers go through explicit imported contracts rather than bare function globals.
6. New shared logic should be added to the appropriate canonical ES module rather than copied between feature controllers.
7. Large controllers should be split only when a cohesive responsibility can move to a clearer owner.
8. Shared infrastructure dependencies should use explicit module imports when ownership is clear; generated direct-file fallbacks may bridge those imports for `file://` compatibility.


## Beta 254: modal and workflow orchestration

`app-workflow-orchestration.mjs` now owns the edit-creation workflow and browser-storage upload prompt workflow. It imports archive, generation, persistence, folder-capability, UI-state, and shell services explicitly instead of leaving those workflows inside `app-core.mjs`. The generated `wormholes-app-workflow.js` adapter preserves direct-file operation.


## Beta 255: map inspector and list-view orchestration

`map-inspector-orchestration.mjs` now owns the accessible Map List View modal, connection/bridge inspection ledgers, entity index rendering, and list-view opening/refresh behavior. `app-core.mjs` retains map filter wiring and high-level compatibility publication, while the generated `wormholes-map-inspector.js` adapter preserves direct-file operation.

## Beta 256: explicit dependencies on the extracted orchestration boundaries

The two residual `app-core` boundaries extracted in Betas 254–255 now record their native dependencies more explicitly:

- `map-inspector-orchestration.mjs` imports domain state and safe rendering directly, and routes cross-feature map/title/relationship behavior through the imported controller-service contract instead of bare compatibility globals.
- `app-workflow-orchestration.mjs` imports content limits, duplicate review, recent-roll history, and persistence repositories through module APIs instead of reaching through `window.Wormholes*` namespaces.
- `duplicate-creations.mjs` now exposes an importable module API while still publishing its compatibility namespace for the generated direct-file build.
- `persistence-repositories.mjs` now exports the installed repository surface for native consumers while preserving `WormholesRepositories` compatibility publication.

No additional `app-core` or large-controller split was introduced because no clearer cohesive owner emerged in this pass. The dual-build architecture and full release gate remain unchanged.


## Beta 288–289: canonical and transactional persistence

Beta 288 introduced the canonical persistence boundary documented in `CANONICAL_PERSISTENCE.md`. Drafts, canonical domain records, exact persisted schemas, and entity migrations now converge at one repository boundary.

Beta 289 adds the transaction coordinator documented in `TRANSACTIONAL_PERSISTENCE.md`. Multi-part saves validate every record before writing, place large content before metadata, update visible state only after persistence succeeds, and run rollback handlers after partial failure. Literature, app-data imports, backup restores, and managed backup folders use this shared ordering and recovery model.


## Beta 290: explicit threat model

Beta 290 adds the engineering threat register in `docs/security/THREAT_MODEL.md`. Imported files, imported backups, folder handles, browser storage, IndexedDB, rendering and sanitization, external URLs, and future AI or network adapters now have explicit assumptions, active controls, residual risks, and regression-test links. `tests/unit/threat-model-coverage.unit.js` keeps the documented control and test paths from drifting.

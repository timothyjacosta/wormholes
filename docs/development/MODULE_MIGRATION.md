# ES module migration

Wormholes is moving JavaScript toward ES modules in stages rather than rewriting the application at once.

## Beta 244–245: shared utility layer

Stable shared utilities became canonical ES modules, including schema/version handling, security and validation helpers, pagination/density, manual drafts, generation diagnostics/history, storage capacity, and large-map helpers.

## Beta 246: architectural boundaries

Beta 246 established explicit model, persistence, and rendering boundaries:

- `app-model.mjs` — shared domain state and pure collection operations
- `persistence-repositories.mjs` — browser and large-data repository interfaces
- `render-coordinator.mjs` — named top-level view dispatch and batching

See `ARCHITECTURE.md` for the layer rules.

## Beta 247: controller and infrastructure sources

Beta 247 moved the major feature-controller and infrastructure layer to canonical ES-module source files. Their `.js` files became generated compatibility adapters for the direct-download build.

## Beta 248: application-shell boundaries and served entry point

Beta 248 completes the five shell-architecture steps that were blocking the final ES-module conversion work:

1. **Shared application state is split by ownership**
   - `app-state-domain.mjs` — universes, Archive, Literature, Vision Board, and relationship-note data
   - `app-state-storage.mjs` — folder handles, storage synchronization flags, notification runtime state, and image object URLs
   - `app-state-ui.mjs` — modal selections, staged picker choices, and transient workflows
   - `app-state-map.mjs` — map focus, isolation, viewport, drag, and filter state

2. **Shell-level interface orchestration is separated**
   - `shell-interface.mjs` owns tab switching, Generate-view rendering, Generate button state, notifications, and top-level error routing.

3. **New boundaries use explicit imports and exports**
   - The map-state module imports its persisted filter dependency from `storage-facade.mjs`.
   - The shell interface imports the storage-state contract directly.
   - The served entry point imports each native architecture boundary explicitly.
   - Generated classic adapters remove those import statements only for the `file://` compatibility build.

4. **Served builds now have a true ES-module entry point**
   - `served-entry.mjs` is the sole script referenced by `Wormholes_Beta_254.served.html`.
   - It installs the native model, persistence, rendering, state, and shell boundaries before loading transitional adapters in deterministic order.

5. **The direct-download build remains generated and `file://` compatible**
   - `Wormholes_Beta_254.html` keeps ordered classic scripts.
   - The new state and shell adapters are generated from their canonical `.mjs` sources.
   - `tools/build-runtime.mjs` generates and verifies the served HTML shell.

## Beta 249: canonical application core and document/ZIP extraction

Beta 249 converts the last hand-authored classic application core into canonical ES-module source:

- `app-core.mjs` is now the source of truth for the residual application core.
- `wormholes-app.js` is generated from `app-core.mjs` for the direct `file://` build.
- `document-zip-helpers.mjs` now owns document text conversion, DOCX creation/extraction, and ZIP helpers.
- `app-core.mjs` imports that helper family explicitly.
- The served runtime imports `app-core.mjs` natively at the same point where the classic core previously loaded.
- The served runtime no longer loads `scripts/wormholes-app.js` as a transitional adapter.
- A duplicate `capsuleShapeFromPosition()` declaration that classic scripts tolerated was removed because ES modules require unique lexical declarations; the duplicate implementations were identical.

There are now 68 canonical `.mjs` source files, and there are no hand-authored classic `.js` runtime sources. Classic runtime files are generated compatibility artifacts.

## Beta 250: native feature controllers and focused ownership splits

Beta 250 completes the priority sequence that followed the application-core conversion:

1. **Cross-controller bare function globals are replaced in canonical feature controllers**
   - `controller-service-registry.mjs` is the explicit imported contract for controller-to-controller services.
   - All 12 feature controllers register their public surfaces and use `controllerServices.<service>` for cross-controller calls.
   - Static analysis of the canonical controller sources reports zero remaining unresolved references to exports owned by another feature controller.

2. **All feature controllers move from transitional adapters to native served imports**
   - `runtime-manifest.mjs` now preserves the established execution order as typed classic/module steps.
   - The served build imports the 12 feature controllers natively.
   - Their generated `.js` files remain only for the direct `file://` build.
   - The served transitional-adapter count drops from 56 to 44.

3. **Useful application-core families move to focused owners**
   - `tagging-helpers.mjs` owns shared tag-target and tag-picker helper behavior.
   - `map-presentation-helpers.mjs` owns 34 shared badge, geometry, text-fitting, edge, and note-placement helpers.
   - `app-core.mjs` is reduced from 4,146 lines in Beta 249 to about 3,560 lines.

4. **A large controller is split only at a clear ownership boundary**
   - Pure app-data structural validation moves from `data-portability-controller.mjs` to `app-data-validation.mjs`.
   - No controller was split merely to reduce line count.

5. **Classic compatibility remains an intentional product build**
   - Every classic runtime `.js` file remains generated from canonical module source.
   - The downloadable `Wormholes_Beta_254.html` continues to preserve direct-file operation.

There are now 72 canonical `.mjs` source files and no hand-authored classic runtime `.js` files.

## Beta 251: foundational infrastructure moves to native served imports

Beta 251 continues the adapter-retirement work in dependency order:

1. **Foundational utilities become native served modules**
   - Single-tab coordination, schema versions, safe rendering, URL safety, large-data storage, generation versioning, persisted-schema validation, storage capacity, file/media/content/reference limits, backup status, pagination, density, map clustering, map DOM budgeting, and map lazy rendering now execute as native ES modules in the served build.

2. **Clear utility ownership becomes explicit imports**
   - URL safety and pagination import the safe-render API.
   - File limits import storage-capacity formatting.
   - Media limits import file-limit formatting.
   - The classic-adapter generator now strips supported import declarations for install-style modules while preserving guarded direct-file fallbacks.

3. **Dialog, focus, and accessibility infrastructure becomes native**
   - Escape policy and dialog-keyboard modules expose importable APIs.
   - Dialog dismissal and focus restoration import the Escape-policy API.
   - Accessibility imports the dialog-keyboard API.

4. **The served compatibility surface is cut from 44 adapters to 21**
   - The 23 retired served adapters remain generated classic outputs for the downloadable `file://` build.
   - No hand-authored classic runtime sources are reintroduced.

There are still 72 canonical `.mjs` source files; Beta 251 changes execution mode and dependency clarity rather than adding artificial modules.

## Beta 252: observability and persistence/recovery become native

Beta 252 retires the next two dependency groups from the served compatibility manifest:

1. **Observability and history become native served modules**
   - Activity Log exports an importable API.
   - Error reporting imports safe rendering and Activity Log explicitly.
   - Recent-roll history imports generation versioning and Activity Log explicitly.
   - Duplicate-creation tracking imports Activity Log explicitly.

2. **The persistence facade becomes a native service boundary**
   - `storage-facade.mjs` now publishes its persistence API through the controller-service contract and `WormholesStorageFacade`.
   - Entity limits, ID integrity, render validation, and manual drafts execute natively in the served build.

3. **Recovery orchestration becomes native without weakening rollback behavior**
   - Recovery snapshots, storage dashboard, write-ahead journal, corrupted-local-storage recovery, and IndexedDB recovery now execute as native ES modules.
   - Recovery modules use explicit storage APIs and the controller-service contract for cross-feature operations rather than relying on bare function globals.

4. **The served compatibility surface drops from 21 adapters to 7**
   - The remaining adapters are copy-to-universe, search index, Global Search, map search, Undo, startup coordinator, and bootstrap.
   - All direct-file `.js` counterparts remain generated compatibility outputs.

There are still 72 canonical `.mjs` source files and no hand-authored classic runtime JavaScript.

## Beta 253: served ES-module conversion completes

Beta 253 retires the final seven served compatibility adapters and removes the transitional loader itself:

1. **Search and action orchestration becomes native**
   - Copy-to-universe, the search index, Global Search, map search, and Undo now execute as native ES modules in the served runtime.
   - Clear module dependencies are recorded with side-effect imports where ownership is stable, while generated direct-file adapters remove those imports and retain the established classic execution order.
   - Copy-to-universe explicitly publishes the small handler surface required by bootstrap, replacing the accidental top-level leakage that classic scripts previously provided.

2. **Startup coordinator and bootstrap become native last**
   - Startup coordinator now records its recovery, validation, draft, journal, and single-tab module dependencies explicitly.
   - Bootstrap records its dependency on copy/search/action/startup modules and executes natively after the rest of the runtime.

3. **The served classic-loader path is removed**
   - `served-entry.mjs` accepts native module steps only.
   - `runtime-manifest.mjs` reports zero classic served steps.
   - The served transitional-adapter count drops from 7 to **0**.

4. **Direct-file compatibility remains generated**
   - The adapter generator now strips supported side-effect imports in addition to named imports.
   - All classic runtime `.js` files remain generated compatibility output for `file://` use.

There are still 72 canonical `.mjs` source files and no hand-authored classic runtime JavaScript. The served-runtime ES-module conversion is complete.

## Direct-file compatibility

The downloadable Wormholes app intentionally remains able to run when opened directly from `file://`. Browser support for loading ES modules from local files is inconsistent because module loading uses stricter origin and CORS rules.

The files in `scripts/modules/` are the source of truth for every migrated component. Generated adapters must not be edited directly.

Run:

```sh
node tools/build-shared-modules.mjs
node tools/build-runtime.mjs
```

to regenerate adapters and the served runtime shell, or:

```sh
node tools/build-shared-modules.mjs --check
node tools/build-runtime.mjs --check
```

to verify both runtime forms.

## What remains after Beta 253

The served-runtime ES-module conversion is complete: there are no transitional classic adapters left to retire. Further work is architectural refinement rather than required conversion.

1. Continue residual `app-core` extraction only where a focused owner is clear, especially modal/workflow orchestration and map inspector/list-view orchestration.
2. Replace remaining compatibility-global access inside native modules with direct imports or narrow service contracts when doing so reduces coupling without creating a dense cyclic import graph.
3. Revisit the largest feature controllers only when a cohesive subsystem can be separated without creating coordination-only modules.
4. Keep the generated classic compatibility runtime for direct `file://` use unless that product requirement is intentionally retired.
5. Keep both build-sync checks and the complete regression/performance suite as release gates so native and direct-file runtimes do not drift.

No additional served-adapter conversion remains.


## Beta 254: first residual app-core workflow extraction

The edit-creation modal workflow and browser-storage upload prompt workflow moved to `app-workflow-orchestration.mjs`. The served runtime loads that boundary natively, while `wormholes-app-workflow.js` is generated for the direct-file build.


## Beta 255: map inspector/list-view extraction

The accessible text-map inspector and Map List View orchestration moved from `app-core.mjs` to `map-inspector-orchestration.mjs`. The served build loads the boundary natively and the direct-file build generates `wormholes-map-inspector.js`.

## Beta 256: extracted-boundary dependency cleanup

Beta 256 follows through on the post-conversion cleanup list without creating new architecture work:

1. **Map inspector/list-view dependencies are explicit**
   - Owned domain state is imported from `app-state-domain.mjs`.
   - Safe rendering is imported from `safe-render.mjs`.
   - Cross-feature relationship, title, archive, and Bridges-map behavior is reached through the imported controller-service contract rather than bare function globals.

2. **Workflow dependencies are explicit**
   - Content limits, duplicate-creation review, recent-roll history, and persistence repositories are imported as module APIs.
   - The workflow source no longer reaches those services through `window.Wormholes*`.

3. **Native APIs are exposed where the workflow needs them**
   - Duplicate-creation tracking now exports its runtime API in addition to its compatibility namespace.
   - Persistence repositories now export the installed repository surface for native consumers.

4. **No artificial splitting**
   - No further `app-core` extraction or large-controller split was made because this pass did not reveal another clearer ownership boundary.

5. **Dual-build and release gates remain mandatory**
   - The native served build remains module-only.
   - The generated classic direct-file build remains supported and validated in one shared lexical scope.

The current post-ES-conversion recommendation list is considered closed here; any broader residual-global or controller-ownership work can be rediscovered in a later dedicated architecture audit.


## Beta 257: canonical-source quality gates

Beta 257 adds ESLint, Stylelint, and Prettier around the canonical source tree. JavaScript linting and formatting target `scripts/modules/**/*.mjs`, while CSS linting and formatting target `styles/**/*.css`. Generated classic runtime files remain build artifacts and are regenerated from the formatted module sources rather than edited or formatted independently.

The `tests/package.json` quality commands make linting, formatting verification, and both runtime synchronization checks available as one release gate with `npm run quality`.

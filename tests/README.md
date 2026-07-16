# Wormholes smoke tests

This folder is non-user-facing test scaffolding for the static Wormholes app. It uses Playwright to catch high-level regressions in the core app flows before a beta build is shared.

## Setup

From this `tests/` folder:

```bash
npm install
npx playwright install chromium
npm run test:unit
npm run coverage
npm test
```

Useful focused commands:

```bash
npm run test:unit
npm run coverage
npm run test:rollback
npm run test:malformed-imports
npm run test:universe-lifecycle
npm run test:group-bulk
npm run test:literature-lifecycle
npm run test:vision-lifecycle
npm run test:malicious-inputs
npm run test:a11y
npm run test:datasets
npm run perf:list
npm run perf:summary
npm run ci:performance
npm run test:desktop
npm run test:headed
npm run test:parallel
npm run test:storage-heavy
npm run test:soak:quick
npm run test:soak
```

## What this covers

The current smoke suite checks:

- App shell startup, duplicate HTML IDs, startup runtime errors, single-active-tab blocking, and stale-write protection
- Automated axe-core WCAG scans for Home, primary tabs, Global Search, Settings, the Literature editor, both maps, and both Map List Views
- Universe creation and duplicate-title validation
- Quick Roll plus Archive Creation
- Manual partial creation and duplicate manual-attribute blocking
- Per-universe unfinished manual-creation draft persistence, reload restoration, and explicit discard
- Literature upload using browser storage
- Vision Board image upload using browser storage
- Creation-to-creation connections from the archive menu
- Storage-status UI rules: section tabs show status text only; settings keeps byte usage
- Maximum import-size coverage for app-data JSON, Literature files, Vision Board images, and backup-folder staging
- Desktop layout checks for the Skip animation control and centered creation buttons
- Folder-sync helper behavior that prevents duplicate files when reconnecting an existing folder
- Storage module unit coverage for localStorage wrappers, migration helpers, universe/archive/notes persistence, and map-filter preferences
- Repository-level persisted-schema type checks for Universe, Archive, Literature, Vision Board, relationship-note, and large-payload storage boundaries
- Versioned migration fixtures and production-normalizer checks for every supported app-data schema version, with fixture coverage required to match the support manifest
- Corrupted-storage startup regressions covering malformed global JSON, schema-invalid per-universe records, recovery ordering, protected raw-data preservation, startup failure reporting, and IndexedDB recovery failures
- Malformed-import regressions covering invalid JSON, wrong export types, unsupported schemas, incomplete universe data, malformed records and collections, wrong field types, early rejection before confirmation or persistence, and unchanged existing data
- Universe lifecycle regressions covering failure-atomic metadata edits, isolated dataset switching, exact bridge cleanup, active and inactive deletion, migration-before-delete, Undo restoration, and persistence across reloads
- Group and bulk-operation regressions covering Archive and Literature group creation, membership edits, cross-group moves, ungrouping, multi-item relationship cleanup, grouped-child deletion, Undo restoration, and failure-atomic persistence
- Vision Board lifecycle regressions covering upload and IndexedDB materialization, universe-isolated reloads, rename, tagging, ordering, deletion, Undo deferral, final large-image cleanup, and failure-atomic persistence
- Malicious-payload input-path coverage across universe, creation, group, connection, Literature, Vision Board, search, upload, and full-import entry points, with automatic inventory checks for newly added writable controls
- Security documentation coverage that requires the release trust-boundary file, supported deployment assumptions, local-data limitations, and the plain-language in-app Data Safety summary
- Forced storage-exhaustion coverage for localStorage, IndexedDB, rolling snapshots, Literature autosave, Vision Board uploads, imports/restores, Clear Data, Undo retry, and local-folder writes
- Folder-storage module unit coverage for local-folder mode, folder helper functions, file write/read/delete helpers, duplicate-prevention file naming, and handle clearing
- Export/import module unit coverage for app-data validation, migration, summary formatting, cleanup keys, failure-atomic rollback, and script ordering
- Dedicated import/restore rollback regression suite that runs both the failed JSON import rollback and failed backup-folder restore rollback scenarios
- Multi-universe browser regression coverage that imports two universes and verifies global persistence-phase ordering plus Archive, Literature, and Vision metadata for both universes
- Archive module unit coverage for grouped entries, visible-map entry helpers, import normalization, migration cloning, and removed-entry cleanup
- Literature module unit coverage for document kind detection, grouping helpers, tag merging, and text-to-HTML conversion
- Literature autosave and abandonment-warning coverage for dirty/saved state, queued saves, title-blocked drafts, and browser-level unload protection
- Literature lifecycle regressions covering failure-atomic create/edit saves, portable-content reloads, cross-universe session guards, tag rollback, deletion, Undo, and deferred large-content cleanup
- Vision Board module unit coverage for image metadata normalization, file-kind helpers, tag labels/counts, and tag toggles
- Connections map module unit coverage for renderer exports, viewport binding, and script order
- Bridges map module unit coverage for Manage Bridges map exports, viewport binding, empty-state rendering, and script order
- Map clustering and viewport-aware lazy rendering coverage for both map views on desktop
- Modals/settings module unit coverage for settings menu handlers, compact toasts, safe controls, and script order
- Generator property coverage across thousands of deterministic generated cases for D20 bounds, table membership, duplicate-attribute prevention, complete Quick Rolls, and source-table immutability
- Deterministic representative performance datasets for small, medium, large single-universe, ten-book multi-universe, dense-map, and near-limit scenarios

## Notes

These tests serve the local `Wormholes_Beta_*.html` file from a temporary localhost web server. They clear browser local/session storage and Wormholes IndexedDB data at the start of each test so the suite can be run repeatedly.

Ordinary browser specs remain parallel. Persistence-intensive specs are listed in `support/storage-heavy-specs.js` and run separately through `playwright.storage.config.js` with one worker. The default `npm test` command runs both groups in sequence. See `../docs/quality/PLAYWRIGHT_STORAGE_WORKERS.md`.

The folder-sync tests use a small in-browser fake folder handle for deterministic helper-level coverage. They do not open a native browser folder picker.

- `unit/generation-module.unit.js` checks the Generate tab module split and manual creation save flow.

- `unit/bridges-module.unit.js` checks Manage Bridges modal/data logic after the `bridges.js` split.
- `unit/universes-module.unit.js` checks the universe module split and basic creation behavior. `unit/universe-lifecycle-regressions.unit.js` exercises the complete create/edit/switch/delete/migrate/undo lifecycle.

## Coverage reporting

`npm run coverage` runs the complete non-browser unit suite with Node V8 coverage collection and reports only the canonical `scripts/modules/**/*.mjs` application source. It generates a terminal summary, `coverage/coverage-summary.json`, and a browsable `coverage/index.html`. Generated classic compatibility scripts are excluded, and no minimum percentage threshold is enforced. See `../docs/quality/COVERAGE_REPORTING.md`.

## Long-session soak testing

The soak suite keeps one Chromium page active while repeatedly creating, editing, deleting, undoing, rendering maps, opening images, saving drafts, and building portable exports. It verifies that runtime errors remain empty, Undo and export checks continue to work, collection and activity-log caps remain bounded, dialogs close cleanly, map DOM size stays within limits, and post-GC JavaScript heap growth remains below the configured ceiling.

The soak test is intentionally opt-in so ordinary smoke-test runs stay fast:

```bash
npm run test:soak:quick   # 24-cycle release check
npm run test:soak         # at least 120 cycles and one minute
npm run ci:soak           # scheduled five-minute CI profile
```

The duration and limits can be overridden with `WORMHOLES_SOAK_CYCLES`, `WORMHOLES_SOAK_DURATION_MS`, `WORMHOLES_SOAK_MAX_CYCLES`, and `WORMHOLES_SOAK_MAX_HEAP_GROWTH_MB`. Results are written to `soak/results/soak-report.json`. `.github/workflows/soak.yml` runs the extended profile weekly and supports manual runs.

## Performance fixtures

Representative datasets are generated on demand from fixed seeds, so benchmark inputs are repeatable without adding large JSON files to the beta package. See `performance/README.md` and use `npm run perf:generate -- --scenario medium --output ./performance/generated`. The dedicated performance CI workflow automatically enforces the portable and desktop Chromium budgets and preserves JSON timing reports for comparison.

## XSS regression corpus

The security regression suite exercises malicious-looking text, rich HTML, URL schemes, imported data, search results, error messages, image metadata, and map labels. The complete 41-payload corpus is also run through every declared user-input path.

```bash
npm run test:xss:unit
npm run test:xss:inputs
WORMHOLES_CHROMIUM_PATH=/path/to/chromium npm run test:xss:sanitizer
npm run test:xss:app
```

`test:xss:sanitizer` uses an isolated browser document and does not need the full app web server. `test:xss:inputs` uses a self-contained production-app fixture to exercise all declared input paths without relying on localhost navigation. `test:xss:app` runs the corpus through the complete application flow.

## Dialog keyboard lifecycle coverage

`npm run test:dialog-keyboard` verifies the complete dialog inventory. Every static dialog and the runtime Map List View dialog must declare an opening-focus target, Escape and backdrop policies, contain Tab and Shift+Tab focus, and restore focus after closing.

## Accessibility CI gate

`.github/workflows/accessibility.yml` runs the Axe accessibility suite automatically for pushes, pull requests, and manual workflow runs. The gate installs the locked dependencies and Chromium, then scans the covered application surfaces in the desktop Playwright profile.

```bash
npm run ci:accessibility
```

Any WCAG 2.0/2.1 A or AA Axe violation fails the job. The Playwright HTML report is uploaded even after a failure so the affected rule, element, and browser profile can be inspected. `unit/accessibility-ci.unit.js` protects the workflow triggers, locked installation, dual-profile command, WCAG tags, and report retention from accidental removal.

## Cross-browser compatibility gate

`npm run test:cross-browser` runs a focused critical-workflow suite across Chromium desktop, Firefox desktop, and WebKit desktop. The full deep regression suite remains Chromium-first so storage-heavy, performance, and specialist checks are not needlessly multiplied across engines.

The permanent CI gate is `npm run ci:cross-browser`, backed by `.github/workflows/cross-browser.yml`. See `../docs/quality/CROSS_BROWSER_VALIDATION.md` for the coverage policy and local setup.

## Private browser and browser-clearing gate

`npm run test:private-browser-storage` runs the dedicated Chromium validation for private-style browser-context isolation and browser site-data clearing. It verifies that separate non-persistent contexts do not share Wormholes data, closing a private-style context discards its data, full site-data clearing returns the app to a clean usable state, local-storage-only clearing does not resurrect orphaned IndexedDB content, and IndexedDB-only clearing recovers portable Literature content from retained metadata.

The permanent CI gate is `npm run ci:private-browser-storage`, backed by `.github/workflows/private-browser-storage.yml`. These persistence-heavy scenarios are also kept in the serialized storage-heavy group. See `../docs/quality/PRIVATE_BROWSER_AND_CLEARING_VALIDATION.md` for the exact coverage and the limits of browser-context automation as a proxy for branded private/incognito modes.

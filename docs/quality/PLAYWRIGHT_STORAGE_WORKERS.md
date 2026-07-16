# Playwright storage-heavy worker cap

Wormholes keeps ordinary browser tests parallel, but runs persistence-intensive browser suites through a dedicated Playwright configuration capped at one worker.

## Why the split exists

The storage-heavy group exercises repeated import, restore, migration, corruption recovery, IndexedDB-backed media, local-folder synchronization, backup state, and write-ahead-journal behavior. Running several of those browser workloads at the same time can add avoidable CPU, memory, and browser-storage contention.

The ordinary `tests/playwright.config.js` keeps `fullyParallel: true` and excludes the storage-heavy manifest in `tests/support/storage-heavy-specs.js`.

The dedicated `tests/playwright.storage.config.js` runs exactly that manifest with:

- `workers: 1`
- `fullyParallel: false`
- a separate HTML report folder

The default `npm test` command runs both groups in sequence, so the storage-heavy tests are still part of the standard browser suite.

## Commands

From `tests/`:

```bash
npm test                         # parallel group, then storage-heavy group
npm run test:parallel            # only the ordinary parallel group
npm run test:storage-heavy       # only the capped storage-heavy group
npm run test:desktop             # both groups, desktop profile
```

Soak and browser-performance suites keep their existing one-worker controls. Accessibility and CSP commands retain their explicit single-worker execution. All browser profiles are desktop profiles.

## Maintenance rule

Add a browser spec to `tests/support/storage-heavy-specs.js` when its dominant workload repeatedly mutates or reconstructs substantial persisted state, especially imports/restores, migrations, corruption recovery, IndexedDB media, backup/folder synchronization, or similarly storage-intensive workflows. Do not add ordinary navigation or rendering tests merely because their setup clears browser storage.

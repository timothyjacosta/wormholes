# Wormholes Beta 301 — Transactional persistence

## Purpose

Multi-part saves now follow one reusable transaction pattern:

`validate everything → write large content → write record metadata → write collection metadata → write core metadata → update visible app state`

If any write fails, Wormholes rolls back completed steps in reverse order and restores the previous in-memory state. Users see a short explanation instead of storage or schema details.

## Transaction coordinator

Canonical source: `scripts/modules/transactional-persistence.mjs`

Generated direct-file adapter: `scripts/wormholes-transactional-persistence.js`

The coordinator accepts a transaction plan containing validators, ordered persistence steps, optional rollback handlers, and a final runtime commit. It rejects unknown or out-of-order phases before writing.

The supported phase order is:

1. `large-content`
2. `record-metadata`
3. `collection-metadata`
4. `core-metadata`

All plan-level and step-level validators run before the first persistence step.

## Visible-state rule

Controllers build detached candidate records rather than editing the live collection before persistence. `commitRuntime` runs only after every persistence step succeeds. When a transaction fails, `restoreRuntime` can restore a captured snapshot before control returns to the interface.

This prevents a failed save from appearing successful or leaving the screen out of sync with browser storage.

## Literature

Literature editor saves now:

- Build and validate a detached canonical collection
- Write document content to the large-data store first
- Write Literature metadata only after content succeeds
- Restore the previous large-content value if metadata fails
- Replace the visible Literature collection only after the transaction commits

Imported Literature uses the same split between prepared content, large-content persistence, and metadata persistence.

## Imports and restores

App-data imports and backup restores use the same ordered transaction plan. Every prepared Universe, Archive, Connection, Literature, Vision Board, and Bridge dataset is validated before old data is cleared.

Incoming large content is written before supporting metadata. The schema version and Universe index are core metadata and are written last. The existing write-ahead journal, recovery snapshot, and full rollback path remain the outer recovery layer.

## Backup folders

Folder backups validate their manifest before copying begins. Content is copied first, the manifest is written next, and the managed-folder completion marker is written last. An interrupted backup therefore is not presented as a complete managed backup.

## Failure injection

Tests may install `WormholesPersistenceFailureInjector`. The callback receives the operation, phase, step, and step index. Returning `true` forces a failure before that step executes.

The regression suite verifies:

- Validation completes before writes
- Phases execute in the required order
- Runtime state commits last
- Completed steps roll back in reverse order
- Runtime state is restored after an injected partial failure
- User-facing failure text remains simple

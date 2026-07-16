# Wormholes Beta 248 — Background Generation Diagnostics

Wormholes records hidden diagnostic information for generated creations. There are no seed fields, buttons, labels, or settings in the normal interface.

## Purpose

The diagnostic data supports:

- Repeatable automated generator tests
- Reproducing a reported generation problem
- Distinguishing a table change from a random-selection change
- Confirming whether an older roll can be reproduced by the current build

It is not intended as a world-building control or a way to browse predetermined creations.

## Behavior

- A new diagnostic seed is created when the first roll for a blank creation begins.
- The seed controls only selected roll results. Decorative dice movement uses separate visual randomness.
- Every completed roll records the generator build, authored table version, a table-content fingerprint, and the seed-behavior version.
- A generated creation stores this data in its private `_generation` field when archived.
- Manual creations do not receive roll metadata.
- Starting a new creation or changing universes clears the active diagnostic session.
- If rolled descriptor fields are later edited, the metadata is marked with `authoredChanges: true`. The diagnostics still describe the original roll.
- The latest 50 completed rolls are retained in a separate local diagnostic history.
- A seed-free summary is added to the Activity Log. User-facing details never expose seeds or diagnostic version values.

## Why both versions and a fingerprint are recorded

The table version identifies an intentionally published set of authored entries. The fingerprint is calculated from the exact table contents and order, so tests can also detect an accidental table edit that was not accompanied by a version change.

The seed-behavior version identifies how the deterministic number stream is converted into table rolls. Wormholes refuses to silently use an unknown behavior when a diagnostic session is recreated.

## Diagnostic API

The following console API is available for automated tests or guided support:

```js
WormholesGenerationDiagnostics.current()
WormholesGenerationDiagnostics.forEntry(entryOrId)
WormholesGenerationDiagnostics.compatibility(metadata)
WormholesGenerationDiagnostics.useSeedForNextSession("deadbeef")
WormholesGenerationDiagnostics.clearPendingSeed()
WormholesRecentRollHistory.latest(10)
WormholesRecentRollHistory.getById(historyId)
```

To reproduce a test case, use the recorded seed and repeat the same roll-button sequence. Exact reproduction requires matching algorithm, seed behavior, table version, table fingerprint, and action sequence.

## Current format

- Metadata version: `2`
- Algorithm: `xorshift32-v1`
- Seed behavior: `xorshift32-inclusive-int-v1`
- Generator version: `beta-248`
- Table version: `classic-authored-v1`
- Table fingerprint: `83f46155` (calculated from the exact `what`, `attribute`, and `story pressure` table contents and order)

Version-1 diagnostics from earlier builds remain readable. Their known seed behavior is identified during normalization, but Wormholes does not invent a table fingerprint that was never recorded. Malformed or unsupported diagnostic metadata is discarded. Diagnostic data is never executed or rendered as HTML.

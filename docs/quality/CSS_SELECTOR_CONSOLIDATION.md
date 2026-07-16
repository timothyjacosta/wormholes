# CSS selector consolidation

Wormholes Beta 260 reduces repeated same-context CSS selector blocks without moving surviving declarations or changing their values.

## Beta 260 baseline

- Beta 259: 1,293 qualified CSS rule blocks.
- Beta 259: 67 repeated exact selector/context groups spanning 152 rule blocks.
- Beta 260: 1,259 qualified CSS rule blocks.
- Beta 260: 46 repeated exact selector/context groups spanning 97 rule blocks.
- Consolidation: 34 fully superseded repeated rule blocks removed.

A rule block was removed only when every declaration in that block was already superseded by a later declaration for the same property under the exact same selector and exact same tracked at-rule context. Surviving declarations were not relocated, reordered, or rewritten.

This intentionally leaves repeated selectors that may represent meaningful cascade layers, viewport-specific overrides, state refinements, or declarations whose safe movement cannot be proven from static analysis alone.

## Guardrail

`tests/unit/css-selector-duplication.unit.js` tracks exact selector repetition within the same top-level or tracked at-rule context. The current budget is capped at:

- 46 repeated selector/context groups.
- 97 rule blocks participating in those repeated groups.

Future CSS work should avoid increasing either count unless the duplication is intentional and the budget is deliberately reviewed.

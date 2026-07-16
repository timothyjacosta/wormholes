# CSS priority policy

Wormholes Beta 259 reduces unnecessary `!important` usage without changing the rendered cascade.

## Beta 259 baseline

- Beta 258: 924 `!important` declarations.
- Beta 259: 874 `!important` declarations.
- Reduction: 50 declarations (about 5.4%).

The removed priorities were limited to declarations that were already superseded under the identical selector and identical at-rule context by a later `!important` declaration for the same property, plus one longhand priority superseded by a later important shorthand on the identical selector. In those cases, the earlier priority could not determine the final computed style.

## Guardrail

`tests/unit/css-important-budget.unit.js` caps the current stylesheet at 874 `!important` declarations so later work does not silently restore the removed priority debt.

The remaining declarations are not assumed to be necessary forever. Future reductions should be made component by component, with cascade analysis and browser-level regression testing rather than bulk removal.

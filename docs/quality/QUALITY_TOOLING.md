# Wormholes quality tooling

Beta 257 added automated JavaScript linting, CSS linting, and source formatting.

## Scope

The quality tools target the canonical application sources:

- `scripts/modules/**/*.mjs` — ESLint and Prettier
- `styles/**/*.css` — Stylelint and Prettier

Generated classic compatibility files in `scripts/*.js` are intentionally excluded from formatting. They are regenerated from the canonical ES modules with `npm run build:shared-modules` from the `tests/` directory.

The generated served HTML shell is also excluded from formatting and is regenerated with `npm run build:runtime`.

## Commands

Run these commands from `tests/` after installing dependencies with `npm ci`:

- `npm run lint` — run ESLint and Stylelint
- `npm run format` — format canonical JavaScript and CSS sources
- `npm run format:check` — verify formatting without changing files
- `npm run quality` — run linting, formatting verification, and both runtime synchronization checks

The lint rules are intentionally conservative. They catch syntax, correctness, and invalid-CSS problems without turning older stylistic debt into an unrelated release blocker.

# Representative performance datasets

These deterministic fixtures model the range of Wormholes projects the app is intended to support. They are generated on demand so the beta package remains small and every benchmark uses the same records, relationships, dates, tags, and text.

## Scenarios

- `small` — ordinary baseline project
- `medium` — established project with several active universes
- `large-single` — one large book/universe
- `large-multi` — ten-book multi-universe project with 500 Archive items and 500 Vision Board items per universe
- `dense-map` — connection- and bridge-heavy map fixture
- `near-limit` — on-demand fixture close to the supported collection and relationship ceilings

## Commands

From the `tests` folder:

```bash
npm run perf:list
npm run perf:summary
npm run perf:generate -- --scenario medium --output ./performance/generated
npm run perf:generate -- --all --output ./performance/generated
```

Add `--include-media` to embed tiny valid PNG/JPEG placeholders for browser image-decode tests. The default fixtures retain realistic image metadata without embedding thousands of large image payloads.

The generated directory is intentionally not included in the beta ZIP. Performance runs should generate only the scenarios they need.

## Performance budgets

Beta 197 adds two layers of release guards:

1. **Portable Node budgets** measure deterministic dataset generation, JSON serialization and parsing, integrity validation, Global Search indexing/querying, and pagination. These run without a browser and are included in the unit/regression command.
2. **Browser interaction budgets** measure import, Archive/Literature/Vision rendering, Global Search, and Connections-map opening in desktop Chromium. They are opt-in because browser and CI graphics timing varies more widely.

From the `tests` folder:

```bash
npm run perf:benchmark
npm run perf:check
npm run perf:browser
```

`perf:benchmark` prints timings without failing. `perf:check` exits nonzero when a portable budget is exceeded. `perf:browser` requires the Playwright dependencies and Chromium.

The initial limits are intentionally generous release guards rather than optimization targets. They are centralized in `performance/performance-budgets.js`. A known slower test runner can use `WORMHOLES_PERF_MULTIPLIER`, for example `WORMHOLES_PERF_MULTIPLIER=1.5`, without editing the checked-in limits.

The checked-in `baseline-beta-197.json` records the measurements used to establish this first budget set. New baselines should be recorded only after confirming that a change is intentional rather than simply raising a limit to hide a regression.

## Continuous performance regression gate

The dedicated GitHub Actions workflow at `.github/workflows/performance.yml` runs on pushes, pull requests, and manual dispatches. It uses the locked Node.js and Chromium dependencies and performs two complementary checks:

- `npm run perf:ci:node` measures every deterministic dataset three times, compares the median with the portable budgets, and writes `performance/results/node-performance.json`.
- `npm run perf:ci:browser` runs the stable small and medium desktop Chromium interaction profiles serially with one worker and no retries, then writes `performance/results/browser-performance.json`. The larger and dense-map browser profiles remain available through `npm run perf:browser` for manual investigation while their rendering work is tracked separately; all six datasets are still enforced by the portable CI gate.

Both JSON timing reports, the Playwright HTML report, traces, and screenshots are uploaded even when a budget fails. The reports are retained for 30 days so changes can be compared without treating normal timing noise as a product regression.

Run the same complete gate locally with:

```bash
npm run ci:performance
```

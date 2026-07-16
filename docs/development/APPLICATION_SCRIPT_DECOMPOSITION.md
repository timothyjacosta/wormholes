# Application script decomposition

Beta 261 completes the checklist item **“Break up the largest application scripts”** by extracting cohesive subsystems from the four largest remaining feature controllers. The goal is ownership and testability, not arbitrary file-count growth.

## What moved

| Original controller | Beta 260 lines | Beta 261 controller lines | Extracted owners |
| --- | ---: | ---: | --- |
| `literature-controller.mjs` | 3,640 | 2,766 | collection view state; grouping workflow; content/tag/sanitization helpers |
| `data-portability-controller.mjs` | 3,546 | 2,664 | local-folder backup creation and restore workflow |
| `archive-controller.mjs` | 3,341 | 2,429 | collection view state; link/schema/migration integrity helpers |
| `vision-board-controller.mjs` | 3,114 | 2,567 | collection view state; image conversion and MIME/thumbnail helpers |

The extracted modules are deliberately smaller subsystem owners. The largest extracted subsystem is the local-folder backup/restore helper at about 1,000 lines; the other extracted modules are roughly 300–600 lines.

## Remaining large modules

`app-core.mjs` remains an application-shell/orchestration boundary rather than a feature controller. The remaining feature controllers are now below the Beta 261 2,800-line maintenance guardrail. Future splits should still follow responsibility boundaries instead of splitting files merely to satisfy a line count.

## Runtime compatibility

The served build imports the helper modules natively. For the downloadable direct-file build, the generator embeds compatibility copies of each helper into its owning generated controller adapter; the canonical source remains split while isolated legacy tests and `file://` execution keep one self-contained controller script. Public controller exports remain available through the existing controller-service registry.

## Regression guardrail

`tests/unit/controller-decomposition.unit.mjs` verifies that:

- the targeted feature controllers stay below 2,800 lines;
- extracted subsystem modules stay below 1,100 lines;
- the canonical controllers import the extracted helpers;
- the generated direct-file controller adapters embed compatibility copies from those canonical helper sources; and
- the build tool continues to treat the helper modules as canonical sources.

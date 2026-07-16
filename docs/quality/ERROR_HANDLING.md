# Wormholes Error Handling

Beta 262 standardizes application errors without turning ordinary validation or control-flow results into exceptions.

## Shared error shape

Important operational failures use `scripts/modules/app-errors.mjs`. A standardized error may include:

- `code`: a stable `WORMHOLES_*` identifier for program logic and diagnostics.
- `message`: technical detail for logs and the expandable error report.
- `userMessage`: short plain-language text shown in the alert or toast.
- `action`: one practical recovery step.
- `recoverable`: whether retry or recovery is expected to help.
- `cause` or `details`: optional diagnostic context.

Native browser errors remain valid. `normalizeError()` adds the common fields at the reporting boundary instead of requiring every low-level failure to use a custom class.

## User-facing copy

Error messages shown directly to users should:

1. Say what failed in plain language.
2. Stay short enough to scan quickly.
3. Give one useful next step when action is needed.
4. Keep raw browser messages, paths, stack details, schema details, and other technical diagnostics inside **More information**.

The central reporter shows a concise message and recovery action in the persistent **Needs Attention** panel. Technical `code`, `context`, and `message` values remain available in the expandable report and activity log.

## Result objects

Lightweight results such as `{ok:false}`, `{status:"blocked"}`, and validation summaries remain appropriate for expected control flow. They should not be converted into exceptions merely for consistency.

## Release guardrail

`tests/unit/error-standardization.unit.mjs` verifies the shared error contract, concise catalog copy, runtime wiring, and standardized error creation for the main import, validation, storage, and folder boundaries.

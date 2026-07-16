# Wormholes Beta 301 — Threat model

## Purpose and scope

This document defines the security and data-integrity boundaries for the supported Wormholes Beta 301 desktop build. It covers the unmodified static release, its browser storage, user-selected folders, imported files, imported backups, rendered content, external links, and the rules that must apply before any future AI or network adapter is enabled.

The threat model is designed to protect:

- **Integrity:** imported, edited, and restored data must not bypass canonical validation or leave partially written records.
- **Recoverability:** a failed save, import, or restore should preserve the last valid state whenever the browser and storage remain available.
- **Execution safety:** authored and imported content must remain data and must not become executable script.
- **Network isolation:** the current build must not send project data to a remote service.
- **Clear limits:** Wormholes does not claim to protect data from a compromised device, browser profile, extension, operating system, or storage location.

This model does not claim confidentiality against someone who can access the browser profile, the selected folder, an exported backup, or the unlocked device. Wormholes does not encrypt those locations.

## Trust levels

| Trust level | Meaning |
| --- | --- |
| Trusted application code | The unmodified Wormholes release files and the browser APIs they call. |
| Conditionally trusted platform | The browser, operating system, browser profile, storage implementation, permission prompts, and file-system APIs. Wormholes depends on them but cannot verify them. |
| Untrusted data | Imported files, imported backups, folder contents, records read from browser storage, user-authored text, rich text, images, filenames, tags, and URLs. |
| Outside the Wormholes boundary | External websites, remote providers, other applications, browser extensions, device administrators, malware, and anyone with access to the underlying files or browser profile. |

## Data-flow rule

Every untrusted record must follow the same path before it becomes current app state:

`input, import, upload, editor, browser storage, or folder → canonical builder or migration → limits and security checks → persisted-schema validation → repository or transaction → storage → visible app state`

No input source is trusted merely because Wormholes created it earlier. Records read back from localStorage, IndexedDB, folders, exports, or backups are checked again before normal use.

## 1. Imported-file boundary

### Inputs

Standalone Literature documents, images, JSON app-data files, and other supported upload formats selected by the user.

### Assumptions

- A filename, extension, MIME type, and file contents may disagree.
- A document or image may be malformed, oversized, deeply nested, or designed to consume excessive storage or memory.
- Extracted text, rich text, metadata, filenames, and embedded links are untrusted.
- Selecting a file does not make its contents safe or truthful.

### Controls

- File-size and media-size limits run before storage-heavy work.
- Content-length, nesting-depth, and entity-count limits reject unreasonable structures.
- Supported conversion paths extract data; they do not intentionally execute macros, scripts, plug-ins, or embedded active content.
- Canonical builders, persisted schemas, ID checks, and cross-reference checks run before persistence.
- Rich text is sanitized and URLs are validated before imported content is accepted.
- Multi-part writes use the shared transaction coordinator and update visible state only after persistence succeeds.

### Residual risks

- Wormholes cannot determine whether imported content is accurate, appropriate, lawful, private, or malicious in a non-technical sense.
- Browser decoders and document APIs remain part of the platform trust boundary.
- A permitted large file can still use meaningful memory or storage within configured limits.

## 2. Imported-backup boundary

### Inputs

Wormholes App Data JSON exports and managed backup folders, including manifests, universe metadata, Archive data, Literature, Vision Board data, relationship data, and large-content files.

### Assumptions

- A backup may be incomplete, manually edited, produced by another version, or replaced by another program.
- A valid-looking manifest does not prove that every referenced file is present or trustworthy.
- IDs, references, schema versions, URLs, rich text, and large-content metadata may be hostile or inconsistent.
- Restoring a backup is destructive if it replaces current data.

### Controls

- Backup format, schema version, canonical record shape, limits, duplicate IDs, and cross-references are checked before replacement begins.
- Unsafe rich text and unsafe URLs stop the import or restore.
- A managed backup is considered complete only after its final completion marker is written.
- Incoming large content is written before metadata; universe and schema metadata are committed last.
- Transaction rollback, the write-ahead journal, and recovery snapshots protect the previous state during interrupted replacement.
- Visible app state changes only after the full restore transaction succeeds.

### Residual risks

- Validation cannot prove that a backup is the one the user intended to select.
- A backup can contain plausible but false or unwanted content.
- A backup stored in the same browser profile or on the same failing device may be lost with the primary data.

## 3. Folder-handle boundary

### Inputs and capabilities

Browser-granted directory handles, files within selected folders, browser-private file-system handles, and folder permissions restored across sessions where the browser allows it.

### Assumptions

- The browser and operating system decide whether access is granted, retained, revoked, or unavailable.
- Folder contents may be changed, moved, replaced, or deleted outside Wormholes at any time.
- A saved handle identifies a capability granted by the platform; it is not proof that the current contents are unchanged.
- Folder names and paths may reveal private information and must not be copied into support reports by default.

### Controls

- Folder access is user initiated and permission is checked before use.
- Wormholes recognizes managed folders through its marker and expected layout rather than trusting a folder name alone.
- Folder filenames are normalized before Wormholes creates files.
- Browser metadata remains the authoritative visible state until a folder write succeeds; partial folder-sync failures are reported without discarding the browser copy.
- Backup completion markers are written last.
- Support reports omit folder names, paths, and raw URLs.

### Residual risks

- Wormholes cannot stop another application or user from changing folder files.
- Revoked permission, disconnected drives, browser changes, or external edits can make folder content unavailable or inconsistent.
- Browser-private file-system storage may be removed with browser site data and is not an independent backup.

## 4. Browser-storage boundary

### Inputs and locations

Application state in localStorage, recovery snapshots, activity history, write-ahead metadata, preferences, and browser-managed storage status.

### Assumptions

- localStorage is not encrypted or tamper resistant.
- Site data can be cleared, evicted, corrupted, replaced by another same-origin script, or lost with the browser profile.
- Browser extensions, malware, device administrators, and anyone controlling the profile may be able to read or change stored data.
- Multiple tabs can attempt to edit stale state.

### Controls

- Stored datasets use versioned envelopes, migrations, canonical validation, and blocked-dataset handling.
- Corrupt or incompatible data is isolated rather than silently accepted.
- Storage-capacity checks and clear quota errors run before or during writes.
- Write-ahead recovery and recovery snapshots provide local integrity and short-term repair.
- Single-tab and stale-write protections reduce conflicting updates.
- The Data Safety dialog explains that browser data is local, unencrypted, and removable.

### Residual risks

- Local recovery data can disappear with the same browser profile as the primary data.
- No local control can protect data after the browser, profile, extension set, operating system, or unlocked device is compromised.
- Storage quotas and eviction behavior vary by browser and device.

## 5. IndexedDB boundary

### Inputs and locations

Large Literature content, full-size images, thumbnails, transaction journal data, and large-content records referenced by metadata stored elsewhere.

### Assumptions

- IndexedDB can be unavailable, blocked, cleared, evicted, interrupted, or quota limited.
- Metadata and large-content records can become mismatched after a browser or device failure.
- IndexedDB is browser-local storage, not an external backup or encrypted vault.

### Controls

- The large-data store reports availability and failure status instead of assuming IndexedDB exists.
- Large content is written before its metadata reference is committed.
- Failed metadata writes restore or remove the newly written large content where possible.
- Missing or damaged large records use recovery and fallback paths rather than being treated as valid content.
- Storage-capacity checks, transaction rollback, IndexedDB recovery, and lifecycle tests cover expected failure modes.

### Residual risks

- A browser-level corruption or profile loss can remove both metadata and recovery data.
- Recovery cannot recreate content that no valid copy retains.
- Private browsing and browser cleanup may remove IndexedDB without warning from Wormholes.

## 6. HTML rendering and sanitization boundary

### Inputs and sinks

Literature rich text, titles, descriptions, notes, tags, filenames, map labels, relationship text, imported markup, generated HTML fragments, and SVG or DOM rendering paths.

### Assumptions

- Stored and imported strings may contain scripts, event handlers, unsafe elements, malformed markup, encoded payloads, or misleading text.
- Sanitization is required at import and rendering boundaries; a prior successful save is not proof that later rendering is safe.
- Dynamic inline styles are used by trusted map and dialog geometry and must never be copied from untrusted markup.

### Controls

- Plain text is inserted through safe text helpers rather than raw HTML.
- Rich Literature content is sanitized through the centralized allowlist before storage or display.
- Imported rich text and encoded URL attributes are checked before the dataset is staged.
- URL attributes use the central URL policy.
- The Content Security Policy blocks inline scripts, event-handler attributes, eval-like code, plug-ins, frames, forms, and unapproved resource types.
- XSS payload, malicious-input, safe-render, normalization, and browser security tests cover the supported rendering paths.

### Residual risks

- A future DOM, SVG, editor, or template path can create a new sink and must be reviewed before release.
- Browser parsing defects are outside Wormholes' direct control.
- Sanitization does not make misleading or harmful prose truthful or safe to act upon.

## 7. External-URL boundary

### Inputs and navigation

URL fields, Literature links, imported links, and user clicks that leave the app.

### Assumptions

- URLs can use unsafe schemes, credentials, protocol-relative forms, backslashes, control characters, bidirectional text, encoded characters, or misleading hostnames.
- A technically valid external site can still be malicious, deceptive, unavailable, or privacy invasive.
- Opening a link leaves the Wormholes data and execution boundary.

### Controls

- Only explicit `http://` and `https://` external URLs are accepted for normal external links.
- Relative internal resources and external navigation are handled separately.
- Unsafe or obfuscated links are rejected during import and again at click time.
- External links receive `target="_blank"`, `rel="noopener noreferrer"`, and `referrerpolicy="no-referrer"`.
- The current Content Security Policy prevents external links from becoming background network access by the app.
- Blocked-link messages use short, non-technical wording.

### Residual risks

- URL validation cannot establish that a destination is honest or safe.
- The destination site and browser control the interaction after the user opens it.
- Users may reveal information directly to an external site after leaving Wormholes.

## 8. Future AI and network-adapter boundary

### Current state

Beta 290 has no AI provider integration, application account, remote synchronization service, or general remote network adapter. The Content Security Policy denies ordinary network connections; `connect-src` permits only local `blob:` reads used during local file processing.

### Threats that must be addressed before enablement

- Sending more project context than the user selected.
- Treating imported or stored prompt-injection text as trusted instructions.
- Letting a model or adapter mutate the DOM, localStorage, IndexedDB, folders, or canon directly.
- Applying partial or invalid AI changes.
- Presenting generated claims as existing stored facts.
- Exposing provider keys, prompts, private context, filenames, paths, or URLs.
- Broadly opening Content Security Policy network access.
- Failing to explain provider retention, privacy, offline behavior, or failure behavior.

### Required controls before any AI or network feature ships

- Provider enablement must be explicit, optional, and disabled by default.
- Network destinations must use a narrow allowlist; `connect-src` must not be broadly opened.
- The user must see and approve the exact context scope before remote transmission.
- Stored and imported content must be treated as data, not privileged instructions.
- AI output must be a proposal, not a direct mutation.
- Accepted proposals must pass canonical builders, schema validation, reference validation, limits, and the shared transaction API.
- Accepted changes must be previewable, attributable, logged, recoverable, and undoable.
- Provider secrets must not be placed in exported project data, activity logs, support reports, or user content.
- Core app use must remain available without AI and without network access.

### Release gate

Adding an AI provider, synchronization service, telemetry endpoint, update checker, remote asset, or other network adapter requires a new threat-model review, an updated provider/data-flow table, Content Security Policy review, privacy copy, failure and offline tests, and explicit user consent before data leaves the device.

## Threat, control, and test matrix

The file paths below are part of the release contract. A dedicated unit test verifies that each active threat has at least one named control and one existing regression test.

| Threat ID | Threat | Primary controls | Regression tests | Residual risk |
| --- | --- | --- | --- | --- |
| FILE-01 | Oversized or malformed imported file consumes resources or bypasses normal shape checks. | `scripts/modules/file-limits.mjs`; `scripts/modules/media-limits.mjs`; `scripts/modules/content-limits.mjs`; `scripts/modules/entity-limits.mjs`; `scripts/modules/app-data-validation.mjs` | `tests/unit/file-size-limits.unit.js`; `tests/unit/embedded-media-limits.unit.js`; `tests/unit/content-length-depth-limits.unit.js`; `tests/unit/entity-count-limits.unit.js`; `tests/unit/malformed-import-regressions.unit.js` | Valid files within limits can still use substantial local resources. |
| FILE-02 | Imported active content or hostile rich text reaches an executable render sink. | `scripts/modules/safe-render.mjs`; `scripts/modules/url-safety.mjs`; `scripts/modules/literature-content-helpers.mjs`; HTML Content Security Policy | `tests/unit/safe-render-helpers.unit.js`; `tests/unit/import-rich-text-sanitization.unit.js`; `tests/unit/xss-regression-payloads.unit.js`; `tests/unit/malicious-input-paths.unit.js`; `tests/e2e/malicious-input-paths.spec.js` | Future rendering sinks require separate review. |
| BACKUP-01 | Backup has an unsupported schema, invalid record shape, duplicate IDs, or broken references. | `scripts/modules/schema-versions.mjs`; `scripts/modules/canonical-persistence.mjs`; `scripts/modules/persisted-schema.mjs`; `scripts/modules/id-integrity.mjs`; `scripts/modules/reference-integrity.mjs` | `tests/unit/schema-version-migrations.unit.js`; `tests/unit/persisted-schema-type-checking.unit.js`; `tests/unit/duplicate-id-validation.unit.js`; `tests/unit/cross-reference-validation.unit.js`; `tests/unit/malformed-import-regressions.unit.js` | Valid structure does not prove desired or truthful content. |
| BACKUP-02 | Interrupted restore leaves a mixture of old and new data. | `scripts/modules/transactional-persistence.mjs`; `scripts/modules/data-portability-transaction-helpers.mjs`; `scripts/modules/write-ahead-journal.mjs`; `scripts/modules/recovery-snapshots.mjs` | `tests/unit/transactional-persistence.unit.mjs`; `tests/unit/json-import-failure-atomic.unit.js`; `tests/unit/backup-folder-restore-failure-atomic.unit.js`; `tests/unit/import-restore-rollback-regressions.unit.js` | Platform-level loss can remove both primary and recovery copies. |
| BACKUP-03 | Incomplete folder copy is mistaken for a complete managed backup. | Managed backup manifest validation and final completion marker in `scripts/modules/data-portability-controller.mjs` | `tests/unit/backup-folder-restore-failure-atomic.unit.js`; `tests/unit/export-import-module.unit.js` | External programs can later alter a completed backup. |
| FOLDER-01 | Permission is revoked or a saved directory handle becomes stale or unavailable. | `scripts/modules/folder-storage-controller.mjs`; repository failure classification in `scripts/modules/persistence-repositories.mjs` | `tests/unit/folder-storage.unit.js`; `tests/e2e/folder-sync.spec.js` | Browser and operating-system permission behavior remains external. |
| FOLDER-02 | Folder files are changed or deleted outside Wormholes. | Managed-folder marker checks; browser-first commit behavior; partial-sync warnings; folder reconnect and restore paths | `tests/unit/folder-storage.unit.js`; `tests/unit/import-restore-rollback-regressions.unit.js`; `tests/e2e/folder-sync.spec.js` | Wormholes cannot prevent external modification. |
| BROWSER-01 | localStorage is corrupt, incompatible, or manually changed. | `scripts/modules/persistence-repositories.mjs`; `scripts/modules/storage-recovery.mjs`; versioned envelopes and canonical validation | `tests/unit/corrupted-local-storage-recovery.unit.js`; `tests/unit/corrupted-storage-startup-regressions.unit.js`; `tests/e2e/corrupted-storage-startup.spec.js` | A compromised profile can alter both data and recovery state. |
| BROWSER-02 | Quota, eviction, private browsing, or site-data clearing removes or blocks data. | `scripts/modules/storage-capacity.mjs`; storage failure messages; App Data export and backup workflows | `tests/unit/storage-capacity-preflight.unit.js`; `tests/unit/storage-exhaustion.unit.js`; `tests/unit/private-browser-storage-ci.unit.js`; `tests/e2e/private-browser-and-clearing.spec.js` | Browsers may clear storage outside the app's control. |
| BROWSER-03 | Two tabs commit conflicting stale state. | Single-tab coordination and revision-aware persistence | `tests/unit/single-tab.unit.js`; `tests/unit/multi-tab-stale-write.unit.js` | Browser crashes can still interrupt coordination. |
| IDB-01 | IndexedDB is unavailable, quota limited, or fails mid-write. | `scripts/modules/large-data-store.mjs`; `scripts/modules/indexeddb-recovery.mjs`; `scripts/modules/transactional-persistence.mjs` | `tests/unit/indexeddb-record-recovery.unit.js`; `tests/unit/storage-exhaustion.unit.js`; `tests/e2e/literature-indexeddb-fallback.spec.js` | No recovery is possible if every retained copy is lost. |
| IDB-02 | Metadata references missing or mismatched large content. | Large-content-first transaction ordering; rollback of large-content writes; normalized render validation | `tests/unit/transactional-persistence.unit.mjs`; `tests/unit/normalized-render-validation.unit.js`; `tests/unit/indexeddb-record-recovery.unit.js` | Browser-wide corruption can affect both stores. |
| RENDER-01 | Stored or imported markup executes script or injects unsafe DOM or SVG. | `scripts/modules/safe-render.mjs`; centralized rich-text sanitization; Content Security Policy | `tests/unit/safe-render-helpers.unit.js`; `tests/unit/xss-regression-payloads.unit.js`; `tests/unit/malicious-input-paths.unit.js`; `tests/e2e/content-security-policy.spec.js` | Newly added sinks must be reviewed and tested. |
| URL-01 | Unsafe or obfuscated URL scheme is imported or opened. | `scripts/modules/url-safety.mjs`; `scripts/modules/safe-render.mjs`; click-time navigation guard | `tests/unit/url-link-hardening.unit.js`; `tests/e2e/url-link-hardening.spec.js`; `tests/unit/import-rich-text-sanitization.unit.js` | Valid destinations may still be deceptive or malicious. |
| URL-02 | External navigation leaks opener or referrer data. | `noopener noreferrer`; `no-referrer`; new-tab isolation; served `Referrer-Policy` | `tests/unit/url-link-hardening.unit.js`; `tests/unit/content-security-policy.unit.js` | The external site controls activity after navigation. |
| NETWORK-01 | A future adapter silently sends local project data to a remote endpoint. | Current `connect-src blob:` policy; no current provider adapter; mandatory explicit opt-in and scoped outbound preview before future enablement | `tests/unit/content-security-policy.unit.js`; `tests/unit/threat-model-coverage.unit.js`; `tests/e2e/content-security-policy.spec.js` | Future implementation requires new controls and tests before release. |
| AI-01 | Future model output bypasses validation, mutates canon directly, or presents inference as fact. | Required proposal-only command layer; canonical validation; shared transactions; preview, provenance, audit, recovery, and Undo release requirements | `tests/unit/threat-model-coverage.unit.js`; future feature-specific proposal and mutation tests are mandatory before enablement | No AI feature is enabled in Beta 290; implementation risk remains future work. |

## Maintenance rules

1. Every new import format, storage backend, rendering sink, external-resource type, provider, or network endpoint must add or update a threat entry before release.
2. Every active threat entry must name at least one concrete control and one automated regression test.
3. A planned control must be labeled as planned and must not be described as active protection.
4. User-facing warnings must use plain language and state what happened, what changed, and the safest next action.
5. Support reports must continue to omit project content, imported files, folder names, paths, raw URLs, and provider secrets.
6. Changes to the Content Security Policy, URL rules, sanitization, persistence schemas, transactions, folder access, or recovery require security-test review.
7. This document and `SECURITY_AND_TRUST.md` must be reviewed together for every release that changes a boundary described here.

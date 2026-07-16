# Wormholes Beta 301 security and trust boundaries

This document states what the supported Wormholes build protects, what it relies on, and what is outside its security boundary. It is intended for release reviewers, deployers, and maintainers. The in-app **Data Safety** dialog gives users a shorter plain-language summary.


## Threat-model reference

The detailed threat register, trust assumptions, residual risks, and control-to-test matrix are maintained in `THREAT_MODEL.md`. That document is the engineering source of truth; this file remains the concise release-level description of the supported security boundary.

## Supported build and deployment

The supported release is the unmodified static package containing the HTML file, `scripts/`, `styles/`, and the supplied security-header configuration.

Wormholes supports two launch modes:

1. Opening the packaged HTML file directly in a modern browser.
2. Serving the package as static files with the response headers in `_headers` or equivalent server configuration.

The HTML policy provides the baseline Content Security Policy in both modes. A served build must also send the supplied headers because `frame-ancestors` cannot be enforced by an HTML `<meta>` policy.

Changing scripts, weakening the Content Security Policy, adding third-party resources, or embedding Wormholes in another application creates a different trust boundary and requires a new security review.

## Data locations

Wormholes is local-first and has no application account or application-managed synchronization service.

Depending on the selected storage mode, data may exist in:

- Browser `localStorage` for application state and small records.
- Browser IndexedDB for larger Literature and image payloads.
- A user-selected operating-system folder when folder storage is enabled.
- User-created JSON exports and backup folders.
- Browser-local recovery snapshots and a short-lived write-ahead journal.

These locations are not encrypted by Wormholes. Device encryption, browser-profile protection, folder permissions, and backup-file protection are supplied by the operating system, browser, and user.

## Trusted components

The supported build relies on the following components behaving correctly:

- The user's operating system and device security.
- The browser, browser profile, installed extensions, and browser storage implementation.
- The unmodified Wormholes release files.
- Browser file and folder permission prompts.
- The user-selected destination for exports and backups.

A person or program that controls any of these components may be able to read, change, delete, or replace Wormholes data.

## Untrusted input

Wormholes treats these as untrusted data:

- Imported JSON and backup folders.
- Uploaded Literature documents and images.
- Authored titles, descriptions, notes, tags, filenames, and links.
- Stored records read back from browser or folder storage.

The supported build applies schema and type checks, file and media limits, entity limits, duplicate-ID checks, cross-reference validation, safe-rendering helpers, rich-text sanitization, and URL validation. Authored and imported content is displayed as data and is not intentionally executed as script.

No validation can prove that user-provided text, images, links, or documents are truthful, appropriate, non-infringing, or free of sensitive information. Users remain responsible for the content they store and share.

## Network and executable-content boundary

The supplied Content Security Policy restricts scripts to the release itself, blocks inline script and event handlers, blocks plug-ins and frames, and denies ordinary network connections. Image data is limited to packaged files, embedded data, and temporary browser blob addresses used by local processing.

Standard `http://` and `https://` links may be stored after validation. Following an external link leaves the Wormholes trust boundary; the destination site and browser then control that interaction.

The policy intentionally permits inline style attributes because map and dialog geometry is calculated at runtime. Those style values must continue to be created by trusted application code rather than copied from untrusted HTML.

## Integrity and recovery boundary

Wormholes provides safeguards against interrupted or invalid local operations:

- Imports and restores are checked before replacement and use rollback protection.
- A write-ahead journal repairs interrupted multi-store operations.
- Recovery snapshots provide a small local version history.
- Undo provides a short recovery window for supported destructive actions.
- The activity log records selected actions and error details.

These are convenience and integrity protections, not independent disaster-recovery backups. Browser clearing, private-browsing closure, storage eviction, profile loss, device loss, or a compromised browser may remove the application data, recovery snapshots, journal, and activity log together.

A JSON export or backup folder becomes independent protection only when it is stored outside the affected browser profile and device failure domain.

## Folder-storage boundary

Folder access is granted and revoked by the browser and operating system. Wormholes cannot prevent another application or user from moving, editing, replacing, or deleting folder files. A disconnected folder, revoked permission, unavailable drive, or external file change may make content unavailable or inconsistent until the folder is reconnected or a backup is restored.

A browser-local folder or browser-managed file-system area may still be removed with browser site data and should not be treated as an external backup.

## Confidentiality boundary

Wormholes does not provide:

- End-to-end encryption or a password-protected vault.
- User accounts, multi-user permissions, or access-control roles.
- Protection from malware, hostile browser extensions, a compromised browser or operating system, or physical access to an unlocked device.
- Remote backup, remote recovery, or cross-device synchronization.
- A guarantee that deleted data is securely erased from storage media or prior backups.

Do not use the supported build as the sole storage location for secrets or data requiring regulated confidentiality controls.

## Availability boundary

Browser storage quotas and eviction policies vary by browser and device. Wormholes checks capacity where browser APIs permit, but cannot guarantee that space will remain available. Very large collections may also be limited by device memory and browser performance.

Users should keep current exports, verify that backups can be opened, and retain copies in a location appropriate to the importance of the data.

## Security-relevant release changes

Changes to any of the following require review and regression testing:

- Content Security Policy or response headers.
- Import, restore, schema, sanitization, URL, or file-validation logic.
- Storage repositories, folder access, recovery snapshots, write-ahead journal, or Undo.
- Rendering paths that insert authored or imported content into HTML or SVG.
- External resources, network access, workers, frames, plug-ins, or third-party libraries.

Use the included security, malformed-import, XSS, rollback, accessibility, performance, and soak tests when preparing a served release.

# Wormholes Beta 301 — Canonical persistence architecture

## Purpose

Every persisted Wormholes record now follows one path:

`input / import / upload / editor draft → canonical builder → persisted-schema validation → repository → browser storage`

Feature code may create incomplete drafts, but it does not send those drafts directly to schema validation or storage. The canonical builder supplies safe defaults, normalizes legacy shapes, removes fields that are not part of the persisted contract, and rejects fields whose supplied type is invalid.

## Persisted entities

The canonical persistence module defines draft, canonical-domain, and persisted-record contracts for:

- Universes
- Archive creations and groups
- Literature documents and groups
- Vision Board items
- Connection notes
- Bridge notes
- Bridge references and tag references used by those records

The executable schema registry is `scripts/modules/canonical-persistence.mjs`. Its direct-file compatibility adapter is generated as `scripts/wormholes-canonical-persistence.js`.

## Exact persisted schemas

`persistedSchemas` is the authoritative field list for each persisted entity. Write validation rejects additional fields. Builders intentionally copy only declared fields, so temporary editor state, DOM state, and presentation-only values cannot leak into browser storage.

The repository envelope records both a write revision and an entity-schema version:

```text
{
  format,
  revision,
  updatedAt,
  schemaVersion,
  data
}
```

## Migrations

Unversioned and older repository envelopes are treated as entity-schema version 1. The migration registry converts them to the current entity schema before read validation. Current migrations include:

- Legacy bridge strings to canonical bridge objects
- Legacy `children` arrays to canonical `groupIds`
- Legacy string tag references to `{ universeId, entryId }`
- Missing required defaults and storage-key fields
- Removal of undeclared persistence fields

The app-data backup schema remains separately versioned through `schema-versions.mjs`.

## Drafts and canonical domain records

Draft contracts accept missing fields but do not accept a supplied value of the wrong type. Builders create fully formed canonical records. Repository writes call the same builders again as a final boundary, ensuring that a feature cannot accidentally bypass normalization.

Feature normalizers for Universes, Archive, Literature, and Vision Board delegate to these builders. This covers editor saves, generated creations, imported backups, uploaded Literature, uploaded images, folder rebuilds, and ordinary in-app edits.

## Presentation models

Display-only projections are separate from persistence records through `viewModels`:

- `universe`
- `archiveCard`
- `literatureRow`
- `visionTile`

These projections expose only the fields needed by a view and are never accepted by persistence repositories.

## User-facing errors

Canonical draft failures use plain language:

> Some information is incomplete or invalid. Review it and try again.

Technical paths and schema details remain available to diagnostics without being shown as the primary user message.

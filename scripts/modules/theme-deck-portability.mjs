/* Wormholes Beta 301 Theme Deck backup and restore helpers. */

export function themeStateForAppDataExport(target = globalThis) {
  return (
    target.WormholesThemeDecks?.exportState?.() || {
      version: 1,
      customDecks: [],
      selectedThemeIds: [],
    }
  );
}

export function prepareThemeStateForAppDataImport(importData, target = globalThis) {
  if (!Object.prototype.hasOwnProperty.call(importData || {}, "themes")) return null;
  return target.WormholesThemeDecks?.prepareImportedState?.(importData.themes) || null;
}

export function appendThemeStateWriteSteps(
  steps,
  prepared,
  assertWriteResult,
  target = globalThis,
) {
  const api = target.WormholesThemeDecks;
  if (!prepared?.themeState || !api) return;
  const previous = api.exportState?.();
  steps.push(
    {
      name: "custom-theme-decks",
      phase: "collection-metadata",
      execute: () =>
        assertWriteResult(
          api.writePreparedCustomDecks?.(prepared.themeState),
          "Custom themes could not be saved.",
        ),
      rollback: () => (previous ? api.writePreparedCustomDecks?.(previous) : true),
    },
    {
      name: "selected-themes",
      phase: "collection-metadata",
      execute: () =>
        assertWriteResult(
          api.writePreparedSelection?.(prepared.themeState),
          "Theme choices could not be saved.",
        ),
      rollback: () => (previous ? api.writePreparedSelection?.(previous) : true),
    },
  );
}

export function applyPreparedThemeStateToRuntime(prepared, target = globalThis) {
  if (!prepared?.themeState) return false;
  return (
    target.WormholesThemeDecks?.applyPreparedState?.(prepared.themeState, {reason: "restore"}) ||
    false
  );
}

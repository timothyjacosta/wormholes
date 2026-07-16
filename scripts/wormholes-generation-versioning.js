/* GENERATED from scripts/modules/generation-versioning.mjs. Do not edit this compatibility adapter directly. */
(function(global){
  "use strict";
  const DIAGNOSTIC_VERSION = 2;
  const LEGACY_DIAGNOSTIC_VERSION = 1;
  const ALGORITHM = "xorshift32-v1";
  const SEED_BEHAVIOR_VERSION = "xorshift32-inclusive-int-v1";
  const GENERATOR_VERSION = "beta-297";
  const TABLE_VERSION = "theme-decks-v1";
  const MAX_ACTIONS = 100;
  
  function cleanText(value, maximum) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum);
  }
  
  function normalizeAction(action) {
    if (!action || typeof action !== "object" || Array.isArray(action)) return null;
    const kind = cleanText(action.kind, 30);
    if (!["what", "attribute", "story", "quick-full"].includes(kind)) return null;
    const rolls = {};
    if (action.rolls && typeof action.rolls === "object" && !Array.isArray(action.rolls)) {
      Object.entries(action.rolls)
        .slice(0, 8)
        .forEach(([key, value]) => {
          const cleanKey = cleanText(key, 20);
          if (
            /^[a-z][a-z0-9]{0,19}$/i.test(cleanKey) &&
            Number.isInteger(value) &&
            value >= 1 &&
            value <= 1000
          ) {
            rolls[cleanKey] = value;
          }
        });
    }
    return {kind, rolls};
  }
  
  function normalizeDiagnostic(metadata) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  
    const version = Number(metadata.version);
    if (version !== LEGACY_DIAGNOSTIC_VERSION && version !== DIAGNOSTIC_VERSION) return null;
  
    const seed = cleanText(metadata.seed, 16).toLowerCase();
    const algorithm = cleanText(metadata.algorithm, 40);
    const generatorVersion = cleanText(metadata.generatorVersion, 40);
    const tableVersion = cleanText(metadata.tableVersion, 80);
    const draws = Number(metadata.draws);
  
    if (!/^[0-9a-f]{8}$/.test(seed)) return null;
    if (algorithm !== ALGORITHM || !generatorVersion || !tableVersion) return null;
    if (!Number.isInteger(draws) || draws < 0 || draws > 10000) return null;
  
    const rawSeedBehaviorVersion = cleanText(metadata.seedBehaviorVersion, 80);
    const seedBehaviorVersion =
      version === LEGACY_DIAGNOSTIC_VERSION
        ? rawSeedBehaviorVersion || SEED_BEHAVIOR_VERSION
        : rawSeedBehaviorVersion;
    if (!seedBehaviorVersion) return null;
  
    const rawFingerprint = cleanText(metadata.tableFingerprint, 16).toLowerCase();
    const tableFingerprint = /^[0-9a-f]{8}$/.test(rawFingerprint) ? rawFingerprint : "";
    if (version === DIAGNOSTIC_VERSION && !tableFingerprint) return null;
  
    const actions = Array.isArray(metadata.actions)
      ? metadata.actions.slice(0, MAX_ACTIONS).map(normalizeAction).filter(Boolean)
      : [];
    const activeThemeIds = Array.isArray(metadata.activeThemeIds)
      ? [...new Set(metadata.activeThemeIds.map((id) => cleanText(id, 120)).filter(Boolean))].slice(
          0,
          50,
        )
      : [];
  
    return {
      version,
      seed,
      algorithm,
      seedBehaviorVersion,
      generatorVersion,
      tableVersion,
      ...(tableFingerprint ? {tableFingerprint} : {}),
      ...(activeThemeIds.length ? {activeThemeIds} : {}),
      draws,
      actions,
      ...(metadata.authoredChanges === true ? {authoredChanges: true} : {}),
    };
  }
  
  function compatibility(metadata, currentVersions = {}) {
    const normalized = normalizeDiagnostic(metadata);
    if (!normalized) return {supported: false, reproducible: false, reasons: ["invalid-diagnostic"]};
    const reasons = [];
    if (normalized.algorithm !== (currentVersions.algorithm || ALGORITHM)) reasons.push("algorithm");
    if (
      normalized.seedBehaviorVersion !==
      (currentVersions.seedBehaviorVersion || SEED_BEHAVIOR_VERSION)
    )
      reasons.push("seed-behavior");
    if (
      currentVersions.generatorVersion &&
      normalized.generatorVersion !== currentVersions.generatorVersion
    )
      reasons.push("generator-version");
    if (currentVersions.tableVersion && normalized.tableVersion !== currentVersions.tableVersion)
      reasons.push("table-version");
    if (
      currentVersions.tableFingerprint &&
      normalized.tableFingerprint !== currentVersions.tableFingerprint
    )
      reasons.push("table-fingerprint");
    return {supported: true, reproducible: reasons.length === 0, reasons};
  }
  
  const api = Object.freeze({
    diagnosticVersion: DIAGNOSTIC_VERSION,
    legacyDiagnosticVersion: LEGACY_DIAGNOSTIC_VERSION,
    algorithm: ALGORITHM,
    seedBehaviorVersion: SEED_BEHAVIOR_VERSION,
    generatorVersion: GENERATOR_VERSION,
    tableVersion: TABLE_VERSION,
    normalizeDiagnostic,
    compatibility,
  });
  
  if (typeof window !== "undefined") window.WormholesGenerationVersioning = api;
  global.WormholesGenerationVersioning = api;
})(window);

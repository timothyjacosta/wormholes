/* GENERATED from scripts/modules/generation-controller.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 generation module.
   Generate tab roll tables, dice animation, skip-animation preference, current-creation state, and manual creation helpers split from wormholes-app.js. */


const MANUAL_CREATE_FIELD_IDS = Object.freeze([
  "manualTitle",
  "manualWhat",
  "manualWhatCustom",
  "manualAttr1",
  "manualAttr1Custom",
  "manualAttr2",
  "manualAttr2Custom",
  "manualStory",
  "manualStoryCustom",
]);

const legacyWhat = [
  "Character — Protagonist, explorer, mercenary, or chosen figure",
  "Character — Antagonist, rival, hunter, tyrant, or betrayer",
  "Character — Ally, guide, specialist, companion, or side character",
  "Character — Legend, folk hero, vanished ruler, inventor, or historical figure",
  "Creature — Animal, monster, pest, mount, or companion species",
  "Creature — Plant, fungus, parasite, coral, or living landscape",
  "Society — Intelligent species, ancestry, or engineered people",
  "Society — Clan, tribe, guild, crew, family, caste, or social group",
  "Society — Religion, spiritual tradition, philosophy, taboo, or ritual",
  "Place — Planet, moon, asteroid, artificial world, or dimension",
  "Place — City, village, station, colony, fortress, or settlement",
  "Place — Region, biome, wilderness, sea, desert, jungle, or underworld",
  "Place — Landmark, ruin, temple, battlefield, portal, anomaly, or sacred site",
  "Technology — Vehicle, machine, weapon, tool, robot, or experimental device",
  "Technology — Artifact, relic, treasure, key, container, or mysterious object",
  "Technology — Resource, fuel, material, medicine, food source, or trade good",
  "Organization — Empire, corporation, military order, guild, cult, gang, or resistance",
  "Event — Disaster, war, expedition, discovery, uprising, heist, or mystery",
  "Knowledge — Map, prophecy, secret, scientific theory, forbidden language, or lost record",
  "Relationship — Alliance, rivalry, bond, feud, pact, or lineage",
];

const legacyAttr = [
  "Ancient but still active",
  "Newly discovered or recently awakened",
  "Hidden inside, beneath, or behind something ordinary",
  "Built, grown, or assembled from salvaged remains",
  "Living, semi-living, or biologically engineered",
  "Mechanical but capable of emotion or instinct",
  "Beautiful, cheerful, or harmless-looking—but dangerous",
  "Weathered, haunted, abandoned, or partially ruined",
  "Small in physical scale but hugely important",
  "Enormous in scale but surprisingly fragile",
  "Controlled by sound, music, rhythm, names, or language",
  "Powered by a rare fuel, creature, memory, dream, or emotion",
  "Believed extinct, mythical, impossible, or fictional",
  "Split between two opposing functions, loyalties, or identities",
  "Always moving, migrating, drifting, growing, or changing",
  "Collects, archives, hoards, or preserves something",
  "Changes form under specific conditions",
  "Protected by an oath, code, curse, ritual, or law",
  "A failed experiment that became unexpectedly useful",
  "Has a secret identity, hidden purpose, or concealed interior",
  "Marked by unusual eyes, horns, scars, feathers, fur, scales, or skin",
  "Speaks, sings, growls, clicks, or communicates in an unusual way",
  "Bonded to a person, creature, place, object, or oath",
  "Carries a visible sign of rank, exile, mutation, blessing, or curse",
  "Has instincts that conflict with intelligence, duty, or emotion",
  "Born, hatched, cloned, summoned, or awakened under strange conditions",
  "Has a reputation that is exaggerated, mistaken, or dangerously incomplete",
  "Depends on a herd, hive, pack, host, rider, or companion to survive",
  "Can sense emotions, illness, lies, danger, weather, or unseen forces",
  "Looks ordinary until angered, threatened, hungry, or exposed to something",
  "Is unusually loyal, territorial, curious, vain, skittish, or stubborn",
  "Carries parasites, symbiotes, spores, eggs, seeds, or hidden offspring",
  "Has a ritual behavior, migration pattern, mating display, or feeding cycle",
  "Imitates voices, faces, behavior, tools, or the appearance of another species",
  "Was trained, domesticated, altered, exiled, crowned, or weaponized by others",
  "Has a missing memory, lost name, broken instinct, or forgotten command",
  "Can heal, poison, charm, frighten, track, mimic, or transform others",
  "Must hide a weakness, appetite, transformation, injury, or forbidden ability",
  "Is respected, feared, hunted, worshiped, collected, or protected by a culture",
  "Leaves behind a distinctive trail, scent, song, mark, shell, molt, or omen",
];

const legacyPressure = [
  "It is being hunted, stolen, or captured.",
  "It is searching for a missing counterpart.",
  "It holds a map, route, or message no one can fully interpret.",
  "It is the last known example of its kind.",
  "It is one piece of a larger machine, system, or mystery.",
  "It causes strange transformations in nearby people or places.",
  "It is protected by an unlikely guardian.",
  "It can only be reached, used, or understood at a particular time.",
  "Two or more factions claim ownership of it.",
  "It is slowly waking up, spreading, or becoming active again.",
  "It produces something everyone needs but nobody understands.",
  "It is blamed for a disaster it did not cause.",
  "It contains, shelters, or imprisons another intelligence.",
  "It grants a benefit but demands a cost.",
  "It was created for war but is now used for survival.",
  "It has a deadline, countdown, limited lifespan, or approaching failure.",
  "It is tied to an old game, nursery rhyme, folk tale, or superstition.",
  "It opens a path to another world, era, scale, or state of reality.",
  "It has been copied, imitated, or counterfeited—with dangerous results.",
  "It changes a small but important rule of reality nearby.",
];

const themeDecksApi =
  typeof importedThemeDeckApi !== "undefined"
    ? importedThemeDeckApi
    : globalThis.WormholesThemeDecks || globalThis.window?.WormholesThemeDecks || null;

/*
  These flattened tables remain available to edit dialogs, diagnostics, and
  compatibility tests. Generate and Create use the selected Theme Decks below,
  rather than sampling these combined arrays directly.
*/
const what = themeDecksApi?.allBuiltInCards?.("what") || legacyWhat;
const attr = themeDecksApi?.allBuiltInCards?.("attribute") || legacyAttr;
const pressure = themeDecksApi?.allBuiltInCards?.("story") || legacyPressure;

const GENERATION_FIELDS = Object.freeze(["what", "attr1", "attr2", "pressure"]);
const GENERATION_FIELD_LABELS = Object.freeze({
  what: "What",
  attr1: "Attribute 1",
  attr2: "Attribute 2",
  pressure: "Story",
});

function emptyGenerationLocks() {
  return {what: false, attr1: false, attr2: false, pressure: false};
}

let current = {what: null, attr1: null, attr2: null, pressure: null};
let currentLocks = emptyGenerationLocks();

/*
  Reproducible generation diagnostics are intentionally background-only.
  There are no visible seed controls. A seed is created when the first roll for
  a creation occurs, drives only result selection (not decorative animation),
  and is retained with archived generated creations for tests and support.
*/
const generationVersioning =
  globalThis.WormholesGenerationVersioning ||
  globalThis.window?.WormholesGenerationVersioning ||
  {};
const WORMHOLES_ROLL_DIAGNOSTIC_VERSION = generationVersioning.diagnosticVersion || 2;
const WORMHOLES_ROLL_ALGORITHM = generationVersioning.algorithm || "xorshift32-v1";
const WORMHOLES_SEED_BEHAVIOR_VERSION =
  generationVersioning.seedBehaviorVersion || "xorshift32-inclusive-int-v1";
const WORMHOLES_GENERATOR_VERSION = generationVersioning.generatorVersion || "beta-297";
const WORMHOLES_GENERATION_TABLE_VERSION = generationVersioning.tableVersion || "theme-decks-v1";
let currentGenerationSession = null;
let currentGenerationActions = [];
let currentRollHistoryId = null;
let nextGenerationSeedOverride = null;

function hashGenerationSeed(value) {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x6d2b79f5;
}

function normalizeGenerationSeed(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value) >>> 0 || 0x6d2b79f5;
  }
  const text = String(value ?? "").trim();
  if (/^(?:0x)?[0-9a-f]{1,8}$/i.test(text)) {
    return Number.parseInt(text.replace(/^0x/i, ""), 16) >>> 0 || 0x6d2b79f5;
  }
  return hashGenerationSeed(text);
}

function formatGenerationSeed(value) {
  return normalizeGenerationSeed(value).toString(16).padStart(8, "0");
}

const WORMHOLES_GENERATION_TABLE_FINGERPRINT = hashGenerationSeed(
  JSON.stringify({what, attr, pressure, themes: themeDecksApi?.diagnostics?.() || null}),
)
  .toString(16)
  .padStart(8, "0");

function createRandomGenerationSeed() {
  try {
    const cryptoObject = globalThis.crypto;
    if (cryptoObject?.getRandomValues) {
      const values = new Uint32Array(1);
      cryptoObject.getRandomValues(values);
      return values[0] || 0x6d2b79f5;
    }
  } catch (error) {}

  const time = Date.now() >>> 0;
  const fineTime = Math.floor((globalThis.performance?.now?.() || 0) * 1000) >>> 0;
  const fallbackRandom = Math.floor(Math.random() * 0x100000000) >>> 0;
  return time ^ fineTime ^ fallbackRandom || 0x6d2b79f5;
}

function createGenerationSession(seedValue, options = {}) {
  const requestedBehavior = String(options?.seedBehaviorVersion || WORMHOLES_SEED_BEHAVIOR_VERSION);
  if (requestedBehavior !== WORMHOLES_SEED_BEHAVIOR_VERSION) {
    throw new RangeError(`Unsupported generation seed behavior: ${requestedBehavior}`);
  }
  const seedState = normalizeGenerationSeed(seedValue ?? createRandomGenerationSeed());
  let state = seedState;
  let draws = 0;

  return {
    seed: formatGenerationSeed(seedState),
    algorithm: WORMHOLES_ROLL_ALGORITHM,
    seedBehaviorVersion: requestedBehavior,
    next() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      if (!state) state = 0x6d2b79f5;
      draws += 1;
      return state / 0x100000000;
    },
    int(maximum) {
      const max = Math.max(1, Math.floor(Number(maximum) || 1));
      return Math.floor(this.next() * max) + 1;
    },
    get draws() {
      return draws;
    },
  };
}

function useGenerationSeedForNextSession(seedValue) {
  nextGenerationSeedOverride = formatGenerationSeed(seedValue);
  return nextGenerationSeedOverride;
}

function ensureCurrentGenerationSession() {
  if (!currentGenerationSession) {
    const seed = nextGenerationSeedOverride || createRandomGenerationSeed();
    nextGenerationSeedOverride = null;
    currentGenerationSession = createGenerationSession(seed);
    currentGenerationActions = [];
  }
  return currentGenerationSession;
}

function generationRandomInt(maximum) {
  return ensureCurrentGenerationSession().int(maximum);
}

function recordGenerationAction(kind, rolls = {}) {
  if (!currentGenerationSession) return;
  const cleanRolls = {};
  Object.entries(rolls || {}).forEach(([key, value]) => {
    if (Number.isInteger(value) && value > 0) cleanRolls[key] = value;
  });
  currentGenerationActions.push({kind: String(kind || "roll"), rolls: cleanRolls});
  recordCompletedGenerationHistoryIfNeeded();
}

function recordCompletedGenerationHistoryIfNeeded() {
  if (currentRollHistoryId || !currentGenerationSession || !isCurrentCreationComplete())
    return null;
  const universe =
    typeof (globalThis.controllerServices || globalThis).getCurrentUniverse === "function"
      ? (globalThis.controllerServices || globalThis).getCurrentUniverse()
      : null;
  const recorded = window.WormholesRecentRollHistory?.recordCompleted?.({
    universeId: typeof currentUniverseId === "string" ? currentUniverseId : "",
    universeTitle: universe?.title || "",
    result: {
      what: current.what?.val || "",
      attr1: current.attr1?.val || "",
      attr2: current.attr2?.val || "",
      pressure: current.pressure?.val || "",
    },
    diagnostic: currentGenerationMetadata(),
  });
  currentRollHistoryId = recorded?.id || null;
  return recorded || null;
}

function currentGenerationMetadata() {
  if (!currentGenerationSession) return null;
  return {
    version: WORMHOLES_ROLL_DIAGNOSTIC_VERSION,
    seed: currentGenerationSession.seed,
    algorithm: currentGenerationSession.algorithm,
    seedBehaviorVersion: currentGenerationSession.seedBehaviorVersion,
    generatorVersion: WORMHOLES_GENERATOR_VERSION,
    tableVersion: WORMHOLES_GENERATION_TABLE_VERSION,
    tableFingerprint: WORMHOLES_GENERATION_TABLE_FINGERPRINT,
    activeThemeIds: themeDecksApi?.activeIds?.() || [],
    draws: currentGenerationSession.draws,
    actions: currentGenerationActions.map((action) => ({
      kind: action.kind,
      rolls: {...action.rolls},
    })),
  };
}

function resetCurrentGenerationDiagnostics() {
  currentGenerationSession = null;
  currentGenerationActions = [];
  currentRollHistoryId = null;
  currentLocks = emptyGenerationLocks();
}

function archivedGenerationDiagnostics(entryOrId) {
  const entry =
    typeof entryOrId === "string"
      ? typeof (globalThis.controllerServices || globalThis).getEntry === "function"
        ? (globalThis.controllerServices || globalThis).getEntry(entryOrId)
        : null
      : entryOrId;
  const metadata = entry?._generation;
  if (!metadata || typeof metadata !== "object") return null;
  const normalized =
    typeof (globalThis.controllerServices || globalThis).normalizeGenerationDiagnostics === "function"
      ? (globalThis.controllerServices || globalThis).normalizeGenerationDiagnostics(metadata)
      : metadata;
  if (!normalized) return null;
  try {
    return JSON.parse(JSON.stringify(normalized));
  } catch (error) {
    return null;
  }
}

if (typeof window !== "undefined") {
  const generationVersions = Object.freeze({
    diagnosticVersion: WORMHOLES_ROLL_DIAGNOSTIC_VERSION,
    algorithm: WORMHOLES_ROLL_ALGORITHM,
    seedBehaviorVersion: WORMHOLES_SEED_BEHAVIOR_VERSION,
    generatorVersion: WORMHOLES_GENERATOR_VERSION,
    tableVersion: WORMHOLES_GENERATION_TABLE_VERSION,
    tableFingerprint: WORMHOLES_GENERATION_TABLE_FINGERPRINT,
  });
  window.WormholesGenerationDiagnostics = Object.freeze({
    version: WORMHOLES_ROLL_DIAGNOSTIC_VERSION,
    algorithm: WORMHOLES_ROLL_ALGORITHM,
    versions: generationVersions,
    useSeedForNextSession: useGenerationSeedForNextSession,
    clearPendingSeed() {
      nextGenerationSeedOverride = null;
    },
    createSession: createGenerationSession,
    current: currentGenerationMetadata,
    forEntry: archivedGenerationDiagnostics,
    compatibility(metadata) {
      return generationVersioning.compatibility
        ? generationVersioning.compatibility(metadata, generationVersions)
        : {supported: !!metadata, reproducible: false, reasons: ["version-helper-unavailable"]};
    },
  });
}

let isRolling = false;
const SKIP_ROLL_ANIMATION_KEY = "wormholesSkipRollAnimation";
let skipRollAnimation = false;

function loadSkipRollAnimation() {
  const repository = window.WormholesRepositories?.preferences;
  const stored = repository
    ? repository.readText(SKIP_ROLL_ANIMATION_KEY, "false")
    : globalThis.localStorage?.getItem?.(SKIP_ROLL_ANIMATION_KEY) || "false";
  skipRollAnimation = stored === "true";
  updateSkipRollAnimationControl();
}

function saveSkipRollAnimation() {
  const repository = window.WormholesRepositories?.preferences;
  if (repository) {
    repository.writeText(SKIP_ROLL_ANIMATION_KEY, skipRollAnimation ? "true" : "false", {
      context: "Could not save roll-animation preference",
      userMessage: "Animation preference could not be saved.",
    });
    return;
  }
  try {
    globalThis.localStorage?.setItem?.(
      SKIP_ROLL_ANIMATION_KEY,
      skipRollAnimation ? "true" : "false",
    );
  } catch (error) {}
}

function updateSkipRollAnimationControl() {
  const control = document.getElementById("skipRollAnimationToggle");
  if (control) control.checked = !!skipRollAnimation;
}

function handleSkipRollAnimationToggle(event) {
  skipRollAnimation = !!event.target.checked;
  saveSkipRollAnimation();
}

function updateSkipRollLayout() {
  const wrap = document.querySelector(".generate-bottom-controls");
  const buttons = document.querySelector(".creation-action-buttons");
  const toggle = document.querySelector(".skip-roll-toggle");
  if (!wrap || !buttons || !toggle) return;

  wrap.classList.remove("skip-roll-wrapped");

  const wrapWidth = wrap.clientWidth || wrap.getBoundingClientRect().width || 0;
  const buttonsWidth = buttons.getBoundingClientRect().width || buttons.offsetWidth || 0;
  const toggleWidth = Math.max(
    toggle.scrollWidth || 0,
    toggle.getBoundingClientRect().width || toggle.offsetWidth || 0,
  );
  const gap = 14;
  const availableRightSpace = wrapWidth - (wrapWidth + buttonsWidth) / 2;
  const shouldWrap = availableRightSpace < toggleWidth + gap;

  wrap.classList.toggle("skip-roll-wrapped", shouldWrap);
}

function installSkipRollLayoutWatcher() {
  const wrap = document.querySelector(".generate-bottom-controls");
  if (!wrap || wrap.dataset.skipLayoutWatcher === "true") return;
  wrap.dataset.skipLayoutWatcher = "true";

  const scheduleUpdate = () => requestAnimationFrame(updateSkipRollLayout);
  window.addEventListener("resize", scheduleUpdate);

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(wrap);
    const buttons = document.querySelector(".creation-action-buttons");
    const toggle = document.querySelector(".skip-roll-toggle");
    if (buttons) observer.observe(buttons);
    if (toggle) observer.observe(toggle);
  }

  scheduleUpdate();
}

function shouldSkipRollAnimation() {
  return skipRollAnimation || prefersReducedMotion();
}

function prefersReducedMotion() {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function resultFromRoll(arr, roll) {
  const safeRoll = Math.max(1, Math.min(20, Number(roll) || 1));
  const index = Math.floor(((safeRoll - 1) / 20) * arr.length);
  return {val: arr[Math.max(0, Math.min(arr.length - 1, index))], roll: safeRoll};
}

function resultFromAttributeRoll(roll) {
  const maximum = Math.max(1, attr.length);
  const safeRoll = Math.max(1, Math.min(maximum, Number(roll) || 1));
  return {val: attr[safeRoll - 1], roll: safeRoll};
}

function randomAttributeRoll() {
  return generationRandomInt(Math.max(1, attr.length));
}

function normalizedAttributeValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function selectedAttributeValuesFromCurrent() {
  return [current.attr1?.val, current.attr2?.val].map(normalizedAttributeValue).filter(Boolean);
}

function resultFromAttributeRollExcluding(roll, usedValues = []) {
  const used = new Set((usedValues || []).map(normalizedAttributeValue).filter(Boolean));
  const first = resultFromAttributeRoll(roll);
  if (!used.has(normalizedAttributeValue(first.val))) return first;

  /*
    Attribute selection uses an internal 1..40 roll so every authored attribute
    is reachable. Duplicate results silently reroll without changing the visible
    D20 animation or any other user-facing behavior.
  */
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const candidate = resultFromAttributeRoll(randomAttributeRoll());
    if (!used.has(normalizedAttributeValue(candidate.val))) return candidate;
  }

  for (let reroll = 1; reroll <= attr.length; reroll += 1) {
    const candidate = resultFromAttributeRoll(reroll);
    if (!used.has(normalizedAttributeValue(candidate.val))) return candidate;
  }

  return first;
}

function themedResult(type, visualRoll, excludedValues = []) {
  const normalizedType = type === "pressure" ? "story" : type === "attr" ? "attribute" : type;
  if (themeDecksApi?.chooseCard) {
    const result = themeDecksApi.chooseCard(normalizedType, {
      randomInt: generationRandomInt,
      excludedValues,
    });
    if (!result) {
      throw new Error(`No selected theme has ${normalizedType} cards.`);
    }
    return {
      ...result,
      roll: result.cardNumber,
      visualRoll: Math.max(1, Math.min(20, Number(visualRoll) || 1)),
    };
  }

  if (normalizedType === "what")
    return resultFromRollExcluding(what, visualRoll, excludedValues[0]);
  if (normalizedType === "story")
    return resultFromRollExcluding(pressure, visualRoll, excludedValues[0]);
  return resultFromAttributeRollExcluding(randomAttributeRoll(), excludedValues);
}

function themeTypeHasCards(type) {
  if (!themeDecksApi?.hasCards) return true;
  return themeDecksApi.hasCards(type);
}

function showMissingThemeCards(type) {
  const label = type === "attribute" ? "Attribute" : type === "story" ? "Story" : "What";
  const message = `Choose a theme with ${label} cards.`;
  if (typeof showSavedToast === "function") showSavedToast(message);
  else window.WormholesActivityLog?.recordAction?.(message);
}

function animateD20(actionLabel, onComplete) {
  if (isRolling) return;
  const finalRoll = generationRandomInt(20);
  if (shouldSkipRollAnimation()) {
    isRolling = true;
    updateButtons();
    onComplete(finalRoll);
    isRolling = false;
    updateButtons();
    return;
  }
  isRolling = true;
  updateButtons();

  const stage = document.getElementById("currentTab");
  const canvas = document.getElementById("diceCanvas");
  const ctx = canvas.getContext("2d");
  const fromRight = Math.random() > 0.5;

  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  canvas.classList.add("showing");
  canvas.style.opacity = "1";

  const phi = (1 + Math.sqrt(5)) / 2;
  const rawVerts = [
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ];

  const len = Math.hypot(rawVerts[0][0], rawVerts[0][1], rawVerts[0][2]);
  const verts = rawVerts.map((v) => [v[0] / len, v[1] / len, v[2] / len]);

  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  const faceLabels = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  const floorY = Math.max(205, rect.height - 92);
  const radius = Math.min(46, Math.max(34, rect.width * 0.075));
  const startX = fromRight ? rect.width - radius - 14 : radius + 14;
  const startY = -radius * 1.6;
  const direction = fromRight ? -1 : 1;

  let state = {
    x: startX,
    y: startY,
    vx: direction * (4.6 + Math.random() * 1.4),
    vy: 2.2,
    rx: Math.random() * Math.PI * 2,
    ry: Math.random() * Math.PI * 2,
    rz: Math.random() * Math.PI * 2,
    avx: (0.16 + Math.random() * 0.06) * (Math.random() > 0.5 ? 1 : -1),
    avy: (0.18 + Math.random() * 0.08) * direction,
    avz: (0.24 + Math.random() * 0.08) * direction,
    radius,
  };

  const gravity = 0.38;
  const bounce = 0.62;
  const floorFriction = 0.84;
  const airDrag = 0.994;
  const angularDragAir = 0.992;
  const angularDragFloor = 0.78;
  const minDuration = 2600;
  const maxDuration = 4400;
  let start = performance.now();
  let last = start;
  let settledAt = null;
  let finished = false;

  function rotateVertex(v) {
    let [x, y, z] = v;

    let cy = Math.cos(state.ry),
      sy = Math.sin(state.ry);
    let cx = Math.cos(state.rx),
      sx = Math.sin(state.rx);
    let cz = Math.cos(state.rz),
      sz = Math.sin(state.rz);

    let x1 = x * cy + z * sy;
    let z1 = -x * sy + z * cy;
    let y1 = y;

    let y2 = y1 * cx - z1 * sx;
    let z2 = y1 * sx + z1 * cx;
    let x2 = x1;

    let x3 = x2 * cz - y2 * sz;
    let y3 = x2 * sz + y2 * cz;

    return [x3, y3, z2];
  }

  function drawDie() {
    ctx.clearRect(0, 0, rect.width, rect.height);

    // contact shadow
    const shadowDistance = Math.max(0, floorY - (state.y + state.radius));
    const shadowScale = Math.max(0.38, 1 - shadowDistance / 190);
    const shadowAlpha = Math.max(0.08, 0.34 - shadowDistance / 520);
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = "rgba(0,0,0,.58)";
    ctx.beginPath();
    ctx.ellipse(
      state.x,
      floorY + state.radius * 0.82,
      state.radius * 1.05 * shadowScale,
      state.radius * 0.23 * shadowScale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    const rotated = verts.map(rotateVertex);
    const projected = rotated.map(([x, y, z]) => {
      const perspective = 2.85 / (2.85 - z);
      return {
        x: state.x + x * state.radius * perspective,
        y: state.y + y * state.radius * perspective,
        z,
        p: perspective,
      };
    });

    const light = normalize([-0.45, -0.65, 1.0]);

    let visibleFaces = faces
      .map((face, idx) => {
        const a = rotated[face[0]],
          b = rotated[face[1]],
          c = rotated[face[2]];
        const n = normalize(cross(sub(b, a), sub(c, a)));
        const centerZ = (a[2] + b[2] + c[2]) / 3;
        const brightness = Math.max(0, dot(n, light));
        return {face, idx, n, centerZ, brightness};
      })
      .filter((f) => f.n[2] > -0.05)
      .sort((a, b) => a.centerZ - b.centerZ);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (const f of visibleFaces) {
      const pts = f.face.map((i) => projected[i]);
      const shade = f.brightness;
      const base = shade > 0.62 ? [232, 222, 199] : shade > 0.38 ? [199, 184, 154] : [143, 126, 98];
      const blueTint = shade > 0.52 ? 12 : 0;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.fillStyle = `rgb(${Math.min(245, base[0] + blueTint)},${Math.min(235, base[1] + blueTint)},${Math.min(213, base[2] + blueTint)})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(42,35,28,.58)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Subtle inner facet line toward face center.
      const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(pts[0].x, pts[0].y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.stroke();
    }

    // outline edges over all visible faces
    ctx.strokeStyle = "rgba(30,25,20,.68)";
    ctx.lineWidth = 1.6;
    for (const f of visibleFaces) {
      const pts = f.face.map((i) => projected[i]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.stroke();
    }

    // specular glint
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(
      state.x - state.radius * 0.22,
      state.y - state.radius * 0.42,
      state.radius * 0.18,
      state.radius * 0.08,
      -0.45,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function step(now) {
    const elapsed = now - start;
    const dt = Math.min(32, now - last) / 16.67;
    last = now;

    state.vy += gravity * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;

    state.rx += state.avx * dt;
    state.ry += state.avy * dt;
    state.rz += state.avz * dt;

    state.vx *= Math.pow(airDrag, dt);
    state.avx *= Math.pow(angularDragAir, dt);
    state.avy *= Math.pow(angularDragAir, dt);
    state.avz *= Math.pow(angularDragAir, dt);

    // side wall taps so the die can ricochet a little if needed
    if (state.x < state.radius + 10) {
      state.x = state.radius + 10;
      state.vx = Math.abs(state.vx) * 0.58;
      state.avz *= -0.8;
    }
    if (state.x > rect.width - state.radius - 10) {
      state.x = rect.width - state.radius - 10;
      state.vx = -Math.abs(state.vx) * 0.58;
      state.avz *= -0.8;
    }

    if (state.y + state.radius > floorY) {
      state.y = floorY - state.radius;
      if (Math.abs(state.vy) > 1.05) {
        state.vy = -Math.abs(state.vy) * bounce;
        state.vx *= floorFriction;
        state.avx *= angularDragFloor;
        state.avy *= angularDragFloor;
        state.avz *= angularDragFloor;
        // kick the angular velocity slightly on impact
        state.avx += (Math.random() - 0.5) * 0.035;
        state.avy += (Math.random() - 0.5) * 0.035;
      } else {
        state.vy = 0;
        state.vx *= 0.88;
        state.avx *= 0.72;
        state.avy *= 0.72;
        state.avz *= 0.72;
      }
    }

    drawDie();

    const speed = Math.hypot(state.vx, state.vy);
    const angular = Math.abs(state.avx) + Math.abs(state.avy) + Math.abs(state.avz);
    const calm = speed < 0.25 && angular < 0.018 && state.y + state.radius >= floorY - 0.1;

    if (elapsed > minDuration && calm) {
      if (!settledAt) settledAt = now;
      if (now - settledAt > 90) {
        finish();
        return;
      }
    }

    if (elapsed > maxDuration) {
      finish();
      return;
    }

    requestAnimationFrame(step);
  }

  function finish() {
    if (finished) return;
    finished = true;
    // Draw the final resting frame, reveal the result immediately,
    // then let the die remain briefly before fading away.
    drawDie();
    onComplete(finalRoll);

    setTimeout(() => {
      const fadeStart = performance.now();
      function fadeFrame(t) {
        const p = Math.min(1, (t - fadeStart) / 240);
        canvas.style.opacity = String(1 - p);
        if (p < 1) {
          requestAnimationFrame(fadeFrame);
        } else {
          canvas.classList.remove("showing");
          canvas.style.opacity = "0";
          ctx.clearRect(0, 0, rect.width, rect.height);
          isRolling = false;
          updateButtons();
        }
      }
      requestAnimationFrame(fadeFrame);
    }, 110);
  }

  drawDie();
  requestAnimationFrame(step);
}

function animateQuickRollD20s(onComplete) {
  if (isRolling) return;
  const finalRolls = [0, 1, 2, 3].map(() => generationRandomInt(20));
  if (shouldSkipRollAnimation()) {
    isRolling = true;
    updateButtons();
    onComplete(finalRolls);
    isRolling = false;
    updateButtons();
    return;
  }

  isRolling = true;
  updateButtons();

  const stage = document.getElementById("currentTab");
  const canvas = document.getElementById("diceCanvas");
  const ctx = canvas.getContext("2d");
  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.classList.add("showing");
  canvas.style.opacity = "1";

  const phi = (1 + Math.sqrt(5)) / 2;
  const rawVerts = [
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ];
  const len = Math.hypot(rawVerts[0][0], rawVerts[0][1], rawVerts[0][2]);
  const verts = rawVerts.map((v) => [v[0] / len, v[1] / len, v[2] / len]);
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  const floorY = Math.max(205, rect.height - 92);
  const radius = Math.min(38, Math.max(27, rect.width * 0.055));
  const centerX = rect.width / 2;
  const starts = [
    {
      x: radius + 12,
      y: -radius * 1.8,
      vx: 5.2 + Math.random() * 0.8,
      vy: 2.0 + Math.random() * 0.6,
      dir: 1,
    },
    {
      x: rect.width - radius - 12,
      y: -radius * 1.8,
      vx: -(5.2 + Math.random() * 0.8),
      vy: 2.0 + Math.random() * 0.6,
      dir: -1,
    },
    {
      x: -radius * 1.7,
      y: Math.max(40, rect.height * 0.28),
      vx: 6.1 + Math.random() * 0.7,
      vy: -1.2 + Math.random() * 0.5,
      dir: 1,
    },
    {
      x: rect.width + radius * 1.7,
      y: Math.max(55, rect.height * 0.42),
      vx: -(6.1 + Math.random() * 0.7),
      vy: -1.0 + Math.random() * 0.5,
      dir: -1,
    },
  ];

  const states = starts.map((start, index) => ({
    x: start.x,
    y: start.y,
    vx: start.vx,
    vy: start.vy,
    rx: Math.random() * Math.PI * 2,
    ry: Math.random() * Math.PI * 2,
    rz: Math.random() * Math.PI * 2,
    avx: (0.15 + Math.random() * 0.08) * (index % 2 ? -1 : 1),
    avy: (0.18 + Math.random() * 0.08) * start.dir,
    avz: (0.23 + Math.random() * 0.09) * start.dir,
    radius: radius * (index < 2 ? 1 : 0.94),
    settledAt: null,
    nudge: (index - 1.5) * Math.min(1.8, rect.width / 450),
  }));

  const gravity = 0.38;
  const bounce = 0.62;
  const floorFriction = 0.84;
  const airDrag = 0.994;
  const angularDragAir = 0.992;
  const angularDragFloor = 0.78;
  const minDuration = 2800;
  const maxDuration = 4700;
  let startTime = performance.now();
  let last = startTime;
  let finished = false;

  function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function rotateVertex(v, state) {
    let [x, y, z] = v;
    let cy = Math.cos(state.ry),
      sy = Math.sin(state.ry);
    let cx = Math.cos(state.rx),
      sx = Math.sin(state.rx);
    let cz = Math.cos(state.rz),
      sz = Math.sin(state.rz);
    let x1 = x * cy + z * sy;
    let z1 = -x * sy + z * cy;
    let y1 = y;
    let y2 = y1 * cx - z1 * sx;
    let z2 = y1 * sx + z1 * cx;
    let x2 = x1;
    let x3 = x2 * cz - y2 * sz;
    let y3 = x2 * sz + y2 * cz;
    return [x3, y3, z2];
  }

  function drawDie(state) {
    const rotated = verts.map((v) => rotateVertex(v, state));
    const projected = rotated.map(([x, y, z]) => {
      const perspective = 2.85 / (2.85 - z);
      return {
        x: state.x + x * state.radius * perspective,
        y: state.y + y * state.radius * perspective,
        z,
        p: perspective,
      };
    });

    const light = normalize([-0.45, -0.65, 1.0]);
    let visibleFaces = faces
      .map((face, idx) => {
        const a = rotated[face[0]],
          b = rotated[face[1]],
          c = rotated[face[2]];
        const n = normalize(cross(sub(b, a), sub(c, a)));
        const centerZ = (a[2] + b[2] + c[2]) / 3;
        const brightness = Math.max(0, dot(n, light));
        return {face, idx, n, centerZ, brightness};
      })
      .filter((f) => f.n[2] > -0.05)
      .sort((a, b) => a.centerZ - b.centerZ);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (const f of visibleFaces) {
      const pts = f.face.map((i) => projected[i]);
      const shade = f.brightness;
      const base = shade > 0.62 ? [232, 222, 199] : shade > 0.38 ? [199, 184, 154] : [143, 126, 98];
      const blueTint = shade > 0.52 ? 12 : 0;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.fillStyle = `rgb(${Math.min(245, base[0] + blueTint)},${Math.min(235, base[1] + blueTint)},${Math.min(213, base[2] + blueTint)})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(42,35,28,.58)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
      const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(pts[0].x, pts[0].y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(30,25,20,.68)";
    ctx.lineWidth = 1.6;
    for (const f of visibleFaces) {
      const pts = f.face.map((i) => projected[i]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(
      state.x - state.radius * 0.22,
      state.y - state.radius * 0.42,
      state.radius * 0.18,
      state.radius * 0.08,
      -0.45,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  function drawScene() {
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const state of states) {
      const shadowDistance = Math.max(0, floorY - (state.y + state.radius));
      const shadowScale = Math.max(0.38, 1 - shadowDistance / 190);
      const shadowAlpha = Math.max(0.06, 0.28 - shadowDistance / 520);
      ctx.save();
      ctx.globalAlpha = shadowAlpha;
      ctx.fillStyle = "rgba(0,0,0,.58)";
      ctx.beginPath();
      ctx.ellipse(
        state.x,
        floorY + state.radius * 0.82,
        state.radius * 1.05 * shadowScale,
        state.radius * 0.23 * shadowScale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }
    states
      .slice()
      .sort((a, b) => a.y - b.y)
      .forEach(drawDie);
  }

  function step(now) {
    const elapsed = now - startTime;
    const dt = Math.min(32, now - last) / 16.67;
    last = now;
    let allCalm = true;

    for (const state of states) {
      state.vy += gravity * dt;
      state.x += (state.vx + state.nudge) * dt;
      state.y += state.vy * dt;
      state.rx += state.avx * dt;
      state.ry += state.avy * dt;
      state.rz += state.avz * dt;
      state.vx *= Math.pow(airDrag, dt);
      state.avx *= Math.pow(angularDragAir, dt);
      state.avy *= Math.pow(angularDragAir, dt);
      state.avz *= Math.pow(angularDragAir, dt);

      if (state.x < state.radius + 10) {
        state.x = state.radius + 10;
        state.vx = Math.abs(state.vx) * 0.58;
        state.avz *= -0.8;
      }
      if (state.x > rect.width - state.radius - 10) {
        state.x = rect.width - state.radius - 10;
        state.vx = -Math.abs(state.vx) * 0.58;
        state.avz *= -0.8;
      }

      if (state.y + state.radius > floorY) {
        state.y = floorY - state.radius;
        if (Math.abs(state.vy) > 1.05) {
          state.vy = -Math.abs(state.vy) * bounce;
          state.vx *= floorFriction;
          state.avx *= angularDragFloor;
          state.avy *= angularDragFloor;
          state.avz *= angularDragFloor;
          state.avx += (Math.random() - 0.5) * 0.035;
          state.avy += (Math.random() - 0.5) * 0.035;
        } else {
          state.vy = 0;
          state.vx *= 0.88;
          state.avx *= 0.72;
          state.avy *= 0.72;
          state.avz *= 0.72;
        }
      }

      const speed = Math.hypot(state.vx, state.vy);
      const angular = Math.abs(state.avx) + Math.abs(state.avy) + Math.abs(state.avz);
      const calm = speed < 0.3 && angular < 0.02 && state.y + state.radius >= floorY - 0.1;
      allCalm = allCalm && calm;
    }

    drawScene();

    if (elapsed > minDuration && allCalm) {
      finish();
      return;
    }
    if (elapsed > maxDuration) {
      finish();
      return;
    }
    requestAnimationFrame(step);
  }

  function finish() {
    if (finished) return;
    finished = true;
    drawScene();
    onComplete(finalRolls);

    setTimeout(() => {
      const fadeStart = performance.now();
      function fadeFrame(t) {
        const p = Math.min(1, (t - fadeStart) / 260);
        canvas.style.opacity = String(1 - p);
        if (p < 1) {
          requestAnimationFrame(fadeFrame);
        } else {
          canvas.classList.remove("showing");
          canvas.style.opacity = "0";
          ctx.clearRect(0, 0, rect.width, rect.height);
          isRolling = false;
          updateButtons();
        }
      }
      requestAnimationFrame(fadeFrame);
    }, 130);
  }

  drawScene();
  requestAnimationFrame(step);
}

function isCurrentCreationComplete() {
  return !!(current.what && current.attr1 && current.attr2 && current.pressure);
}

function manualIsComplete() {
  return !!(
    document.getElementById("manualTitle")?.value.trim() &&
    getManualValue("manualWhat", "manualWhatCustom") &&
    getManualValue("manualAttr1", "manualAttr1Custom") &&
    getManualValue("manualAttr2", "manualAttr2Custom") &&
    getManualValue("manualStory", "manualStoryCustom")
  );
}

function manualHasArchivableCreationData() {
  return !!(
    getManualValue("manualWhat", "manualWhatCustom") ||
    getManualValue("manualAttr1", "manualAttr1Custom") ||
    getManualValue("manualAttr2", "manualAttr2Custom") ||
    getManualValue("manualStory", "manualStoryCustom")
  );
}

function valueOrNull(value) {
  const clean = String(value || "").trim();
  return clean ? {val: clean} : null;
}

function cloneGenerationValue(value) {
  return value ? {...value} : null;
}

function hasCurrentGenerationData() {
  return GENERATION_FIELDS.some((field) => !!current[field]);
}

function generationFieldIsLocked(field) {
  return GENERATION_FIELDS.includes(field) && !!current[field] && currentLocks[field] === true;
}

function toggleGenerationFieldLock(field) {
  if (!GENERATION_FIELDS.includes(field) || !current[field] || isRolling) return false;
  currentLocks[field] = !currentLocks[field];
  renderCurrent();
  return currentLocks[field];
}

function generationQuickRollTargets() {
  if (!isCurrentCreationComplete()) {
    return GENERATION_FIELDS.filter((field) => !current[field]);
  }
  return GENERATION_FIELDS.filter((field) => !generationFieldIsLocked(field));
}

function captureGenerationUndoState() {
  return {
    current: Object.fromEntries(
      GENERATION_FIELDS.map((field) => [field, cloneGenerationValue(current[field])]),
    ),
    locks: {...currentLocks},
    diagnostic: currentGenerationMetadata(),
    rollHistoryId: currentRollHistoryId,
    pendingSeed: nextGenerationSeedOverride,
  };
}

function restoreGenerationUndoState(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  current = Object.fromEntries(
    GENERATION_FIELDS.map((field) => [field, cloneGenerationValue(snapshot.current?.[field])]),
  );
  currentLocks = {
    ...emptyGenerationLocks(),
    ...(snapshot.locks && typeof snapshot.locks === "object" ? snapshot.locks : {}),
  };
  nextGenerationSeedOverride = snapshot.pendingSeed || null;
  currentGenerationSession = null;
  currentGenerationActions = [];
  currentRollHistoryId = snapshot.rollHistoryId || null;

  const diagnostic = snapshot.diagnostic;
  if (diagnostic?.seed) {
    currentGenerationSession = createGenerationSession(diagnostic.seed, {
      seedBehaviorVersion: diagnostic.seedBehaviorVersion,
    });
    const draws = Math.max(0, Math.min(10000, Number(diagnostic.draws) || 0));
    for (let index = 0; index < draws; index += 1) currentGenerationSession.next();
    currentGenerationActions = Array.isArray(diagnostic.actions)
      ? diagnostic.actions.map((action) => ({
          kind: String(action?.kind || "roll"),
          rolls: {...(action?.rolls || {})},
        }))
      : [];
  }

  renderCurrent();
  return true;
}

function offerGenerationUndo(snapshot, message, restoredMessage) {
  if (!snapshot) return false;
  if (window.WormholesUndo?.offer) {
    window.WormholesUndo.offer({
      message,
      restoredMessage,
      undo: async () => restoreGenerationUndoState(snapshot),
    });
    return true;
  }
  window.WormholesActivityLog?.recordAction?.(message);
  return false;
}

function resultFromRollExcluding(source, roll, excludedValue) {
  const excluded = String(excludedValue || "").trim();
  const first = resultFromRoll(source, roll);
  if (!excluded || first.val !== excluded) return first;

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = resultFromRoll(source, generationRandomInt(20));
    if (candidate.val !== excluded) return candidate;
  }
  for (let fallbackRoll = 1; fallbackRoll <= 20; fallbackRoll += 1) {
    const candidate = resultFromRoll(source, fallbackRoll);
    if (candidate.val !== excluded) return candidate;
  }
  return first;
}

function rerollGenerationField(field) {
  if (!GENERATION_FIELDS.includes(field) || !current[field] || isRolling) return false;
  if (generationFieldIsLocked(field)) return false;
  const requiredType =
    field === "pressure" ? "story" : field.startsWith("attr") ? "attribute" : "what";
  if (!themeTypeHasCards(requiredType)) {
    showMissingThemeCards(requiredType);
    return false;
  }

  const before = captureGenerationUndoState();
  const label = GENERATION_FIELD_LABELS[field];
  animateD20(`Re-rolled ${label}`, (visualRoll) => {
    if (field === "what") {
      current.what = themedResult("what", visualRoll, [before.current.what?.val]);
      recordGenerationAction("what", {visualRoll, card: current.what.roll});
    } else if (field === "pressure") {
      current.pressure = themedResult("story", visualRoll, [before.current.pressure?.val]);
      recordGenerationAction("story", {visualRoll, card: current.pressure.roll});
    } else {
      const otherField = field === "attr1" ? "attr2" : "attr1";
      const used = [before.current[field]?.val, current[otherField]?.val]
        .map(normalizedAttributeValue)
        .filter(Boolean);
      const nextAttribute = themedResult("attribute", visualRoll, used);
      current[field] = nextAttribute;
      recordGenerationAction("attribute", {
        visualRoll,
        card: nextAttribute.roll,
        slot: field === "attr1" ? 1 : 2,
      });
    }
    renderCurrent();
    offerGenerationUndo(before, `Re-rolled ${label}`, `${label} restored`);
  });
  return true;
}

function rollWhat() {
  if (current.what || isRolling) return;
  if (!themeTypeHasCards("what")) return showMissingThemeCards("what");
  animateD20("Rolled What", (visualRoll) => {
    current.what = themedResult("what", visualRoll);
    recordGenerationAction("what", {visualRoll, card: current.what.roll});
    renderCurrent();
  });
}

function rollAttr() {
  if ((current.attr1 && current.attr2) || isRolling) return;
  if (!themeTypeHasCards("attribute")) return showMissingThemeCards("attribute");
  animateD20("Rolled Attribute", (visualRoll) => {
    const used = selectedAttributeValuesFromCurrent();
    const nextAttribute = themedResult("attribute", visualRoll, used);
    const slot = !current.attr1 ? 1 : 2;
    if (slot === 1) current.attr1 = nextAttribute;
    else current.attr2 = nextAttribute;
    recordGenerationAction("attribute", {visualRoll, card: nextAttribute.roll, slot});
    renderCurrent();
  });
}

function rollPressure() {
  if (current.pressure || isRolling) return;
  if (!themeTypeHasCards("story")) return showMissingThemeCards("story");
  animateD20("Rolled Story", (visualRoll) => {
    current.pressure = themedResult("story", visualRoll);
    recordGenerationAction("story", {visualRoll, card: current.pressure.roll});
    renderCurrent();
  });
}

function quickFullRoll() {
  if (isRolling) return;
  const targets = generationQuickRollTargets();
  if (!targets.length) return;
  const requiredTypes = new Set(
    targets.map((field) =>
      field === "pressure" ? "story" : field.startsWith("attr") ? "attribute" : "what",
    ),
  );
  for (const type of requiredTypes) {
    if (!themeTypeHasCards(type)) return showMissingThemeCards(type);
  }
  const before = isCurrentCreationComplete() ? captureGenerationUndoState() : null;

  animateQuickRollD20s((rolls) => {
    const actionRolls = {};
    if (targets.includes("what")) {
      current.what = themedResult("what", rolls[0], [current.what?.val]);
      actionRolls.what = current.what.roll;
    }
    const usedAttributeValues = [current.attr1?.val, current.attr2?.val]
      .map(normalizedAttributeValue)
      .filter(Boolean);
    if (targets.includes("attr1")) {
      current.attr1 = themedResult("attribute", rolls[1], usedAttributeValues);
      actionRolls.attr1 = current.attr1.roll;
      usedAttributeValues.push(normalizedAttributeValue(current.attr1?.val));
    }
    if (targets.includes("attr2")) {
      current.attr2 = themedResult("attribute", rolls[2], usedAttributeValues);
      actionRolls.attr2 = current.attr2.roll;
      usedAttributeValues.push(normalizedAttributeValue(current.attr2?.val));
    }
    if (targets.includes("pressure")) {
      current.pressure = themedResult("story", rolls[3], [current.pressure?.val]);
      actionRolls.story = current.pressure.roll;
    }

    recordGenerationAction("quick-full", actionRolls);
    renderCurrent();
    if (before) {
      const count = targets.length;
      offerGenerationUndo(
        before,
        `Quick Roll changed ${count} ${count === 1 ? "field" : "fields"}`,
        "Previous roll restored",
      );
    }
  });
}

function newCreation() {
  if (isRolling) return;
  const before = hasCurrentGenerationData() ? captureGenerationUndoState() : null;
  current = {what: null, attr1: null, attr2: null, pressure: null};
  resetCurrentGenerationDiagnostics();
  renderCurrent();
  if (before) offerGenerationUndo(before, "Started a new creation", "Previous creation restored");
}

function openTitleModal() {
  if (!currentUniverseId) return;
  if (!hasCurrentCreation()) return;
  document.getElementById("titleError").classList.remove("show");
  document.getElementById("modalTitle").textContent = isCurrentCreationComplete()
    ? "Name Your Creation"
    : "Title this partial creation";
  const note = document.querySelector("#titleModal .modal p");
  if (note) {
    note.textContent = isCurrentCreationComplete()
      ? "Give this creation a name before saving it to the archive."
      : "This creation is not complete yet. Give it a name to save the partial version to the archive.";
  }
  document.getElementById("creationTitleInput").value = "";
  document.getElementById("titleModal").classList.add("open");
  setTimeout(() => document.getElementById("creationTitleInput").focus(), 0);
}

function closeTitleModal() {
  document.getElementById("titleModal").classList.remove("open");
}

let themeSelectionListenerInstalled = false;
let themeSelectionRefreshPending = false;

function scheduleThemeSelectionRefresh() {
  if (themeSelectionRefreshPending) return;
  themeSelectionRefreshPending = true;
  const refresh = () => {
    themeSelectionRefreshPending = false;
    populateManualSelects();
    updateManualButtons();
    renderCurrent();
  };
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function")
    window.requestAnimationFrame(refresh);
  else setTimeout(refresh, 0);
}

function preserveManualSelection(selectId, inputId, populate) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);
  if (!select || !input) return;
  const previousValue = getManualValue(selectId, inputId);
  populate();
  if (!previousValue) return;
  if (Array.from(select.options || []).some((option) => option.value === previousValue)) {
    select.value = previousValue;
    input.value = "";
    input.classList.remove("open");
  } else {
    select.value = "__custom__";
    input.value = previousValue;
    input.classList.add("open");
  }
}

function populateManualSelects() {
  themeDecksApi?.initializeUi?.();
  if (themeDecksApi?.populateSelect) {
    preserveManualSelection("manualWhat", "manualWhatCustom", () =>
      themeDecksApi.populateSelect("manualWhat", "what"),
    );
    preserveManualSelection("manualAttr1", "manualAttr1Custom", () =>
      themeDecksApi.populateSelect("manualAttr1", "attribute"),
    );
    preserveManualSelection("manualAttr2", "manualAttr2Custom", () =>
      themeDecksApi.populateSelect("manualAttr2", "attribute"),
    );
    preserveManualSelection("manualStory", "manualStoryCustom", () =>
      themeDecksApi.populateSelect("manualStory", "story"),
    );
  } else {
    fillSelect("manualWhat", what);
    fillSelect("manualAttr1", attr);
    fillSelect("manualAttr2", attr);
    fillSelect("manualStory", pressure);
  }

  setupCustomSelect("manualWhat", "manualWhatCustom");
  setupCustomSelect("manualAttr1", "manualAttr1Custom");
  setupCustomSelect("manualAttr2", "manualAttr2Custom");
  setupCustomSelect("manualStory", "manualStoryCustom");
  updateManualAttributeOptionStates();

  if (!themeSelectionListenerInstalled && typeof window !== "undefined") {
    themeSelectionListenerInstalled = true;
    window.addEventListener("wormholes:themes-changed", scheduleThemeSelectionRefresh);
  }
}

function fillSelect(id, options) {
  const select = document.getElementById(id);
  select.innerHTML =
    `<option value="">Choose...</option>` +
    options
      .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
      .join("") +
    `<option value="__custom__">Custom...</option>`;
}

function setupCustomSelect(selectId, inputId) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);

  if (select.dataset.customSelectReady === "true") return;
  select.dataset.customSelectReady = "true";
  select.addEventListener("change", () => {
    const custom = select.value === "__custom__";
    input.classList.toggle("open", custom);
    if (custom) input.focus();
    if (!custom) input.value = "";
    handleManualCreateFieldChange();
  });
}

function getManualValue(selectId, inputId) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);

  if (select.value === "__custom__") {
    return input.value.trim();
  }

  return select.value.trim();
}

function manualAttributeDuplicateExists() {
  const first = normalizedAttributeValue(getManualValue("manualAttr1", "manualAttr1Custom"));
  const second = normalizedAttributeValue(getManualValue("manualAttr2", "manualAttr2Custom"));
  return !!(first && second && first === second);
}

function updateManualAttributeOptionStates() {
  const pairs = [
    {
      selectId: "manualAttr1",
      inputId: "manualAttr1Custom",
      otherSelectId: "manualAttr2",
      otherInputId: "manualAttr2Custom",
    },
    {
      selectId: "manualAttr2",
      inputId: "manualAttr2Custom",
      otherSelectId: "manualAttr1",
      otherInputId: "manualAttr1Custom",
    },
  ];

  pairs.forEach((pair) => {
    const select = document.getElementById(pair.selectId);
    if (!select) return;
    const otherValue = normalizedAttributeValue(
      getManualValue(pair.otherSelectId, pair.otherInputId),
    );

    Array.from(select.options || []).forEach((option) => {
      if (!option.dataset.originalText) option.dataset.originalText = option.textContent;
      const optionValue = normalizedAttributeValue(option.value);
      const isAttributeOption = !!option.value && option.value !== "__custom__";
      const isCurrentSelection = option.value === select.value;
      const shouldDisable =
        isAttributeOption && !!otherValue && optionValue === otherValue && !isCurrentSelection;

      option.disabled = shouldDisable;
      option.textContent = shouldDisable
        ? `${option.dataset.originalText} — already selected`
        : option.dataset.originalText;
    });
  });
}

function manualHasAnyData() {
  return MANUAL_CREATE_FIELD_IDS.some(
    (id) => String(document.getElementById(id)?.value || "").trim() !== "",
  );
}

function setManualDraftStatus(message = "", state = "") {
  const status = document.getElementById("manualDraftStatus");
  if (!status) return;
  status.textContent = message;
  if (state) status.dataset.state = state;
  else delete status.dataset.state;
}

function persistManualCreateDraft(options = {}) {
  const universeId = options.universeId || currentUniverseId;
  const drafts = window.WormholesManualDrafts;
  if (!universeId || !drafts) return false;

  const values = captureManualCreateFields();
  const hasData = drafts.fieldsHaveData ? drafts.fieldsHaveData(values) : manualHasAnyData();
  const result = hasData
    ? drafts.saveDraft(universeId, values)
    : {ok: drafts.removeDraft(universeId), removed: true};

  if (options.showStatus !== false) {
    if (result?.ok && hasData) setManualDraftStatus("Draft saved locally.");
    else if (result?.ok) setManualDraftStatus("");
    else setManualDraftStatus("Draft could not be saved locally.", "error");
  }
  return !!result?.ok;
}

function restoreManualCreateDraftForCurrentUniverse(options = {}) {
  const drafts = window.WormholesManualDrafts;
  const draft = currentUniverseId && drafts?.getDraft?.(currentUniverseId);

  clearManualCreate({discardDraft: false, preserveStatus: true});
  if (!draft) {
    setManualDraftStatus("");
    return false;
  }

  restoreManualCreateFields(draft.fields);
  setManualDraftStatus(
    options.silent ? "Draft saved locally." : "Restored unfinished draft. Clear to discard it.",
  );
  return true;
}

function handleManualCreateFieldChange() {
  updateManualButtons();
  persistManualCreateDraft();
}

function updateManualButtons() {
  updateManualAttributeOptionStates();

  const hasData = manualHasAnyData();
  const complete = manualIsComplete();
  const hasTitle = !!document.getElementById("manualTitle")?.value.trim();
  const hasCreationData = manualHasArchivableCreationData();
  const hasDuplicateAttributes = manualAttributeDuplicateExists();
  const saveManualBtn = document.getElementById("saveManualBtn");
  const error = document.getElementById("manualError");

  (globalThis.controllerServices || globalThis).setAppButtonDisabled(document.getElementById("clearManualBtn"), !hasData);
  (globalThis.controllerServices || globalThis).setAppButtonDisabled(
    saveManualBtn,
    !(hasTitle && hasCreationData) || hasDuplicateAttributes,
  );

  if (error && hasDuplicateAttributes) {
    error.textContent = "Choose two different attributes.";
    error.classList.add("show");
  } else if (error && error.textContent === "Choose two different attributes.") {
    error.textContent = "";
    error.classList.remove("show");
  }

  if (saveManualBtn) {
    saveManualBtn.textContent = complete ? "Archive Creation" : "Archive Partial Creation";
  }

  if (typeof (globalThis.controllerServices || globalThis).syncAllAppButtonStates === "function")
    (globalThis.controllerServices || globalThis).syncAllAppButtonStates();
}

function captureManualCreateFields() {
  return Object.fromEntries(
    MANUAL_CREATE_FIELD_IDS.map((id) => [id, document.getElementById(id)?.value || ""]),
  );
}

function restoreManualCreateFields(values = {}) {
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
  ["manualWhat", "manualAttr1", "manualAttr2", "manualStory"].forEach((selectId) => {
    const custom = document.getElementById(`${selectId}Custom`);
    if (custom)
      custom.classList.toggle("open", document.getElementById(selectId)?.value === "__custom__");
  });
  updateManualButtons();
}

function clearManualCreateWithUndo() {
  if (!manualHasAnyData()) return;
  const universeId = currentUniverseId;
  const values = captureManualCreateFields();
  clearManualCreate();
  if (window.WormholesUndo) {
    window.WormholesUndo.offer({
      message: "Manual creation cleared",
      restoredMessage: "Manual creation restored",
      undo: async () => {
        restoreManualCreateFields(values);
        persistManualCreateDraft({universeId});
        return true;
      },
    });
  }
}

function clearManualCreate(options = {}) {
  MANUAL_CREATE_FIELD_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
  document.querySelectorAll(".custom-input").forEach((input) => input.classList.remove("open"));
  const error = document.getElementById("manualError");
  if (error) {
    error.textContent = "";
    error.classList.remove("show");
  }
  if (options.discardDraft !== false && currentUniverseId) {
    window.WormholesManualDrafts?.removeDraft?.(options.universeId || currentUniverseId);
  }
  if (!options.preserveStatus) setManualDraftStatus("");
  updateManualButtons();
}

async function saveManualCreation() {
  if (!currentUniverseId) return;
  const title = document.getElementById("manualTitle").value.trim();
  const manualWhat = getManualValue("manualWhat", "manualWhatCustom");
  const manualAttr1 = getManualValue("manualAttr1", "manualAttr1Custom");
  const manualAttr2 = getManualValue("manualAttr2", "manualAttr2Custom");
  const manualStory = getManualValue("manualStory", "manualStoryCustom");
  const error = document.getElementById("manualError");

  if (!title) {
    error.textContent = "A title is required.";
    document.getElementById("manualTitle").focus();
    updateManualButtons();
    return;
  }

  const entryValues = {
    what: valueOrNull(manualWhat),
    attr1: valueOrNull(manualAttr1),
    attr2: valueOrNull(manualAttr2),
    pressure: valueOrNull(manualStory),
  };

  if (!(globalThis.controllerServices || globalThis).entryHasArchivableCreationData(entryValues)) {
    error.textContent = "Choose or customize at least one creation field before archiving.";
    updateManualButtons();
    return;
  }

  if (window.WormholesContentLimits) {
    if (
      !window.WormholesContentLimits.ensureString("title", title, {
        fieldName: "creation title",
        operation: "archive this creation",
      }).ok
    )
      return;
    for (const [label, value] of [
      ["what", manualWhat],
      ["first attribute", manualAttr1],
      ["second attribute", manualAttr2],
      ["story pressure", manualStory],
    ]) {
      if (
        value &&
        !window.WormholesContentLimits.ensureString("shortLabel", value, {
          fieldName: label,
          context: title,
          operation: "archive this creation",
        }).ok
      )
        return;
    }
  }

  if (manualAttributeDuplicateExists()) {
    error.textContent = "Choose two different attributes.";
    error.classList.add("show");
    updateManualButtons();
    return;
  }

  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("archive", archiveEntries.length, 1, {
      context: (globalThis.controllerServices || globalThis).getCurrentUniverse()?.title || "",
      operation: "archive another creation",
    }).ok
  )
    return;

  const entry = {
    id: makeId(),
    title,
    what: entryValues.what,
    attr1: entryValues.attr1,
    attr2: entryValues.attr2,
    pressure: entryValues.pressure,
    connections: [],
    bridges: [],
    createdAt: new Date().toISOString(),
    source: "manual",
  };

  if (window.WormholesDuplicateCreations?.review) {
    const duplicateReview = await window.WormholesDuplicateCreations.review(entry, archiveEntries, {
      actionLabel: "Save Anyway",
      actionKind: "save",
      opener: document.getElementById("saveManualBtn"),
    });
    if (duplicateReview.decision === "view") {
      switchTab("archive");
      (globalThis.controllerServices || globalThis).revealArchiveEntryForTag(duplicateReview.match?.existing?.id || "");
      return;
    }
    if (duplicateReview.decision !== "proceed") return;
  }

  archiveEntries.unshift(entry);

  const wasComplete = !!(manualWhat && manualAttr1 && manualAttr2 && manualStory);

  if (!saveArchiveToStorage()) {
    archiveEntries = archiveEntries.filter((item) => item.id !== entry.id);
    return;
  }

  await (globalThis.controllerServices || globalThis).writeArchiveEntryToFolderIfNeeded(entry);
  (globalThis.controllerServices || globalThis).renderArchive();
  clearManualCreate();
  error.textContent = `${wasComplete ? "Archived" : "Archived partial creation"} "${title}". You can find it in Archive & Connections.`;
  showSavedToast("Creation archived");
}

function generationUiSnapshot() {
  const quickRollTargets = generationQuickRollTargets();
  const availability = Object.freeze({
    what: themeTypeHasCards("what"),
    attribute: themeTypeHasCards("attribute"),
    story: themeTypeHasCards("story"),
  });
  return Object.freeze({
    current,
    locks: Object.freeze({...currentLocks}),
    availability,
    isRolling,
    complete: isCurrentCreationComplete(),
    hasCreation: hasCurrentGenerationData(),
    quickRollTargets: Object.freeze([...quickRollTargets]),
    canQuickRoll: !isRolling && quickRollTargets.length > 0,
  });
}

function installGenerationRuntime(target = globalThis) {
  const api = Object.freeze({
    snapshot: generationUiSnapshot,
    isComplete: isCurrentCreationComplete,
  });
  target.WormholesGenerationRuntime = api;
  return api;
}

if (typeof window !== "undefined") installGenerationRuntime(window);

/* Public controller surface for served ES-module builds. */
const GENERATION_CONTROLLER_API = Object.freeze({
  what,
  attr,
  pressure,
  generationUiSnapshot,
  installGenerationRuntime,
  hashGenerationSeed,
  normalizeGenerationSeed,
  formatGenerationSeed,
  createRandomGenerationSeed,
  createGenerationSession,
  useGenerationSeedForNextSession,
  ensureCurrentGenerationSession,
  generationRandomInt,
  recordGenerationAction,
  recordCompletedGenerationHistoryIfNeeded,
  currentGenerationMetadata,
  resetCurrentGenerationDiagnostics,
  archivedGenerationDiagnostics,
  loadSkipRollAnimation,
  saveSkipRollAnimation,
  updateSkipRollAnimationControl,
  handleSkipRollAnimationToggle,
  updateSkipRollLayout,
  installSkipRollLayoutWatcher,
  shouldSkipRollAnimation,
  prefersReducedMotion,
  themedResult,
  themeTypeHasCards,
  resultFromRoll,
  resultFromAttributeRoll,
  randomAttributeRoll,
  normalizedAttributeValue,
  selectedAttributeValuesFromCurrent,
  resultFromAttributeRollExcluding,
  generationFieldIsLocked,
  toggleGenerationFieldLock,
  generationQuickRollTargets,
  captureGenerationUndoState,
  restoreGenerationUndoState,
  rerollGenerationField,
  animateD20,
  animateQuickRollD20s,
  isCurrentCreationComplete,
  manualIsComplete,
  manualHasArchivableCreationData,
  valueOrNull,
  rollWhat,
  rollAttr,
  rollPressure,
  quickFullRoll,
  newCreation,
  openTitleModal,
  closeTitleModal,
  populateManualSelects,
  fillSelect,
  setupCustomSelect,
  getManualValue,
  manualAttributeDuplicateExists,
  updateManualAttributeOptionStates,
  manualHasAnyData,
  setManualDraftStatus,
  persistManualCreateDraft,
  restoreManualCreateDraftForCurrentUniverse,
  handleManualCreateFieldChange,
  updateManualButtons,
  captureManualCreateFields,
  restoreManualCreateFields,
  clearManualCreateWithUndo,
  clearManualCreate,
  saveManualCreation,
});
(globalThis.registerControllerServices || (() => {}))(GENERATION_CONTROLLER_API);

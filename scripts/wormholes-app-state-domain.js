/* GENERATED from scripts/modules/app-state-domain.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 248 domain-state ownership boundary.
   Canonical mutable bindings for universe-scoped data. The served module build
   exposes accessor-backed legacy bindings only for classic compatibility code. */

let universes = [];
let currentUniverseId = null;
let archiveEntries = [];
let literatureEntries = [];
let visionEntries = [];
let connectionNotes = {};
let bridgeNotes = {};

function defineBinding(target, name, getter, setter) {
  const existing = Object.getOwnPropertyDescriptor(target, name);
  if (existing && existing.configurable === false) return false;
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: false,
    get: getter,
    set: setter,
  });
  return true;
}

function installLegacyDomainStateBindings(target = globalThis) {
  defineBinding(
    target,
    "universes",
    () => universes,
    (value) => {
      universes = Array.isArray(value) ? value : [];
    },
  );
  defineBinding(
    target,
    "currentUniverseId",
    () => currentUniverseId,
    (value) => {
      currentUniverseId = value == null ? null : String(value);
    },
  );
  defineBinding(
    target,
    "archiveEntries",
    () => archiveEntries,
    (value) => {
      archiveEntries = Array.isArray(value) ? value : [];
    },
  );
  defineBinding(
    target,
    "literatureEntries",
    () => literatureEntries,
    (value) => {
      literatureEntries = Array.isArray(value) ? value : [];
    },
  );
  defineBinding(
    target,
    "visionEntries",
    () => visionEntries,
    (value) => {
      visionEntries = Array.isArray(value) ? value : [];
    },
  );
  defineBinding(
    target,
    "connectionNotes",
    () => connectionNotes,
    (value) => {
      connectionNotes = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    },
  );
  defineBinding(
    target,
    "bridgeNotes",
    () => bridgeNotes,
    (value) => {
      bridgeNotes = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    },
  );
  return target;
}

function domainStateSnapshot() {
  return Object.freeze({
    universes,
    currentUniverseId,
    archiveEntries,
    literatureEntries,
    visionEntries,
    connectionNotes,
    bridgeNotes,
  });
}

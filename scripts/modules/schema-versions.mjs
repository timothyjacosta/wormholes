/* Wormholes Beta 248 persisted-schema version module.
   Canonical ES-module source; the local-file build uses a generated classic compatibility adapter. */

import importedAppErrorsApi from "./app-errors.mjs";

export const current = 5;
export const supported = Object.freeze([1, 2, 3, 4, 5]);
const supportedSet = new Set(supported);

function schemaVersionError(code, message) {
  const appErrors =
    typeof importedAppErrorsApi !== "undefined"
      ? importedAppErrorsApi
      : globalThis.WormholesAppErrors;
  if (appErrors?.createError) return appErrors.createError(code, message);
  return Object.assign(new Error(message), {code});
}

export function sourceVersion(value) {
  const numeric = Number(value ?? 1);
  return Number.isInteger(numeric) && numeric >= 1 ? numeric : 1;
}

export function isSupported(value) {
  return supportedSet.has(sourceVersion(value));
}

export function assertSupported(value) {
  const version = sourceVersion(value);
  if (version > current) {
    throw schemaVersionError(
      "WORMHOLES_NEWER_VERSION",
      "This backup was made by a newer Wormholes version.",
    );
  }
  if (!supportedSet.has(version)) {
    throw schemaVersionError(
      "WORMHOLES_UNSUPPORTED_VERSION",
      "This backup uses an older data format that this Wormholes version no longer supports.",
    );
  }
  return version;
}

export const api = Object.freeze({
  current,
  supported,
  oldest: supported[0],
  sourceVersion,
  isSupported,
  assertSupported,
});

if (typeof window !== "undefined") window.WormholesSchemaVersions = api;

export default api;

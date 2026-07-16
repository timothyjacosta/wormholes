/* Wormholes Beta 301 data-portability transaction helpers.
   Validates every prepared dataset before an import or restore starts writing. */

export function validatePreparedAppDataForWrite(prepared, options = {}) {
  const makeError =
    typeof options.makeError === "function"
      ? options.makeError
      : (code, message) => Object.assign(new Error(message), {code});
  if (!prepared || typeof prepared !== "object") {
    throw makeError("WORMHOLES_MALFORMED_IMPORT", "This backup is incomplete.");
  }

  const validateDataset = (schemaName, value, scope) => {
    const schema = options.schema;
    if (!schema?.validate) return true;
    const result = schema.validate(schemaName, value, {mode: "write", scope});
    if (result?.ok) return true;
    throw schema.errorFor
      ? schema.errorFor(result)
      : makeError("WORMHOLES_SCHEMA_INVALID", "Some backup data is incomplete or invalid.");
  };

  const universes = Array.isArray(prepared.universes) ? prepared.universes : [];
  validateDataset("universes", universes, null);
  validateDataset("bridgeNotes", prepared.bridgeNotes || {}, null);
  universes.forEach((universe) => {
    const data = prepared.importData?.universeData?.[universe.id] || {};
    validateDataset("archive", Array.isArray(data.archive) ? data.archive : [], universe.id);
    validateDataset(
      "connectionNotes",
      data.connectionNotes && typeof data.connectionNotes === "object" ? data.connectionNotes : {},
      universe.id,
    );
    validateDataset(
      "literature",
      Array.isArray(data.literature) ? data.literature : [],
      universe.id,
    );
    validateDataset("vision", Array.isArray(data.vision) ? data.vision : [], universe.id);
  });
  return true;
}

export function assertAppDataWriteResult(result, message, makeError) {
  if (result === false || result?.ok === false) {
    throw (
      result?.error ||
      (typeof makeError === "function"
        ? makeError("WORMHOLES_IMPORT_FAILED", message)
        : Object.assign(new Error(message), {code: "WORMHOLES_IMPORT_FAILED"}))
    );
  }
  return result;
}

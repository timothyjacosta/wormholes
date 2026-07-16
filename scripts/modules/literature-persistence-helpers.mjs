/* Wormholes Beta 301 Literature transaction helpers.
   Keeps multi-store persistence orchestration outside the Literature controller. */

export function cloneLiteratureCollection(value) {
  try {
    return JSON.parse(JSON.stringify(Array.isArray(value) ? value : []));
  } catch (error) {
    return [];
  }
}

export async function runLiteraturePersistenceTransaction(options = {}) {
  const universeId = options.universeId;
  const previousEntries = cloneLiteratureCollection(options.previousEntries || []);
  const candidates = (options.candidateEntries || []).map((doc) =>
    options.normalizeDoc(doc, universeId),
  );
  const largeAvailable = !!options.largeDataAvailable?.();
  const transactionApi = options.transactionApi;

  async function restoreLarge(key, previousValue) {
    if (previousValue) await options.persistLarge(key, previousValue);
    else await options.deleteLarge(key);
  }

  if (!transactionApi?.run) {
    const rollbackValues = [];
    try {
      if (largeAvailable) {
        for (const doc of candidates) {
          if (!doc?.id || options.isGroup(doc)) continue;
          const key = doc.contentStoreKey || options.contentKey(universeId, doc.id);
          const previousValue = await options.loadLarge(key);
          rollbackValues.push({key, previousValue});
          const saved = await options.persistLarge(key, options.sanitize(doc.content || ""));
          if (!saved) throw new Error("Document content could not be saved.");
          doc.contentStoreKey = key;
          doc.contentStored = "indexedDB";
        }
      }
      const result = options.normalizeResult(options.writeMetadata(universeId, candidates));
      if (!result.ok)
        throw result.error || new Error(result.userMessage || "Document could not be saved.");
      await options.commitRuntime?.(candidates);
      return {ok: true, entries: candidates};
    } catch (error) {
      for (const item of rollbackValues.reverse()) {
        await restoreLarge(item.key, item.previousValue);
      }
      throw error;
    }
  }

  const largeSteps = [];
  if (largeAvailable) {
    for (const doc of candidates) {
      if (!doc?.id || options.isGroup(doc)) continue;
      const key = doc.contentStoreKey || options.contentKey(universeId, doc.id);
      const content = options.sanitize(doc.content || "");
      let previousValue = "";
      largeSteps.push({
        name: `literature-content:${doc.id}`,
        phase: "large-content",
        validate: () => typeof content === "string",
        async execute() {
          previousValue = await options.loadLarge(key);
          const saved = await options.persistLarge(key, content);
          if (!saved) return false;
          doc.contentStoreKey = key;
          doc.contentStored = "indexedDB";
          return true;
        },
        rollback: () => restoreLarge(key, previousValue),
      });
    }
  }

  await transactionApi.run({
    operation: options.operation || "save this document",
    validate: [() => options.validate?.(candidates, universeId) ?? true],
    steps: [
      ...largeSteps,
      {
        name: "literature-metadata",
        phase: "collection-metadata",
        execute: () => options.normalizeResult(options.writeMetadata(universeId, candidates)),
        rollback: () => options.normalizeResult(options.writeMetadata(universeId, previousEntries)),
      },
    ],
    commitRuntime: () => options.commitRuntime?.(candidates),
    restoreRuntime: options.restoreRuntime,
    failureMessage: "This document could not be saved. Nothing was changed.",
  });
  return {ok: true, entries: candidates};
}

/* GENERATED from scripts/modules/indexeddb-recovery.mjs. Do not edit this direct-file compatibility adapter. */




/* Wormholes Beta 252 missing/partial IndexedDB recovery.
   Verifies Literature and Vision Board payload references, repairs only the affected payload
   from canonical keys, portable metadata, rolling snapshots, or regenerated thumbnails, and
   leaves metadata visible when no safe recovery source exists. */
(function () {
  const storageApi =
    typeof importedStorageFacadeApi !== "undefined"
      ? importedStorageFacadeApi
      : globalThis.WormholesStorageFacade || globalThis;
  const snapshotsApi =
    typeof importedSnapshotsApi !== "undefined"
      ? importedSnapshotsApi
      : globalThis.WormholesSnapshots;
  const mediaLimitsApi =
    typeof importedMediaLimitsApi !== "undefined"
      ? importedMediaLimitsApi
      : globalThis.WormholesMediaLimits;
  const services =
    typeof importedControllerServices !== "undefined"
      ? importedControllerServices
      : globalThis.controllerServices || globalThis;
  const LITERATURE_PREFIXES = ["wormholesUniverseLiterature:", "worldBuilderUniverseLiterature:"];
  const VISION_PREFIXES = ["wormholesUniverseVisionBoard:", "worldBuilderUniverseVisionBoard:"];
  let latestIssues = [];

  function storeApi() {
    return window.WormholesRepositories?.largeData || window.WormholesLargeDataStore || null;
  }

  function uniqueStrings(values) {
    return Array.from(new Set((values || []).map((value) => String(value || "")).filter(Boolean)));
  }

  function isLiteratureGroupRecord(doc) {
    return (
      !!doc &&
      (doc.kind === "literatureGroup" ||
        doc.fileType === "group" ||
        Array.isArray(doc.groupIds) ||
        Array.isArray(doc.children))
    );
  }

  function hasMeaningfulLiteratureContent(value) {
    if (typeof value !== "string") return false;
    if (typeof services.literaturePlainPreview === "function")
      return !!services.literaturePlainPreview(value);
    return !!String(value)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim();
  }

  function validLiteraturePayload(value) {
    return typeof value === "string";
  }

  function validVisionPayload(value, kind = "visionImage") {
    if (typeof value !== "string" || !value) return false;
    const mediaResult = mediaLimitsApi?.dataUrlResult?.(value, kind, {showDialog: false});
    if (mediaResult && !mediaResult.ok) return false;
    if (typeof services.isSafeImportedVisionImageDataUrl === "function")
      return services.isSafeImportedVisionImageDataUrl(value, kind);
    return /^data:image\/(png|jpe?g);base64,[a-z0-9+/=\s]+$/i.test(value);
  }

  async function inspectPayload(key, validator) {
    const api = storeApi();
    if (!api?.inspect)
      return {
        status: "unavailable",
        key: String(key || ""),
        reason: "IndexedDB inspection is unavailable.",
      };
    const result = await api.inspect(key);
    if (result.status !== "found") return result;
    if (!validator(result.value)) {
      return {
        ...result,
        status: "invalid",
        reason: "The stored payload has an unexpected type or format.",
      };
    }
    return {...result, status: "valid"};
  }

  async function firstValidStoredPayload(keys, validator) {
    let sawUnavailable = null;
    let sawError = null;
    let sawInvalid = null;
    for (const key of uniqueStrings(keys)) {
      const result = await inspectPayload(key, validator);
      if (result.status === "valid") return result;
      if (result.status === "unavailable") sawUnavailable = sawUnavailable || result;
      if (result.status === "error") sawError = sawError || result;
      if (result.status === "invalid") sawInvalid = sawInvalid || result;
    }
    return (
      sawUnavailable ||
      sawError ||
      sawInvalid || {status: "missing", key: uniqueStrings(keys)[0] || ""}
    );
  }

  function snapshotItems(snapshot, universeId, dataset) {
    const items = snapshot?.data?.universeData?.[universeId]?.[dataset];
    return Array.isArray(items) ? items : [];
  }

  function newestSnapshotItem(snapshots, universeId, dataset, itemId, predicate) {
    for (const snapshot of snapshots || []) {
      const item = snapshotItems(snapshot, universeId, dataset).find(
        (candidate) => String(candidate?.id || "") === String(itemId || ""),
      );
      if (item && predicate(item)) return {item, snapshot};
    }
    return null;
  }

  function collectUniverseIds(snapshots) {
    const ids = new Set();
    (globalThis.universes || []).forEach(
      (universe) => universe?.id && ids.add(String(universe.id)),
    );
    try {
      const repository = window.WormholesRepositories?.local;
      const keys =
        repository?.keys?.() ||
        Array.from({length: localStorage.length}, (_, index) => localStorage.key(index)).filter(
          Boolean,
        );
      for (const key of keys) {
        const storedKey = String(key || "");
        for (const prefix of [...LITERATURE_PREFIXES, ...VISION_PREFIXES]) {
          if (storedKey.startsWith(prefix) && storedKey.length > prefix.length)
            ids.add(storedKey.slice(prefix.length));
        }
      }
    } catch (error) {}
    (snapshots || []).forEach((snapshot) => {
      Object.keys(snapshot?.data?.universeData || {}).forEach((id) => id && ids.add(String(id)));
    });
    return ids;
  }

  function readLiteratureMetadata(universeId) {
    try {
      const data =
        (typeof storageApi.wormholesRepository === "function"
          ? storageApi.wormholesRepository("literature")?.read(universeId, [])
          : undefined) ??
        storageApi.readPersistedDatasetData(
          storageApi.literatureStorageKey(universeId),
          storageApi.oldLiteratureStorageKey(universeId),
          [],
        );
      return Array.isArray(data)
        ? data.map((doc) => services.normalizeLiteratureDoc(doc, universeId))
        : [];
    } catch (error) {
      return [];
    }
  }

  function readVisionMetadata(universeId) {
    try {
      const data =
        (typeof storageApi.wormholesRepository === "function"
          ? storageApi.wormholesRepository("vision")?.read(universeId, [])
          : undefined) ??
        storageApi.readPersistedDatasetData(
          storageApi.visionStorageKey(universeId),
          storageApi.oldVisionStorageKey(universeId),
          [],
        );
      return Array.isArray(data)
        ? data.map((item) => ({
            ...services.normalizeVisionEntry(item),
            dataStoreKey:
              item?.dataStoreKey ||
              (item?.id ? services.visionDataStoreKeyFor(universeId, item.id) : ""),
            thumbnailStoreKey:
              item?.thumbnailStoreKey ||
              (item?.id ? services.visionThumbnailStoreKeyFor(universeId, item.id) : ""),
          }))
        : [];
    } catch (error) {
      return [];
    }
  }

  async function putRecoveredPayload(key, value) {
    const api = storeApi();
    if (!api?.put) throw new Error("IndexedDB recovery storage is unavailable.");
    await api.put(key, value);
    return true;
  }

  function issueResult(status, details) {
    return {status, ...details};
  }

  async function repairLiteratureDocument(universeId, doc, snapshots) {
    if (!doc?.id || isLiteratureGroupRecord(doc) || doc.contentStored !== "indexedDB") {
      return issueResult("not-referenced", {
        kind: "literature-content",
        universeId,
        itemId: doc?.id || "",
      });
    }

    const canonicalKey = services.literatureContentStoreKeyFor(universeId, doc.id);
    const stored = await firstValidStoredPayload(
      [doc.contentStoreKey, canonicalKey],
      validLiteraturePayload,
    );
    if (stored.status === "valid") {
      const changed = doc.contentStoreKey !== stored.key || doc.contentStored !== "indexedDB";
      doc.contentStoreKey = stored.key;
      doc.contentStored = "indexedDB";
      return issueResult(changed ? "relinked" : "healthy", {
        kind: "literature-content",
        universeId,
        itemId: doc.id,
        key: stored.key,
        metadataChanged: changed,
      });
    }
    if (stored.status === "unavailable" || stored.status === "error") {
      return issueResult("unverified", {
        kind: "literature-content",
        universeId,
        itemId: doc.id,
        key: doc.contentStoreKey || canonicalKey,
        reason: stored.reason || stored.error?.message || "IndexedDB could not be checked.",
      });
    }

    let content = hasMeaningfulLiteratureContent(doc.content || "")
      ? services.sanitizeLiteratureHtml(doc.content || "")
      : "";
    let source = content ? "portable metadata" : "";
    let snapshotId = "";

    if (!content) {
      const candidate = newestSnapshotItem(snapshots, universeId, "literature", doc.id, (item) =>
        hasMeaningfulLiteratureContent(item?.content || ""),
      );
      if (candidate) {
        content = services.sanitizeLiteratureHtml(candidate.item.content || "");
        source = "restore point";
        snapshotId = String(candidate.snapshot?.id || "");
      }
    }

    if (!content) {
      return issueResult("unresolved", {
        kind: "literature-content",
        universeId,
        itemId: doc.id,
        title: doc.title || "Untitled Literature",
        key: doc.contentStoreKey || canonicalKey,
        reason:
          stored.status === "invalid"
            ? "The IndexedDB document body is invalid and no valid fallback was found."
            : "The IndexedDB document body is missing and no valid fallback was found.",
      });
    }

    await putRecoveredPayload(canonicalKey, content);
    doc.content = content;
    doc.contentStoreKey = canonicalKey;
    doc.contentStored = "indexedDB";
    return issueResult("recovered", {
      kind: "literature-content",
      universeId,
      itemId: doc.id,
      title: doc.title || "Untitled Literature",
      key: canonicalKey,
      source,
      snapshotId,
      metadataChanged: true,
    });
  }

  function visionSnapshotValue(snapshots, universeId, itemId, field) {
    const candidate = newestSnapshotItem(snapshots, universeId, "vision", itemId, (item) =>
      validVisionPayload(
        item?.[field],
        field === "thumbnailDataUrl" ? "visionThumbnail" : "visionImage",
      ),
    );
    return candidate
      ? {value: candidate.item[field], snapshotId: String(candidate.snapshot?.id || "")}
      : null;
  }

  async function repairVisionImage(universeId, item, snapshots) {
    if (!item?.id || item.dataStored !== "indexedDB") {
      return issueResult("not-referenced", {
        kind: "vision-image",
        universeId,
        itemId: item?.id || "",
        value: validVisionPayload(item?.dataUrl, "visionImage") ? item.dataUrl : "",
      });
    }

    const canonicalKey = services.visionDataStoreKeyFor(universeId, item.id);
    const stored = await firstValidStoredPayload([item.dataStoreKey, canonicalKey], (value) =>
      validVisionPayload(value, "visionImage"),
    );
    if (stored.status === "valid") {
      const changed = item.dataStoreKey !== stored.key || item.dataStored !== "indexedDB";
      item.dataStoreKey = stored.key;
      item.dataStored = "indexedDB";
      return issueResult(changed ? "relinked" : "healthy", {
        kind: "vision-image",
        universeId,
        itemId: item.id,
        key: stored.key,
        value: stored.value,
        metadataChanged: changed,
      });
    }
    if (stored.status === "unavailable" || stored.status === "error") {
      return issueResult("unverified", {
        kind: "vision-image",
        universeId,
        itemId: item.id,
        key: item.dataStoreKey || canonicalKey,
        reason: stored.reason || stored.error?.message || "IndexedDB could not be checked.",
        value: "",
      });
    }

    let value = validVisionPayload(item.dataUrl, "visionImage") ? item.dataUrl : "";
    let source = value ? "portable metadata" : "";
    let snapshotId = "";
    if (!value) {
      const candidate = visionSnapshotValue(snapshots, universeId, item.id, "dataUrl");
      if (candidate) {
        value = candidate.value;
        source = "restore point";
        snapshotId = candidate.snapshotId;
      }
    }

    if (!value) {
      return issueResult("unresolved", {
        kind: "vision-image",
        universeId,
        itemId: item.id,
        title: item.title || "Untitled Vision",
        key: item.dataStoreKey || canonicalKey,
        value: "",
        reason:
          stored.status === "invalid"
            ? "The IndexedDB image is invalid and no full-image fallback was found."
            : "The IndexedDB image is missing and no full-image fallback was found.",
      });
    }

    await putRecoveredPayload(canonicalKey, value);
    item.dataStoreKey = canonicalKey;
    item.dataStored = "indexedDB";
    item.dataUrl = value;
    return issueResult("recovered", {
      kind: "vision-image",
      universeId,
      itemId: item.id,
      title: item.title || "Untitled Vision",
      key: canonicalKey,
      value,
      source,
      snapshotId,
      metadataChanged: true,
    });
  }

  async function repairVisionThumbnail(universeId, item, snapshots, fullImageResult) {
    if (!item?.id || item.thumbnailStored !== "indexedDB") {
      return issueResult("not-referenced", {
        kind: "vision-thumbnail",
        universeId,
        itemId: item?.id || "",
      });
    }

    const canonicalKey = services.visionThumbnailStoreKeyFor(universeId, item.id);
    const stored = await firstValidStoredPayload([item.thumbnailStoreKey, canonicalKey], (value) =>
      validVisionPayload(value, "visionThumbnail"),
    );
    if (stored.status === "valid") {
      const changed = item.thumbnailStoreKey !== stored.key || item.thumbnailStored !== "indexedDB";
      item.thumbnailStoreKey = stored.key;
      item.thumbnailStored = "indexedDB";
      return issueResult(changed ? "relinked" : "healthy", {
        kind: "vision-thumbnail",
        universeId,
        itemId: item.id,
        key: stored.key,
        metadataChanged: changed,
      });
    }
    if (stored.status === "unavailable" || stored.status === "error") {
      return issueResult("unverified", {
        kind: "vision-thumbnail",
        universeId,
        itemId: item.id,
        key: item.thumbnailStoreKey || canonicalKey,
        reason: stored.reason || stored.error?.message || "IndexedDB could not be checked.",
      });
    }

    let value = validVisionPayload(item.thumbnailDataUrl, "visionThumbnail")
      ? item.thumbnailDataUrl
      : "";
    let source = value ? "portable metadata" : "";
    let snapshotId = "";
    if (!value) {
      const candidate = visionSnapshotValue(snapshots, universeId, item.id, "thumbnailDataUrl");
      if (candidate) {
        value = candidate.value;
        source = "restore point";
        snapshotId = candidate.snapshotId;
      }
    }

    const fullImage =
      fullImageResult?.value ||
      (validVisionPayload(item.dataUrl, "visionImage") ? item.dataUrl : "");
    if (!value && fullImage && typeof services.regenerateVisionThumbnailDataUrl === "function") {
      try {
        value = await services.regenerateVisionThumbnailDataUrl(fullImage);
        if (validVisionPayload(value, "visionThumbnail"))
          source = "regenerated from the full image";
        else value = "";
      } catch (error) {
        value = "";
      }
    }

    if (!value) {
      return issueResult("unresolved", {
        kind: "vision-thumbnail",
        universeId,
        itemId: item.id,
        title: item.title || "Untitled Vision",
        key: item.thumbnailStoreKey || canonicalKey,
        reason:
          stored.status === "invalid"
            ? "The IndexedDB thumbnail is invalid and could not be regenerated."
            : "The IndexedDB thumbnail is missing and could not be regenerated.",
      });
    }

    await putRecoveredPayload(canonicalKey, value);
    item.thumbnailStoreKey = canonicalKey;
    item.thumbnailStored = "indexedDB";
    item.thumbnailDataUrl = value;
    return issueResult("recovered", {
      kind: "vision-thumbnail",
      universeId,
      itemId: item.id,
      title: item.title || "Untitled Vision",
      key: canonicalKey,
      source,
      snapshotId,
      metadataChanged: true,
    });
  }

  function shouldWriteMetadata(results) {
    return results.some((result) => result.metadataChanged);
  }

  function reportResults(results) {
    const repaired = results.filter(
      (result) => result.status === "recovered" || result.status === "relinked",
    );
    const unresolved = results.filter((result) => result.status === "unresolved");
    const unverified = results.filter((result) => result.status === "unverified");
    latestIssues = [...unresolved, ...unverified];
    if (!repaired.length && !unresolved.length && !unverified.length) return;

    const details = [];
    if (repaired.length)
      details.push(
        `${repaired.length} payload reference${repaired.length === 1 ? " was" : "s were"} repaired`,
      );
    if (unresolved.length)
      details.push(
        `${unresolved.length} payload${unresolved.length === 1 ? " remains" : "s remain"} incomplete`,
      );
    if (unverified.length)
      details.push(
        `${unverified.length} payload${unverified.length === 1 ? " could" : "s could"} not be verified`,
      );
    const error = new Error(`${details.join("; ")}.`);
    const userMessage = unresolved.length
      ? `Wormholes repaired ${repaired.length} incomplete stored payload${repaired.length === 1 ? "" : "s"}. ${unresolved.length} item${unresolved.length === 1 ? " still has" : "s still have"} missing image or document data; its metadata was preserved.`
      : unverified.length
        ? "Wormholes could not verify all large stored data because IndexedDB was unavailable. No records were treated as missing."
        : `Wormholes repaired ${repaired.length} missing or incomplete document/image payload${repaired.length === 1 ? "" : "s"}.`;
    services.reportAppError?.("IndexedDB data recovery", error, {userMessage});
  }

  async function recoverMissingOrPartialIndexedDbRecords() {
    if (window.__wormholesRecoveringIndexedDbRecords)
      return {repaired: 0, unresolved: 0, unverified: 0, results: []};
    const api = storeApi();
    if (!api?.inspect)
      return {repaired: 0, unresolved: 0, unverified: 0, results: [], skipped: true};

    window.__wormholesRecoveringIndexedDbRecords = true;
    const results = [];
    try {
      let snapshots = [];
      try {
        snapshots = (await snapshotsApi?.listSnapshots?.()) || [];
      } catch (error) {
        snapshots = [];
      }

      const universeIds = collectUniverseIds(snapshots);
      for (const universeId of universeIds) {
        const docs = readLiteratureMetadata(universeId);
        const literatureResults = [];
        for (const doc of docs) {
          const result = await repairLiteratureDocument(universeId, doc, snapshots);
          literatureResults.push(result);
          results.push(result);
        }
        if (shouldWriteMetadata(literatureResults))
          services.writeLiteratureMetadataOnly(universeId, docs);

        const visionItems = readVisionMetadata(universeId);
        const visionResults = [];
        for (const item of visionItems) {
          const imageResult = await repairVisionImage(universeId, item, snapshots);
          const thumbnailResult = await repairVisionThumbnail(
            universeId,
            item,
            snapshots,
            imageResult,
          );
          visionResults.push(imageResult, thumbnailResult);
          results.push(imageResult, thumbnailResult);
        }
        if (shouldWriteMetadata(visionResults))
          services.writeVisionMetadataOnly(universeId, visionItems);
      }
    } finally {
      window.__wormholesRecoveringIndexedDbRecords = false;
    }

    reportResults(results);
    return {
      repaired: results.filter(
        (result) => result.status === "recovered" || result.status === "relinked",
      ).length,
      unresolved: results.filter((result) => result.status === "unresolved").length,
      unverified: results.filter((result) => result.status === "unverified").length,
      results,
    };
  }

  const api = Object.freeze({
    recoverMissingOrPartialIndexedDbRecords,
    repairLiteratureDocument,
    repairVisionImage,
    repairVisionThumbnail,
    inspectPayload,
    validLiteraturePayload,
    validVisionPayload,
    get latestIssues() {
      return latestIssues.slice();
    },
  });
  window.WormholesIndexedDbRecovery = api;
  return api;
})();

const indexedDbRecoveryModuleApi = globalThis.WormholesIndexedDbRecovery;

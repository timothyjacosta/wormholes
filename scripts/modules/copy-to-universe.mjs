/* Wormholes Beta 248 cross-universe copy helpers.
   Copies are independent records with new IDs. Source items and source links remain unchanged. */
import "./content-limits.mjs";
import "./entity-limits.mjs";
import "./duplicate-creations.mjs";

function copyItemKindConfig(type) {
  return (
    {
      archive: {
        singular: "creation",
        groupLabel: "creation group",
        title: "Copy Creation",
        saved: "Creation copied",
        limit: "archive",
        tab: "archive",
      },
      literature: {
        singular: "Literature",
        groupLabel: "Literature group",
        title: "Copy Literature",
        saved: "Literature copied",
        limit: "literature",
        tab: "literature",
      },
      vision: {
        singular: "image",
        groupLabel: "image group",
        title: "Copy Image",
        saved: "Image copied",
        limit: "vision",
        tab: "vision",
      },
    }[type] || null
  );
}

function copyItemSource(type, itemId) {
  if (type === "archive") return getEntry?.(itemId) || null;
  if (type === "literature") return getLiteratureDoc?.(itemId) || null;
  if (type === "vision") return getVisionItem?.(itemId) || null;
  return null;
}

function copyItemCount(type, item) {
  if (type === "archive" && isGroupEntry?.(item)) return 1 + groupChildIds(item).length;
  if (type === "literature" && isLiteratureGroup?.(item))
    return 1 + literatureGroupChildDocs(item).length;
  return item ? 1 : 0;
}

function openCopyToUniverseModal(type, itemId) {
  const config = copyItemKindConfig(type);
  const item = copyItemSource(type, itemId);
  if (!config || !item) return;

  activeCopyItemType = type;
  activeCopyItemId = itemId;
  stagedCopyTargetUniverseId = null;

  const isGroup =
    type === "archive"
      ? isGroupEntry(item)
      : type === "literature"
        ? isLiteratureGroup(item)
        : false;
  const itemLabel = isGroup ? config.groupLabel : config.singular;
  document.getElementById("copyToUniverseTitle").textContent = isGroup
    ? `Copy ${itemLabel}`
    : config.title;
  document.getElementById("copyToUniverseSubtitle").textContent =
    `Choose a universe for “${item.title || item.sourceName || "Untitled"}”. The original will stay here.`;
  document.getElementById("saveCopyToUniverseBtn").textContent = isGroup
    ? `Copy ${itemLabel}`
    : `Copy ${config.singular}`;
  renderCopyToUniverseList();
  document.getElementById("copyToUniverseModal").classList.add("open");
}

function closeCopyToUniverseModal() {
  document.getElementById("copyToUniverseModal")?.classList.remove("open");
  activeCopyItemType = null;
  activeCopyItemId = null;
  stagedCopyTargetUniverseId = null;
}

function renderCopyToUniverseList() {
  const list = document.getElementById("copyToUniverseList");
  if (!list) return;
  const targets = universes.filter((universe) => universe.id !== currentUniverseId);
  const saveButton = document.getElementById("saveCopyToUniverseBtn");
  if (saveButton) {
    const disabled = !stagedCopyTargetUniverseId;
    saveButton.setAttribute("aria-disabled", disabled ? "true" : "false");
    saveButton.disabled = disabled;
  }

  if (!targets.length) {
    list.innerHTML = `<div class="universe-empty">Create another universe to copy this item.</div>`;
    return;
  }

  list.innerHTML = targets
    .map((universe) => {
      const selected = universe.id === stagedCopyTargetUniverseId;
      return `
      <button class="universe-entry-button copy-universe-target app-button ${selected ? "selected" : ""}" type="button" data-id="${escapeHtml(universe.id)}" data-app-button="true" aria-pressed="${selected ? "true" : "false"}">
        <span class="universe-entry-title">${escapeHtml(universe.title)}</span>
        ${universe.summary ? `<span class="universe-entry-summary">${escapeHtml(universe.summary)}</span>` : ""}
      </button>
    `;
    })
    .join("");

  document.querySelectorAll(".copy-universe-target").forEach((button) => {
    button.addEventListener("click", () => {
      stagedCopyTargetUniverseId = button.dataset.id;
      renderCopyToUniverseList();
    });
  });
}

function openCopyNewUniverseModal() {
  if (!activeCopyItemType || !activeCopyItemId) return;
  document.getElementById("copyNewUniverseError")?.classList.remove("show");
  const input = document.getElementById("copyNewUniverseInput");
  if (input) input.value = "";
  document.getElementById("copyNewUniverseModal")?.classList.add("open");
  setTimeout(() => input?.focus(), 0);
}

function closeCopyNewUniverseModal() {
  document.getElementById("copyNewUniverseModal")?.classList.remove("open");
}

async function createCopyNewUniverse() {
  const config = copyItemKindConfig(activeCopyItemType);
  const source = copyItemSource(activeCopyItemType, activeCopyItemId);
  if (!config || !source) return;

  const input = document.getElementById("copyNewUniverseInput");
  const title = input?.value.trim() || "";
  document.getElementById("copyNewUniverseError")?.classList.remove("show");
  if (!title) {
    setModalErrorText("copyNewUniverseError", "A universe title is required.");
    input?.focus();
    return;
  }
  if (
    window.WormholesContentLimits &&
    !window.WormholesContentLimits.ensureString("title", title, {
      fieldName: "universe title",
      operation: "create this universe",
    }).ok
  )
    return;
  if (duplicateUniverseTitleExists(title)) {
    setModalErrorText(
      "copyNewUniverseError",
      "A universe with that title already exists. Choose a unique title.",
    );
    input?.focus();
    return;
  }
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("universes", universes.length, 1, {
      operation: "create another universe",
    }).ok
  )
    return;
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure(
      config.limit,
      0,
      copyItemCount(activeCopyItemType, source),
      {context: title, operation: "copy this item"},
    ).ok
  )
    return;

  const universe = {
    id: makeId(),
    title,
    summary: "",
    bridges: [],
    createdAt: new Date().toISOString(),
  };
  universe.diskFolderName = stableUniverseFolderName(universe);
  universes.unshift(universe);
  if (!saveUniversesToStorage()) {
    universes = universes.filter((item) => item.id !== universe.id);
    setModalErrorText("copyNewUniverseError", "Could not create the universe. Try again.");
    return;
  }
  if (localFoldersEnabled && wormholesParentFolderHandle) {
    try {
      await prepareWormholesFolderHandles({requestPermission: true});
      await ensureUniverseFolders(universe);
    } catch (error) {}
  }

  closeCopyNewUniverseModal();
  const copied = await copyActiveItemToUniverse(universe.id);
  if (!copied) {
    universes = universes.filter((item) => item.id !== universe.id);
    saveUniversesToStorage();
    return;
  }
  renderUniverseArchiveList?.();
}

async function saveCopyToUniverse() {
  if (!stagedCopyTargetUniverseId) return;
  await copyActiveItemToUniverse(stagedCopyTargetUniverseId);
}

function cloneArchiveEntriesForCopy(sourceArchive, sourceEntry, sourceUniverse, targetUniverseId) {
  const wanted = new Set([sourceEntry.id]);
  if (isGroupEntry(sourceEntry)) groupChildIds(sourceEntry).forEach((id) => wanted.add(id));
  const idMap = {};
  sourceArchive.forEach((entry) => {
    if (wanted.has(entry.id)) idMap[entry.id] = makeId();
  });
  const now = new Date().toISOString();
  const copiedEntries = sourceArchive
    .filter((entry) => wanted.has(entry.id))
    .map((entry) => {
      const clone = JSON.parse(JSON.stringify(entry));
      const oldId = clone.id;
      clone.id = idMap[oldId];
      clone.connections = [];
      clone.bridges = [];
      clone.storage = "";
      clone.folderFileName = "";
      clone.copiedAt = now;
      clone.copiedFromUniverse = sourceUniverse?.title || "";
      clone.copiedFromUniverseId = sourceUniverse?.id || "";
      if (isGroupEntry(clone)) {
        clone.groupIds = groupChildIds(clone)
          .filter((id) => idMap[id])
          .map((id) => idMap[id]);
        delete clone.children;
        clone.attr2 = {
          val: `${clone.groupIds.length} grouped item${clone.groupIds.length === 1 ? "" : "s"}`,
        };
      } else {
        // Group membership belongs to the source universe. Normal copied creations
        // must not carry an absent/undefined group field into persisted data.
        delete clone.groupIds;
        delete clone.children;
      }
      return clone;
    });
  return {idMap, copiedEntries};
}

async function copyArchiveItemToUniverse(itemId, targetUniverseId) {
  const sourceEntry = getEntry(itemId);
  const sourceUniverse = getCurrentUniverse();
  const targetUniverse = universes.find((universe) => universe.id === targetUniverseId);
  if (!sourceEntry || !sourceUniverse || !targetUniverse || targetUniverseId === currentUniverseId)
    return false;

  const {copiedEntries} = cloneArchiveEntriesForCopy(
    archiveEntries,
    sourceEntry,
    sourceUniverse,
    targetUniverseId,
  );
  const targetArchive = readArchiveForUniverse(targetUniverseId);
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("archive", targetArchive.length, copiedEntries.length, {
      context: targetUniverse.title || "",
      operation: "copy these Archive items",
    }).ok
  )
    return false;
  if (window.WormholesDuplicateCreations?.reviewBatch) {
    const review = await window.WormholesDuplicateCreations.reviewBatch(
      copiedEntries,
      targetArchive,
      {
        actionLabel: "Copy Anyway",
        actionKind: "copy",
        opener: document.getElementById("saveCopyToUniverseBtn"),
      },
    );
    if (review.decision === "view") {
      closeCopyToUniverseModal();
      enterUniverse(targetUniverseId);
      switchTab("archive");
      revealArchiveEntryForTag(review.match?.existing?.id || "");
      return "view";
    }
    if (review.decision !== "proceed") return false;
  }

  const nextArchive = [...copiedEntries, ...targetArchive];
  if (!saveArchiveForUniverse(targetUniverseId, nextArchive)) return false;

  if (localFoldersEnabled && wormholesCreationsRootHandle) {
    try {
      const folders = await ensureUniverseFolders(targetUniverse);
      if (folders?.creations && (await requestFolderPermission(folders.creations))) {
        for (const entry of copiedEntries)
          await writeArchiveEntryToFolder(entry, folders.creations, targetUniverse);
        saveArchiveForUniverse(targetUniverseId, nextArchive);
      }
    } catch (error) {
      rememberFolderSaveFailure(
        "Copied creation saved in app, but could not sync to the target local folder",
        error,
      );
    }
  }
  return true;
}

async function cloneLiteratureEntriesForCopy(sourceDoc, targetUniverseId) {
  const wanted = new Set([sourceDoc.id]);
  if (isLiteratureGroup(sourceDoc))
    literatureGroupChildDocs(sourceDoc).forEach((doc) => wanted.add(doc.id));
  const sources = literatureEntries.filter((doc) => wanted.has(doc.id));
  for (const doc of sources) {
    if (!isLiteratureGroup(doc)) await materializeLiteratureDoc(doc);
  }
  const idMap = {};
  sources.forEach((doc) => {
    idMap[doc.id] = makeId();
  });
  const now = new Date().toISOString();
  return sources.map((doc) => {
    const clone = JSON.parse(JSON.stringify(doc));
    const oldId = clone.id;
    clone.id = idMap[oldId];
    clone.tags = {universes: [], entries: []};
    clone.storage = "";
    clone.folderFileName = "";
    clone.createdAt = now;
    clone.updatedAt = now;
    clone.copiedAt = now;
    clone.copiedFromUniverse = getCurrentUniverse()?.title || "";
    clone.copiedFromUniverseId = currentUniverseId || "";
    if (isLiteratureGroup(clone)) {
      clone.groupIds = (clone.groupIds || []).filter((id) => idMap[id]).map((id) => idMap[id]);
      clone.contentStoreKey = "";
      clone.contentStored = "";
    } else {
      clone.contentStoreKey = literatureContentStoreKeyFor(targetUniverseId, clone.id);
      clone.contentStored = clone.content ? "pending-indexedDB" : "";
    }
    return clone;
  });
}

async function copyLiteratureItemToUniverse(itemId, targetUniverseId) {
  const sourceDoc = getLiteratureDoc(itemId);
  const targetUniverse = universes.find((universe) => universe.id === targetUniverseId);
  if (!sourceDoc || !targetUniverse || targetUniverseId === currentUniverseId) return false;
  const copiedDocs = await cloneLiteratureEntriesForCopy(sourceDoc, targetUniverseId);
  const targetDocs = readLiteratureForUniverse(targetUniverseId);
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("literature", targetDocs.length, copiedDocs.length, {
      context: targetUniverse.title || "",
      operation: "copy these Literature items",
    }).ok
  )
    return false;

  if (largeDataStoreAvailable()) {
    for (const doc of copiedDocs) {
      if (!isLiteratureGroup(doc)) await persistLiteratureLargeData(targetUniverseId, doc);
    }
  }
  const nextDocs = [...copiedDocs, ...targetDocs];
  if (!saveLiteratureForUniverse(targetUniverseId, nextDocs)) return false;

  if (localFoldersEnabled && wormholesLiteratureRootHandle) {
    try {
      const folders = await ensureUniverseFolders(targetUniverse);
      if (folders?.literature && (await requestFolderPermission(folders.literature))) {
        for (const doc of copiedDocs) {
          if (isLiteratureGroup(doc)) continue;
          await writeLiteratureDocToSpecificFolder(
            doc,
            folders.literature,
            doc.content || "<p></p>",
            {forceTitleFileName: true},
          );
        }
        saveLiteratureForUniverse(targetUniverseId, nextDocs);
      }
    } catch (error) {
      rememberFolderSaveFailure(
        "Copied Literature saved in app, but could not sync to the target local folder",
        error,
      );
    }
  }
  return true;
}

async function copyVisionItemToUniverse(itemId, targetUniverseId) {
  const sourceItem = getVisionItem(itemId);
  const targetUniverse = universes.find((universe) => universe.id === targetUniverseId);
  if (!sourceItem || !targetUniverse || targetUniverseId === currentUniverseId) return false;

  const clone = JSON.parse(JSON.stringify(sourceItem));
  await materializeVisionItemForAppDataExport(clone, currentUniverseId);
  if (!clone.dataUrl) {
    showErrorToast("Image could not be copied. Reconnect its folder and try again.");
    return false;
  }

  const now = new Date().toISOString();
  clone.id = makeId();
  clone.tags = {universes: [], entries: []};
  clone.storage = "";
  clone.folderFileName = "";
  clone.dataStoreKey = visionDataStoreKeyFor(targetUniverseId, clone.id);
  clone.thumbnailStoreKey = visionThumbnailStoreKeyFor(targetUniverseId, clone.id);
  clone.dataStored = clone.dataUrl ? "pending-indexedDB" : "";
  clone.thumbnailStored = clone.thumbnailDataUrl ? "pending-indexedDB" : "";
  clone.createdAt = now;
  clone.copiedAt = now;
  clone.copiedFromUniverse = getCurrentUniverse()?.title || "";
  clone.copiedFromUniverseId = currentUniverseId || "";

  const targetItems = readVisionBoardForUniverse(targetUniverseId);
  if (
    window.WormholesEntityLimits &&
    !window.WormholesEntityLimits.ensure("vision", targetItems.length, 1, {
      context: targetUniverse.title || "",
      operation: "copy this image",
    }).ok
  )
    return false;
  if (largeDataStoreAvailable()) await persistVisionLargeData(targetUniverseId, clone);
  const nextItems = [clone, ...targetItems];
  if (!saveVisionBoardForUniverse(targetUniverseId, nextItems)) return false;

  if (localFoldersEnabled && wormholesImagesRootHandle) {
    try {
      const folders = await ensureUniverseFolders(targetUniverse);
      if (folders?.images && (await requestFolderPermission(folders.images))) {
        const extension = visionExtensionForStoredItem(clone, ".jpg");
        clone.folderFileName = await uniqueFolderFileName(
          folders.images,
          clone.title || clone.sourceName || "vision",
          extension,
        );
        await writeBlobToFolder(folders.images, clone.folderFileName, dataUrlToBlob(clone.dataUrl));
        clone.storage = "folder";
        saveVisionBoardForUniverse(targetUniverseId, nextItems);
      }
    } catch (error) {
      rememberFolderSaveFailure(
        "Copied image saved in app, but could not sync to the target local folder",
        error,
      );
    }
  }
  return true;
}

async function copyActiveItemToUniverse(targetUniverseId) {
  const type = activeCopyItemType;
  const itemId = activeCopyItemId;
  const config = copyItemKindConfig(type);
  if (!config || !itemId || !targetUniverseId) return false;

  let copied = false;
  try {
    if (type === "archive") copied = await copyArchiveItemToUniverse(itemId, targetUniverseId);
    else if (type === "literature")
      copied = await copyLiteratureItemToUniverse(itemId, targetUniverseId);
    else if (type === "vision") copied = await copyVisionItemToUniverse(itemId, targetUniverseId);
  } catch (error) {
    reportAppError("Could not copy this item to another universe", error, {
      userMessage: "The item could not be copied.",
    });
    copied = false;
  }

  if (copied === "view") return true;
  if (!copied) return false;
  closeCopyToUniverseModal();
  closeMenus?.();
  showSavedToast(config.saved);
  renderUniverseArchiveList?.();
  return true;
}

/* Compatibility publication for bootstrap wiring and direct-file builds. */
Object.assign(globalThis, {
  openCopyToUniverseModal,
  closeCopyToUniverseModal,
  renderCopyToUniverseList,
  openCopyNewUniverseModal,
  closeCopyNewUniverseModal,
  createCopyNewUniverse,
  saveCopyToUniverse,
  copyActiveItemToUniverse,
});

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};

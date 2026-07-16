/* Wormholes Beta 301 bootstrap and startup wiring. */
import "./copy-to-universe.mjs";
import "./global-search.mjs";
import "./map-search.mjs";
import "./undo.mjs";
import "./startup-coordinator.mjs";

window.WormholesUrlSafety?.installLinkGuard?.();
window.WormholesDensity?.initialize?.();

const RELATIONSHIP_GUIDES = Object.freeze([
  Object.freeze({
    buttonId: "connectionsHelpBtn",
    panelId: "connectionsHelpPanel",
    dismissId: "dismissConnectionsHelpBtn",
    storageKey: "wormholesConnectionsHelpSeen",
  }),
  Object.freeze({
    buttonId: "bridgesHelpBtn",
    panelId: "bridgesHelpPanel",
    dismissId: "dismissBridgesHelpBtn",
    storageKey: "wormholesBridgesHelpSeen",
  }),
]);

function relationshipGuideWasSeen(storageKey) {
  try {
    return window.localStorage?.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

function rememberRelationshipGuide(storageKey) {
  try {
    window.localStorage?.setItem(storageKey, "true");
  } catch {
    // The guide still works when browser storage is unavailable.
  }
}

function setRelationshipGuideOpen(config, open, {remember = false} = {}) {
  const button = document.getElementById(config.buttonId);
  const panel = document.getElementById(config.panelId);
  if (!button || !panel) return;

  button.setAttribute("aria-expanded", open ? "true" : "false");
  button.textContent = open ? "Hide help" : "What’s this?";
  panel.hidden = !open;
  if (remember) rememberRelationshipGuide(config.storageKey);
}

function initializeRelationshipGuides() {
  RELATIONSHIP_GUIDES.forEach((config) => {
    const button = document.getElementById(config.buttonId);
    const dismiss = document.getElementById(config.dismissId);
    if (!button || !dismiss) return;

    const showFirstTimeHelp = !relationshipGuideWasSeen(config.storageKey);
    setRelationshipGuideOpen(config, showFirstTimeHelp);

    button.addEventListener("click", () => {
      const isOpen = button.getAttribute("aria-expanded") === "true";
      setRelationshipGuideOpen(config, !isOpen, {remember: isOpen});
    });

    dismiss.addEventListener("click", () => {
      setRelationshipGuideOpen(config, false, {remember: true});
      button.focus({preventScroll: true});
    });
  });
}

initializeRelationshipGuides();

document.getElementById("currentTabBtn").addEventListener("click", () => switchTab("current"));
document.getElementById("createTabBtn").addEventListener("click", () => switchTab("create"));
document.getElementById("archiveTabBtn").addEventListener("click", () => switchTab("archive"));
document
  .getElementById("literatureTabBtn")
  .addEventListener("click", () => switchTab("literature"));
document.getElementById("visionTabBtn").addEventListener("click", () => switchTab("vision"));
document.getElementById("archiveFilterBtn").addEventListener("click", toggleArchiveFilterPanel);
[
  "archiveFilterType",
  "archiveFilterGroup",
  "archiveFilterConnections",
  "archiveFilterNotes",
  "archiveFilterSummary",
].forEach((id) => {
  const control = document.getElementById(id);
  control.addEventListener(
    control.tagName === "SELECT" ? "change" : "change",
    applyArchiveFiltersFromControls,
  );
});
document.getElementById("resetArchiveFiltersBtn").addEventListener("click", resetArchiveFilters);
document
  .getElementById("closeArchiveFiltersBtn")
  .addEventListener("click", closeArchiveFilterPanel);
document.getElementById("archiveSortBtn").addEventListener("click", toggleArchiveSortPanel);
document.getElementById("archiveSortOrder").addEventListener("change", applyArchiveSortFromControl);
document.getElementById("resetArchiveSortBtn").addEventListener("click", resetArchiveSort);
document.getElementById("closeArchiveSortBtn").addEventListener("click", closeArchiveSortPanel);
document
  .getElementById("literatureFilterBtn")
  .addEventListener("click", toggleLiteratureFilterPanel);
[
  "literatureFilterType",
  "literatureFilterGroup",
  "literatureFilterTags",
  "literatureFilterContent",
].forEach((id) => {
  document.getElementById(id).addEventListener("change", applyLiteratureFiltersFromControls);
});
document
  .getElementById("resetLiteratureFiltersBtn")
  .addEventListener("click", resetLiteratureFilters);
document
  .getElementById("closeLiteratureFiltersBtn")
  .addEventListener("click", closeLiteratureFilterPanel);
document.getElementById("literatureSortBtn").addEventListener("click", toggleLiteratureSortPanel);
document
  .getElementById("literatureSortOrder")
  .addEventListener("change", applyLiteratureSortFromControl);
document.getElementById("resetLiteratureSortBtn").addEventListener("click", resetLiteratureSort);
document
  .getElementById("closeLiteratureSortBtn")
  .addEventListener("click", closeLiteratureSortPanel);
document.getElementById("visionFilterBtn").addEventListener("click", toggleVisionFilterPanel);
["visionFilterTags", "visionFilterStorage", "visionFilterFormat"].forEach((id) => {
  document.getElementById(id).addEventListener("change", applyVisionFiltersFromControls);
});
document.getElementById("resetVisionFiltersBtn").addEventListener("click", resetVisionFilters);
document.getElementById("closeVisionFiltersBtn").addEventListener("click", closeVisionFilterPanel);
document.getElementById("visionSortBtn").addEventListener("click", toggleVisionSortPanel);
document.getElementById("visionSortOrder").addEventListener("change", applyVisionSortFromControl);
document.getElementById("resetVisionSortBtn").addEventListener("click", resetVisionSort);
document.getElementById("closeVisionSortBtn").addEventListener("click", closeVisionSortPanel);
document.getElementById("connectionsBtn").addEventListener("click", () => {
  showConnectionsScreen();
  document.getElementById("connectionsHeading")?.focus?.({preventScroll: true});
});
document.getElementById("backToArchiveBtn").addEventListener("click", () => {
  showArchiveListScreen();
  document.getElementById("archiveListHeading")?.focus?.({preventScroll: true});
  showSavedToast("Connections saved");
});
document.getElementById("uploadLiteratureBtn").addEventListener("click", openLiteratureUploadModal);
document
  .getElementById("chooseLiteratureFilesBtn")
  .addEventListener("click", chooseLiteratureUploadFiles);
document
  .getElementById("cancelLiteratureUploadBtn")
  .addEventListener("click", closeLiteratureUploadModal);
document.getElementById("uploadVisionBtn").addEventListener("click", openVisionUploadModal);
document.getElementById("chooseVisionFilesBtn").addEventListener("click", chooseVisionUploadFiles);
document.getElementById("cancelVisionUploadBtn").addEventListener("click", closeVisionUploadModal);
document
  .getElementById("settingsLocalFolderToggle")
  ?.addEventListener("change", handleLocalFolderToggleChange);
document
  .getElementById("understandLocalFolderWarningBtn")
  .addEventListener("click", acknowledgeLocalFolderDeletionWarning);
document
  .getElementById("reconnectSavedLocalFolderBtn")
  .addEventListener("click", reconnectSavedLocalFolderFromModal);
document
  .getElementById("findLocalFolderBtn")
  .addEventListener("click", findLocalFolderFromNotFoundModal);
document
  .getElementById("useAppOnlyLocalFolderBtn")
  .addEventListener("click", useAppOnlyFromNotFoundModal);
document
  .getElementById("syncExistingLocalFilesYesBtn")
  .addEventListener("click", () => confirmLocalFolderSync(true));
document
  .getElementById("syncExistingLocalFilesNoBtn")
  .addEventListener("click", () => confirmLocalFolderSync(false));
document
  .getElementById("createLiteratureBtn")
  .addEventListener("click", () => showLiteratureEditorScreen());
document.getElementById("literatureFileInput").addEventListener("change", (event) => {
  closeLiteratureUploadModal();
  uploadLiteratureFiles(event.target.files);
});
document.getElementById("visionFileInput").addEventListener("change", (event) => {
  closeVisionUploadModal();
  uploadVisionFiles(event.target.files);
});
document.getElementById("saveLiteratureBtn").addEventListener("click", saveLiteratureDoc);
document
  .getElementById("cancelLiteratureEditorBtn")
  .addEventListener("click", () => closeLiteratureEditor());
document
  .getElementById("literatureBoldBtn")
  .addEventListener("click", () => applyLiteratureFormat("bold"));
document
  .getElementById("literatureItalicBtn")
  .addEventListener("click", () => applyLiteratureFormat("italic"));
document
  .getElementById("literatureTextSize")
  .addEventListener("change", (event) => applyLiteratureFormat("fontSize", event.target.value));
document
  .getElementById("saveLiteratureTagBtn")
  .addEventListener("click", saveAndCloseLiteratureTagModal);
document.getElementById("closeLiteratureTagBtn").addEventListener("click", closeLiteratureTagModal);
document
  .getElementById("closeLiteratureViewerBtn")
  .addEventListener("click", closeLiteratureViewer);
document.getElementById("editFromLiteratureViewerBtn").addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();
    editActiveLiteratureFromViewer();
  },
  true,
);
document.getElementById("editFromLiteratureViewerBtn").addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      editActiveLiteratureFromViewer();
    }
  },
  true,
);
document
  .getElementById("closeLiteratureLinksBtn")
  .addEventListener("click", closeLiteratureLinksModal);
document.getElementById("closeVisionLinksBtn").addEventListener("click", closeVisionLinksModal);
document
  .getElementById("returnVisionImageViewerBtn")
  .addEventListener("click", closeVisionImageViewerModal);
document.addEventListener("click", handleTaggedImageThumbnailClick);
document.getElementById("cancelVisionRenameBtn").addEventListener("click", closeVisionRenameModal);
document.getElementById("saveVisionRenameBtn").addEventListener("click", saveVisionRename);
document
  .getElementById("cancelVisionDeleteBtn")
  .addEventListener("click", closeVisionDeleteConfirm);
document.getElementById("confirmVisionDeleteBtn").addEventListener("click", confirmVisionDelete);
document
  .getElementById("cancelLiteratureDeleteBtn")
  .addEventListener("click", closeLiteratureDeleteConfirm);
document
  .getElementById("confirmLiteratureDeleteBtn")
  .addEventListener("click", confirmLiteratureDelete);
document.getElementById("homeBtn").addEventListener("click", () => {
  if (literatureEditorIsOpen()) closeLiteratureEditor({showHome: true});
  else showHomeScreen();
});
document
  .getElementById("cancelUniverseTitleBtn")
  .addEventListener("click", closeUniverseTitleModal);
document.getElementById("saveUniverseTitleBtn").addEventListener("click", createUniverseFromModal);
document
  .getElementById("closeUniverseArchiveBtn")
  .addEventListener("click", closeUniverseArchiveModal);
document.getElementById("createUniverseFromArchiveBtn").addEventListener("click", () => {
  closeUniverseArchiveModal();
  openUniverseTitleModal();
});
document.getElementById("saveMigrateBtn").addEventListener("click", (event) => {
  if (event.currentTarget.getAttribute("aria-disabled") === "true") return;
  saveMigratePickerModal();
});
document.getElementById("cancelMigrateBtn").addEventListener("click", closeMigrateModal);
document
  .getElementById("migrateToNewUniverseBtn")
  .addEventListener("click", openMigrateNewUniverseModal);
document
  .getElementById("cancelMigrateNewUniverseBtn")
  .addEventListener("click", closeMigrateNewUniverseModal);
document
  .getElementById("saveMigrateNewUniverseBtn")
  .addEventListener("click", createMigrateNewUniverse);
document.getElementById("saveCopyToUniverseBtn").addEventListener("click", (event) => {
  if (event.currentTarget.getAttribute("aria-disabled") === "true") return;
  saveCopyToUniverse();
});
document
  .getElementById("cancelCopyToUniverseBtn")
  .addEventListener("click", closeCopyToUniverseModal);
document.getElementById("copyToNewUniverseBtn").addEventListener("click", openCopyNewUniverseModal);
document
  .getElementById("cancelCopyNewUniverseBtn")
  .addEventListener("click", closeCopyNewUniverseModal);
document.getElementById("saveCopyNewUniverseBtn").addEventListener("click", createCopyNewUniverse);
document.getElementById("saveBridgeBtn").addEventListener("click", saveBridgePickerModal);
document.getElementById("cancelBridgeBtn").addEventListener("click", closeBridgeModal);
document
  .getElementById("bridgeToNewUniverseBtn")
  .addEventListener("click", openBridgeNewUniverseModal);
document
  .getElementById("cancelBridgeNewUniverseBtn")
  .addEventListener("click", closeBridgeNewUniverseModal);
document
  .getElementById("saveBridgeNewUniverseBtn")
  .addEventListener("click", createBridgeNewUniverse);
document.getElementById("closeWormholesBtn").addEventListener("click", () => {
  closeWormholesModal();
  showSavedToast("Bridges saved");
});
document
  .getElementById("clearBridgesBtn")
  .addEventListener("click", () => openClearMapConfirm("bridges"));
document
  .getElementById("clearConnectionsBtn")
  .addEventListener("click", () => openClearMapConfirm("connections"));
document.getElementById("cancelClearMapBtn").addEventListener("click", closeClearMapConfirm);
document.getElementById("confirmClearMapBtn").addEventListener("click", confirmClearMapAction);
document
  .getElementById("cancelUniverseSummaryBtn")
  .addEventListener("click", closeUniverseSummaryModal);
document.getElementById("saveUniverseSummaryBtn").addEventListener("click", saveUniverseSummary);
document.getElementById("cancelUniverseEditBtn").addEventListener("click", closeUniverseEditModal);
document.getElementById("saveUniverseEditBtn").addEventListener("click", saveUniverseEdit);
document.getElementById("cancelDeleteEntryBtn").addEventListener("click", closeDeleteEntryConfirm);
document.getElementById("confirmDeleteEntryBtn").addEventListener("click", confirmDeleteEntry);
document.getElementById("cancelDeleteUniverseBtn").addEventListener("click", () => {
  closeDeleteUniverseModal();
  activeUniverseDeleteId = null;
});
document
  .getElementById("confirmDeleteUniverseBtn")
  .addEventListener("click", confirmDeleteUniverseWithoutMigration);
document
  .getElementById("migrateBeforeDeleteUniverseBtn")
  .addEventListener("click", openDeleteUniverseMigrateModal);
document.getElementById("backToDeleteUniverseBtn").addEventListener("click", () => {
  closeDeleteUniverseMigrateModal();
  if (activeUniverseDeleteId) openDeleteUniverseModal(activeUniverseDeleteId);
});
document.getElementById("cancelDeleteUniverseMigrateBtn").addEventListener("click", () => {
  closeDeleteUniverseMigrateModal();
  activeUniverseDeleteId = null;
});

document.getElementById("whatBtn").addEventListener("click", rollWhat);
document.getElementById("attrBtn").addEventListener("click", rollAttr);
document.getElementById("storyBtn").addEventListener("click", rollPressure);
document.getElementById("quickFullRollBtn").addEventListener("click", quickFullRoll);
document.getElementById("result")?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-generation-action][data-generation-field]");
  if (!button || button.disabled) return;
  const field = button.dataset.generationField;
  if (button.dataset.generationAction === "reroll") {
    window.rerollGenerationField?.(field);
  } else if (button.dataset.generationAction === "lock") {
    window.toggleGenerationFieldLock?.(field);
  }
});
document
  .getElementById("skipRollAnimationToggle")
  ?.addEventListener("change", handleSkipRollAnimationToggle);
document.getElementById("newBtn").addEventListener("click", newCreation);
document.getElementById("archiveBtn").addEventListener("click", openTitleModal);
document.getElementById("cancelArchiveBtn").addEventListener("click", closeTitleModal);
document.getElementById("saveArchiveBtn").addEventListener("click", saveCurrentToArchive);
document.getElementById("cancelConnectionTextBtn").addEventListener("click", closeConnectionModal);
document.getElementById("saveConnectionTextBtn").addEventListener("click", saveConnectionModalText);
document
  .getElementById("cancelRelationshipRemovalBtn")
  .addEventListener("click", closeRelationshipRemovalConfirm);
document
  .getElementById("confirmRelationshipRemovalBtn")
  .addEventListener("click", confirmRelationshipRemoval);
document
  .getElementById("deleteConnectionTextBtn")
  .addEventListener("click", deleteConnectionModalText);
document.getElementById("cancelSummaryBtn").addEventListener("click", closeSummaryModal);
document.getElementById("saveSummaryBtn").addEventListener("click", saveSummaryText);
document.getElementById("deleteSummaryBtn").addEventListener("click", deleteSummaryText);
document.getElementById("cancelNoteBtn").addEventListener("click", closeNoteModal);
document.getElementById("saveNoteBtn").addEventListener("click", saveNoteText);
document.getElementById("cancelGroupBtn").addEventListener("click", closeGroupModal);
document.getElementById("saveGroupBtn").addEventListener("click", saveGroupModal);
document
  .getElementById("cancelGroupConnectionBtn")
  .addEventListener("click", closeGroupConnectionModal);
document.getElementById("saveConnectPickerBtn").addEventListener("click", saveConnectPickerModal);
document
  .getElementById("cancelConnectPickerBtn")
  .addEventListener("click", closeConnectPickerModal);
document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);
document.getElementById("saveEditBtn").addEventListener("click", saveEditEntry);
document
  .getElementById("clearManualBtn")
  .addEventListener(
    "click",
    typeof clearManualCreateWithUndo === "function" ? clearManualCreateWithUndo : clearManualCreate,
  );
document.getElementById("saveManualBtn").addEventListener("click", saveManualCreation);

const manualCreateChangeHandler =
  typeof handleManualCreateFieldChange === "function"
    ? handleManualCreateFieldChange
    : updateManualButtons;

[
  "manualTitle",
  "manualWhat",
  "manualWhatCustom",
  "manualAttr1",
  "manualAttr1Custom",
  "manualAttr2",
  "manualAttr2Custom",
  "manualStory",
  "manualStoryCustom",
].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("input", manualCreateChangeHandler);
  el.addEventListener("change", manualCreateChangeHandler);
});

window.addEventListener("beforeunload", () => {
  if (typeof persistManualCreateDraft === "function") persistManualCreateDraft({showStatus: false});
});

document.getElementById("creationTitleInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveCurrentToArchive();
});

document.getElementById("visionRenameInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveVisionRename();
});

document.getElementById("visionDeleteConfirmModal").addEventListener("keydown", (event) => {
  if (event.key === "Enter") confirmVisionDelete();
});

document.getElementById("literatureDeleteConfirmModal").addEventListener("keydown", (event) => {
  if (event.key === "Enter") confirmLiteratureDelete();
});

document
  .getElementById("literatureTitleInput")
  .addEventListener("input", markLiteratureEditorDirty);
document.getElementById("literatureEditor").addEventListener("input", markLiteratureEditorDirty);
window.addEventListener("beforeunload", handleLiteratureBeforeUnload);

document.getElementById("literatureTitleInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveLiteratureDoc();
});

document.getElementById("literatureEditor").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
    saveLiteratureDoc();
  }
});

document
  .getElementById("literatureEditor")
  .addEventListener("paste", handleLiteratureEditorTextTransfer);
document
  .getElementById("literatureEditor")
  .addEventListener("drop", handleLiteratureEditorTextTransfer);
document.getElementById("literatureEditor").addEventListener("dragover", (event) => {
  const types = Array.from(event.dataTransfer?.types || []);
  if (types.includes("text/plain") || types.includes("text/html")) event.preventDefault();
});

document.getElementById("groupTitleInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveGroupModal();
});

document.getElementById("wormholesMapWrap").addEventListener("dragstart", (event) => {
  event.preventDefault();
});

document.getElementById("universeTitleInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") createUniverseFromModal();
});

document.getElementById("bridgeNewUniverseInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") createBridgeNewUniverse();
});

document.getElementById("migrateNewUniverseInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") createMigrateNewUniverse();
});
document.getElementById("copyNewUniverseInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") createCopyNewUniverse();
});

document.getElementById("universeSummaryInput").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveUniverseSummary();
});

document.getElementById("universeEditTitleInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveUniverseEdit();
});

document.getElementById("universeEditSummaryInput").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveUniverseEdit();
});

document.getElementById("connectionTextInput").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveConnectionModalText();
});

document.getElementById("summaryTextInput").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveSummaryText();
});

document.getElementById("noteTextInput").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveNoteText();
});

document.getElementById("editTitle").addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveEditEntry();
});

document.getElementById("editSummary").addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveEditEntry();
});

document.getElementById("addEditNoteBtn").addEventListener("click", openEditAddNoteModal);

document.getElementById("cancelVisionTagGoBtn").addEventListener("click", closeVisionTagGoModal);
document.getElementById("confirmVisionTagGoBtn").addEventListener("click", goToVisionTagTarget);

installSettingsMenuHandlers();

document.addEventListener("click", handleVisionBoardDelegatedClick, true);

document.addEventListener("keydown", (event) => {
  const tagButton = event.target.closest?.(".vision-pin-tag[data-tag-type]");
  if (!tagButton || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  event.stopPropagation();
  openVisionTagGoModal({
    type: tagButton.dataset.tagType,
    universeId: tagButton.dataset.universeId || "",
    entryId: tagButton.dataset.entryId || "",
    title: tagButton.dataset.tagTitle || tagButton.textContent.trim(),
  });
});

document.addEventListener(
  "click",
  (event) => {
    const badge = event.target.closest?.(".svg-vision-indicator");
    if (!badge) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openVisionLinksModal(
      badge.dataset.visionLinkType,
      badge.dataset.universeId,
      badge.dataset.entryId || "",
    );
  },
  true,
);

document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu-wrap")) closeMenus();
  if (!event.target.closest("#settingsDock")) toggleSettingsMenu(false);
});

window.WormholesStartup?.startWormholesApp?.();

/* ES-module source marker; runtime API remains the existing window namespace. */
export {};

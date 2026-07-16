/* Wormholes Beta 256 modal and workflow orchestration boundary.
   Edit-creation and browser-storage prompt workflows live here instead of in app-core.
   Native execution uses explicit module APIs for content limits, duplicate review,
   recent-roll synchronization, and persistence preferences. */

import {archiveEntries} from "./app-state-domain.mjs";
import {localFoldersEnabled} from "./app-state-storage.mjs";
import {activeEditEntryId, setActiveEditEntryId} from "./app-state-ui.mjs";
import {
  getEntry,
  cleanNotesArray,
  renderEditNotesList,
  getEditNotesFromList,
  revealArchiveEntryForTag,
  entryHasArchivableCreationData,
  writeArchiveEntryToFolderIfNeeded,
  renderArchive,
} from "./archive-controller.mjs";
import {
  what,
  attr,
  pressure,
  fillSelect,
  getManualValue,
  valueOrNull,
} from "./generation-controller.mjs";
import {localFolderApiSupported} from "./folder-storage-controller.mjs";
import {
  WORMHOLES_BROWSER_STORAGE_UPLOAD_PROMPT_DISMISSED_KEY,
  saveLocalStorageText,
  saveArchiveToStorage,
} from "./storage-facade.mjs";
import {showSavedToast} from "./shell-interface.mjs";
import {api as importedWorkflowContentLimitsApi} from "./content-limits.mjs";
import {api as importedWorkflowDuplicateCreationsApi} from "./duplicate-creations.mjs";
import {api as importedWorkflowRecentRollHistoryApi} from "./recent-roll-history.mjs";
import {repositories as importedWorkflowRepositories} from "./persistence-repositories.mjs";

const workflowContentLimitsApi =
  typeof importedWorkflowContentLimitsApi !== "undefined"
    ? importedWorkflowContentLimitsApi
    : globalThis.WormholesContentLimits;
const workflowDuplicateCreationsApi =
  typeof importedWorkflowDuplicateCreationsApi !== "undefined"
    ? importedWorkflowDuplicateCreationsApi
    : globalThis.WormholesDuplicateCreations;
const workflowRecentRollHistoryApi =
  typeof importedWorkflowRecentRollHistoryApi !== "undefined"
    ? importedWorkflowRecentRollHistoryApi
    : globalThis.WormholesRecentRollHistory;
const workflowRepositories =
  typeof importedWorkflowRepositories !== "undefined"
    ? importedWorkflowRepositories
    : globalThis.WormholesRepositories;

function populateEditSelects() {
  fillSelect("editWhat", what);
  fillSelect("editAttr1", attr);
  fillSelect("editAttr2", attr);
  fillSelect("editStory", pressure);

  setupEditCustomSelect("editWhat", "editWhatCustom");
  setupEditCustomSelect("editAttr1", "editAttr1Custom");
  setupEditCustomSelect("editAttr2", "editAttr2Custom");
  setupEditCustomSelect("editStory", "editStoryCustom");
}

function setupEditCustomSelect(selectId, inputId) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);

  select.addEventListener("change", () => {
    const custom = select.value === "__custom__";
    input.classList.toggle("open", custom);
    if (custom) input.focus();
    if (!custom) input.value = "";
  });
}

function setEditSelectValue(selectId, inputId, options, value) {
  const select = document.getElementById(selectId);
  const input = document.getElementById(inputId);
  const cleanValue = value || "";

  if (options.includes(cleanValue)) {
    select.value = cleanValue;
    input.value = "";
    input.classList.remove("open");
  } else if (cleanValue) {
    select.value = "__custom__";
    input.value = cleanValue;
    input.classList.add("open");
  } else {
    select.value = "";
    input.value = "";
    input.classList.remove("open");
  }
}

function openEditModal(entryId) {
  const entry = getEntry(entryId);
  if (!entry) return;

  setActiveEditEntryId(entryId);
  document.getElementById("editError").classList.remove("show");
  document.getElementById("editModalSubtitle").textContent = entry.title;

  document.getElementById("editTitle").value = entry.title || "";
  setEditSelectValue("editWhat", "editWhatCustom", what, entry.what?.val || "");
  setEditSelectValue("editAttr1", "editAttr1Custom", attr, entry.attr1?.val || "");
  setEditSelectValue("editAttr2", "editAttr2Custom", attr, entry.attr2?.val || "");
  setEditSelectValue("editStory", "editStoryCustom", pressure, entry.pressure?.val || "");

  document.getElementById("editSummary").value = entry.summary || "";
  renderEditNotesList(entry.notes);

  document.getElementById("editModal").classList.add("open");
  setTimeout(() => document.getElementById("editTitle").focus(), 0);
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
  setActiveEditEntryId(null);
}

async function saveEditEntry() {
  if (!activeEditEntryId) return;

  const entry = getEntry(activeEditEntryId);
  if (!entry) return;

  const title = document.getElementById("editTitle").value.trim();
  const editWhat = getManualValue("editWhat", "editWhatCustom");
  const editAttr1 = getManualValue("editAttr1", "editAttr1Custom");
  const editAttr2 = getManualValue("editAttr2", "editAttr2Custom");
  const editStory = getManualValue("editStory", "editStoryCustom");
  const error = document.getElementById("editError");

  const editValues = {
    what: valueOrNull(editWhat),
    attr1: valueOrNull(editAttr1),
    attr2: valueOrNull(editAttr2),
    pressure: valueOrNull(editStory),
  };

  if (!title || !entryHasArchivableCreationData(editValues)) {
    error.textContent = "A title and at least one creation field are required.";
    error.classList.add("show");
    if (!title) document.getElementById("editTitle").focus();
    return;
  }

  const summary = document.getElementById("editSummary").value.trim();
  const notes = getEditNotesFromList();
  if (workflowContentLimitsApi) {
    if (
      !workflowContentLimitsApi.ensureString("title", title, {
        previousValue: entry.title || "",
        fieldName: "creation title",
        operation: "save this creation",
      }).ok
    )
      return;
    for (const [label, value, previousValue] of [
      ["what", editWhat, entry.what?.val || ""],
      ["first attribute", editAttr1, entry.attr1?.val || ""],
      ["second attribute", editAttr2, entry.attr2?.val || ""],
      ["story pressure", editStory, entry.pressure?.val || ""],
    ]) {
      if (
        value &&
        !workflowContentLimitsApi.ensureString("shortLabel", value, {
          previousValue,
          fieldName: label,
          context: title,
          operation: "save this creation",
        }).ok
      )
        return;
    }
    if (
      !workflowContentLimitsApi.ensureString("note", summary, {
        previousValue: entry.summary || "",
        fieldName: "creation summary",
        context: title,
        operation: "save this creation",
      }).ok
    )
      return;
    const previousNotes = cleanNotesArray(entry.notes);
    for (let index = 0; index < notes.length; index += 1) {
      if (
        !workflowContentLimitsApi.ensureString("note", notes[index], {
          previousValue: previousNotes[index] || "",
          fieldName: "note",
          context: title,
          operation: "save this creation",
        }).ok
      )
        return;
    }
  }

  const duplicateCandidate = {
    ...entry,
    title,
    what: editValues.what,
    attr1: editValues.attr1,
    attr2: editValues.attr2,
    pressure: editValues.pressure,
    summary,
  };
  if (workflowDuplicateCreationsApi?.review) {
    const duplicateReview = await workflowDuplicateCreationsApi.review(
      duplicateCandidate,
      archiveEntries,
      {
        ignoreIds: [entry.id],
        actionLabel: "Save Anyway",
        actionKind: "save",
        opener: document.getElementById("saveEditBtn"),
      },
    );
    if (duplicateReview.decision === "view") {
      closeEditModal();
      revealArchiveEntryForTag(duplicateReview.match?.existing?.id || "");
      return;
    }
    if (duplicateReview.decision !== "proceed") return;
  }

  const generatedFieldsChanged = ["what", "attr1", "attr2", "pressure"].some(
    (key) => String(entry[key]?.val || "") !== String(editValues[key]?.val || ""),
  );

  entry.title = title;
  entry.what = editValues.what;
  entry.attr1 = editValues.attr1;
  entry.attr2 = editValues.attr2;
  entry.pressure = editValues.pressure;
  if (generatedFieldsChanged && entry._generation && typeof entry._generation === "object") {
    entry._generation = {...entry._generation, authoredChanges: true};
  }

  if (summary) {
    entry.summary = summary;
  } else {
    delete entry.summary;
  }

  if (notes.length) {
    entry.notes = notes;
  } else {
    delete entry.notes;
  }

  if (!saveArchiveToStorage()) return;
  await writeArchiveEntryToFolderIfNeeded(entry, {forceTitleFileName: true});
  workflowRecentRollHistoryApi?.syncArchiveEntry?.(entry.id, {
    title: entry.title,
    generatedFieldsChanged,
  });
  closeEditModal();
  renderArchive();
  showSavedToast("Creation updated");
}

function browserStorageUploadPromptDismissed() {
  return (
    workflowRepositories?.preferences?.readText(
      WORMHOLES_BROWSER_STORAGE_UPLOAD_PROMPT_DISMISSED_KEY,
      "false",
    ) === "true"
  );
}

function dismissBrowserStorageUploadPrompt() {
  if (
    saveLocalStorageText(
      WORMHOLES_BROWSER_STORAGE_UPLOAD_PROMPT_DISMISSED_KEY,
      "true",
      "Could not save browser-storage upload prompt preference",
      "Prompt preference could not be saved.",
    )
  ) {
    document
      .querySelectorAll(".browser-storage-upload-prompt")
      .forEach((prompt) => prompt.remove());
  }
}

function shouldShowBrowserStorageUploadPrompt() {
  return !localFoldersEnabled && !browserStorageUploadPromptDismissed();
}

function browserStorageUploadPromptMessage() {
  if (!localFolderApiSupported()) {
    return "This upload was saved in browser storage. Local folder storage is unavailable in this browser, so exported app-data backups are the safest way to keep a portable copy.";
  }
  return "This upload was saved in browser storage. To save future uploads in a local folder, open the gear menu, turn on “Use local folder,” then follow the folder connection prompts.";
}

function createBrowserStorageUploadPrompt() {
  const prompt = document.createElement("div");
  prompt.className = "browser-storage-upload-prompt";
  prompt.setAttribute("role", "note");

  const text = document.createElement("p");
  text.textContent = browserStorageUploadPromptMessage();
  prompt.appendChild(text);

  const label = document.createElement("label");
  label.className = "browser-storage-upload-dismiss";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.addEventListener("change", (event) => {
    if (event.currentTarget.checked) dismissBrowserStorageUploadPrompt();
  });

  const span = document.createElement("span");
  span.textContent = "Don’t show this again";

  label.appendChild(checkbox);
  label.appendChild(span);
  prompt.appendChild(label);
  return prompt;
}

function showBrowserStorageUploadPrompt(section) {
  if (!shouldShowBrowserStorageUploadPrompt()) return;
  const tab = document.getElementById(section === "vision" ? "visionTab" : "literatureTab");
  tab?.querySelectorAll(".browser-storage-upload-prompt").forEach((prompt) => prompt.remove());

  const prompt = createBrowserStorageUploadPrompt();
  if (section === "vision") {
    const grid = document.getElementById("visionBoardGrid");
    grid?.before(prompt);
    return;
  }

  const list = document.getElementById("literatureList");
  list?.prepend(prompt);
}

export {
  populateEditSelects,
  setupEditCustomSelect,
  setEditSelectValue,
  openEditModal,
  closeEditModal,
  saveEditEntry,
  browserStorageUploadPromptDismissed,
  dismissBrowserStorageUploadPrompt,
  shouldShowBrowserStorageUploadPrompt,
  browserStorageUploadPromptMessage,
  createBrowserStorageUploadPrompt,
  showBrowserStorageUploadPrompt,
};

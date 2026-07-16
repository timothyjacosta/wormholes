'use strict';

const inputPaths = Object.freeze([
  {id:'universe-create-title', controls:['universeTitleInput'], handler:'createUniverseFromModal', kind:'text'},
  {id:'universe-summary', controls:['universeSummaryInput'], handler:'saveUniverseSummary', kind:'text'},
  {id:'universe-edit-title', controls:['universeEditTitleInput'], handler:'saveUniverseEdit', kind:'text'},
  {id:'universe-edit-summary', controls:['universeEditSummaryInput'], handler:'saveUniverseEdit', kind:'text'},
  {id:'migrate-new-universe-title', controls:['migrateNewUniverseInput'], handler:'createMigrateNewUniverse', kind:'text'},
  {id:'copy-new-universe-title', controls:['copyNewUniverseInput'], handler:'createCopyNewUniverse', kind:'text'},
  {id:'bridge-new-universe-title', controls:['bridgeNewUniverseInput'], handler:'createBridgeNewUniverse', kind:'text'},
  {id:'rolled-creation-title', controls:['creationTitleInput'], handler:'saveCurrentToArchive', kind:'text'},
  {id:'manual-creation-title', controls:['manualTitle'], handler:'saveManualCreation', kind:'text'},
  {id:'manual-creation-what', controls:['manualWhatCustom'], handler:'saveManualCreation', kind:'text'},
  {id:'manual-creation-attribute-one', controls:['manualAttr1Custom'], handler:'saveManualCreation', kind:'text'},
  {id:'manual-creation-attribute-two', controls:['manualAttr2Custom'], handler:'saveManualCreation', kind:'text'},
  {id:'manual-creation-story', controls:['manualStoryCustom'], handler:'saveManualCreation', kind:'text'},
  {id:'creation-edit-title', controls:['editTitle'], handler:'saveEditEntry', kind:'text'},
  {id:'creation-edit-what', controls:['editWhatCustom'], handler:'saveEditEntry', kind:'text'},
  {id:'creation-edit-attribute-one', controls:['editAttr1Custom'], handler:'saveEditEntry', kind:'text'},
  {id:'creation-edit-attribute-two', controls:['editAttr2Custom'], handler:'saveEditEntry', kind:'text'},
  {id:'creation-edit-story', controls:['editStoryCustom'], handler:'saveEditEntry', kind:'text'},
  {id:'creation-edit-summary', controls:['editSummary'], handler:'saveEditEntry', kind:'text'},
  {id:'creation-edit-note', controls:['editNotesList'], handler:'saveEditEntry', kind:'dynamic-text'},
  {id:'connection-note', controls:['connectionTextInput'], handler:'saveConnectionModalText', kind:'text'},
  {id:'creation-summary', controls:['summaryTextInput'], handler:'saveSummaryText', kind:'text'},
  {id:'creation-note', controls:['noteTextInput'], handler:'saveNoteText', kind:'text'},
  {id:'archive-group-title', controls:['groupTitleInput'], handler:'saveGroupModal', kind:'text'},
  {id:'literature-group-title', controls:['groupTitleInput'], handler:'saveGroupModal', kind:'text'},
  {id:'literature-title', controls:['literatureTitleInput'], handler:'saveLiteratureDoc', kind:'text'},
  {id:'literature-rich-text', controls:['literatureEditor'], handler:'saveLiteratureDoc', kind:'rich-text'},
  {id:'literature-plain-text-paste', controls:['literatureEditor'], handler:'paste event', kind:'clipboard'},
  {id:'literature-plain-text-drop', controls:['literatureEditor'], handler:'drop event', kind:'drag-drop'},
  {id:'literature-upload-name', controls:['literatureFileInput'], handler:'uploadLiteratureFiles', kind:'file'},
  {id:'literature-upload-body', controls:['literatureFileInput'], handler:'uploadLiteratureFiles', kind:'file'},
  {id:'vision-upload-name', controls:['visionFileInput'], handler:'uploadVisionFiles', kind:'file'},
  {id:'vision-rename', controls:['visionRenameInput'], handler:'saveVisionRename', kind:'text'},
  {id:'global-search-query', controls:['globalSearchInput'], handler:'renderGlobalSearchResults', kind:'search'},
  {id:'app-data-import', controls:['appDataImportInput'], handler:'handleAppDataImportFile', kind:'file'},
  {id:'custom-theme-title', controls:['themeManagerTitle'], handler:'saveThemeManagerDraft', kind:'text'},
  {id:'custom-theme-description', controls:['themeManagerDescription'], handler:'saveThemeManagerDraft', kind:'text'},
  {id:'custom-theme-card', controls:['newThemeCardText'], handler:'addThemeManagerCard', kind:'text'},
  {id:'custom-theme-bulk-cards', controls:['themeBulkCards'], handler:'addThemeManagerBulkCards', kind:'text'},
  {id:'custom-theme-search', controls:['themeManagerSearch'], handler:'renderThemeManagerCards', kind:'search'},
  {id:'custom-theme-import', controls:['themeImportInput'], handler:'importThemeFile', kind:'file'}
]);

const nonTextControls = Object.freeze([
  'skipRollAnimationToggle',
  'manualWhat', 'manualAttr1', 'manualAttr2', 'manualStory',
  'editWhat', 'editAttr1', 'editAttr2', 'editStory',
  'archiveFilterType', 'archiveFilterGroup', 'archiveFilterConnections', 'archiveFilterNotes', 'archiveFilterSummary', 'archiveSortOrder',
  'literatureFilterType', 'literatureFilterGroup', 'literatureFilterTags', 'literatureFilterContent', 'literatureSortOrder', 'literatureTextSize',
  'visionFilterTags', 'visionFilterStorage', 'visionFilterFormat', 'visionSortOrder',
  'settingsLocalFolderToggle', 'globalSearchScope',
  'themeManagerDeckSelect', 'newThemeCardType', 'themeBulkType', 'themeManagerFilter'
]);

module.exports = { inputPaths, nonTextControls };

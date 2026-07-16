'use strict';

const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');
const { inputPaths } = require('../security/input-paths');
const { htmlPayloads, dangerousUrls } = require('../security/xss-payloads');

const corpus = [...htmlPayloads, ...dangerousUrls];
const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XxZKAAAAAElFTkSuQmCC';

function testablePathIds(){
  return inputPaths.map(item => item.id);
}

test.describe('malicious payload corpus across every input path', () => {
  test('all declared input paths remain inert and render safely', async ({ page }) => {
    test.setTimeout(180000);
    const runtimeErrors = await openSelfContainedApp(page);

    const result = await page.evaluate(async ({ corpus, pathIds, tinyPng }) => {
      const failures = [];
      const exercised = [];
      const original = {};

      const rememberAndReplace = (name, replacement) => {
        try{
          original[name] = globalThis[name];
          globalThis[name] = replacement;
        } catch(error){
          failures.push({path:'harness', payload:'', reason:`Could not replace ${name}: ${error.message}`});
        }
      };

      [
        'saveUniversesToStorage', 'saveArchiveToStorage', 'saveConnectionNotesToStorage',
        'saveBridgeNotesToStorage', 'saveLiteratureToStorage', 'saveVisionBoardToStorage'
      ].forEach(name => rememberAndReplace(name, () => true));
      [
        'writeArchiveEntryToFolderIfNeeded', 'persistLiteratureLargeData', 'persistVisionLargeData',
        'deleteVisionLargeData', 'pruneWormholesFolderToAppState', 'syncActiveLiteratureEditorDocToFolder'
      ].forEach(name => rememberAndReplace(name, async () => true));
      rememberAndReplace('showSavedToast', () => {});
      rememberAndReplace('showBrowserStorageUploadPrompt', () => {});
      rememberAndReplace('requestStorageFootnoteUpdate', () => {});
      rememberAndReplace('renderWormholesMap', () => {});
      rememberAndReplace('renderConnectionsMap', () => {});
      rememberAndReplace('migrateEntryToUniverse', async () => true);
      rememberAndReplace('confirmAppDataImportOverwrite', () => Promise.resolve(true));
      rememberAndReplace('imageFileToPinboardDataUrl', async () => tinyPng);
      rememberAndReplace('imageFileToThumbnailDataUrl', async () => tinyPng);
      window.WormholesUndo = null;
      window.WormholesStorageCapacity = null;
      window.WormholesWriteAheadJournal = null;
      window.WormholesSnapshots = {createSnapshot:async () => ({id:'security-test-snapshot'})};
      window.WormholesLargeDataStore = {
        supported:false, ready:async () => false, status:async () => ({available:false}),
        put:async () => false, get:async () => null, inspect:async () => null, del:async () => true,
        deletePrefix:async () => 0, clearAll:async () => true, estimatePrefixBytes:async () => 0
      };
      window.__wormholesXssExecutions = 0;

      const now = '2026-07-12T00:00:00.000Z';
      const safeUniverse = () => ({id:'u1', title:'Safe Universe', summary:'', bridges:[], createdAt:now, diskFolderName:'safe-universe-u1'});
      const safeEntry = (id, title) => ({
        id, title, what:{val:'Safe place'}, attr1:{val:'Ancient'}, attr2:{val:'Quiet'}, pressure:{val:'A safe story'},
        summary:'', notes:[], connections:[], bridges:[], createdAt:now, updatedAt:now
      });
      const safeDoc = (id, title) => ({
        id, title, content:'<p>Safe content</p>', sourceName:'', fileType:'text', mimeType:'text/html', fileData:'',
        fileSize:0, storage:'', folderFileName:'', contentStoreKey:'', contentStored:'',
        tags:{universes:['u1'], entries:[]}, createdAt:now, updatedAt:now
      });
      const safeVision = () => ({
        id:'v1', title:'Safe image', sourceName:'safe.png', fileType:'image', mimeType:'image/png',
        thumbnailDataUrl:tinyPng, dataUrl:tinyPng, fileSize:100, storage:'', folderFileName:'',
        tags:{universes:[], entries:[]}, createdAt:now
      });

      function resetDom(){
        document.querySelectorAll('.modal-backdrop.open').forEach(modal => modal.classList.remove('open'));
        ['archiveList','literatureList','visionBoardGrid','globalSearchResults','universeArchiveList','connectionsMapWrap','wormholesMapWrap','themeManagerCardList'].forEach(id => {
          const element = document.getElementById(id);
          if(element) element.replaceChildren();
        });
        document.getElementById('literatureEditorScreen')?.classList.remove('active');
        document.getElementById('literatureListScreen')?.classList.add('active');
        document.getElementById('appErrorPanel')?.classList.remove('open');
        document.getElementById('savedToast')?.classList.remove('show');
      }

      function resetState(){
        resetDom();
        universes = [safeUniverse()];
        currentUniverseId = 'u1';
        archiveEntries = [];
        literatureEntries = [];
        visionEntries = [];
        connectionNotes = {};
        bridgeNotes = {};
        current = {what:{val:'Safe place'}, attr1:{val:'Ancient'}, attr2:{val:'Quiet'}, pressure:{val:'A safe story'}};
        activeEditEntryId = null;
        activeSummaryEntryId = null;
        activeNoteEntryId = null;
        activeConnectionKey = null;
        activeBridgeNoteKey = null;
        activeUniverseSummaryId = null;
        activeUniverseEditId = null;
        activeMigrateEntryId = null;
        activeCopyItemType = null;
        activeCopyItemId = null;
        activeBridgeEntryId = null;
        activeBridgeUniverseId = null;
        activeGroupEntryId = null;
        activeGroupMode = 'create';
        activeGroupContext = 'creation';
        activeLiteratureId = null;
        activeVisionRenameId = null;
        literatureEditorSessionUniverseId = null;
        localFoldersEnabled = false;
        wormholesParentFolderHandle = null;
        literatureFolderHandle = null;
        visionFolderHandle = null;
        selectedMapNodeId = null;
        connectSourceId = null;
        window.__wormholesXssExecutions = 0;
        try{
  localStorage.removeItem('wormholesCustomThemeDecksV1');
  localStorage.removeItem('wormholesSelectedThemeDeckIdsV1');
} catch(error){}
customThemeDecks = [];
selectedThemeIds = [];
themeStateLoaded = false;
themeManagerDraft = null;
themeManagerOriginalId = null;
pendingThemeDeleteId = null;
        document.getElementById('currentUniverseLabel').textContent = 'Safe Universe';
        window.WormholesSearchIndex?.markDirty?.('security reset', {schedule:false});
      }

      function setCustom(selectId, inputId, value){
        const select = document.getElementById(selectId);
        const input = document.getElementById(inputId);
        select.value = '__custom__';
        input.value = value;
        input.classList.add('open');
      }

      function scanSurface(selectors){
        const findings = [];
        for(const selector of selectors){
          const root = document.querySelector(selector);
          if(!root) continue;
          root.querySelectorAll('*').forEach(element => {
            const tag = element.tagName.toLowerCase();
            if(['script','style','iframe','object','embed','link','meta','base','math'].includes(tag)) findings.push(`${selector}:<${tag}>`);
            if(tag === 'svg' && !element.closest('.connections-map-wrap,.wormholes-map-wrap')) findings.push(`${selector}:<svg>`);
            for(const attribute of element.getAttributeNames()){
              const lower = attribute.toLowerCase();
              const value = element.getAttribute(attribute) || '';
              if(lower.startsWith('on')) findings.push(`${selector}:${tag}[${attribute}]`);
              if(lower === 'srcdoc') findings.push(`${selector}:${tag}[srcdoc]`);
              if(['href','src','action','formaction','poster','xlink:href'].includes(lower) && /^\s*(?:javascript|vbscript|data:text\/html|data:image\/svg\+xml|file:)/i.test(value)){
                findings.push(`${selector}:${tag}[${attribute}=${value.slice(0,60)}]`);
              }
            }
          });
        }
        return findings;
      }

      async function settle(){
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      async function exercise(pathId, payload, index){
        resetState();
        const safeTitle = `Safe ${index}`;
        let surfaces = ['#archiveList','#literatureList','#visionBoardGrid','#universeArchiveList','#globalSearchResults','#appErrorPanel'];

        switch(pathId){
          case 'universe-create-title':
            universes = [];
            currentUniverseId = null;
            document.getElementById('universeTitleInput').value = payload;
            createUniverseFromModal();
            renderUniverseArchiveList();
            surfaces = ['#universeArchiveList','#currentUniverseLabel'];
            break;
          case 'universe-summary':
            activeUniverseSummaryId = 'u1';
            document.getElementById('universeSummaryInput').value = payload;
            saveUniverseSummary();
            renderUniverseArchiveList();
            surfaces = ['#universeArchiveList'];
            break;
          case 'universe-edit-title':
            activeUniverseEditId = 'u1';
            document.getElementById('universeEditTitleInput').value = payload;
            document.getElementById('universeEditSummaryInput').value = 'Safe summary';
            saveUniverseEdit();
            renderUniverseArchiveList();
            surfaces = ['#universeArchiveList','#currentUniverseLabel'];
            break;
          case 'universe-edit-summary':
            activeUniverseEditId = 'u1';
            document.getElementById('universeEditTitleInput').value = safeTitle;
            document.getElementById('universeEditSummaryInput').value = payload;
            saveUniverseEdit();
            renderUniverseArchiveList();
            surfaces = ['#universeArchiveList'];
            break;
          case 'migrate-new-universe-title':
            archiveEntries = [safeEntry('a','Safe creation')];
            activeMigrateEntryId = 'a';
            document.getElementById('migrateNewUniverseInput').value = payload;
            await createMigrateNewUniverse();
            renderUniverseArchiveList();
            surfaces = ['#universeArchiveList'];
            break;
          case 'copy-new-universe-title':
            archiveEntries = [safeEntry('a','Safe creation')];
            activeCopyItemType = 'archive';
            activeCopyItemId = 'a';
            document.getElementById('copyNewUniverseInput').value = payload;
            await createCopyNewUniverse();
            renderUniverseArchiveList();
            surfaces = ['#universeArchiveList'];
            break;
          case 'bridge-new-universe-title':
            activeBridgeUniverseId = 'u1';
            document.getElementById('bridgeNewUniverseInput').value = payload;
            createBridgeNewUniverse();
            renderUniverseArchiveList();
            surfaces = ['#universeArchiveList'];
            break;
          case 'rolled-creation-title':
            document.getElementById('creationTitleInput').value = payload;
            await saveCurrentToArchive();
            renderArchive();
            surfaces = ['#archiveList'];
            break;
          case 'manual-creation-title':
          case 'manual-creation-what':
          case 'manual-creation-attribute-one':
          case 'manual-creation-attribute-two':
          case 'manual-creation-story': {
            document.getElementById('manualTitle').value = pathId === 'manual-creation-title' ? payload : safeTitle;
            setCustom('manualWhat','manualWhatCustom',pathId === 'manual-creation-what' ? payload : 'Safe place');
            setCustom('manualAttr1','manualAttr1Custom',pathId === 'manual-creation-attribute-one' ? payload : 'Ancient');
            setCustom('manualAttr2','manualAttr2Custom',pathId === 'manual-creation-attribute-two' ? payload : 'Quiet');
            setCustom('manualStory','manualStoryCustom',pathId === 'manual-creation-story' ? payload : 'Safe story');
            await saveManualCreation();
            renderArchive();
            surfaces = ['#archiveList','#manualError'];
            break;
          }
          case 'creation-edit-title':
          case 'creation-edit-what':
          case 'creation-edit-attribute-one':
          case 'creation-edit-attribute-two':
          case 'creation-edit-story':
          case 'creation-edit-summary':
          case 'creation-edit-note': {
            archiveEntries = [safeEntry('a','Safe creation')];
            openEditModal('a');
            document.getElementById('editTitle').value = pathId === 'creation-edit-title' ? payload : safeTitle;
            setCustom('editWhat','editWhatCustom',pathId === 'creation-edit-what' ? payload : 'Safe place');
            setCustom('editAttr1','editAttr1Custom',pathId === 'creation-edit-attribute-one' ? payload : 'Ancient');
            setCustom('editAttr2','editAttr2Custom',pathId === 'creation-edit-attribute-two' ? payload : 'Quiet');
            setCustom('editStory','editStoryCustom',pathId === 'creation-edit-story' ? payload : 'Safe story');
            document.getElementById('editSummary').value = pathId === 'creation-edit-summary' ? payload : 'Safe summary';
            renderEditNotesList([pathId === 'creation-edit-note' ? payload : 'Safe note']);
            await saveEditEntry();
            renderArchive();
            surfaces = ['#archiveList','#editNotesList'];
            break;
          }
          case 'connection-note':
            archiveEntries = [safeEntry('a','Alpha'), safeEntry('b','Beta')];
            archiveEntries[0].connections = ['b'];
            archiveEntries[1].connections = ['a'];
            openConnectionModal('a','b');
            document.getElementById('connectionTextInput').value = payload;
            saveConnectionModalText();
            document.getElementById('connectionModalSubtitle').textContent = connectionNotes['a::b'] || '';
            surfaces = ['#connectionModal'];
            break;
          case 'creation-summary':
            archiveEntries = [safeEntry('a','Safe creation')];
            activeSummaryEntryId = 'a';
            document.getElementById('summaryTextInput').value = payload;
            saveSummaryText();
            renderArchive();
            surfaces = ['#archiveList'];
            break;
          case 'creation-note':
            archiveEntries = [safeEntry('a','Safe creation')];
            activeNoteEntryId = 'a';
            document.getElementById('noteTextInput').value = payload;
            saveNoteText();
            renderArchive();
            surfaces = ['#archiveList'];
            break;
          case 'archive-group-title':
            archiveEntries = [safeEntry('a','Alpha'), safeEntry('b','Beta')];
            activeGroupEntryId = 'a';
            activeGroupMode = 'create';
            activeGroupContext = 'creation';
            original.selectedGroupChoiceIds = globalThis.selectedGroupChoiceIds;
            globalThis.selectedGroupChoiceIds = () => ['b'];
            document.getElementById('groupTitleInput').value = payload;
            await createGroupFromModal();
            renderArchive();
            globalThis.selectedGroupChoiceIds = original.selectedGroupChoiceIds;
            surfaces = ['#archiveList'];
            break;
          case 'literature-group-title':
            literatureEntries = [safeDoc('d1','One'), safeDoc('d2','Two')];
            activeGroupEntryId = 'd1';
            activeGroupMode = 'create';
            activeGroupContext = 'literature';
            original.selectedGroupChoiceIds = globalThis.selectedGroupChoiceIds;
            globalThis.selectedGroupChoiceIds = () => ['d2'];
            document.getElementById('groupTitleInput').value = payload;
            createLiteratureGroupFromModal();
            renderLiteratureList();
            globalThis.selectedGroupChoiceIds = original.selectedGroupChoiceIds;
            surfaces = ['#literatureList'];
            break;
          case 'literature-title':
          case 'literature-rich-text': {
            await showLiteratureEditorScreen();
            document.getElementById('literatureTitleInput').value = pathId === 'literature-title' ? payload : safeTitle;
            if(pathId === 'literature-rich-text') document.getElementById('literatureEditor').textContent = payload;
            else document.getElementById('literatureEditor').innerHTML = '<p>Safe content</p>';
            markLiteratureEditorDirty();
            await saveLiteratureDoc();
            renderLiteratureList();
            if(literatureEntries[0]){
              await openLiteratureViewer(literatureEntries[0].id, 'u1');
            }
            surfaces = ['#literatureList','#literatureViewerContent'];
            break;
          }
          case 'literature-plain-text-paste': {
            await showLiteratureEditorScreen();
            document.getElementById('literatureTitleInput').value = safeTitle;
            const editor = document.getElementById('literatureEditor');
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            const selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            const pasteEvent = new Event('paste', {bubbles:true, cancelable:true});
            Object.defineProperty(pasteEvent, 'clipboardData', {value:{getData:() => payload}});
            editor.dispatchEvent(pasteEvent);
            await settle();
            markLiteratureEditorDirty();
            await saveLiteratureDoc();
            renderLiteratureList();
            if(literatureEntries[0]) await openLiteratureViewer(literatureEntries[0].id, 'u1');
            surfaces = ['#literatureList','#literatureViewerContent'];
            break;
          }
          case 'literature-plain-text-drop': {
            await showLiteratureEditorScreen();
            document.getElementById('literatureTitleInput').value = safeTitle;
            const editor = document.getElementById('literatureEditor');
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            const selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            const dropEvent = new Event('drop', {bubbles:true, cancelable:true});
            Object.defineProperty(dropEvent, 'clientX', {value:0});
            Object.defineProperty(dropEvent, 'clientY', {value:0});
            Object.defineProperty(dropEvent, 'dataTransfer', {value:{getData:() => payload, types:['text/plain','text/html']}});
            editor.dispatchEvent(dropEvent);
            await settle();
            markLiteratureEditorDirty();
            await saveLiteratureDoc();
            renderLiteratureList();
            if(literatureEntries[0]) await openLiteratureViewer(literatureEntries[0].id, 'u1');
            surfaces = ['#literatureList','#literatureViewerContent'];
            break;
          }
          case 'literature-upload-name':
          case 'literature-upload-body': {
            const name = pathId === 'literature-upload-name' ? `${payload}.txt` : `safe-${index}.txt`;
            const body = pathId === 'literature-upload-body' ? payload : 'Safe body';
            const file = new File([body], name, {type:'text/plain'});
            await uploadLiteratureFiles([file]);
            renderLiteratureList();
            if(literatureEntries[0]) await openLiteratureViewer(literatureEntries[0].id, 'u1');
            surfaces = ['#literatureList','#literatureViewerContent'];
            break;
          }
          case 'vision-upload-name': {
            const bytes = Uint8Array.from(atob(tinyPng.split(',')[1]), char => char.charCodeAt(0));
            const file = new File([bytes], `${payload}.png`, {type:'image/png'});
            await uploadVisionFiles([file]);
            renderVisionBoard();
            surfaces = ['#visionBoardGrid','#visionBoardMessage'];
            break;
          }
          case 'vision-rename':
            visionEntries = [safeVision()];
            activeVisionRenameId = 'v1';
            document.getElementById('visionRenameInput').value = payload;
            await saveVisionRename();
            renderVisionBoard();
            surfaces = ['#visionBoardGrid'];
            break;
          case 'global-search-query':
            archiveEntries = [safeEntry('a', payload)];
            window.WormholesSearchIndex?.markDirty?.('security query', {schedule:false});
            window.WormholesSearchIndex?.rebuild?.('security query');
            document.getElementById('globalSearchInput').value = payload;
            document.getElementById('globalSearchInput').dispatchEvent(new Event('input', {bubbles:true}));
            await new Promise(resolve => setTimeout(resolve, 140));
            surfaces = ['#globalSearchResults','#globalSearchStatus'];
            break;
          case 'app-data-import': {
            const importData = {
              format:'Wormholes App Data Export', schemaVersion:4, appVersion:'Beta 209', exportedAt:now,
              currentUniverseId:'import-u',
              universes:[{id:'import-u', title:payload, summary:payload, bridges:[], createdAt:now}],
              bridgeNotes:{},
              universeData:{
                'import-u':{
                  archive:[{...safeEntry('import-a', payload), summary:payload, notes:[payload]}],
                  connectionNotes:{},
                  literature:[{...safeDoc('import-d', payload), content:payload, tags:{universes:['import-u'], entries:[]}}],
                  vision:[{...safeVision(), id:'import-v', title:payload, sourceName:`${payload}.png`}]
                }
              }
            };
            const file = new File([JSON.stringify(importData)], `import-${index}.json`, {type:'application/json'});
            await handleAppDataImportFile({target:{files:[file], value:'selected'}});
            renderUniverseArchiveList();
            renderArchive();
            renderLiteratureList();
            renderVisionBoard();
            surfaces = ['#universeArchiveList','#archiveList','#literatureList','#visionBoardGrid','#settingsStatus'];
            break;
          }
          case 'custom-theme-title':
case 'custom-theme-description': {
  openThemeManager({newTheme:true});
  document.getElementById('themeManagerTitle').value = pathId === 'custom-theme-title' ? payload : safeTitle;
  document.getElementById('themeManagerDescription').value = pathId === 'custom-theme-description' ? payload : 'Safe description';
  saveThemeManagerDraft();
  renderThemeManagerDeckSelect();
  renderThemeManagerCards();
  surfaces = ['#themeManagerModal'];
  break;
}
case 'custom-theme-card': {
  openThemeManager({newTheme:true});
  document.getElementById('themeManagerTitle').value = safeTitle;
  addThemeManagerCard('what', payload);
  renderThemeManagerCards();
  surfaces = ['#themeManagerModal'];
  break;
}
case 'custom-theme-bulk-cards': {
  openThemeManager({newTheme:true});
  document.getElementById('themeManagerTitle').value = safeTitle;
  document.getElementById('themeBulkType').value = 'what';
  document.getElementById('themeBulkCards').value = payload;
  addThemeManagerBulkCards();
  surfaces = ['#themeManagerModal'];
  break;
}
case 'custom-theme-search': {
  openThemeManager({newTheme:true});
  document.getElementById('themeManagerTitle').value = safeTitle;
  addThemeManagerCard('what', 'Safe card');
  document.getElementById('themeManagerSearch').value = payload;
  renderThemeManagerCards();
  surfaces = ['#themeManagerModal'];
  break;
}
case 'custom-theme-import': {
  openThemeManager({newTheme:true});
  const themeData = {
    format:'Wormholes Theme Deck',
    version:1,
    theme:{
      title:payload,
      description:payload,
      cards:{what:[payload], attribute:['Safe attribute'], story:['Safe story']}
    }
  };
  const file = new File([JSON.stringify(themeData)], `theme-${index}.json`, {type:'application/json'});
  await importThemeFile(file);
  renderThemeManagerDeckSelect();
  renderThemeManagerCards();
  surfaces = ['#themeManagerModal'];
  break;
}
          default:
            throw new Error(`No malicious-input adapter for ${pathId}`);
        }

        await settle();
        const findings = scanSurface(surfaces);
        if(window.__wormholesXssExecutions !== 0){
          throw new Error(`payload executed ${window.__wormholesXssExecutions} time(s)`);
        }
        if(findings.length){
          throw new Error(`unsafe DOM: ${findings.join(', ')}`);
        }
      }

      for(const pathId of pathIds){
        let count = 0;
        for(let index = 0; index < corpus.length; index += 1){
          const payload = corpus[index];
          try{
            await exercise(pathId, payload, index);
            count += 1;
          } catch(error){
            failures.push({path:pathId, payload:String(payload).slice(0,120), reason:error?.message || String(error)});
            break;
          }
        }
        exercised.push({path:pathId, count});
      }

      return {failures, exercised, executions:window.__wormholesXssExecutions};
    }, { corpus, pathIds:testablePathIds(), tinyPng });

    expect(result.failures).toEqual([]);
    expect(result.executions).toBe(0);
    expect(result.exercised).toHaveLength(inputPaths.length);
    for(const row of result.exercised){
      expect(row.count, `${row.path} should receive the complete corpus`).toBe(corpus.length);
    }
    expect(runtimeErrors.filter(message => !/favicon|ResizeObserver loop|Could not import app data|Could not create an automatic restore point/i.test(message))).toEqual([]);
  });
});

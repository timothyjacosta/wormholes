const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { appHtmlPath, appRoot } = require('../support/app');

const STATIC_DIALOG_IDS = [
  'globalSearchModal', 'appDataImportConfirmModal', 'fileSizeLimitModal', 'entityLimitModal',
  'duplicateIdModal', 'referenceIntegrityModal', 'mediaLimitModal', 'contentLimitModal',
  'urlSafetyModal', 'storageCapacityPreflightModal', 'recoverySnapshotsModal', 'localDataHelpModal',
  'clearAppDataConfirmModal', 'appDataExportSummaryModal', 'universeTitleModal', 'universeArchiveModal',
  'migrateModal', 'migrateNewUniverseModal', 'universeSummaryModal', 'universeEditModal',
  'deleteEntryConfirmModal', 'literatureDeleteConfirmModal', 'clearMapConfirmModal', 'deleteUniverseModal', 'deleteUniverseMigrateModal',
  'bridgeModal', 'bridgeNewUniverseModal', 'wormholesModal', 'titleModal', 'connectionModal',
  'summaryModal', 'noteModal', 'groupModal', 'groupConnectionModal', 'connectPickerModal',
  'literatureViewerModal', 'literatureUploadModal', 'visionUploadModal', 'quickStartModal',
  'localFolderDeletionWarningModal', 'localFolderSyncModal', 'localFolderNotFoundModal',
  'literatureLinksModal', 'visionLinksModal', 'visionImageViewerModal', 'visionRenameModal',
  'visionDeleteConfirmModal', 'visionTagGoModal', 'literatureTagModal', 'editModal',
  'mapListViewModal'
];

function inlineScript(filename){
  return fs.readFileSync(path.join(appRoot(), 'scripts', filename), 'utf8').replace(/<\/script/gi, '<\\/script');
}

function dialogFixtureHtml(){
  let html = fs.readFileSync(appHtmlPath(), 'utf8');
  html = html
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/gi, '');

  const style = `
    <style>
      [hidden]{display:none !important;}
      .modal-backdrop{display:none;position:fixed;inset:0;padding:16px;background:rgba(0,0,0,.2);}
      .modal-backdrop.open{display:block;}
      .modal{display:block;background:white;padding:16px;max-height:80vh;overflow:auto;}
      button,input,select,textarea,[tabindex]{visibility:visible;}
    </style>
  `;
  html = html.replace('</head>', `${style}</head>`);

  const dynamicDialog = `
    <div aria-labelledby="mapListViewTitle" aria-modal="true" class="modal-backdrop map-list-view-backdrop" id="mapListViewModal" role="dialog" data-escape-dismiss="closeMapListViewBtn" data-backdrop-dismiss="same" data-dialog-kind="viewer" data-dialog-initial-focus="closeMapListViewBtn">
      <div class="modal map-list-view-modal">
        <h2 id="mapListViewTitle">Map List View</h2>
        <button class="app-button" data-app-button="true" id="closeMapListViewBtn" type="button">Close</button>
      </div>
    </div>
  `;
  const scripts = [
    'wormholes-escape.js',
    'wormholes-dialogs.js',
    'wormholes-dialog-keyboard.js',
    'wormholes-focus.js',
    'wormholes-accessibility.js'
  ].map(filename => `<script>${inlineScript(filename)}</script>`).join('\n');

  return html.replace('</body>', `${dynamicDialog}\n${scripts}\n</body>`);
}

async function prepareDialog(page, dialogId){
  return page.evaluate(id => {
    document.querySelectorAll('.modal-backdrop.open').forEach(modal => modal.classList.remove('open'));

    let opener = document.getElementById('dialogKeyboardLifecycleOpener');
    if(!opener){
      opener = document.createElement('button');
      opener.id = 'dialogKeyboardLifecycleOpener';
      opener.type = 'button';
      opener.textContent = 'Dialog lifecycle test opener';
      opener.style.position = 'fixed';
      opener.style.left = '8px';
      opener.style.bottom = '8px';
      document.body.appendChild(opener);
    }
    opener.disabled = false;
    opener.removeAttribute('aria-disabled');
    opener.removeAttribute('tabindex');
    opener.focus();

    const modal = document.getElementById(id);
    if(!modal) throw new Error(`Missing dialog: ${id}`);
    const dismissId = modal.dataset.escapeDismiss || 'none';
    const dismiss = dismissId === 'none' ? null : document.getElementById(dismissId);
    if(dismiss){
      dismiss.__dialogKeyboardOriginalClick = dismiss.click;
      dismiss.click = function(){
        this.dataset.dialogKeyboardEscapeActivated = 'true';
        modal.classList.remove('open');
      };
    }

    modal.classList.add('open');
    window.WormholesEscape?.scanLayers?.(modal);
    window.WormholesFocus?.scanLayers?.(modal);
    return {
      initialFocusId: modal.dataset.dialogInitialFocus,
      dismissId
    };
  }, dialogId);
}

async function finishDialog(page, dialogId){
  await page.evaluate(id => {
    const modal = document.getElementById(id);
    const dismissId = modal?.dataset.escapeDismiss || 'none';
    const dismiss = dismissId === 'none' ? null : document.getElementById(dismissId);
    modal?.classList.remove('open');
    window.WormholesEscape?.scanLayers?.(modal);
    window.WormholesFocus?.scanLayers?.(modal);
    if(dismiss && dismiss.__dialogKeyboardOriginalClick){
      dismiss.click = dismiss.__dialogKeyboardOriginalClick;
      delete dismiss.__dialogKeyboardOriginalClick;
      delete dismiss.dataset.dialogKeyboardEscapeActivated;
    }
  }, dialogId);
}

test.describe('every dialog keyboard lifecycle', () => {
  test('opening focus, Tab containment, Escape policy, and focus restoration stay consistent', async ({ page }) => {
    test.setTimeout(120000);
    await page.setContent(dialogFixtureHtml(), {waitUntil:'load'});

    const discovered = await page.evaluate(() => Array.from(document.querySelectorAll('.modal-backdrop')).map(modal => modal.id));
    expect(discovered).toEqual(STATIC_DIALOG_IDS);

    for(const dialogId of STATIC_DIALOG_IDS){
      await test.step(dialogId, async () => {
        const contract = await prepareDialog(page, dialogId);
        expect(contract.initialFocusId, `${dialogId} should declare opening focus`).toBeTruthy();

        await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(contract.initialFocusId);

        const cycle = await page.evaluate(id => {
          const modal = document.getElementById(id);
          return window.WormholesDialogKeyboard.getFocusableElements(modal).map(item => item.id);
        }, dialogId);
        expect(cycle.length, `${dialogId} should have at least one keyboard control`).toBeGreaterThan(0);
        expect(cycle.every(Boolean), `${dialogId} lifecycle controls should have stable IDs`).toBe(true);

        await page.evaluate(controlId => document.getElementById(controlId).focus(), cycle[cycle.length - 1]);
        await page.keyboard.press('Tab');
        await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(cycle[0]);

        await page.evaluate(controlId => document.getElementById(controlId).focus(), cycle[0]);
        await page.keyboard.press('Shift+Tab');
        await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(cycle[cycle.length - 1]);

        await page.keyboard.press('Escape');
        if(contract.dismissId === 'none'){
          await expect(page.locator(`#${dialogId}`)).toHaveClass(/open/);
          await finishDialog(page, dialogId);
        } else {
          await expect(page.locator(`#${dialogId}`)).not.toHaveClass(/open/);
          await expect.poll(() => page.evaluate(id => document.getElementById(id)?.dataset.dialogKeyboardEscapeActivated || '', contract.dismissId)).toBe('true');
        }

        await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe('dialogKeyboardLifecycleOpener');
        await finishDialog(page, dialogId);
      });
    }
  });
});

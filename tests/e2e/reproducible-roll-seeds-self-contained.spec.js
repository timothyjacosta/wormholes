const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

test('background roll diagnostics reproduce results without adding seed controls', async ({ page }) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});

  const result = await page.evaluate(async () => {
    const now = new Date().toISOString();
    const universe = {id:makeId(), title:'Diagnostic Roll Universe', summary:'', bridges:[], createdAt:now};
    universe.diskFolderName = stableUniverseFolderName(universe);
    universes.push(universe);
    saveUniversesToStorage();
    enterUniverse(universe.id);
    skipRollAnimation = true;

    function run(seed){
      newCreation();
      WormholesGenerationDiagnostics.useSeedForNextSession(seed);
      quickFullRoll();
      return {
        creation:JSON.parse(JSON.stringify(current)),
        metadata:WormholesGenerationDiagnostics.current()
      };
    }

    const first = run('deadbeef');
    const second = run('deadbeef');
    const different = run('12345678');

    newCreation();
    WormholesGenerationDiagnostics.useSeedForNextSession('deadbeef');
    quickFullRoll();
    document.getElementById('creationTitleInput').value = 'Archived Diagnostic Roll';
    await saveCurrentToArchive();
    const archived = archiveEntries.find(entry => entry.title === 'Archived Diagnostic Roll');
    const rollHistory = WormholesRecentRollHistory.latest(10);
    const historyEntry = rollHistory.find(item => item.archiveEntryId === archived?.id);
    const logEntry = WormholesActivityLog.state.items.find(item => item.id === historyEntry?.logItemId);
    const exported = await buildWormholesAppDataExport();
    const exportedEntry = exported.universeData[universe.id].archive.find(entry => entry.id === archived?.id);

    return {
      first,
      second,
      different,
      archivedMetadata:archived?._generation || null,
      exportedMetadata:exportedEntry?._generation || null,
      archivedSource:archived?.source || '',
      currentAfterArchive:WormholesGenerationDiagnostics.current(),
      historyEntry,
      logEntry
    };
  });

  expect(result.second.creation).toEqual(result.first.creation);
  expect(result.second.metadata).toEqual(result.first.metadata);
  expect(result.different.creation).not.toEqual(result.first.creation);
  expect(result.archivedSource).toBe('generated');
  expect(result.archivedMetadata.version).toBe(2);
  expect(result.archivedMetadata.seed).toBe('deadbeef');
  expect(result.archivedMetadata.algorithm).toBe('xorshift32-v1');
  expect(result.archivedMetadata.seedBehaviorVersion).toBe('xorshift32-inclusive-int-v1');
  expect(result.archivedMetadata.generatorVersion).toBe('beta-248');
  expect(result.archivedMetadata.tableVersion).toBe('classic-authored-v1');
  expect(result.archivedMetadata.tableFingerprint).toMatch(/^[0-9a-f]{8}$/);
  expect(result.exportedMetadata).toEqual(result.archivedMetadata);
  expect(result.currentAfterArchive).toBeNull();
  expect(result.historyEntry.archived).toBe(true);
  expect(result.historyEntry.archiveTitle).toBe('Archived Diagnostic Roll');
  expect(result.historyEntry.diagnostic.seed).toBe('deadbeef');
  expect(result.logEntry.message).toMatch(/^Rolled /);
  expect(result.logEntry.detail.summary).toContain('Archived as');
  expect(JSON.stringify(result.logEntry)).not.toMatch(/deadbeef|seed|xorshift32/i);

  const visibleSeedControls = await page.locator('button, label, input, select, textarea').evaluateAll(elements =>
    elements.filter(element => {
      const text = `${element.textContent || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''} ${element.getAttribute('placeholder') || ''}`;
      return /\bseed\b|reproducible/i.test(text);
    }).length
  );
  expect(visibleSeedControls).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

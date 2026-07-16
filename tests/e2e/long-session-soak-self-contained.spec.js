const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { openSelfContainedApp } = require('../support/self-contained-app');

function positiveInteger(value, fallback){
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback){
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function browserHeapBytes(page){
  const session = await page.context().newCDPSession(page);
  try{
    await session.send('HeapProfiler.enable');
    await session.send('Performance.enable');
    await session.send('HeapProfiler.collectGarbage');
    const response = await session.send('Performance.getMetrics');
    return Number(response.metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value || 0);
  } finally {
    await session.detach();
  }
}

async function installSoakHarness(page){
  return await page.evaluate(() => {
    function tinyPng(seed){
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const context = canvas.getContext('2d');
      context.fillStyle = `rgb(${(seed * 31) % 255}, ${(seed * 67) % 255}, ${(seed * 97) % 255})`;
      context.fillRect(0, 0, 48, 48);
      context.fillStyle = 'rgba(255,255,255,.75)';
      context.fillRect(seed % 20, (seed * 3) % 20, 20, 20);
      return canvas.toDataURL('image/png');
    }

    const now = new Date().toISOString();
    const seededUniverses = Array.from({length:3}, (_, universeIndex) => {
      const universe = {
        id:makeId(),
        title:`Soak Universe ${universeIndex + 1}`,
        summary:'Long-session validation universe',
        bridges:[],
        createdAt:now
      };
      universe.diskFolderName = stableUniverseFolderName(universe);
      const entries = Array.from({length:24}, (_, entryIndex) => ({
        id:makeId(),
        title:`Seed ${universeIndex + 1}-${String(entryIndex + 1).padStart(2, '0')}`,
        what:{val:entryIndex % 2 ? 'Character — Explorer' : 'Place — Landmark'},
        attr1:{val:'Persistent'},
        attr2:{val:'Observed'},
        pressure:{val:'Changing'},
        summary:'Soak seed entry',
        notes:[],
        connections:[],
        bridges:[],
        createdAt:now
      }));
      entries.forEach((entry, index) => {
        const next = entries[(index + 1) % entries.length];
        entry.connections = [next.id];
      });
      saveArchiveForUniverse(universe.id, entries);
      saveConnectionNotesForUniverse(universe.id, {});
      saveLiteratureForUniverse(universe.id, Array.from({length:5}, (_, index) => normalizeLiteratureDoc({
        id:makeId(),
        title:`Seed Literature ${universeIndex + 1}-${index + 1}`,
        content:`<p>Seed document ${index + 1}</p>`,
        fileType:'text',
        tags:{universes:[universe.id], entries:[{universeId:universe.id, entryId:entries[index].id}]},
        createdAt:now,
        updatedAt:now
      }, universe.id)));
      const thumbnail = tinyPng(universeIndex + 1);
      const vision = Array.from({length:4}, (_, index) => normalizeVisionEntry({
        id:makeId(),
        title:`Seed Image ${universeIndex + 1}-${index + 1}`,
        sourceName:`seed-${universeIndex + 1}-${index + 1}.png`,
        fileType:'image',
        mimeType:'image/png',
        dataUrl:thumbnail,
        thumbnailDataUrl:thumbnail,
        fileSize:thumbnail.length,
        tags:{universes:[universe.id], entries:[{universeId:universe.id, entryId:entries[index].id}]},
        createdAt:now
      }));
      writeVisionMetadataOnly(universe.id, vision);
      return universe;
    });

    universes = seededUniverses;
    saveUniversesToStorage();
    enterUniverse(seededUniverses[0].id);
    switchTab('archive');
    renderArchive();

    window.__wormholesSoak = {
      imageData:Array.from({length:8}, (_, index) => tinyPng(index + 10)),
      exportChecks:0,
      undoChecks:0,
      mapChecks:0,
      cycles:0
    };

    window.__wormholesSoakStep = async cycle => {
      const state = window.__wormholesSoak;
      const universe = universes[cycle % universes.length];
      if(currentUniverseId !== universe.id) enterUniverse(universe.id);

      const timestamp = new Date(Date.now() + cycle * 1000).toISOString();
      const entry = {
        id:makeId(),
        title:`Session Entry ${cycle + 1}`,
        what:{val:cycle % 2 ? 'Character — Guide' : 'Place — Outpost'},
        attr1:{val:`Trait ${cycle % 11}`},
        attr2:{val:`Detail ${cycle % 7}`},
        pressure:{val:`Pressure ${cycle % 5}`},
        summary:`Edited during soak cycle ${cycle + 1}`,
        notes:[`Note ${cycle + 1}`],
        connections:[],
        bridges:[],
        createdAt:timestamp
      };
      const previous = archiveEntries[archiveEntries.length - 1];
      if(previous){
        entry.connections = [previous.id];
        previous.connections = Array.from(new Set([...(previous.connections || []), entry.id]));
      }
      archiveEntries.push(entry);
      const edited = archiveEntries[cycle % archiveEntries.length];
      edited.summary = `Revisited at cycle ${cycle + 1}`;
      edited.updatedAt = timestamp;

      while(archiveEntries.length > 72){
        const removed = archiveEntries.shift();
        archiveEntries.forEach(item => {
          item.connections = (item.connections || []).filter(id => id !== removed.id);
        });
        Object.keys(connectionNotes || {}).forEach(key => {
          if(key.includes(removed.id)) delete connectionNotes[key];
        });
      }
      if(previous && archiveEntries.some(item => item.id === previous.id)){
        connectionNotes[connectionKey(previous.id, entry.id)] = `Connection checked during cycle ${cycle + 1}`;
      }
      const noteKeys = Object.keys(connectionNotes || {});
      while(noteKeys.length > 60){
        delete connectionNotes[noteKeys.shift()];
      }
      if(!saveArchiveToStorage()) throw new Error(`Archive save failed at cycle ${cycle + 1}`);
      if(!saveConnectionNotesToStorage()) throw new Error(`Connection-note save failed at cycle ${cycle + 1}`);

      if(cycle % 2 === 0){
        literatureEntries.push(normalizeLiteratureDoc({
          id:makeId(),
          title:`Session Literature ${cycle + 1}`,
          content:`<p>Long-session document ${cycle + 1}</p>`,
          fileType:'text',
          tags:{universes:[currentUniverseId], entries:[{universeId:currentUniverseId, entryId:entry.id}]},
          createdAt:timestamp,
          updatedAt:timestamp
        }, currentUniverseId));
        while(literatureEntries.length > 30) literatureEntries.shift();
        if(!saveLiteratureToStorage()) throw new Error(`Literature save failed at cycle ${cycle + 1}`);
      }

      if(cycle % 3 === 0){
        const dataUrl = state.imageData[cycle % state.imageData.length];
        visionEntries.push(normalizeVisionEntry({
          id:makeId(),
          title:`Session Image ${cycle + 1}`,
          sourceName:`session-${cycle + 1}.png`,
          fileType:'image',
          mimeType:'image/png',
          dataUrl,
          thumbnailDataUrl:dataUrl,
          fileSize:dataUrl.length,
          tags:{universes:[currentUniverseId], entries:[{universeId:currentUniverseId, entryId:entry.id}]},
          createdAt:timestamp
        }));
        while(visionEntries.length > 20) visionEntries.shift();
        if(!saveVisionBoardToStorage()) throw new Error(`Vision save failed at cycle ${cycle + 1}`);
      }

      if(cycle % 5 === 0){
        const draftResult = window.WormholesManualDrafts.saveDraft(currentUniverseId, {
          manualTitle:`Unfinished ${cycle + 1}`,
          manualWhat:'__custom__',
          manualWhatCustom:'Temporary soak draft'
        });
        if(!draftResult.ok) throw new Error(`Draft save failed at cycle ${cycle + 1}`);
      } else if(cycle % 5 === 1){
        window.WormholesManualDrafts.removeDraft(currentUniverseId);
      }

      if(cycle % 7 === 0 && archiveEntries.length > 3){
        const undoState = window.WormholesUndo.captureState();
        const temporarilyRemoved = archiveEntries.pop();
        saveArchiveToStorage();
        await window.WormholesUndo.offer({
          message:`Soak deletion ${cycle + 1}`,
          restoredMessage:'Soak deletion restored',
          state:undoState
        });
        const restored = await window.WormholesUndo.undoActive();
        if(!restored || !archiveEntries.some(item => item.id === temporarilyRemoved.id)){
          throw new Error(`Undo failed at cycle ${cycle + 1}`);
        }
        state.undoChecks += 1;
      }

      const tab = cycle % 3 === 0 ? 'archive' : (cycle % 3 === 1 ? 'literature' : 'vision');
      switchTab(tab);
      if(tab === 'archive') renderArchive();
      if(tab === 'literature') renderLiteratureList();
      if(tab === 'vision') await renderVisionBoard();

      if(cycle % 6 === 0){
        switchTab('archive');
        showConnectionsScreen();
        connectionsMapZoom = cycle % 12 === 0 ? 0.35 : 1.25;
        connectionsMapAutoFitOnNextRender = false;
        renderConnectionsMap();
        showArchiveListScreen();
        state.mapChecks += 1;
      }

      if(cycle % 12 === 0){
        openWormholesModal();
        wormholesMapZoom = 0.45;
        wormholesMapAutoFitOnNextRender = false;
        renderWormholesMap();
        closeWormholesModal();
        state.mapChecks += 1;
      }

      if(cycle % 9 === 0 && visionEntries.length){
        await openVisionImageViewer(currentUniverseId, visionEntries[visionEntries.length - 1].id);
        closeVisionImageViewerModal();
      }

      if(cycle % 10 === 0){
        const exported = await buildWormholesAppDataExport();
        const summary = exported.exportSummary || summarizeWormholesAppDataExport(exported);
        const expectedArchive = universes.reduce((total, item) => total + readArchiveForUniverse(item.id).filter(record => !isGroupEntry(record)).length, 0);
        if(summary.archiveEntries !== expectedArchive){
          throw new Error(`Export summary mismatch at cycle ${cycle + 1}`);
        }
        state.exportChecks += 1;
      }

      window.WormholesActivityLog.recordAction(`Soak cycle ${cycle + 1} completed`, {dedupeWindowMs:0});
      closeMenus();
      closeWormholesModal();
      showArchiveListScreen();
      state.cycles = cycle + 1;
      await new Promise(resolve => setTimeout(resolve, 0));

      return window.__wormholesSoakMetrics();
    };

    window.__wormholesSoakMetrics = () => {
      const activityItems = window.WormholesActivityLog?.state?.items || [];
      const activeArchive = currentUniverseId ? readArchiveForUniverse(currentUniverseId) : [];
      const activeLiterature = currentUniverseId ? readLiteratureForUniverse(currentUniverseId) : [];
      const activeVision = currentUniverseId ? readVisionBoardForUniverse(currentUniverseId) : [];
      const openDialogs = Array.from(document.querySelectorAll('[role="dialog"], .modal, .settings-menu'))
        .filter(element => element.classList.contains('open') || element.classList.contains('show')).length;
      return {
        cycles:window.__wormholesSoak.cycles,
        universes:universes.length,
        archive:activeArchive.length,
        literature:activeLiterature.length,
        vision:activeVision.length,
        activityLog:Array.isArray(activityItems) ? activityItems.length : 0,
        domNodes:document.querySelectorAll('*').length,
        svgNodes:document.querySelectorAll('svg *').length,
        openDialogs,
        activeUndo:!!window.WormholesUndo?.hasActive?.(),
        localStorageItems:localStorage.length,
        localStorageBytes:Array.from({length:localStorage.length}, (_, index) => {
          const key = localStorage.key(index) || '';
          return key.length + String(localStorage.getItem(key) || '').length;
        }).reduce((sum, value) => sum + value, 0),
        exportChecks:window.__wormholesSoak.exportChecks,
        undoChecks:window.__wormholesSoak.undoChecks,
        mapChecks:window.__wormholesSoak.mapChecks
      };
    };

    return window.__wormholesSoakMetrics();
  });
}

test.describe.configure({mode:'serial'});

test('extended mixed-use session remains stable and bounded', async ({ page }, testInfo) => {
  test.skip(process.env.WORMHOLES_RUN_SOAK !== '1', 'Run with npm run test:soak or npm run test:soak:quick.');

  const minimumCycles = positiveInteger(process.env.WORMHOLES_SOAK_CYCLES, 120);
  const minimumDurationMs = nonNegativeInteger(process.env.WORMHOLES_SOAK_DURATION_MS, 60000);
  const maximumCycles = positiveInteger(process.env.WORMHOLES_SOAK_MAX_CYCLES, Math.max(minimumCycles, 1000));
  const maximumHeapGrowthMb = positiveInteger(process.env.WORMHOLES_SOAK_MAX_HEAP_GROWTH_MB, 96);
  test.setTimeout(Math.max(120000, minimumDurationMs + 180000));

  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});
  const initialMetrics = await installSoakHarness(page);

  for(let warmup = 0; warmup < 6; warmup += 1){
    await page.evaluate(index => window.__wormholesSoakStep(index), warmup);
  }
  const baselineHeap = await browserHeapBytes(page);
  const baselineMetrics = await page.evaluate(() => window.__wormholesSoakMetrics());

  const startedAt = Date.now();
  const checkpoints = [];
  let completed = 6;
  while((completed < minimumCycles || Date.now() - startedAt < minimumDurationMs) && completed < maximumCycles){
    const metrics = await page.evaluate(index => window.__wormholesSoakStep(index), completed);
    completed += 1;
    if(completed % 20 === 0 || completed === minimumCycles){
      checkpoints.push({...metrics, elapsedMs:Date.now() - startedAt});
    }
  }

  await page.evaluate(async () => {
    await window.WormholesUndo?.commitActive?.({silent:true});
    closeMenus();
    closeWormholesModal();
    showArchiveListScreen();
    switchTab('archive');
    renderArchive();
  });
  const finalHeap = await browserHeapBytes(page);
  const finalMetrics = await page.evaluate(() => window.__wormholesSoakMetrics());
  const heapGrowthBytes = Math.max(0, finalHeap - baselineHeap);

  const report = {
    release:'Beta 248',
    completedCycles:completed,
    elapsedMs:Date.now() - startedAt,
    baselineHeapBytes:baselineHeap,
    finalHeapBytes:finalHeap,
    heapGrowthBytes,
    maximumHeapGrowthBytes:maximumHeapGrowthMb * 1024 * 1024,
    initialMetrics,
    baselineMetrics,
    finalMetrics,
    checkpoints,
    runtimeErrors
  };
  const reportPath = path.resolve(__dirname, '..', 'soak', 'results', 'soak-report.json');
  fs.mkdirSync(path.dirname(reportPath), {recursive:true});
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await testInfo.attach('soak-report', {path:reportPath, contentType:'application/json'});

  expect(completed).toBeGreaterThanOrEqual(minimumCycles);
  expect(runtimeErrors).toEqual([]);
  expect(finalMetrics.universes).toBe(3);
  expect(finalMetrics.archive).toBeLessThanOrEqual(72);
  expect(finalMetrics.literature).toBeLessThanOrEqual(30);
  expect(finalMetrics.vision).toBeLessThanOrEqual(20);
  expect(finalMetrics.activityLog).toBeLessThanOrEqual(200);
  expect(finalMetrics.openDialogs).toBe(0);
  expect(finalMetrics.activeUndo).toBe(false);
  expect(finalMetrics.exportChecks).toBeGreaterThan(0);
  expect(finalMetrics.undoChecks).toBeGreaterThan(0);
  expect(finalMetrics.mapChecks).toBeGreaterThan(0);
  expect(finalMetrics.domNodes).toBeLessThan(baselineMetrics.domNodes + 3500);
  expect(finalMetrics.svgNodes).toBeLessThan(4000);
  expect(heapGrowthBytes).toBeLessThan(maximumHeapGrowthMb * 1024 * 1024);
});

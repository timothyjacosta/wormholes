'use strict';

const {test, expect} = require('@playwright/test');
const {validImport} = require('../fixtures/malformed-import-corpus');
const {openSelfContainedApp} = require('../support/self-contained-app');

function multiUniverseImport(){
  const data = validImport();
  data.currentUniverseId = 'u-2';
  data.universes.push({
    id:'u-2',
    title:'Second Import Universe',
    summary:'Confirms metadata for later universes is written after every record-metadata step.',
    bridges:[],
    createdAt:'2026-07-16T18:58:08.000Z',
    diskFolderName:'Second Import Universe -- u-2'
  });
  data.universeData['u-2'] = {
    archive:[{
      id:'a-2',
      title:'Second Universe Creation',
      what:{val:'Sanctuary'},
      connections:[],
      bridges:[],
      createdAt:'2026-07-16T18:58:08.000Z'
    }],
    connectionNotes:{},
    literature:[{
      id:'l-2',
      title:'Second Universe Document',
      content:'<p>Portable second-universe text.</p>',
      fileType:'text',
      fileSize:0,
      tags:{universes:[], entries:[]}
    }],
    vision:[{
      id:'v-2',
      title:'Second Universe Image',
      fileType:'image',
      fileSize:0,
      tags:{universes:[], entries:[]}
    }]
  };
  return data;
}

test('imports two universes with globally phase-ordered persistence steps', async ({page}) => {
  const runtimeErrors = await openSelfContainedApp(page, {inlineStyles:true});
  const importData = multiUniverseImport();

  const result = await page.evaluate(async (data) => {
    const originalJournal = window.WormholesWriteAheadJournal;
    const originalSnapshots = window.WormholesSnapshots;
    const phases = [];
    window.WormholesWriteAheadJournal = null;
    window.WormholesSnapshots = null;
    window.WormholesPersistenceFailureInjector = (context) => {
      phases.push({phase:context.phase, step:context.step});
      return false;
    };

    try {
      const imported = await applyWormholesAppDataImport(data, {
        skipConfirmation:true,
        persistentSnapshot:false,
        offerUndo:false,
        suppressSuccessToast:true,
        capacityPreflight:false
      });
      return {
        imported,
        phases,
        currentUniverseId,
        universeIds:universes.map(universe => universe.id),
        archiveTitles:Object.fromEntries(universes.map(universe => [
          universe.id,
          readArchiveForUniverse(universe.id).map(entry => entry.title)
        ])),
        literatureTitles:Object.fromEntries(universes.map(universe => [
          universe.id,
          readLiteratureForUniverse(universe.id).map(entry => entry.title)
        ])),
        visionTitles:Object.fromEntries(universes.map(universe => [
          universe.id,
          readVisionBoardForUniverse(universe.id).map(entry => entry.title)
        ]))
      };
    } finally {
      delete window.WormholesPersistenceFailureInjector;
      window.WormholesWriteAheadJournal = originalJournal;
      window.WormholesSnapshots = originalSnapshots;
    }
  }, importData);

  expect(result.imported).toBe(true);
  expect(result.currentUniverseId).toBe('u-2');
  expect(result.universeIds).toEqual(['u-1', 'u-2']);
  expect(result.archiveTitles).toEqual({
    'u-1':['Control Creation'],
    'u-2':['Second Universe Creation']
  });
  expect(result.literatureTitles).toEqual({
    'u-1':['Control Document'],
    'u-2':['Second Universe Document']
  });
  expect(result.visionTitles).toEqual({
    'u-1':['Control Image'],
    'u-2':['Second Universe Image']
  });

  const ranks = {'large-content':10, 'record-metadata':20, 'collection-metadata':30, 'core-metadata':40};
  expect(result.phases.map(item => ranks[item.phase])).toEqual(
    [...result.phases].map(item => ranks[item.phase]).sort((a, b) => a - b)
  );
  const lastRecordIndex = result.phases.map(item => item.phase).lastIndexOf('record-metadata');
  const firstCollectionIndex = result.phases.findIndex(item => item.phase === 'collection-metadata');
  expect(lastRecordIndex).toBeGreaterThanOrEqual(0);
  expect(firstCollectionIndex).toBeGreaterThan(lastRecordIndex);
  expect(runtimeErrors).toEqual([]);
});

'use strict';

function validImport(){
  return {
    format:'Wormholes App Data Export',
    schemaVersion:4,
    appVersion:'Beta 209',
    currentUniverseId:'u-1',
    universes:[{
      id:'u-1',
      title:'Malformed Import Control',
      summary:'A small valid backup used as the mutation baseline.',
      bridges:[],
      createdAt:'2026-07-12T20:33:31.000Z',
      diskFolderName:'Malformed Import Control -- u-1'
    }],
    bridgeNotes:{},
    universeData:{
      'u-1':{
        archive:[{
          id:'a-1',
          title:'Control Creation',
          what:{val:'Artifact'},
          connections:[],
          bridges:[],
          createdAt:'2026-07-12T20:33:31.000Z'
        }],
        connectionNotes:{},
        literature:[{
          id:'l-1',
          title:'Control Document',
          content:'<p>Safe text.</p>',
          fileType:'text',
          fileSize:0,
          tags:{universes:[], entries:[]}
        }],
        vision:[{
          id:'v-1',
          title:'Control Image',
          fileType:'image',
          fileSize:0,
          tags:{universes:[], entries:[]}
        }]
      }
    }
  };
}

function mutate(name, path, change){
  const data = validImport();
  change(data);
  return {name, path, data};
}

const structuralCases = [
  mutate('schema version is text', '$.schemaVersion', data => { data.schemaVersion = '4'; }),
  mutate('universe details is an array', '$.universeData', data => { data.universeData = []; }),
  mutate('universe record is not an object', '$.universes[0]', data => { data.universes[0] = 'u-1'; }),
  mutate('universe ID is missing', '$.universes[0].id', data => { delete data.universes[0].id; }),
  mutate('universe bridge list is not an array', '$.universes[0].bridges', data => { data.universes[0].bridges = {}; }),
  mutate('listed universe has no details', '$.universeData.u-1', data => { delete data.universeData['u-1']; }),
  mutate('orphan universe details are present', '$.universeData.orphan-u', data => {
    data.universeData['orphan-u'] = {archive:[], connectionNotes:{}, literature:[], vision:[]};
  }),
  mutate('Archive collection is not an array', '$.universeData.u-1.archive', data => { data.universeData['u-1'].archive = {}; }),
  mutate('Archive record is not an object', '$.universeData.u-1.archive[0]', data => { data.universeData['u-1'].archive[0] = 'a-1'; }),
  mutate('Archive ID is missing', '$.universeData.u-1.archive[0].id', data => { delete data.universeData['u-1'].archive[0].id; }),
  mutate('Archive connections are not an array', '$.universeData.u-1.archive[0].connections', data => { data.universeData['u-1'].archive[0].connections = 'a-2'; }),
  mutate('Archive value cell has the wrong shape', '$.universeData.u-1.archive[0].what', data => { data.universeData['u-1'].archive[0].what = []; }),
  mutate('connection notes are not an object', '$.universeData.u-1.connectionNotes', data => { data.universeData['u-1'].connectionNotes = []; }),
  mutate('connection note value is not text', '$.universeData.u-1.connectionNotes.a-1::a-2', data => { data.universeData['u-1'].connectionNotes['a-1::a-2'] = 42; }),
  mutate('Literature collection is not an array', '$.universeData.u-1.literature', data => { data.universeData['u-1'].literature = {}; }),
  mutate('Literature record is not an object', '$.universeData.u-1.literature[0]', data => { data.universeData['u-1'].literature[0] = []; }),
  mutate('Literature file size is text', '$.universeData.u-1.literature[0].fileSize', data => { data.universeData['u-1'].literature[0].fileSize = '0'; }),
  mutate('Literature tags contain a malformed entry', '$.universeData.u-1.literature[0].tags.entries[0]', data => { data.universeData['u-1'].literature[0].tags.entries = [17]; }),
  mutate('Vision Board collection is not an array', '$.universeData.u-1.vision', data => { data.universeData['u-1'].vision = {}; }),
  mutate('Vision Board record is not an object', '$.universeData.u-1.vision[0]', data => { data.universeData['u-1'].vision[0] = null; }),
  mutate('Vision Board data URL is not text', '$.universeData.u-1.vision[0].dataUrl', data => { data.universeData['u-1'].vision[0].dataUrl = 99; }),
  mutate('bridge note value is not text', '$.bridgeNotes.bad-key', data => { data.bridgeNotes['bad-key'] = {note:'not text'}; })
];

const fileCases = [
  {name:'truncated JSON', raw:'{"format":"Wormholes App Data Export","universes":['},
  {name:'JSON primitive', raw:'42'},
  {name:'JSON array', raw:'[]'},
  {name:'wrong export format', raw:JSON.stringify({...validImport(), format:'Some Other Export'})},
  {name:'future schema version', raw:JSON.stringify({...validImport(), schemaVersion:6})},
  ...structuralCases.map(testCase => ({name:testCase.name, raw:JSON.stringify(testCase.data)}))
];

module.exports = {validImport, structuralCases, fileCases};

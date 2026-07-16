'use strict';

const crypto = require('crypto');

const APP_FORMAT = 'Wormholes App Data Export';
const SCHEMA_VERSION = 4;
const DEFAULT_APP_VERSION = 'Beta 248';
const TINY_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl9sAAAAASUVORK5CYII=';
const TINY_JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k=';

const TYPES = [
  ['Character', 'Protagonist'],
  ['Creature', 'Species'],
  ['Society', 'Culture'],
  ['Place', 'City'],
  ['Technology', 'Device'],
  ['Organization', 'Faction'],
  ['Event', 'Turning Point'],
  ['Knowledge', 'Secret'],
  ['Relationship', 'Alliance']
];
const ADJECTIVES = ['Amber', 'Ashen', 'Bright', 'Crimson', 'Distant', 'Emerald', 'Forgotten', 'Glass', 'Hollow', 'Ivory', 'Jade', 'Last', 'Moonlit', 'Northern', 'Obsidian', 'Quiet', 'Red', 'Silver', 'Twilight', 'Verdant'];
const NOUNS = ['Archive', 'Beacon', 'Citadel', 'Crown', 'Engine', 'Expanse', 'Gate', 'Harbor', 'Library', 'March', 'Oracle', 'Pact', 'River', 'Sanctum', 'Signal', 'Spire', 'Throne', 'Vault', 'Way', 'Workshop'];
const UNIVERSE_NOUNS = ['Atlas', 'Chronicle', 'Constellation', 'Dominion', 'Expedition', 'Frontier', 'Inheritance', 'Labyrinth', 'Odyssey', 'Realm', 'Saga', 'Testament'];
const NOTE_TEXT = [
  'A detail that becomes important later in the story.',
  'This thread is intentionally unresolved.',
  'Review this relationship during the next revision.',
  'A quiet clue links this item to the wider universe.'
];
const LORE_PARAGRAPHS = [
  'The oldest accounts disagree about how the place first received its name, but every version preserves the same warning: the boundary is easier to cross than it is to recognize.',
  'Travelers record different landmarks depending on the season. Local guides insist that the route is stable and that memory, rather than geography, is responsible for the contradictions.',
  'The surviving letters describe ordinary lives beside extraordinary events. Their authors rarely understood the scale of what was happening around them.',
  'Later scholars organized these fragments into a single narrative, smoothing over several gaps that remain visible when the original sources are compared.',
  'This section is written as representative long-form material for repeatable Wormholes performance testing.'
];

const SCENARIOS = Object.freeze({
  small: Object.freeze({
    label: 'Small everyday project',
    purpose: 'Fast baseline for startup, navigation, filtering, and ordinary saves.',
    seed: 0x534d414c,
    universes: 3,
    archiveEntitiesPerUniverse: 40,
    archiveGroupsPerUniverse: 4,
    literatureEntitiesPerUniverse: 15,
    literatureGroupsPerUniverse: 2,
    visionItemsPerUniverse: 18,
    connectionsPerUniverse: 50,
    bridgesAcrossApp: 12,
    notesPerUniverse: 8,
    literatureCharactersPerDocument: 900
  }),
  medium: Object.freeze({
    label: 'Established project',
    purpose: 'Representative ongoing project for collection rendering and global search.',
    seed: 0x4d454449,
    universes: 4,
    archiveEntitiesPerUniverse: 250,
    archiveGroupsPerUniverse: 20,
    literatureEntitiesPerUniverse: 100,
    literatureGroupsPerUniverse: 10,
    visionItemsPerUniverse: 120,
    connectionsPerUniverse: 700,
    bridgesAcrossApp: 80,
    notesPerUniverse: 80,
    literatureCharactersPerDocument: 1800
  }),
  'large-single': Object.freeze({
    label: 'Large single-universe book',
    purpose: 'Heavy Archive, Literature, Vision Board, pagination, filtering, and search coverage.',
    seed: 0x4c415247,
    universes: 1,
    archiveEntitiesPerUniverse: 1000,
    archiveGroupsPerUniverse: 50,
    literatureEntitiesPerUniverse: 500,
    literatureGroupsPerUniverse: 25,
    visionItemsPerUniverse: 750,
    connectionsPerUniverse: 5000,
    bridgesAcrossApp: 0,
    notesPerUniverse: 500,
    literatureCharactersPerDocument: 2400
  }),
  'large-multi': Object.freeze({
    label: 'Ten-book multi-universe project',
    purpose: 'Models deep multi-universe authorship with bridges, images, writing, and large Archives.',
    seed: 0x4d554c54,
    universes: 10,
    archiveEntitiesPerUniverse: 500,
    archiveGroupsPerUniverse: 25,
    literatureEntitiesPerUniverse: 160,
    literatureGroupsPerUniverse: 10,
    visionItemsPerUniverse: 500,
    connectionsPerUniverse: 1500,
    bridgesAcrossApp: 500,
    notesPerUniverse: 200,
    literatureCharactersPerDocument: 3200
  }),
  'dense-map': Object.freeze({
    label: 'Dense map network',
    purpose: 'Stresses Connections, Manage Bridges, isolation, list view, zoom, and map filtering.',
    seed: 0x4d415053,
    universes: 4,
    archiveEntitiesPerUniverse: 800,
    archiveGroupsPerUniverse: 20,
    literatureEntitiesPerUniverse: 40,
    literatureGroupsPerUniverse: 4,
    visionItemsPerUniverse: 60,
    connectionsPerUniverse: 12000,
    bridgesAcrossApp: 4000,
    notesPerUniverse: 1000,
    literatureCharactersPerDocument: 800
  }),
  'near-limit': Object.freeze({
    label: 'Near supported limits',
    purpose: 'On-demand safety and scaling fixture close to the supported per-universe ceilings.',
    seed: 0x4c494d54,
    universes: 2,
    archiveEntitiesPerUniverse: 4800,
    archiveGroupsPerUniverse: 300,
    literatureEntitiesPerUniverse: 4800,
    literatureGroupsPerUniverse: 300,
    visionItemsPerUniverse: 2400,
    connectionsPerUniverse: 48000,
    bridgesAcrossApp: 20000,
    notesPerUniverse: 4000,
    literatureCharactersPerDocument: 500
  })
});

function makeSeededRandom(seed){
  let state = Number(seed) >>> 0;
  return function random(){
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pad(value, width = 4){
  return String(value).padStart(width, '0');
}

function isoAt(index, total, start = Date.UTC(2022, 0, 1), spanDays = 1460){
  const denominator = Math.max(1, total - 1);
  const millis = start + Math.floor((index / denominator) * spanDays * 86400000);
  return new Date(millis).toISOString();
}

function choose(random, values){
  return values[Math.floor(random() * values.length) % values.length];
}

function titleFor(random, index){
  return `${choose(random, ADJECTIVES)} ${choose(random, NOUNS)} ${pad(index + 1, 3)}`;
}

function repeatedLore(targetCharacters, universeIndex, documentIndex){
  const prefix = `<h2>Section ${documentIndex + 1}</h2>`;
  let result = prefix;
  let cursor = universeIndex + documentIndex;
  while(result.length < targetCharacters){
    result += `<p>${LORE_PARAGRAPHS[cursor % LORE_PARAGRAPHS.length]}</p>`;
    cursor += 1;
  }
  return result;
}

function canonicalPair(a, b){
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function addConnections(creations, desiredCount){
  const max = creations.length * (creations.length - 1) / 2;
  const target = Math.min(Math.max(0, desiredCount), max);
  const pairs = [];
  const seen = new Set();
  if(creations.length < 2 || !target) return pairs;

  for(let distance = 1; pairs.length < target && distance < creations.length; distance += 1){
    for(let index = 0; index < creations.length && pairs.length < target; index += 1){
      const other = (index + distance) % creations.length;
      if(index === other) continue;
      const a = creations[index];
      const b = creations[other];
      const key = canonicalPair(a.id, b.id);
      if(seen.has(key)) continue;
      seen.add(key);
      a.connections.push(b.id);
      b.connections.push(a.id);
      pairs.push([a.id, b.id]);
    }
  }
  return pairs;
}

function assignGroups(items, groups, random){
  if(!groups.length || !items.length) return;
  const available = items.slice();
  let cursor = 0;
  groups.forEach((group, groupIndex) => {
    const remainingGroups = groups.length - groupIndex;
    const remainingItems = available.length - cursor;
    const ideal = Math.max(1, Math.min(20, Math.floor(remainingItems / Math.max(1, remainingGroups))));
    const count = Math.max(1, Math.min(ideal + Math.floor(random() * 5) - 2, remainingItems - Math.max(0, remainingGroups - 1)));
    group.groupIds = available.slice(cursor, cursor + count).map(item => item.id);
    group.attr2 = {val:`${group.groupIds.length} grouped items`};
    cursor += count;
  });
}

function makeUniverseRecord(universeIndex, universeCount, random){
  const id = `u-${pad(universeIndex + 1, 3)}`;
  const title = `${choose(random, ADJECTIVES)} ${choose(random, UNIVERSE_NOUNS)} ${universeIndex + 1}`;
  return {
    id,
    title,
    summary:`Representative performance universe ${universeIndex + 1} of ${universeCount}.`,
    bridges:[],
    createdAt:isoAt(universeIndex, universeCount),
    diskFolderName:`${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')} -- ${id}`
  };
}

function makeArchive(universe, config, random){
  const groupCount = Math.min(config.archiveGroupsPerUniverse, Math.max(0, config.archiveEntitiesPerUniverse - 1));
  const creationCount = Math.max(0, config.archiveEntitiesPerUniverse - groupCount);
  const creations = [];
  const groups = [];

  for(let index = 0; index < creationCount; index += 1){
    const [type, subtype] = TYPES[index % TYPES.length];
    const id = `${universe.id}-a-${pad(index + 1, 5)}`;
    creations.push({
      id,
      title:titleFor(random, index),
      what:{val:`${type} — ${subtype}`},
      attr1:{val:choose(random, ['Ancient', 'Contested', 'Hidden', 'Luminous', 'Migratory', 'Ritual', 'Unstable'])},
      attr2:{val:choose(random, ['Bound by oath', 'Known by rumor', 'Recently changed', 'Under observation', 'Widely misunderstood'])},
      pressure:{val:choose(random, ['A deadline approaches', 'A secret is exposed', 'An alliance is tested', 'The old order resists', 'Someone vanishes'])},
      summary:`${type} entry ${index + 1} in ${universe.title}. ${choose(random, LORE_PARAGRAPHS)}`,
      notes:[],
      connections:[],
      bridges:[],
      createdAt:isoAt(index, Math.max(1, creationCount))
    });
  }

  for(let index = 0; index < groupCount; index += 1){
    groups.push({
      id:`${universe.id}-g-${pad(index + 1, 4)}`,
      kind:'group',
      title:`${choose(random, ADJECTIVES)} Collection ${index + 1}`,
      what:{val:'Group'},
      attr1:{val:'Curated collection'},
      attr2:{val:'0 grouped items'},
      pressure:{val:'Items share a narrative purpose'},
      summary:`A representative Archive group in ${universe.title}.`,
      groupIds:[],
      connections:[],
      bridges:[],
      createdAt:isoAt(index, Math.max(1, groupCount))
    });
  }

  assignGroups(creations, groups, random);
  const connectionPairs = addConnections(creations, config.connectionsPerUniverse);
  const noteTarget = Math.min(config.notesPerUniverse, creations.length);
  for(let index = 0; index < noteTarget; index += 1){
    const entry = creations[index];
    entry.notes = [NOTE_TEXT[index % NOTE_TEXT.length]];
  }

  const connectionNotes = {};
  connectionPairs.slice(0, Math.min(connectionPairs.length, Math.ceil(config.notesPerUniverse / 4))).forEach((pair, index) => {
    connectionNotes[canonicalPair(pair[0], pair[1])] = `Connection note ${index + 1}: ${NOTE_TEXT[index % NOTE_TEXT.length]}`;
  });

  return {archive:[...groups, ...creations], creations, groups, connectionPairs, connectionNotes};
}

function makeLiterature(universe, archiveInfo, config, random){
  const groupCount = Math.min(config.literatureGroupsPerUniverse, Math.max(0, config.literatureEntitiesPerUniverse - 1));
  const documentCount = Math.max(0, config.literatureEntitiesPerUniverse - groupCount);
  const documents = [];
  const groups = [];

  for(let index = 0; index < documentCount; index += 1){
    const id = `${universe.id}-l-${pad(index + 1, 5)}`;
    const archiveTarget = archiveInfo.creations.length ? archiveInfo.creations[index % archiveInfo.creations.length] : null;
    documents.push({
      id,
      kind:'',
      title:`${choose(random, ADJECTIVES)} Chapter ${index + 1}`,
      content:repeatedLore(config.literatureCharactersPerDocument, Number(universe.id.slice(2)) || 0, index),
      sourceName:`chapter-${pad(index + 1, 4)}.txt`,
      fileType:'text',
      mimeType:'text/plain',
      fileSize:config.literatureCharactersPerDocument,
      convertedFrom:'',
      storage:'',
      folderFileName:'',
      contentStoreKey:`literature:${universe.id}:${id}:content`,
      contentStored:'embedded-export',
      tags:{
        universes:index % 5 === 0 ? [universe.id] : [],
        entries:archiveTarget && index % 3 === 0 ? [{universeId:universe.id, entryId:archiveTarget.id}] : []
      },
      createdAt:isoAt(index, Math.max(1, documentCount)),
      updatedAt:isoAt(documentCount - index - 1, Math.max(1, documentCount), Date.UTC(2024, 0, 1), 700)
    });
  }

  for(let index = 0; index < groupCount; index += 1){
    groups.push({
      id:`${universe.id}-lg-${pad(index + 1, 4)}`,
      kind:'literatureGroup',
      title:`Draft Cycle ${index + 1}`,
      content:'',
      sourceName:'',
      fileType:'group',
      mimeType:'',
      fileSize:0,
      storage:'',
      folderFileName:'',
      contentStoreKey:'',
      contentStored:'',
      groupIds:[],
      tags:{universes:[], entries:[]},
      createdAt:isoAt(index, Math.max(1, groupCount)),
      updatedAt:isoAt(index, Math.max(1, groupCount), Date.UTC(2024, 0, 1), 700)
    });
  }
  assignGroups(documents, groups, random);
  return [...groups, ...documents];
}

function makeVision(universe, archiveInfo, config, random, options){
  const items = [];
  for(let index = 0; index < config.visionItemsPerUniverse; index += 1){
    const id = `${universe.id}-v-${pad(index + 1, 5)}`;
    const png = index % 2 === 0;
    const archiveTarget = archiveInfo.creations.length ? archiveInfo.creations[(index * 7) % archiveInfo.creations.length] : null;
    const thumbnail = options.includeMediaPayloads ? (png ? TINY_PNG_DATA_URL : TINY_JPEG_DATA_URL) : '';
    items.push({
      id,
      title:`${choose(random, ADJECTIVES)} Reference ${index + 1}`,
      sourceName:`reference-${pad(index + 1, 5)}.${png ? 'png' : 'jpg'}`,
      fileType:'image',
      mimeType:png ? 'image/png' : 'image/jpeg',
      thumbnailDataUrl:thumbnail,
      dataUrl:'',
      storage:'',
      folderFileName:'',
      dataStoreKey:`vision:${universe.id}:${id}:dataUrl`,
      thumbnailStoreKey:thumbnail ? `vision:${universe.id}:${id}:thumbnailDataUrl` : '',
      dataStored:'',
      thumbnailStored:thumbnail ? 'embedded-export' : '',
      fileSize:png ? 180000 : 240000,
      tags:{
        universes:index % 6 === 0 ? [universe.id] : [],
        entries:archiveTarget && index % 2 === 0 ? [{universeId:universe.id, entryId:archiveTarget.id}] : []
      },
      createdAt:isoAt(index, Math.max(1, config.visionItemsPerUniverse), Date.UTC(2023, 0, 1), 900)
    });
  }
  return items;
}

function sourceNodeKey(universeId, creationId){
  return creationId ? `C:${universeId}:${creationId}` : `U:${universeId}`;
}

function addBridges(dataset, archiveByUniverse, desiredCount){
  const universes = dataset.universes;
  if(universes.length < 2 || desiredCount <= 0) return [];
  const edges = [];
  const perSource = new Map();
  const seen = new Set();
  const creationLists = universes.map(universe => archiveByUniverse.get(universe.id).creations);
  const sourceCandidates = [];
  universes.forEach((universe, universeIndex) => {
    sourceCandidates.push({universeIndex, creationIndex:-1, node:universe, bridges:universe.bridges});
    creationLists[universeIndex].forEach((creation, creationIndex) => {
      sourceCandidates.push({universeIndex, creationIndex, node:creation, bridges:creation.bridges});
    });
  });

  let cursor = 0;
  const maxAttempts = Math.max(desiredCount * 20, 1000);
  while(edges.length < desiredCount && cursor < maxAttempts){
    const source = sourceCandidates[cursor % sourceCandidates.length];
    const targetUniverseIndex = (source.universeIndex + 1 + Math.floor(cursor / Math.max(1, sourceCandidates.length))) % universes.length;
    const targetUniverse = universes[targetUniverseIndex];
    const targetCreations = creationLists[targetUniverseIndex];
    const useUniverseTarget = cursor % 11 === 0 || !targetCreations.length;
    const targetCreation = useUniverseTarget ? null : targetCreations[(cursor * 13 + source.creationIndex + 1) % targetCreations.length];
    const sourceUniverse = universes[source.universeIndex];
    const sourceKey = sourceNodeKey(sourceUniverse.id, source.creationIndex >= 0 ? source.node.id : '');
    const targetKey = sourceNodeKey(targetUniverse.id, targetCreation?.id || '');
    const edgeKey = [sourceKey, targetKey].sort().join('||');
    const sourceCount = perSource.get(sourceKey) || 0;
    if(sourceUniverse.id !== targetUniverse.id && !seen.has(edgeKey) && sourceCount < 5000){
      seen.add(edgeKey);
      source.bridges.push({universeId:targetUniverse.id, creationId:targetCreation?.id || ''});
      perSource.set(sourceKey, sourceCount + 1);
      edges.push([sourceKey, targetKey]);
    }
    cursor += 1;
  }
  return edges;
}

function scenarioConfig(name, overrides = {}){
  const base = SCENARIOS[name];
  if(!base) throw new Error(`Unknown performance scenario: ${name}`);
  return {...base, ...overrides};
}

function generateDataset(name, options = {}){
  const config = scenarioConfig(name, options.overrides || {});
  const seed = options.seed === undefined ? config.seed : options.seed;
  const random = makeSeededRandom(seed);
  const includeMediaPayloads = !!options.includeMediaPayloads;
  const universes = [];
  const universeData = {};
  const archiveByUniverse = new Map();

  for(let index = 0; index < config.universes; index += 1){
    const universe = makeUniverseRecord(index, config.universes, random);
    universes.push(universe);
    const archiveInfo = makeArchive(universe, config, random);
    archiveByUniverse.set(universe.id, archiveInfo);
    universeData[universe.id] = {
      archive:archiveInfo.archive,
      connectionNotes:archiveInfo.connectionNotes,
      literature:makeLiterature(universe, archiveInfo, config, random),
      vision:makeVision(universe, archiveInfo, config, random, {includeMediaPayloads})
    };
  }

  const data = {
    format:APP_FORMAT,
    schemaVersion:SCHEMA_VERSION,
    appVersion:options.appVersion || DEFAULT_APP_VERSION,
    exportedAt:'2026-07-12T00:00:00.000Z',
    currentUniverseId:universes[0]?.id || null,
    universes,
    bridgeNotes:{},
    universeData,
    performanceFixture:{
      scenario:name,
      label:config.label,
      purpose:config.purpose,
      seed:Number(seed) >>> 0,
      includeMediaPayloads
    }
  };

  const bridgeEdges = addBridges(data, archiveByUniverse, config.bridgesAcrossApp);
  bridgeEdges.slice(0, Math.min(bridgeEdges.length, Math.ceil(config.bridgesAcrossApp / 20))).forEach((edge, index) => {
    data.bridgeNotes[[edge[0], edge[1]].sort().join('||')] = `Bridge note ${index + 1}: ${NOTE_TEXT[index % NOTE_TEXT.length]}`;
  });
  data.exportSummary = summarizeDataset(data);
  assertDatasetIntegrity(data);
  return data;
}

function summarizeDataset(data){
  const summary = {
    universes:0,
    archiveEntries:0,
    groups:0,
    literatureDocuments:0,
    literatureGroups:0,
    literatureDocumentsWithBody:0,
    visionItems:0,
    visionItemsWithImageData:0,
    connections:0,
    bridges:0
  };
  const connectionPairs = new Set();
  summary.universes = Array.isArray(data?.universes) ? data.universes.length : 0;
  (data?.universes || []).forEach(universe => {
    const details = data?.universeData?.[universe.id] || {};
    const archive = Array.isArray(details.archive) ? details.archive : [];
    const literature = Array.isArray(details.literature) ? details.literature : [];
    const vision = Array.isArray(details.vision) ? details.vision : [];
    archive.forEach(entry => {
      if(entry?.kind === 'group') summary.groups += 1;
      else summary.archiveEntries += 1;
      (entry?.connections || []).forEach(targetId => connectionPairs.add(`${universe.id}:${canonicalPair(entry.id, targetId)}`));
      summary.bridges += Array.isArray(entry?.bridges) ? entry.bridges.length : 0;
    });
    literature.forEach(doc => {
      if(doc?.kind === 'literatureGroup') summary.literatureGroups += 1;
      else {
        summary.literatureDocuments += 1;
        if(String(doc?.content || '').trim()) summary.literatureDocumentsWithBody += 1;
      }
    });
    summary.visionItems += vision.length;
    summary.visionItemsWithImageData += vision.filter(item => !!item?.dataUrl).length;
    summary.bridges += Array.isArray(universe?.bridges) ? universe.bridges.length : 0;
  });
  summary.connections = connectionPairs.size;
  return summary;
}

function datasetHash(data){
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function plannedSummary(name, overrides = {}){
  const config = scenarioConfig(name, overrides);
  const archiveGroups = Math.min(config.archiveGroupsPerUniverse, Math.max(0, config.archiveEntitiesPerUniverse - 1));
  const literatureGroups = Math.min(config.literatureGroupsPerUniverse, Math.max(0, config.literatureEntitiesPerUniverse - 1));
  return {
    scenario:name,
    label:config.label,
    universes:config.universes,
    archiveEntries:(config.archiveEntitiesPerUniverse - archiveGroups) * config.universes,
    groups:archiveGroups * config.universes,
    literatureDocuments:(config.literatureEntitiesPerUniverse - literatureGroups) * config.universes,
    literatureGroups:literatureGroups * config.universes,
    visionItems:config.visionItemsPerUniverse * config.universes,
    connections:config.connectionsPerUniverse * config.universes,
    bridges:config.universes < 2 ? 0 : config.bridgesAcrossApp
  };
}

function assertDatasetIntegrity(data){
  if(!data || data.format !== APP_FORMAT || !Array.isArray(data.universes) || !data.universeData){
    throw new Error('Generated performance dataset has an invalid top-level structure.');
  }
  const universeIds = new Set();
  const archiveMaps = new Map();
  for(const universe of data.universes){
    if(!universe?.id || universeIds.has(universe.id)) throw new Error('Generated dataset contains a duplicate or missing universe ID.');
    universeIds.add(universe.id);
    const details = data.universeData[universe.id];
    if(!details) throw new Error(`Generated dataset is missing data for ${universe.id}.`);
    const ids = new Set();
    for(const entry of details.archive || []){
      if(!entry?.id || ids.has(entry.id)) throw new Error(`Generated Archive contains a duplicate or missing ID in ${universe.id}.`);
      ids.add(entry.id);
    }
    archiveMaps.set(universe.id, new Map((details.archive || []).map(entry => [entry.id, entry])));
  }
  if(data.currentUniverseId && !universeIds.has(data.currentUniverseId)) throw new Error('Generated current universe is missing.');

  for(const universe of data.universes){
    const details = data.universeData[universe.id];
    const archiveMap = archiveMaps.get(universe.id);
    const membership = new Set();
    for(const entry of details.archive || []){
      if(entry.kind === 'group'){
        for(const memberId of entry.groupIds || []){
          if(!archiveMap.has(memberId) || archiveMap.get(memberId)?.kind === 'group' || membership.has(memberId)) throw new Error('Generated Archive group has an invalid member.');
          membership.add(memberId);
        }
      }
      for(const targetId of entry.connections || []){
        const target = archiveMap.get(targetId);
        if(!target || targetId === entry.id || !(target.connections || []).includes(entry.id)) throw new Error('Generated connection is missing or one-sided.');
      }
      for(const bridge of entry.bridges || []){
        if(!universeIds.has(bridge.universeId) || bridge.universeId === universe.id) throw new Error('Generated creation bridge has an invalid universe.');
        if(bridge.creationId && !archiveMaps.get(bridge.universeId)?.has(bridge.creationId)) throw new Error('Generated creation bridge has an invalid target.');
      }
    }
    const literatureIds = new Set((details.literature || []).map(doc => doc.id));
    const literatureMembership = new Set();
    for(const doc of details.literature || []){
      if(doc.kind === 'literatureGroup'){
        for(const memberId of doc.groupIds || []){
          if(!literatureIds.has(memberId) || literatureMembership.has(memberId)) throw new Error('Generated Literature group has an invalid member.');
          literatureMembership.add(memberId);
        }
      }
      for(const tag of doc.tags?.entries || []){
        if(!archiveMaps.get(tag.universeId)?.has(tag.entryId)) throw new Error('Generated Literature tag has an invalid target.');
      }
    }
    for(const item of details.vision || []){
      for(const tag of item.tags?.entries || []){
        if(!archiveMaps.get(tag.universeId)?.has(tag.entryId)) throw new Error('Generated Vision Board tag has an invalid target.');
      }
    }
    for(const bridge of universe.bridges || []){
      if(!universeIds.has(bridge.universeId) || bridge.universeId === universe.id) throw new Error('Generated universe bridge has an invalid target.');
      if(bridge.creationId && !archiveMaps.get(bridge.universeId)?.has(bridge.creationId)) throw new Error('Generated universe bridge creation is missing.');
    }
  }
  return true;
}

module.exports = {
  APP_FORMAT,
  SCHEMA_VERSION,
  DEFAULT_APP_VERSION,
  SCENARIOS,
  TINY_PNG_DATA_URL,
  TINY_JPEG_DATA_URL,
  makeSeededRandom,
  scenarioConfig,
  plannedSummary,
  generateDataset,
  summarizeDataset,
  datasetHash,
  assertDatasetIntegrity
};

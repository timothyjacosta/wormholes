'use strict';

const fs = require('fs');
const path = require('path');

const stylesheetPath = path.resolve(__dirname, '..', '..', 'styles', 'wormholes.css');
const stylesheet = fs.readFileSync(stylesheetPath, 'utf8');
const trackedAtRules = new Set(['media', 'supports', 'layer', 'container', 'document', 'scope']);

function skipComment(source, index){
  const end = source.indexOf('*/', index + 2);
  return end === -1 ? source.length : end + 2;
}

function scanPrelude(source, start, limit){
  let quote = null;
  let parenDepth = 0;
  let bracketDepth = 0;

  for(let index = start; index < limit; index += 1){
    const character = source[index];
    if(quote){
      if(character === '\\') index += 1;
      else if(character === quote) quote = null;
      continue;
    }
    if(source.startsWith('/*', index)){
      index = skipComment(source, index) - 1;
      continue;
    }
    if(character === '"' || character === "'"){
      quote = character;
      continue;
    }
    if(character === '(') parenDepth += 1;
    else if(character === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if(character === '[') bracketDepth += 1;
    else if(character === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if(parenDepth === 0 && bracketDepth === 0 && (character === '{' || character === ';')){
      return {index, terminator:character};
    }
  }
  return {index:limit, terminator:null};
}

function findClosingBrace(source, openingIndex, limit){
  let depth = 1;
  let quote = null;
  for(let index = openingIndex + 1; index < limit; index += 1){
    const character = source[index];
    if(quote){
      if(character === '\\') index += 1;
      else if(character === quote) quote = null;
      continue;
    }
    if(source.startsWith('/*', index)){
      index = skipComment(source, index) - 1;
      continue;
    }
    if(character === '"' || character === "'"){
      quote = character;
      continue;
    }
    if(character === '{') depth += 1;
    else if(character === '}'){
      depth -= 1;
      if(depth === 0) return index;
    }
  }
  throw new Error(`Unbalanced CSS block beginning at character ${openingIndex}.`);
}

function countRules(source){
  const counts = new Map();
  let totalRules = 0;

  function walk(start, limit, context){
    let cursor = start;
    while(cursor < limit){
      while(cursor < limit && /\s/.test(source[cursor])) cursor += 1;
      if(cursor >= limit) break;
      if(source.startsWith('/*', cursor)){
        cursor = skipComment(source, cursor);
        continue;
      }
      if(source[cursor] === '}'){
        cursor += 1;
        continue;
      }

      const preludeResult = scanPrelude(source, cursor, limit);
      if(!preludeResult.terminator) break;
      const prelude = source.slice(cursor, preludeResult.index).trim();
      if(preludeResult.terminator === ';'){
        cursor = preludeResult.index + 1;
        continue;
      }

      const blockEnd = findClosingBrace(source, preludeResult.index, limit);
      if(prelude.startsWith('@')){
        const match = prelude.match(/^@([\w-]+)\s*(.*)$/s);
        const name = match ? match[1].toLowerCase() : '';
        const parameters = match ? match[2].trim() : '';
        if(trackedAtRules.has(name)){
          walk(preludeResult.index + 1, blockEnd, context.concat(`${name}:${parameters}`));
        }
      } else if(prelude){
        const key = `${context.join(' > ')}\n${prelude}`;
        counts.set(key, (counts.get(key) || 0) + 1);
        totalRules += 1;
      }
      cursor = blockEnd + 1;
    }
  }

  walk(0, source.length, []);
  return {counts, totalRules};
}

const {counts, totalRules} = countRules(stylesheet);
const repeatedCounts = [...counts.values()].filter(count => count > 1);
const repeatedGroups = repeatedCounts.length;
const repeatedBlocks = repeatedCounts.reduce((sum, count) => sum + count, 0);
const REPEATED_GROUP_BUDGET = 46;
const REPEATED_BLOCK_BUDGET = 97;

if(repeatedGroups > REPEATED_GROUP_BUDGET || repeatedBlocks > REPEATED_BLOCK_BUDGET){
  throw new Error(
    `CSS selector duplication budget exceeded: ${repeatedGroups} repeated selector/context groups across ` +
    `${repeatedBlocks} rule blocks (budgets: ${REPEATED_GROUP_BUDGET} groups, ${REPEATED_BLOCK_BUDGET} blocks). ` +
    'Consolidate new same-context repetition or deliberately review the budget.'
  );
}

console.log(
  `CSS selector duplication budget passed (${totalRules} rules; ${repeatedGroups}/${REPEATED_GROUP_BUDGET} groups; ` +
  `${repeatedBlocks}/${REPEATED_BLOCK_BUDGET} repeated blocks).`
);

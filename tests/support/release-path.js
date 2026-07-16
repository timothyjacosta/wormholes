'use strict';
const fs = require('fs');
const path = require('path');

function latestDirectHtmlName(root){
  const name = fs.readdirSync(root)
    .filter(item => /^Wormholes_Beta_\d+\.html$/.test(item))
    .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}))
    .pop();
  if(!name) throw new Error(`No Wormholes_Beta_###.html release entry found in ${root}`);
  return name;
}

function latestDirectHtmlPath(root){
  return path.join(root, latestDirectHtmlName(root));
}

module.exports = {latestDirectHtmlName, latestDirectHtmlPath};

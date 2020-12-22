'use strict';

const glob = require('glob');
const fsp = require('fs').promises;

const globPromise = pattern =>
  new Promise((resolve, reject) => {
    glob(pattern, (err, filenames) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(filenames);
    });
  });

globPromise('./packages/*/*.gfm.manifest.json').then(manifestFilenames =>
  Promise.all(
    manifestFilenames.map(manifestFilename =>
      fsp
        .readFile(manifestFilename, 'utf8')
        .then(content => JSON.parse(content))
    )
  ).then(manifests => {
    const tagCounts = manifests.reduce((map, { tags }) => {
      tags.forEach(tag => {
        const currentCount = map.get(tag) || 0;
        map.set(tag, currentCount + 1);
      });
      return map;
    }, new Map());
    console.log(Array.from(tagCounts).sort((a, b) => a[1] - b[1]));
  })
);

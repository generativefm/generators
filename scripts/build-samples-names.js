'use strict';

const glob = require('glob');
const pfs = require('fs').promises;
const sampleNameRegex = /samples(?:(?:\.([\w-]+))|(?:\['([\w-]+)'\]))/g;

const findSampleNames = filename =>
  pfs.readFile(filename, 'utf8').then(content => {
    const sampleNames = [];
    let match = sampleNameRegex.exec(content);
    while (match) {
      //eslint-disable-next-line no-unused-vars
      const [group1, group2, group3] = match;
      if (group2) {
        sampleNames.push(group2);
      } else {
        sampleNames.push(group3);
      }
      match = sampleNameRegex.exec(content);
    }
    return Array.from(new Set(sampleNames));
  });

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

Promise.all([
  globPromise('./packages/*/src/piece.js'),
  globPromise('./packages/*/*.gfm.manifest.json'),
]).then(([pieceFilenames, manifestFilenames]) =>
  Promise.all(
    pieceFilenames.map((pieceFilename, i) => {
      const manifestFilename = manifestFilenames[i];
      return Promise.all([
        findSampleNames(pieceFilename),
        pfs
          .readFile(manifestFilename, 'utf8')
          .then(content => JSON.parse(content)),
      ]).then(([sampleNames, manifest]) =>
        pfs.writeFile(
          manifestFilename,
          JSON.stringify(Object.assign(manifest, { sampleNames }), null, 2)
        )
      );
    })
  )
);

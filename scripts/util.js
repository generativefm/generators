'use strict';

const fs = require('fs').promises;
const glob = require('glob');

const filenames = glob.sync('./packages/*/package.json');

const JSON_SPACING = 2;

Promise.all(
  filenames.map(filename =>
    fs.readFile(filename, 'utf8').then(data => {
      const parsed = JSON.parse(data);
      parsed.unpkg = 'dist/umd.min.js';
      return fs.writeFile(filename, JSON.stringify(parsed, null, JSON_SPACING));
    })
  )
).then(() => {
  console.log('done');
});

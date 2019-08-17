'use strict';

const fs = require('fs').promises;
const glob = require('glob');

const filenames = glob.sync('./packages/*/*.gfm.manifest.json');

Promise.all(
  filenames.map(filename =>
    fs
      .readFile(filename, 'utf8')
      .then(data =>
        fs.writeFile(
          filename,
          JSON.stringify(
            Object.assign({ visualizationType: 'squareCut' }, JSON.parse(data)),
            null,
            2
          )
        )
      )
  )
).then(() => {
  console.log('done');
});

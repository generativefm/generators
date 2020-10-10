'use strict';

const { spawn } = require('child_process');
const fs = require('fs').promises;
const glob = require('glob');

const filenames = glob.sync('./packages/piece-*');
const packageNames = filenames.map(
  filename => `@generative-music/${filename.replace('./packages/', '')}`
);

const collectionPackage = require('../packages/pieces-alex-bainter/package.json');

const missingDeps = packageNames.filter(
  packageName => !collectionPackage.dependencies[packageName]
);

if (missingDeps.length > 0) {
  spawn(
    'npm',
    ['i', '--prefix', './packages/pieces-alex-bainter'].concat(
      missingDeps.map(packageName => packageName)
    ),
    { stdio: 'inherit' }
  );
}

const esmFileContent = packageNames
  .map((packageName, i) => `import piece${i + 1} from '${packageName}';`)
  .concat([
    '',
    `export default [\n${packageNames
      .map((_, i) => `  piece${i + 1}`)
      .join(',\n')}\n];`,
    '',
    `export const byId = {\n${packageNames
      .map(
        (packageName, i) =>
          `  ['${packageName.replace(
            '@generative-music/piece-',
            ''
          )}']: piece${i + 1}`
      )
      .join(',\n')}\n};`,
  ])
  .join('\n');

const cjsFileContent = [
  "'use strict;'",
  '',
  `module.exports = [\n${packageNames
    .map(packageName => `  require('${packageName}')`)
    .join(',\n')}\n];`,
].join('\n');

fs.mkdir('./packages/pieces-alex-bainter/dist/', { recursive: true })
  .then(() =>
    fs.writeFile('./packages/pieces-alex-bainter/dist/esm.js', esmFileContent)
  )
  .then(() => {
    console.log('Generated pieces-alex-bainter/esm.js');
  })
  .then(() =>
    fs.writeFile('./packages/pieces-alex-bainter/dist/cjs.js', cjsFileContent)
  )
  .then(() => {
    console.log('Generated pieces-alex-bainter/cjs.js');
  });

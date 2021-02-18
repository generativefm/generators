'use strict';

const fsp = require('fs').promises;
const glob = require('glob');

const filenames = glob.sync('./packages/piece-*/src/piece.js');

const findFirstNonImportIndex = lines => {
  for (let index = lines.length - 1; index > 0; index -= 1) {
    if (lines[index - 1].startsWith('import')) {
      return index;
    }
  }
  return -1;
};

Promise.all(
  filenames
    .filter(filename => !filename.includes('oxalis'))
    .map(filename =>
      fsp.readFile(filename, 'utf8').then(data => {
        const pieceId = filename
          .replace('./packages/piece-', '')
          .replace('/src/piece.js', '');
        const gainImport = `import gainAdjustments from '../../../normalize/gain.json';`;
        const gainAdjustmentDeclaration = `const GAIN_ADJUSTMENT = gainAdjustments['${pieceId}'];`;
        const exportWithGain = `export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });`;
        const lines = data.split('\n');
        const importEndIndex = findFirstNonImportIndex(lines);
        const exportLineIndex = lines.findIndex(line =>
          line.startsWith('export default wrapActivate(activate)')
        );
        if (importEndIndex === -1) {
          console.error('couldnt find last import line in ', filename);
          process.exit(1);
        }
        if (exportLineIndex === -1) {
          console.error('couldnt find export line in ', filename);
          process.exit(1);
        }

        const newLines = lines
          .slice(0, importEndIndex)
          .concat([gainImport])
          .concat(lines.slice(importEndIndex, exportLineIndex))
          .concat([gainAdjustmentDeclaration, '\r', exportWithGain, '\r']);

        const newFileContent = newLines.join('\n');
      })
    )
).then(() => {
  console.log('done');
});

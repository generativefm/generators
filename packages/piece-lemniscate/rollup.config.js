'use strict';

const babel = require('rollup-plugin-babel');
const { dependencies } = require('./package.json');

module.exports = {
  input: './src/piece',
  output: {
    file: 'dist/piece.js',
    format: 'esm',
  },
  external: Reflect.ownKeys(dependencies),
  plugins: [babel({ exclude: 'node_modules/**' })],
};

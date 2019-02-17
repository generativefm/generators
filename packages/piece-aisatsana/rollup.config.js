'use strict';

const json = require('rollup-plugin-json');
const babel = require('rollup-plugin-babel');

module.exports = {
  input: './src/piece',
  output: {
    file: 'dist/piece.js',
    format: 'esm',
  },
  external: [
    'markov-chains',
    '@generative-music/samples.generative.fm',
    'tone',
  ],
  plugins: [json(), babel({ exclude: 'node_modules/**' })],
};

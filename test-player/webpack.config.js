'use strict';

const { argv } = require('process');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');

if (argv.length < 4 || argv[2] !== '--pieceId') {
  throw new Error('Please provide a piece id with --pieceId');
}

const pieceId = argv[3];

const piecePath = path.resolve(
  __dirname,
  `../packages/piece-${pieceId}/src/piece.js`
);

console.log(`Testing ${piecePath}`);

const config = {
  resolve: {
    alias: {
      piece$: piecePath,
      tone$: path.resolve(__dirname, `./node_modules/tone`),
      '@generative-music/utilities$': path.resolve(
        __dirname,
        '../packages/utilities/src/index.js'
      ),
    },
  },
  module: {
    rules: [
      {
        test: path.resolve(
          './node_modules/@generative-music/web-provider/worker/save-worker.esm.js'
        ),
        use: 'worker-loader',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new EnvironmentPlugin({ SAMPLE_FILE_HOST: '//localhost:6969' }),
  ],
};

module.exports = config;

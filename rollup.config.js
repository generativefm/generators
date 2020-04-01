'use strict';

const glob = require('glob');
const babel = require('rollup-plugin-babel');
const json = require('rollup-plugin-json');

const globPromise = (pattern, options) =>
  new Promise((resolve, reject) =>
    glob(pattern, options, (err, result) => {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    })
  );

const makePieceConfig = (
  dirname,
  dependencies = {},
  peerDependencies = {}
) => ({
  input: `${dirname}/src/piece.js`,
  output: [
    {
      file: `${dirname}/dist/esm.js`,
      format: 'esm',
    },
    {
      file: `${dirname}/dist/cjs.js`,
      format: 'cjs',
    },
  ],
  external: ['rxjs/operators']
    .concat(Reflect.ownKeys(dependencies))
    .concat(Reflect.ownKeys(peerDependencies)),
  plugins: [json(), babel({ exclude: 'node_modules/**' })],
});

const pieceConfigsPromise = globPromise('./packages/piece-*').then(dirnames =>
  dirnames.reduce((buildConfigs, dirname) => {
    const {
      dependencies,
      peerDependencies,
      //eslint-disable-next-line global-require
    } = require(`${dirname}/package.json`);
    return buildConfigs.concat(
      makePieceConfig(dirname, dependencies, peerDependencies)
    );
  }, [])
);

const utilitiesConfig = {
  input: 'packages/utilities/src/index.js',
  output: [
    {
      format: 'esm',
      file: 'packages/utilities/dist/esm.js',
    },
    {
      format: 'cjs',
      file: 'packages/utilities/dist/cjs.js',
    },
  ],
  external: ['tone'],
};

const makeOxalisConfig = {
  input: 'packages/make-piece-oxalis/src/make-oxalis.js',
  output: [
    {
      format: 'esm',
      file: 'packages/utilities/dist/esm.js',
    },
    {
      format: 'cjs',
      file: 'packages/utilities/dist/cjs.js',
    },
  ],
  external: ['tone', '@generative-music/utilities'],
};

module.exports = pieceConfigsPromise.then(pieceConfigs =>
  pieceConfigs.concat([utilitiesConfig, makeOxalisConfig])
);

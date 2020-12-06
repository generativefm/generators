'use strict';

const glob = require('glob');
const babel = require('rollup-plugin-babel');
const json = require('rollup-plugin-json');
const { terser } = require('rollup-plugin-terser');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

const globPromise = (pattern, options) =>
  new Promise((resolve, reject) =>
    glob(pattern, options, (err, result) => {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    })
  );

const createPiecePackageConfig = (
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

const convertKebabToCamel = kebabCaseString =>
  kebabCaseString
    .split('-')
    .map((word, i) =>
      i === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`
    )
    .join('');

const createPieceScriptConfig = dirname => ({
  input: `${dirname}/src/piece.js`,
  output: {
    file: `${dirname}/dist/iife.min.js`,
    format: 'iife',
    name: convertKebabToCamel(dirname.replace('./packages/', '')),
  },
  external: ['tone'],
  plugins: [nodeResolve(), terser()],
});

const pieceConfigsPromise = globPromise('./packages/piece-*').then(dirnames =>
  dirnames.reduce((buildConfigs, dirname) => {
    console.log(createPieceScriptConfig(dirname));
    process.exit(0);
    const {
      dependencies,
      peerDependencies,
      //eslint-disable-next-line global-require
    } = require(`${dirname}/package.json`);
    return buildConfigs.concat([
      createPiecePackageConfig(dirname, dependencies, peerDependencies),
      //createPieceScriptConfig(dirname),
    ]);
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
      file: 'packages/make-piece-oxalis/dist/esm.js',
    },
    {
      format: 'cjs',
      file: 'packages/make-piece-oxalis/dist/cjs.js',
    },
  ],
  external: ['tone', '@generative-music/utilities'],
};

module.exports = pieceConfigsPromise.then(pieceConfigs =>
  pieceConfigs.concat([utilitiesConfig, makeOxalisConfig])
);

'use strict';

const glob = require('glob');
const { babel } = require('@rollup/plugin-babel');
const json = require('@rollup/plugin-json');
const { terser } = require('rollup-plugin-terser');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonJs = require('@rollup/plugin-commonjs');

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
      exports: 'auto',
    },
  ],
  external: [/rxjs/, /@babel\/runtime/]
    .concat(Reflect.ownKeys(dependencies))
    .concat(Reflect.ownKeys(peerDependencies)),
  plugins: [
    json(),
    babel({ exclude: 'node_modules/**', babelHelpers: 'runtime' }),
  ],
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
    globals: {
      tone: 'Tone',
    },
  },
  external: ['tone'],
  plugins: [
    babel({ exclude: 'node_modules/**', babelHelpers: 'bundled' }),
    nodeResolve(),
    commonJs(),
    json(),
    terser(),
  ],
});

const pieceConfigsPromise = globPromise('./packages/piece-*').then(dirnames =>
  dirnames.reduce((buildConfigs, dirname) => {
    const {
      dependencies,
      peerDependencies,
      //eslint-disable-next-line global-require
    } = require(`${dirname}/package.json`);
    return buildConfigs.concat([
      createPiecePackageConfig(dirname, dependencies, peerDependencies),
      createPieceScriptConfig(dirname),
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
      exports: 'auto',
    },
  ],
  external: ['tone', /@babel\/runtime/],
  plugins: [babel({ exclude: 'node_modules/**', babelHelpers: 'runtime' })],
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
      exports: 'auto',
    },
  ],
  external: ['tone', '@generative-music/utilities', /@babel\/runtime/],
  plugins: [babel({ exclude: 'node_modules/**', babelHelpers: 'runtime' })],
};

module.exports = pieceConfigsPromise.then(pieceConfigs =>
  pieceConfigs.concat([utilitiesConfig, makeOxalisConfig])
);

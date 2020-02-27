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

const makeConfig = (
  dirname,
  dependencies = {},
  peerDependencies = {},
  format
) => ({
  input: `${dirname}/src/piece.js`,
  output: {
    file: `${dirname}/dist/${format}.js`,
    format,
  },
  external: ['rxjs/operators']
    .concat(Reflect.ownKeys(dependencies))
    .concat(Reflect.ownKeys(peerDependencies)),
  plugins: [json(), babel({ exclude: 'node_modules/**' })],
});

const configsPromise = globPromise('./packages/piece-*').then(dirnames =>
  dirnames.reduce((buildConfigs, dirname) => {
    const {
      dependencies,
      peerDependencies,
      //eslint-disable-next-line global-require
    } = require(`${dirname}/package.json`);
    return buildConfigs.concat(
      ['esm', 'cjs'].map(format =>
        makeConfig(dirname, dependencies, peerDependencies, format)
      )
    );
  }, [])
);

module.exports = configsPromise;

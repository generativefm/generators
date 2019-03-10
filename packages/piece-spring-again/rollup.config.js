'use strict';

const babel = require('rollup-plugin-babel');
const { dependencies } = require('./package.json');

const makeConfig = format => ({
  input: './src/piece',
  output: {
    file: `dist/${format}.js`,
    format,
  },
  external: Reflect.ownKeys(dependencies),
  plugins: [babel({ exclude: 'node_modules/**' })],
});

module.exports = ['esm', 'cjs'].map(format => makeConfig(format));

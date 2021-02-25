# @generative-music/pieces-alex-bainter

A collection of generative music systems by Alex Bainter.

## Installation

You can install this package with [npm], along with [Tone.js] if you don't already have it installed:

```bash
npm install @generative-music/pieces-alex-bainter tone
```

## Usage

The default export of this package is just an array containing all of the `@generative-music/piece-*` systems.

```javascript
// choose the import style which matches your environment
import pieces from '@generative-music/pieces-alex-bainter'; //ESM
const pieces = require('@generative-music/pieces-alex-bainter'); //CJS

const activate = pieces[12];

activate(activationOptions).then(([deactivate, schedule]) => {
  //...
});
```

A `byId` export is also available, which is an object containing all of the individual `@generative-music/piece-*` systems by their IDs:

```javascript
// choose the import style which matches your environment
import { byId } from '@generative-music/pieces-alex-bainter'; // an actual named export
const { byId } = require('@generative-music/pieces-alex-bainter'); // just an extra property on the exported 'pieces' array

const activate = byId.zed;

activate(activationOptions).then(([deactivate, schedule]) => {
  //...
});
```

You can find a system's ID by loooking at the `id` property of its `*.gfm.manifest.json` file. For example, the `*.gfm.manifest.json` file for "Zed" is [`packages/piece-zed/piece.gfm.manifest.json`]('../piece-zed/piece.gfm.manifest.json'), where the `id` is specified as `"zed"`.

For instructions and examples related to managing and controlling the systems, see [the top-level README](../../README.md#Usage).

[npm]: https://www.npmjs.com/
[tone.js]: https://tonejs.github.io/

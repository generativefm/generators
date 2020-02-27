# pieces-alex-bainter

A collection of generative music pieces for [Generative.fm](https://generative.fm).

## Installation

Each piece is available via npm under the `@generative-music` scope.
For example, the piece "Observable Streams" can be installed like so:

```bash
npm i @generative-music/piece-observable-streams
```

## Usage

The default export of every piece is a function which takes an object parameter and returns a promise which resolves with a cleanup function once the piece is ready.

The object parameter passed to the exported function of a piece should have three properties:

- `audioContext`: An instantiated implementation of the Web Audio API [`AudioContext`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) interface.
- `destination`: An [`AudioNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode) to which the piece's own nodes will be connected.
- `samples`: An object which adheres to the schema defined in [@generative-music/sample-index-schema](https://github.com/generative-music/sample-index-schema) and contains the samples necessary for the piece.
  These pieces all use samples from [@generative-music/samples-alex-bainter](https://github.com/generative-music/samples-alex-bainter).

Currently, all pieces use [Tone.js](https://tonejs.github.io/) which is required to control a piece.

```JavaScript
import Tone from 'tone';
import makePiece from '@generative-music/piece-observable-streams';
import getSamplesByFormat from '@generative-music/samples-alex-bainter';

const { wav } = getSamplesByFormat();

makePiece({
  audioContext: Tone.context,
  destination: Tone.Master,
  samples: wav
}).then(cleanUp => {
  // Starting the piece
  // Make sure you follow the Chrome Autoplay policy: https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio
  Tone.Transport.start();

  // Stopping the piece
  Tone.Transport.stop(); // stop Transport events
  Tone.Transport.cancel(); // remove all Transport events
  cleanUp(); // dispose of audio nodes created by the piece
})
```

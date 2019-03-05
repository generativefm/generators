# pieces-alex-bainter

A collection of generative music pieces for [generative.fm](https://generative.fm).

## Installation

Each piece is available via npm under the `@generative-music` scope.
For example, the piece "Observable Streams" can be installed like so:

```bash
npm i @generative-music/piece-observable-streams
```

## Usage

> **IMPORTANT:** The pieces use audio files hosted on [samples.generative.fm](https://samples.generative.fm), which does not support requests from unrecognized origins.

> Currently, all pieces use ESM [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)/[`export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export) syntax. Other module formats like CommonJS may be supported in the future

The default export of every piece is a function which takes an object parameter and returns a promise which resolves with a cleanup function once the piece is ready.

The object parameter passed to the exported function of a piece should have three properties:

- `audioContext`: An instantiated implementation of the Web Audio API [`AudioContext`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) interface.
- `destination`: An [`AudioNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode) to which the piece's own nodes will be connected.
- `preferredFormat`: A string containing the audio format to use for any audio files. Currently accepted values are `ogg` and `mp3`.

Currently, all pieces use [Tone.js](https://tonejs.github.io/) which is required to control a piece.

```JavaScript
import Tone from 'tone';
import makePiece from '@generative-music/piece-observable-streams';

// Detect ogg support, otherwise use mp3
const preferredFormat = document.createElement('audio').canPlayType('audio/ogg') !== '' ? 'ogg' : 'mp3';

makePiece({ audioContext: Tone.context, destination: Tone.Master, preferredFormat }).then(cleanUp => {
  // Starting the piece
  // Make sure you follow the Chrome Autoplay policy: https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio
  Tone.Transport.start();

  // Stopping the piece
  Tone.Transport.stop(); // stop Transport events
  Tone.Transport.cancel(); // remove all Transport events
  cleanUp(); // dispose of audio nodes created by the piece
})
```

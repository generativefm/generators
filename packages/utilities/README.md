# @generative-music/utilities

A collection of common utilities for Web Audio API generative music systems.

## Usage

This package exports the following utilities:

### `getBuffer()`

Create a [Tone.js `Buffer`](https://tonejs.github.io/docs/r13/Buffer) object for a URL or an `AudioBuffer`.

#### Syntax

```javascript
getBuffer(url).then(toneBuffer => {
  // do something with the Tone.js Buffer
});
```

##### Parameters

- **url**: Either a `string` containing a URL to an audio file, or an `AudioBuffer`.

##### Return value

A `Promise` that resolves to a Tone.js `Buffer` for the specified audio.

### `getBuffers()`

Create a [Tone.js `Buffers`](https://tonejs.github.io/docs/r13/Buffers) object for a group of URLs or `AudioBuffer` objects.

#### Syntax

```javascript
getBuffers(urlMap).then(toneBuffers => {
  // do something with the Tone.js Buffers
});
```

##### Parameters

- **urlMap**: Either an array of `string`s containing URLs to audio files, an array of `AudioBuffer` objects, or an object with property values containing either `string`s or `AudioBuffer` objects.

##### Return value

A `Promise` that resolves to a Tone.js `Buffers` object for the specified audio.

### `getSampler()`

Create a [Tone.js `Sampler`](https://tonejs.github.io/docs/r13/Sampler).

#### Syntax

```javascript
getSampler(urlMap).then(sampler => {
  // do something with the Tone.js Sampler
});
```

##### Parameters

- **urlMap** - An object that maps pitches to either a `string` containing a URL or an `AudioBuffer`. Pitches can be notated as Midi or in scientific pitch notation.

##### Return value

A `Promise` that resolves to a Tone.js `Sampler` for the specified audio.

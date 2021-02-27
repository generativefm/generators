# pieces-alex-bainter

A collection of generative music systems for [Generative.fm](https://generative.fm).

The documentation here is incomplete but hopefully it can help you get started. Please see [Generative.fm Open-source Objectives](https://gist.github.com/metalex9/11923b7faa710215dc7ab39a0e056a65).

## Installation

The generative systems are available as [npm] packages. You can either install every system in one package or as separate packages for each system.

### Installing every system in one package

See [@generative-music/pieces-alex-bainter](packages/pieces-alex-bainter/README.md#Installation).

### Installing systems individually

Each piece is available on [npm] as package in the `@generative-music` scope. For example, to install the system for "Zed", you would do:

```bash
npm install @generative-music/piece-zed
```

In general, a system's package name is the same as its title, written in lower-kebab-case and prefixed with `@generative-music/piece-`. Slashes (/) in titles are replaced with dashes (-). You can confirm a system's package name by looking at the `name` property of its `package.json` file. For example, the `package.json` file for "Zed" is located at [packages/piece-zed/package.json](packages/piece-zed/package.json), where the `name` is specified as `"@generative-music/piece-zed"`.

You will also need to install [Tone.js] if you haven't already (`npm install tone`).

## Usage

### As fast as possible

1. You need to have the necessary audio sample files hosted somewhere accessible to the systems. These samples can be found in the [@generative-music/samples-alex-bainter](https://github.com/generative-music/samples-alex-bainter) repository. For local development, follow the instructions for [building](https://github.com/generative-music/samples-alex-bainter#building) and [serving](https://github.com/generative-music/samples-alex-bainter#serving-locally-with-docker) the files.

2. Install necessary dependencies from [npm]:

```bash
npm install @generative-music/web-library @generative-music/web-provider @generative-music/samples-alex-bainter
```

3. Run the system:

```javascript
import activate from '@generative-music/piece-zed';
import createLibrary from '@generative-music/web-library';
import createProvider from '@generative-music/web-provider';
import getSampleIndex from '@generative-music/samples-alex-bainter';
import { Transport, Destination, context } from 'tone';

const provider = createProvider();

const sampleIndex = getSampleIndex({
  format: 'wav', // also accepts 'mp3' and 'ogg'
  host: 'http://localhost:6969', // host where sample files can be fetched from
});

const sampleLibrary = createLibrary({
  sampleIndex,
  provider,
});


// activate the system (load sample files and allocate memory)
activate({
  context,
  sampleLibrary
  destination: Destination, // connect the output of the system to Tone's Destination node
}).then(([deactivate, schedule]) => {
  const end = schedule(); // schedule a performance along Tone's Transport
  Transport.start(); // begin playback

  // stopping the system
  Transport.stop(); // stop Tone's Transport
  Transport.cancel(); // clear Tone's Transport
  end(); // clear the performance

  // releasing resources
  deactivate();
});
```

## 🍝 Regarding code quality (or lack thereof)

Most of the systems within this repository were written during a period where I'd set an aggressive pace for myself to create new systems regularly and experiment. As a result, code quality suffered. Unfortunately, this means the code may be hard to understand, and I don't consider it to be a good example of how I typically build software. Someday, I'd love to improve these systems so they're easier for you to read.

You've been warned!

[npm]: https://www.npmjs.com/
[tone.js]: https://tonejs.github.io/

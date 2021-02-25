import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  createPrerenderableBuffers,
  wrapActivate,
  getRandomElement,
} from '@generative-music/utilities';
import { sampleNames } from '../ritual.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const createPercussionSampler = async (prerenderOptions = {}) => {
  const buffers = await createPrerenderableBuffers(prerenderOptions);
  const {
    samples,
    sourceInstrumentName,
    renderedInstrumentName,
  } = prerenderOptions;
  const instrumentSamples =
    samples[renderedInstrumentName] || samples[sourceInstrumentName];
  const activeSources = [];
  const gain = new Tone.Gain();

  const triggerAttack = time => {
    const buffer = buffers.get(
      Math.floor(window.generativeMusic.rng() * instrumentSamples.length)
    );
    const source = new Tone.BufferSource(buffer)
      .set({
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(gain);
    source.start(time);
  };

  const connect = destination => {
    gain.connect(destination);
  };

  const releaseAll = time => {
    activeSources.forEach(source => {
      source.stop(time);
    });
  };

  const dispose = () => {
    [buffers, gain, ...activeSources].forEach(node => {
      node.dispose();
    });
  };

  return {
    triggerAttack,
    connect,
    releaseAll,
    dispose,
  };
};

const violinPhrases = [['G#4', 'F4', 'F#4', 'C#4'], ['A#4', 'F#4', 'G#4']];

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const didgeridooSamples =
    samples['ritual__vcsl-didgeridoo-sus'] || samples['vcsl-didgeridoo-sus'];

  const dideridooBuffers = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vcsl-didgeridoo-sus',
    renderedInstrumentName: 'ritual__vcsl-didgeridoo-sus',
    getDestination: () => new Tone.Reverb(30).toDestination().generate(),
    onProgress: val => onProgress(val / 8),
  });

  const violins = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    notes: ['C#4', 'G#4'],
    sourceInstrumentName: 'vsco2-violins-susvib',
    renderedInstrumentName: 'ritual__vsco2-violins-susvib',
    getDestination: () => new Tone.Reverb(30).toDestination().generate(),
    onProgress: val => onProgress((1 + val) / 8),
    pitchShift: -24,
  });

  const bassdrum = await createPercussionSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vcsl-bassdrum-hit-ff',
    renderedInstrumentName: 'ritual__vcsl-bassdrum-hit-ff',
    additionalRenderLength: 1,
    getDestination: () =>
      new Tone.Reverb(15)
        .set({ wet: 0.5 })
        .toDestination()
        .generate(),
    onProgress: val => onProgress((2 + val) / 8),
  });

  const darbukas = [];
  for (let id = 1; id <= 5; id += 1) {
    //eslint-disable-next-line no-await-in-loop
    const darbuka = await createPercussionSampler({
      samples,
      sampleLibrary,
      sourceInstrumentName: `vcsl-darbuka-${id}-f`,
      renderedInstrumentName: `ritual__vcsl-darbuka-${id}-f`,
      additionalRenderLength: 1,
      getDestination: () =>
        new Tone.Reverb(15)
          .set({ wet: 0.5 })
          .toDestination()
          .generate(),
      onProgress: val => onProgress((id + 2 + val) / 8),
    });
    darbukas.push(darbuka);
  }

  const activeSources = [];

  const drone = ({ destination }) => {
    const buffer = dideridooBuffers.get(
      Math.floor(window.generativeMusic.rng() * didgeridooSamples.length)
    );
    const playbackRate = window.generativeMusic.rng() < 0.9 ? 1 : 0.5;
    const source = new Tone.BufferSource(buffer)
      .set({
        fadeIn: 5,
        playbackRate,
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(destination);
    activeSources.push(source);
    source.start('+1');
    Tone.Transport.scheduleOnce(() => {
      drone({ destination });
    }, `+${1 + buffer.duration / 3 / playbackRate}`);
  };

  const playViolinPhrase = () => {
    const phrase = getRandomElement(violinPhrases);

    const totalDelay = phrase.reduce((delay, note) => {
      violins.triggerAttack(note, `+${delay}`);
      return delay + window.generativeMusic.rng() * 20 + 20;
    }, window.generativeMusic.rng() * 5);

    Tone.Transport.scheduleOnce(() => {
      playViolinPhrase();
    }, `+${totalDelay + 10}`);
  };

  const percussionGain = new Tone.Gain();
  bassdrum.connect(percussionGain);

  darbukas.forEach(darbuka => {
    darbuka.connect(percussionGain);
  });

  const percussion = (beatTime, up) => {
    bassdrum.triggerAttack('+1');
    bassdrum.triggerAttack(`+${1 + beatTime * 2}`);

    for (let i = 0; i < 32; i += 1) {
      if (i === 0 || i === 2 || window.generativeMusic.rng() < 0.3) {
        darbukas[Math.floor(window.generativeMusic.rng() * darbukas.length)].triggerAttack(
          `+${1 + beatTime * i}`
        );
      }
    }

    Tone.Transport.scheduleOnce(() => {
      if (up && beatTime > 0.6) {
        percussion(beatTime * (1 - window.generativeMusic.rng() * 0.02), false);
      } else if (!up && beatTime < 0.2) {
        percussion(beatTime * (1 + window.generativeMusic.rng() * 0.02), true);
      } else if (up) {
        percussion(beatTime * (1 + window.generativeMusic.rng() * 0.02), true);
      } else {
        percussion(beatTime * (1 - window.generativeMusic.rng() * 0.02), false);
      }
    }, `+${32 * beatTime}`);
  };

  const schedule = ({ destination }) => {
    percussionGain.connect(destination);
    violins.connect(destination);
    const percussionGainLfo = new Tone.LFO(
      window.generativeMusic.rng() / 1000 + 0.001,
      0,
      0.9
    ).set({ phase: 90 });
    percussionGainLfo.connect(percussionGain.gain);
    percussionGainLfo.start();

    drone({ destination });
    playViolinPhrase();
    percussion(window.generativeMusic.rng() * 0.4 + 0.2, true);

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      violins.releaseAll(0);
      bassdrum.releaseAll(0);
      darbukas.forEach(darbuka => {
        darbuka.releaseAll(0);
      });

      percussionGainLfo.dispose();
    };
  };

  const deactivate = () => {
    [violins, bassdrum, percussionGain, dideridooBuffers, ...darbukas].forEach(
      node => {
        node.dispose();
      }
    );
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['ritual'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

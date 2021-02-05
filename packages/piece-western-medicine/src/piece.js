import * as Tone from 'tone';
import {
  createPrerenderableSampledBuffers,
  toss,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../western-medicine.gfm.manifest.json';

const getCustomSampler = async ({ prerenderOptions, destination }) => {
  const buffers = await createPrerenderableSampledBuffers(prerenderOptions);

  const activeSources = [];
  const triggerAttack = (note, time = Tone.now()) => {
    const buffer = buffers.get(note);
    buffer.reverse = window.generativeMusic.rng() < 0.5;
    const bufferSource = new Tone.BufferSource(buffer)
      .set({
        onended: () => {
          const i = activeSources.indexOf(bufferSource);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(destination);
    activeSources.push(bufferSource);
    bufferSource.start(time);
  };

  const releaseAll = time => {
    activeSources.forEach(source => {
      source.stop(time);
    });
  };

  const dispose = () => {
    [buffers, ...activeSources].forEach(node => node.dispose());
  };

  return {
    triggerAttack,
    releaseAll,
    dispose,
  };
};

const HARMONICS_NOTES = ['C4', 'G4', 'C3', 'C5'];
const MARIMBA_OCTS = [2, 3, 4, 5, 6];
const HARP_NOTES = ['C4', 'G4', 'C5', 'G5', 'C6', 'G6'];
const PIANO_NOTES = toss(['C', 'E', 'G'], [3, 4, 5, 6]);

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const filter = new Tone.Filter(3000);

  const [harmonics, marimba, harp, piano] = await Promise.all(
    [
      ['guitar-harmonics', HARMONICS_NOTES],
      ['vsco2-marimba', toss(['C', 'G'], MARIMBA_OCTS)],
      ['vsco2-harp', HARP_NOTES],
      ['vsco2-piano-mf', PIANO_NOTES],
    ].map(([instrumentName, notes], i) =>
      getCustomSampler({
        prerenderOptions: {
          samples,
          sampleLibrary,
          notes,
          pitchShift: -24,
          sourceInstrumentName: instrumentName,
          renderedInstrumentName: `western-medicine__${instrumentName}`,
          getDestination: () =>
            new Tone.Reverb(15)
              .set({ wet: 0.625 })
              .toDestination()
              .generate(),
          onProgress: val => onProgress(val * 0.25 + 0.25 * i),
          additionalRenderLength: 0.5,
        },
        destination: filter,
      })
    )
  );

  const playHarmonics = () => {
    const note =
      HARMONICS_NOTES[Math.floor(window.generativeMusic.rng() * HARMONICS_NOTES.length)];
    harmonics.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      playHarmonics();
    }, `+${window.generativeMusic.rng() * 20 + 5}`);
  };

  const playMarimba = () => {
    const notes = ['C', 'G'].map(
      note =>
        `${note}${
          MARIMBA_OCTS[Math.floor(window.generativeMusic.rng() * MARIMBA_OCTS.length)]
        }`
    );
    notes.forEach(note => {
      marimba.triggerAttack(note, `+${window.generativeMusic.rng() * 0.2 + 1}`);
    });
    Tone.Transport.scheduleOnce(() => {
      playMarimba();
    }, `+${window.generativeMusic.rng() * 20 + 20}`);
  };

  const playHarp = () => {
    const note = HARP_NOTES[Math.floor(window.generativeMusic.rng() * HARP_NOTES.length)];

    harp.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      playHarp();
    }, `+${window.generativeMusic.rng() * 10 + 10}`);
  };

  piano.triggerAttack('C3');
  const playPiano = () => {
    const notes = Array.from({
      length: Math.ceil(window.generativeMusic.rng() * 5),
    }).map(() => PIANO_NOTES[Math.floor(window.generativeMusic.rng() * PIANO_NOTES.length)]);
    const maxOffset = window.generativeMusic.rng() * 3;

    notes.forEach(note => {
      piano.triggerAttack(note, `+${1 + window.generativeMusic.rng() * maxOffset}`);
    });

    Tone.Transport.scheduleOnce(() => {
      playPiano();
    }, `+${window.generativeMusic.rng() * 15 + 15}`);
  };

  const schedule = ({ destination }) => {
    filter.connect(destination);
    playHarmonics();
    playMarimba();
    playHarp();
    playPiano();

    return () => {
      [harmonics, marimba, harp, piano].forEach(sampler => {
        sampler.releaseAll(0);
      });
    };
  };

  const deactivate = () => {
    [harmonics, marimba, harp, piano, filter].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

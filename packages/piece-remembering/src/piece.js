import * as Tone from 'tone';
import {
  wrapActivate,
  createPrerenderableSampler,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../remembering.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const PITCH_CLASSES = ['C', 'D', 'E', 'G', 'A', 'C'];
const getPhrase = octave => {
  const notes = toss(PITCH_CLASSES, [octave])
    .concat()
    .concat([`${PITCH_CLASSES[0]}${octave + 1}`]);
  return Array.from({ length: 4 }).map(
    () => notes[Math.floor(window.generativeMusic.rng() * notes.length)]
  );
};

const getPhrases = (octaves = [3, 4, 5, 6]) =>
  octaves.map(octave => getPhrase(octave));

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const piano = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    onProgress,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'remembering__vsco2-piano-mf',
    notes: toss(
      PITCH_CLASSES.slice(0, -1).filter(pc => pc !== 'D' && pc !== 'A'),
      [3, 4, 5, 6]
    ).concat(['C7']),
    getDestination: () =>
      Promise.resolve(new Tone.Freeverb(0.5).set({ wet: 0.5 }).toDestination()),
  });

  const playPhrase = () => {
    const phrases = getPhrases();
    const divisor = window.generativeMusic.rng() * 0.15 + 0.5;
    phrases.forEach(phrase =>
      phrase.forEach((note, i) => {
        if (window.generativeMusic.rng() < 0.85) {
          piano.triggerAttack(
            note,
            `+${i / divisor + window.generativeMusic.rng() / 5 - 0.1}`
          );
        }
      })
    );

    Tone.Transport.scheduleOnce(() => {
      playPhrase();
    }, `+${phrases[0].length / divisor + window.generativeMusic.rng() * 5 + 3}`);
  };

  const schedule = ({ destination }) => {
    piano.connect(destination);
    playPhrase();

    return () => {
      piano.releaseAll(0);
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['remembering'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

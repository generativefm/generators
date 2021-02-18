import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  getRandomElement,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../agua-ravine.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const phrase1 = [
  ['G4', 'B4', 'E5'],
  ['F4', 'A4', 'D5'],
  ['E4', 'G4', 'C5'],
  ['D4', 'F4', 'B4'],
  ['C4', 'E4', 'A4'],
  ['B3', 'D4', 'G4'],
  ['A3', 'C4', 'F4'],
  ['G3', 'B3', 'E4'],
];
const phrase2 = [['C2'], ['C3'], ['G2']];
const phrase3 = [['C4'], ['G4'], ['C5'], ['C4', 'G4', 'B4']];
const phrase4 = [['C3'], ['G3'], ['C4'], ['F3'], ['E3']];
const phrase5 = [['C2'], ['A2'], ['C3']];
const phrase6 = [['D3'], ['G3'], ['D4'], ['A4'], ['C5']];
const phrase7 = [['D4', 'G4', 'C5'], ['C4', 'G4', 'C5']];

const phrases = [phrase1, phrase2, phrase3, phrase4, phrase5, phrase6, phrase7];

const vibeNotes = ['C3', 'C4', 'C5', 'G3', 'G4', 'G5'];

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const piano = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    notes: Array.from(new Set(phrases.flat(2))).filter(
      ([pc]) => pc === 'C' || pc === 'E' || pc === 'G' || pc === 'A'
    ),
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'agua-ravine__vsco2-piano-mf',
    onProgress: val => onProgress(val * 0.5),
    getDestination: () =>
      new Tone.Reverb(15)
        .set({ wet: 0.5 })
        .toDestination()
        .generate(),
  });
  const vibes = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    notes: vibeNotes,
    sourceInstrumentName: 'vcsl-vibraphone-soft-mallets-mp',
    renderedInstrumentName: 'agua-ravine__vcsl-vibraphone-soft-mallets-mp',
    onProgress: val => onProgress(val * 0.5 + 0.5),
    getDestination: () =>
      new Tone.Reverb(30)
        .set({ wet: 0.8 })
        .toDestination()
        .generate(),
  });

  const playPhrase = (phrase = getRandomElement(phrases)) => {
    const noteTime = (window.generativeMusic.rng() * 2 + 3) / phrase.length;
    (window.generativeMusic.rng() < 0.25 ? phrase.slice(0).reverse() : phrase)
      .slice(0, Math.ceil(window.generativeMusic.rng() * phrase.length - 1))
      .forEach((notes, i) => {
        notes.forEach(note => {
          piano.triggerAttack(
            note,
            `+${(1 + i + window.generativeMusic.rng() / 20 - 0.025) * noteTime +
              window.generativeMusic.rng() / 10 -
              0.05}`
          );
        });
      });

    Tone.Transport.scheduleOnce(() => {
      playPhrase();
    }, `+${window.generativeMusic.rng() * 5 + 3}`);
  };

  const playVibes = () => {
    Tone.Transport.scheduleOnce(() => {
      const vibeNote1 = getRandomElement(vibeNotes);
      const vibeNote2 = getRandomElement(
        vibeNotes.filter(note => note !== vibeNote1)
      );
      [vibeNote1, vibeNote2].forEach(note => {
        vibes.triggerAttack(note, `+${1 + window.generativeMusic.rng() / 10 - 0.05}`);
      });
      playVibes();
    }, `+${window.generativeMusic.rng() * 40 + 20}`);
  };

  const schedule = ({ destination }) => {
    vibes.connect(destination);
    piano.connect(destination);
    playPhrase();
    playVibes();
    return () => {
      piano.releaseAll(0);
      vibes.releaseAll(0);
    };
  };

  const deactivate = () => {
    [piano, vibes].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['agua-ravine'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

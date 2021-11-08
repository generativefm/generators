import * as Tone from 'tone';
import {
  wrapActivate,
  createPitchShiftedSampler,
  transpose,
  P1,
  M3,
  P4,
  P5,
} from '@generative-music/utilities';
import { sampleNames, id } from '../piece.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const primaryChord = ['C5', 'F5', 'A5', 'C6', 'D6', 'G6', 'A6'];
const secondaryChord = ['B4', 'D5', 'F5', 'G5', 'B5', 'C6', 'F6', 'G6'];

const transpositions = [-P5, -P4, -M3, P1, M3, P4, P5];

const buildPhrase = ({ length, notes, transposition }) => {
  const phrase = [];
  let nonSequentialNotes = notes;
  for (let i = 0; i < length; i += 1) {
    const selectedNote =
      nonSequentialNotes[
        Math.floor(window.generativeMusic.rng() * nonSequentialNotes.length)
      ];
    phrase.push(selectedNote);
    nonSequentialNotes = notes.filter(note => note !== selectedNote);
  }
  return phrase.map(transpose(transposition));
};

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.getContext(), sampleNames);
  const sampler = await createPitchShiftedSampler({
    samplesByNote: samples['vsco2-piano-mf'],
    pitchShift: -24,
  });

  const playPhrase = ({
    isFirst = false,
    currentTranspositionIndex = 3,
  } = {}) => {
    let shouldPlayPrimary = isFirst || window.generativeMusic.rng() < 0.66;
    let transpositionIndex = currentTranspositionIndex;
    if (window.generativeMusic.rng() < 0.05) {
      shouldPlayPrimary = true;
      const minNextPossibleTranspositionIndex = Math.max(
        0,
        transpositionIndex - 2
      );
      const maxNextPossibleTranspositionIndex = Math.min(
        transpositions.length - 1,
        transpositionIndex + 2
      );
      transpositionIndex = Math.floor(
        window.generativeMusic.rng() *
          (maxNextPossibleTranspositionIndex +
            1 -
            minNextPossibleTranspositionIndex) +
          minNextPossibleTranspositionIndex
      );
    }
    const num = Math.floor(window.generativeMusic.rng() * 15 + 10);
    const exponent = window.generativeMusic.rng() + 1.2;
    buildPhrase({
      length: num,
      notes: shouldPlayPrimary ? primaryChord : secondaryChord,
      transposition: transpositions[transpositionIndex],
    }).forEach((note, i) => {
      sampler.triggerAttack(note, `+${(i / num) ** exponent * (num / 2)}`);
    });
    Tone.Transport.scheduleOnce(() => {
      playPhrase({ currentTranspositionIndex: transpositionIndex });
    }, `+${num / 2 + 7 + window.generativeMusic.rng() * 7}`);
  };

  const schedule = ({ destination }) => {
    sampler.connect(destination);

    playPhrase({ isFirst: true });

    return () => {
      sampler.releaseAll(0);
    };
  };

  const deactivate = () => {
    sampler.dispose();
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments[id];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

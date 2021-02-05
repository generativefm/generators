import * as Tone from 'tone';
import {
  createSampler,
  wrapActivate,
  getRandomNumberBetween,
  getRandomElement,
  major7th,
  minor7th,
  dominant7th,
  invert,
} from '@generative-music/utilities';
import { sampleNames } from '../sevenths.gfm.manifest.json';

const CHORDS = [major7th, minor7th, dominant7th];
// eslint-disable-next-line no-magic-numbers
const OCTAVES = [2, 3, 4, 5];
const MIN_ARPEGGIO_TIME_S = 0.25;
const MAX_ARPEGGIO_TIME_S = 5;
const MIN_NEXT_CHORD_TIME_S = 3;
const MAX_NEXT_CHORD_TIME_S = 15;

const makeScheduleChord = instrument => {
  const scheduleChord = () => {
    const pitchClass = getRandomElement([
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ]);
    const octave = getRandomElement(OCTAVES);
    const tonic = `${pitchClass}${octave}`;
    const chord = getRandomElement(CHORDS);
    const inversion = Math.floor(getRandomNumberBetween(0, 4));
    const notes = invert(chord(tonic), inversion);
    const chordTime =
      window.generativeMusic.rng() * (MAX_NEXT_CHORD_TIME_S - MIN_NEXT_CHORD_TIME_S) +
      MIN_NEXT_CHORD_TIME_S;
    const arpeggioTime = getRandomNumberBetween(
      MIN_ARPEGGIO_TIME_S,
      MAX_ARPEGGIO_TIME_S
    );
    notes.forEach(note => {
      const noteTime = getRandomNumberBetween(0, arpeggioTime);
      instrument.triggerAttack(note, `+${noteTime}`);
    });
    Tone.Transport.scheduleOnce(() => {
      scheduleChord();
    }, `+${chordTime}`);
  };
  return scheduleChord;
};

const getPiano = samples => createSampler(samples['vsco2-piano-mf']);

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const piano = await getPiano(samples);
  const scheduleChord = makeScheduleChord(piano);
  const schedule = ({ destination }) => {
    piano.connect(destination);
    scheduleChord();
    return () => {
      piano.releaseAll(0);
    };
  };
  const deactivate = () => {
    piano.dispose();
  };
  return [deactivate, schedule];
};

export default wrapActivate(activate);

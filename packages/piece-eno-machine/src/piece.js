import { Chord, Array } from 'tonal';
import * as Tone from 'tone';
import {
  createSampler,
  makePiece,
  getRandomNumberBetween,
} from '@generative-music/utilities';

const OCTAVES = [3, 4, 5];
const MIN_REPEAT_S = 20;
const MAX_REPEAT_S = 60;

const NOTES = Array.rotate(1, Chord.notes('DbM9')).reduce(
  (withOctaves, note) =>
    withOctaves.concat(OCTAVES.map(octave => `${note}${octave}`)),
  []
);

const getPiano = samples => createSampler(samples['vsco2-piano-mf']);

const activate = ({ destination, samples }) => {
  return getPiano(samples).then(piano => {
    piano.connect(destination);

    const schedule = () => {
      NOTES.forEach(note => {
        const interval = getRandomNumberBetween(MIN_REPEAT_S, MAX_REPEAT_S);
        const delay = getRandomNumberBetween(0, MAX_REPEAT_S - MIN_REPEAT_S);
        const playNote = () => piano.triggerAttack(note, '+1');
        Tone.Transport.scheduleRepeat(playNote, interval, `+${delay}`);
      });

      return () => {
        piano.releaseAll();
      };
    };

    const deactivate = () => {
      piano.dispose();
    };

    return [deactivate, schedule];
  });
};

export default makePiece(activate);

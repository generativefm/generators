import { Chord, Array } from 'tonal';
import * as Tone from 'tone';
import { getSampler, makePiece } from '@generative-music/utilities';

const randomNumber = ({ min, max }) => Math.random() * (max - min) + min;

const OCTAVES = [3, 4, 5];
const MIN_REPEAT_S = 20;
const MAX_REPEAT_S = 60;

const NOTES = Array.rotate(1, Chord.notes('DbM9')).reduce(
  (withOctaves, note) =>
    withOctaves.concat(OCTAVES.map(octave => `${note}${octave}`)),
  []
);

const getPiano = samples => getSampler(samples['vsco2-piano-mf']);

const activate = ({ destination, samples }) => {
  return getPiano(samples).then(piano => {
    piano.connect(destination);

    const schedule = () => {
      NOTES.forEach(note => {
        const interval = randomNumber({ min: MIN_REPEAT_S, max: MAX_REPEAT_S });
        const delay = randomNumber({
          min: 0,
          max: MAX_REPEAT_S - MIN_REPEAT_S,
        });
        const playNote = () => piano.triggerAttack(note, '+1');
        Tone.Transport.scheduleRepeat(playNote, interval, `+${delay}`);
      });
    };

    const deactivate = () => {
      piano.dispose();
    };

    return [deactivate, schedule];
  });
};

export default makePiece(activate);

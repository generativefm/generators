import * as tonal from 'tonal';
import * as Tone from 'tone';
import {
  createSampler,
  makePiece,
  getRandomNumberBetween,
  getRandomElement,
} from '@generative-music/utilities';

const CHORDS = ['m7', 'maj7', '7'];
// eslint-disable-next-line no-magic-numbers
const OCTAVES = [2, 3, 4, 5];
const MIN_ARPEGGIO_TIME_S = 0.25;
const MAX_ARPEGGIO_TIME_S = 5;
const MIN_NEXT_CHORD_TIME_S = 3;
const MAX_NEXT_CHORD_TIME_S = 15;

const makeScheduleChord = instrument => {
  const scheduleChord = () => {
    const tonic = getRandomElement(tonal.Note.names());
    const chordType = getRandomElement(CHORDS);
    const octave = getRandomElement(OCTAVES);
    const octavedTonic = `${tonic}${octave}`;
    const intervals = tonal.Chord.intervals(chordType);
    const inversion = Math.floor(getRandomNumberBetween(0, 4));
    const notes = intervals.map((interval, i) =>
      tonal.Distance.transpose(
        octavedTonic,
        i < inversion ? tonal.Interval.invert(interval) : interval
      )
    );
    const chordTime =
      Math.random() * (MAX_NEXT_CHORD_TIME_S - MIN_NEXT_CHORD_TIME_S) +
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

const activate = ({ destination, samples }) =>
  getPiano(samples).then(piano => {
    piano.connect(destination);
    const scheduleChord = makeScheduleChord(piano);
    const schedule = () => {
      scheduleChord();
      return () => {
        piano.releaseAll();
      };
    };
    const deactivate = () => {
      piano.dispose();
    };
    return [deactivate, schedule];
  });

export default makePiece(activate);

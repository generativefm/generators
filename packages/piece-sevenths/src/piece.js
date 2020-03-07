import pickRandom from 'pick-random';
import randomNumber from 'random-number';
import * as tonal from 'tonal';
import Tone from 'tone';
import { getSampler } from '@generative-music/utilities';

const CHORDS = ['m7', 'maj7', '7'];
// eslint-disable-next-line no-magic-numbers
const OCTAVES = [2, 3, 4, 5];
const MIN_ARPEGGIO_TIME_S = 0.25;
const MAX_ARPEGGIO_TIME_S = 5;
const MIN_NEXT_CHORD_TIME_S = 3;
const MAX_NEXT_CHORD_TIME_S = 15;

const makeScheduleChord = instrument => {
  const scheduleChord = () => {
    const [tonic] = pickRandom(tonal.Note.names());
    const [chordType] = pickRandom(CHORDS);
    const [octave] = pickRandom(OCTAVES);
    const octavedTonic = `${tonic}${octave}`;
    const intervals = tonal.Chord.intervals(chordType);
    const inversion = randomNumber({ min: 0, max: 3, integer: true });
    const notes = intervals.map((interval, i) =>
      tonal.Distance.transpose(
        octavedTonic,
        i < inversion ? tonal.Interval.invert(interval) : interval
      )
    );
    const chordTime = randomNumber({
      min: MIN_NEXT_CHORD_TIME_S,
      max: MAX_NEXT_CHORD_TIME_S,
    });
    Tone.Transport.scheduleOnce(() => {
      const arpeggioTime = randomNumber({
        min: MIN_ARPEGGIO_TIME_S,
        max: MAX_ARPEGGIO_TIME_S,
      });
      notes.forEach(note => {
        const noteTime = randomNumber({ min: 0, max: arpeggioTime });
        instrument.triggerAttack(note, `+${noteTime}`);
      });
      scheduleChord();
    }, `+${chordTime}`);
  };
  return scheduleChord;
};

const getPiano = samples => getSampler(samples['vsco2-piano-mf']);

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return getPiano(samples).then(piano => {
    piano.connect(destination);
    makeScheduleChord(piano)();
    return () => {
      piano.dispose();
    };
  });
};

export default makePiece;

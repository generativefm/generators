import getOctave from './get-octave';
import toss from '../toss';

const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const PITCH_CLASSES = [
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
];
const NOTES = toss(PITCH_CLASSES, OCTAVES);
const TOLERANT_NOTE_REGEX = /([abcdefg])([#b]*)(\d*)/i;
const accidentalValues = {
  '#': 1,
  b: -1,
};

const makeWrappedGet = arr => (current, change) => {
  const currentIndex = arr.indexOf(current);
  const nextIndex =
    (((currentIndex + change) % arr.length) + arr.length) % arr.length;
  return arr[nextIndex];
};

const getNextPitchClass = makeWrappedGet(PITCH_CLASSES);
const getNextNote = makeWrappedGet(NOTES);

const normalizeNote = note => {
  const match = note.match(TOLERANT_NOTE_REGEX);
  const [, pitchLetter, accidentals, octave] = match;
  const accidentalSum = accidentals
    .split('')
    .reduce((sum, accidental) => sum + accidentalValues[accidental], 0);
  if (octave.length > 0) {
    return getNextNote(`${pitchLetter}${octave}`, accidentalSum);
  }
  return getNextPitchClass(pitchLetter, accidentalSum);
};

const _transpose = (note, steps) => {
  const normalizedNote = normalizeNote(note);
  if (getOctave(note) === null) {
    return getNextPitchClass(normalizedNote, steps);
  }
  return getNextNote(normalizedNote, steps);
};

const curry2 = fn => arg1 => arg2 => fn(arg1, arg2);
const swap2 = fn => (arg1, arg2) => fn(arg2, arg1);

const transpose = (arg1, arg2) => {
  const getResult = typeof arg1 === 'string' ? _transpose : swap2(_transpose);
  return typeof arg2 === 'undefined'
    ? curry2(getResult)(arg1)
    : getResult(arg1, arg2);
};

export default transpose;

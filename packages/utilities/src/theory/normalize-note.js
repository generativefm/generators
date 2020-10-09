import transposePitchClass from './transpose-pitch-class';
import transposeNote from './transpose-note';

const TOLERANT_NOTE_REGEX = /([abcdefg])([#b]*)(\d*)/i;
const accidentalValues = {
  '#': 1,
  b: -1,
};

const normalizeNote = note => {
  const match = note.match(TOLERANT_NOTE_REGEX);
  const [, pitchClass, accidentals, octave] = match;
  const accidentalSum = accidentals
    .split('')
    .reduce((sum, accidental) => sum + accidentalValues[accidental], 0);
  if (octave.length > 0) {
    return transposeNote(
      pitchClass,
      Number.parseInt(octave, 10),
      accidentalSum
    );
  }
  return transposePitchClass(pitchClass, accidentalSum);
};

export default normalizeNote;

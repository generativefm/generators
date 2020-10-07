import transposePitchClass from './transpose-pitch-class';
import pitchClassIndiciesByValue from './pitch-class-indicies-by-value';

const getImplicitOctaveChange = (pitchClassA, pitchClassB, wasTransposedUp) => {
  const [indexA, indexB] = [pitchClassA, pitchClassB].map(
    pc => pitchClassIndiciesByValue[pc]
  );
  if (wasTransposedUp && indexA > indexB) {
    return 1;
  } else if (!wasTransposedUp && indexA < indexB) {
    return -1;
  }
  return 0;
};

const transposeNote = (pitchClass, octave, semitones) => {
  const nextPitchClass = transposePitchClass(pitchClass, semitones);
  const fullOctaveChange = Number.parseInt(semitones / 12, 10);
  const nextOctave =
    octave +
    fullOctaveChange +
    getImplicitOctaveChange(pitchClass, nextPitchClass, semitones > 0);
  return `${nextPitchClass}${nextOctave}`;
};

export default transposeNote;

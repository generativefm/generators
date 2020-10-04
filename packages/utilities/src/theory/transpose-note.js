import transposePitchClass from './transpose-pitch-class';

const transposeNote = (pitchClass, octave, semitones) => {
  const nextPitchClass = transposePitchClass(pitchClass, semitones);
  const octaveChange = Number.parseInt(semitones / 12, 10);
  const nextOctave = octave + octaveChange;
  return `${nextPitchClass}${nextOctave}`;
};

export default transposeNote;

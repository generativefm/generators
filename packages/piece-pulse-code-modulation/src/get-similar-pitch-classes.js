import {
  P1,
  M2,
  M3,
  P4,
  P5,
  M6,
  M7,
  transpose,
  getRandomElement,
} from '@generative-music/utilities';

const majorScale = tonic => [P1, M2, M3, P4, P5, M6, M7].map(transpose(tonic));
const majorScaleSets = [
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
]
  .map(majorScale)
  .map(arr => new Set(arr));

const majorScalesWithNotes = notes =>
  majorScaleSets.filter(scaleNoteSet =>
    notes.every(note => scaleNoteSet.has(note))
  );

const getSimilarPitchClasses = (includingPitchClasses = []) => {
  const compatibleMajorScales = majorScalesWithNotes(includingPitchClasses);
  const randomCompatibleScale = getRandomElement(compatibleMajorScales);
  return Array.from(
    new Set([
      ...includingPitchClasses,
      ...Array.from(randomCompatibleScale).filter(() => Math.random() < 0.5),
    ])
  );
};

export default getSimilarPitchClasses;

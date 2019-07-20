import { Scale, Note } from 'tonal';

const majorScales = Note.names().map(tonic =>
  Scale.notes(tonic, 'major')
    .map(note => Note.simplify(note))
    .map(note => (note.includes('b') ? Note.enharmonic(note) : note))
);

const majorScalesWithNotes = notes =>
  majorScales.filter(scaleNotes =>
    notes.every(note => scaleNotes.includes(note))
  );

const getSimilarPitchClasses = (includingPitchClasses = []) => {
  const compatibleMajorScales = majorScalesWithNotes(includingPitchClasses);
  const randomCompatibleScale =
    compatibleMajorScales[
      Math.floor(Math.random() * compatibleMajorScales.length)
    ];
  return Array.from(
    new Set([
      ...includingPitchClasses,
      ...randomCompatibleScale.filter(() => Math.random() < 0.5),
    ])
  );
};

export default getSimilarPitchClasses;

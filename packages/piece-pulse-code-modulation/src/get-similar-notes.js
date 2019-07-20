import { Distance, Note } from 'tonal';
import getSimilarPitchClasses from './get-similar-pitch-classes';

const getSimilarNotes = (currentNotes, octaves) => {
  const pitchClasses = Array.from(
    new Set(currentNotes.map(note => Note.pc(note)))
  );
  return getSimilarPitchClasses(pitchClasses)
    .reduce(
      (withOctaves, pc) =>
        withOctaves.concat(octaves.map(oct => `${pc}${oct}`)),
      []
    )
    .filter(() => Math.random() < (11 - pitchClasses.length) / 10)
    .reduce(
      (noYuckyIntervals, note) =>
        noYuckyIntervals.every(otherNote => {
          const distance = Math.abs(Distance.semitones(note, otherNote));
          return distance !== 6 && distance !== 1;
        })
          ? noYuckyIntervals.concat([note])
          : noYuckyIntervals,
      []
    );
};

export default getSimilarNotes;

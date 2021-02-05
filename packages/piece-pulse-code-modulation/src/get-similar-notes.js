import { getPitchClass, toss, getDistance } from '@generative-music/utilities';
import getSimilarPitchClasses from './get-similar-pitch-classes';

const getSimilarNotes = (currentNotes, octaves) => {
  const pitchClasses = Array.from(
    new Set(currentNotes.map(note => getPitchClass(note)))
  );
  return toss(getSimilarPitchClasses(pitchClasses), octaves)
    .filter(() => window.generativeMusic.rng() < (11 - pitchClasses.length) / 10)
    .reduce(
      (noYuckyIntervals, note) =>
        noYuckyIntervals.every(otherNote => {
          const distance = Math.abs(getDistance(note, otherNote));
          return distance !== 6 && distance !== 1;
        })
          ? noYuckyIntervals.concat([note])
          : noYuckyIntervals,
      []
    );
};

export default getSimilarNotes;

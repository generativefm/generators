import { Note } from 'tonal';

const pitchClasses = Note.names();
const uniquePitchClasses = pitchClasses.reduce(
  (uniquePcs, pc) =>
    uniquePcs.every(existingPc => Note.chroma(existingPc) !== Note.chroma(pc))
      ? uniquePcs.concat(pc)
      : uniquePcs,
  []
);

export default uniquePitchClasses;

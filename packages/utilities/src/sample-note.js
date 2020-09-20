import * as Tone from 'tone';
import getClosestNote from './get-closest-note';

const sampleNote = ({ note, sampledNotes = [], pitchShift = 0 }) => {
  const midi = Tone.Midi(note).toMidi();
  const sampledMidiSet = new Set(
    sampledNotes.map(sampledNote =>
      typeof sampledNote === 'number'
        ? sampledNote
        : Tone.Midi(sampledNote).toMidi()
    )
  );
  const closestMidi = getClosestNote({
    targetMidi: midi,
    searchedMidiSet: sampledMidiSet,
  });
  const playbackRate = Tone.intervalToFrequencyRatio(
    midi - closestMidi + pitchShift
  );
  const sampledNoteIndex = Array.from(sampledMidiSet).indexOf(closestMidi);
  const sampledNote = sampledNotes[sampledNoteIndex];
  return {
    sampledNote,
    playbackRate,
  };
};

export default sampleNote;

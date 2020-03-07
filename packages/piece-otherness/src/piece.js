import Tone from 'tone';
import { Note } from 'tonal';
import { getSampler } from '@generative-music/utilities';

const OCTAVES = [2, 3, 4];
const notes = OCTAVES.reduce(
  (allNotes, octave) =>
    allNotes.concat(Note.names().map(pitchClass => `${pitchClass}${octave}`)),
  []
);

const playNote = (instrument, sineSynth, lastNoteMidi) => {
  const newNotes = notes.filter(n => Note.midi(n) !== lastNoteMidi);
  const note = newNotes[Math.floor(Math.random() * newNotes.length)];
  instrument.triggerAttack(note, '+1.5');
  const pitchClass = Note.pc(note);
  sineSynth.triggerAttackRelease(`${pitchClass}1`, 5, '+1.5');
  Tone.Transport.scheduleOnce(() => {
    playNote(instrument, sineSynth, Note.midi(note));
  }, `+${Math.random() * 10 + 10}`);
};

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return getSampler(samples.otherness).then(instrument => {
    const volume = new Tone.Volume(-5).connect(destination);
    const sineSynth = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 3,
        release: 10,
      },
    }).connect(volume);

    instrument.connect(volume);

    sineSynth.volume.value = -25;
    instrument.volume.value = -5;

    playNote(instrument, sineSynth);

    return () => {
      [sineSynth, instrument, volume].forEach(node => node.dispose());
    };
  });
};

export default makePiece;

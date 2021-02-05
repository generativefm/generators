import * as Tone from 'tone';
import { createSampler, wrapActivate } from '@generative-music/utilities';
import { sampleNames } from '../otherness.gfm.manifest.json';

const PITCH_CLASSES = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
];
const OCTAVES = [2, 3, 4];
const notes = OCTAVES.reduce(
  (allNotes, octave) =>
    allNotes.concat(PITCH_CLASSES.map(pitchClass => `${pitchClass}${octave}`)),
  []
);

const playNote = (instrument, sineSynth, lastNoteMidi) => {
  const newNotes = notes.filter(n => Tone.Midi(n).toMidi() !== lastNoteMidi);
  const note = newNotes[Math.floor(window.generativeMusic.rng() * newNotes.length)];
  instrument.triggerAttack(note, '+1.5');
  const pitchClass = note.slice(0, -1);
  sineSynth.triggerAttackRelease(`${pitchClass}1`, 5, '+1.5');
  Tone.Transport.scheduleOnce(() => {
    playNote(instrument, sineSynth, Tone.Midi(note).toMidi());
  }, `+${window.generativeMusic.rng() * 10 + 10}`);
};

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const instrument = await createSampler(samples.otherness);
  const volume = new Tone.Volume(-5);
  instrument.connect(volume);

  const schedule = ({ destination }) => {
    volume.connect(destination);
    const sineSynth = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 3,
        release: 10,
      },
    }).connect(volume);

    sineSynth.volume.value = -25;
    instrument.volume.value = -5;

    playNote(instrument, sineSynth);

    return () => {
      sineSynth.dispose();
      instrument.releaseAll(0);
    };
  };

  const deactivate = () => {
    instrument.dispose();
    volume.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

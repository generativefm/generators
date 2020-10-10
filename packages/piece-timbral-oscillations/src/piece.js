import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../timbral-oscillations.gfm.manifest.json';

const OCTAVES = [3, 4, 5, 6];
const MAX_STEP_DISTANCE = 2;
const MAX_PHRASE_LENGTH = 3;
const PHRASE_P_BASE = 0.5;
const PITCH_CLASSES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const notes = OCTAVES.reduce(
  (allNotes, octave) =>
    allNotes.concat(PITCH_CLASSES.map(pc => `${pc}${octave}`)),
  []
);

const getNextNotesForNote = note => {
  const index = notes.findIndex(n => n === note);
  const lowestIndex = Math.max(0, index - MAX_STEP_DISTANCE);
  return notes
    .slice(lowestIndex, index)
    .concat(notes.slice(index + 1, index + MAX_STEP_DISTANCE + 1));
};

const generatePhrase = (
  phrase = [notes[Math.floor(Math.random() * notes.length)]]
) => {
  if (
    phrase.length < MAX_PHRASE_LENGTH &&
    Math.random() < PHRASE_P_BASE ** phrase.length
  ) {
    const lastNote = phrase[phrase.length - 1];
    const possibleNextNotes = getNextNotesForNote(lastNote);
    return generatePhrase(
      phrase.concat([
        possibleNextNotes[Math.floor(Math.random() * possibleNextNotes.length)],
      ])
    );
  }
  return phrase;
};

const playPhrase = piano => {
  const phrase = generatePhrase();
  phrase.forEach((note, i) => {
    piano.triggerAttack(note, `+${i * 1.5}`);
  });
  Tone.Transport.scheduleOnce(() => {
    playPhrase(piano);
  }, `+${Math.random() * 10 + 10}`);
};

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const getPianoDestination = () =>
    Promise.resolve(new Tone.Freeverb().toDestination());

  const piano = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    onProgress,
    notes: notes.filter((_, i) => i % 2 === 0),
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'timbral-oscillations__vsco2-piano-mf',
    additionalRenderLength: 0,
    getDestination: getPianoDestination,
  });

  const schedule = () => {
    const delayFudge = Math.random() * 3;
    const delay = new Tone.FeedbackDelay({
      wet: 0.5,
      delayTime: 5 + delayFudge,
      feedback: 0.8 - delayFudge / 100,
    });
    const synth = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      volume: -45,
      envelope: { release: 3, attack: 0.5 },
    }).chain(delay);

    const chorusLfo = new Tone.LFO({
      frequency: Math.random() / 100,
      phase: 90,
    });
    chorusLfo.start();
    const chorus = new Tone.Chorus({ wet: 0 });
    chorusLfo.connect(chorus.wet);

    const autoFilter = new Tone.AutoFilter({
      frequency: Math.random() / 100,
      baseFrequency: 250,
      octaves: 5,
      type: 'sine',
    });
    autoFilter.start();

    const pitchLfo = new Tone.LFO({
      frequency: Math.random() / 100,
      phase: 90,
    });
    pitchLfo.start();
    const pitchShift = new Tone.PitchShift({ pitch: 7 });
    pitchLfo.connect(pitchShift.wet);

    const tremoloFrequencyLfo = new Tone.LFO({
      frequency: Math.random() / 100,
      phase: 90,
      min: 0.1,
      max: 10,
    });
    const tremoloLfo = new Tone.LFO({
      frequency: Math.random() / 100,
      phase: 90,
    });
    tremoloFrequencyLfo.start();
    tremoloLfo.start();
    const tremolo = new Tone.Tremolo();
    tremoloFrequencyLfo.connect(tremolo.frequency);
    tremoloLfo.connect(tremolo.wet);
    tremolo.start();

    const compressor = new Tone.Compressor();

    piano.chain(
      pitchShift,
      delay,
      chorus,
      autoFilter,
      tremolo,
      compressor,
      destination
    );

    playPhrase(piano);

    return () => {
      piano.releaseAll(0);
      [
        delay,
        chorusLfo,
        chorus,
        autoFilter,
        pitchLfo,
        pitchShift,
        tremoloFrequencyLfo,
        tremoloLfo,
        tremolo,
        compressor,
        synth,
      ].forEach(node => node.dispose());
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

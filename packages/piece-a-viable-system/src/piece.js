import * as Tone from 'tone';
import {
  createPrerenderedSampler,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../a-viable-system.gfm.manifest.json';

const MAX_STEP_DISTANCE = 3;
const MAX_PHRASE_LENGTH = 3;
const PHRASE_P_BASE = 0.5;

const getNextNotesForNote = (notes, note) => {
  const index = notes.findIndex(n => n === note);
  const lowestIndex = Math.max(0, index - MAX_STEP_DISTANCE);
  return notes
    .slice(lowestIndex, index)
    .concat(notes.slice(index + 1, index + MAX_STEP_DISTANCE + 1));
};

const generatePhrase = (
  notes,
  phrase = [notes[Math.floor(Math.random() * notes.length)]]
) => {
  if (
    phrase.length < MAX_PHRASE_LENGTH &&
    Math.random() < PHRASE_P_BASE ** phrase.length
  ) {
    const lastNote = phrase[phrase.length - 1];
    const possibleNextNotes = getNextNotesForNote(notes, lastNote);
    return generatePhrase(
      notes,
      phrase.concat([
        possibleNextNotes[Math.floor(Math.random() * possibleNextNotes.length)],
      ])
    );
  }
  return phrase;
};

const instrumentConfigs = {
  'vsco2-piano-mf': {
    isSingleNote: false,
    secondsBetweenNotes: 2,
    notes: [
      'C2',
      'D2',
      'E2',
      'F2',
      'G2',
      'A2',
      'B2',
      'C3',
      'D3',
      'E3',
      'F3',
      'G3',
      'A3',
      'B3',
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
      'D5',
      'E5',
      'F5',
      'G5',
      'A5',
      'B5',
      'C6',
      'D6',
      'E6',
      'F6',
      'G6',
      'A6',
      'B6',
    ],
    renderLength: 5,
  },
  'vsco2-contrabass-susvib': {
    isSingleNote: true,
    notes: [
      'G0',
      'A0',
      'B0',
      'C1',
      'D1',
      'E1',
      'F1',
      'G1',
      'A1',
      'B1',
      'C2',
      'D2',
      'E2',
      'F2',
      'G2',
      'A2',
      'B2',
    ],
    renderLength: 14,
  },
  'vsco2-violin-arcvib': {
    isSingleNote: false,
    secondsBetweenNotes: 8,
    notes: [
      'G3',
      'A3',
      'B3',
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
      'D5',
      'E5',
      'F5',
      'G5',
      'A5',
      'B5',
      'C6',
      'D6',
      'E6',
      'F6',
      'G6',
      'A6',
      'B6',
      'C7',
    ],
    renderLength: 15,
  },
};

const startInstrument = (instrument, instrumentConfig) => {
  const { isSingleNote, secondsBetweenNotes, notes } = instrumentConfig;
  const playPhrase = () => {
    const phrase = generatePhrase(notes);
    if (isSingleNote) {
      instrument.triggerAttack(phrase[0], `+1`);
    } else {
      phrase.forEach((note, i) => {
        instrument.triggerAttack(note, `+${i * secondsBetweenNotes + 1}`);
      });
    }
  };

  Tone.Transport.scheduleRepeat(() => {
    playPhrase();
  }, Math.random() * 10 + 10);
};

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const instrumentNames = Object.keys(instrumentConfigs);
  const getPrerenderedeDestination = () =>
    Promise.resolve(new Tone.Freeverb({ roomSize: 0.6 }).toDestination());
  const instruments = [];
  for (let i = 0; i < instrumentNames.length; i += 1) {
    const instrumentName = instrumentNames[i];
    const { notes, renderLength } = instrumentConfigs[instrumentName];
    //eslint-disable-next-line no-await-in-loop
    const sampler = await createPrerenderedSampler({
      notes: notes.filter((_, noteIndex) => noteIndex % 2 === 0),
      samples,
      sampleLibrary,
      renderLength,
      sourceInstrumentName: instrumentName,
      renderedInstrumentName: `a-viable-system::${instrumentName}`,
      getDestination: getPrerenderedeDestination,
      onProgress: val => onProgress((1 / instrumentNames.length) * (val + i)),
    });
    instruments.push(sampler);
  }

  const schedule = () => {
    const delayTime = 10 + Math.random() * 2;
    const delay = new Tone.FeedbackDelay({
      delayTime,
      feedback: 0.3 + Math.random() / 30,
      wet: 0.5,
      maxDelay: delayTime,
    });
    instruments.forEach((instrument, i) => {
      instrument.chain(delay, destination);
      startInstrument(instrument, instrumentConfigs[instrumentNames[i]]);
    });

    return () => {
      instruments.forEach(instrument => {
        instrument.releaseAll();
      });
      delay.dispose();
    };
  };

  const deactivate = () => {
    instruments.forEach(instrument => {
      instrument.dispose();
    });
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

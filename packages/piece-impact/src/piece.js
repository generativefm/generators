import * as Tone from 'tone';
import {
  createSampler,
  minor7th,
  wrapActivate,
  getRandomNumberBetween,
  getRandomElement,
  createReverseSampler,
} from '@generative-music/utilities';
import arpeggiateOnce from './arpeggiate-once';
import { sampleNames } from '../impact.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const TONIC = 'A#';
const CHORD = minor7th(TONIC);
const REVERSE_OCTAVES = [1, 2];
const REGULAR_OCTAVES = [4, 5];
const REGULAR_ARPEGGIATE_MIN_TIME = 0.5;
const REGULAR_ARPEGGIATE_MAX_TIME = 2;
const EXTRA_NOTE_CHANCE_P = 0.3;
const EXTRA_NOTE_VELOCITY = 0.3;
const EXTRA_CHORD_CHANCE_P = 0.2;

const makeNextNote = (
  reverseInstrument,
  regularInstrument,
  durationsByMidi
) => {
  const nextNote = () => {
    const note = getRandomElement(CHORD);
    const reverseNote = `${note}${getRandomElement(REVERSE_OCTAVES)}`;
    const inversion = Math.floor(getRandomNumberBetween(0, 4));
    const regularOctave = getRandomElement(REGULAR_OCTAVES);
    const regularNotes = minor7th(`${note}${regularOctave}`, inversion);
    Tone.Transport.scheduleOnce(() => {
      reverseInstrument.triggerAttack(reverseNote);
      //eslint-disable-next-line new-cap
      const midi = Tone.Frequency(reverseNote).toMidi();
      if (!durationsByMidi.has(midi)) {
        const [bufferSource] = reverseInstrument._activeSources.get(midi);
        const duration =
          bufferSource.buffer.duration / bufferSource.playbackRate.value;
        durationsByMidi.set(midi, duration);
      }
      Tone.Transport.scheduleOnce(() => {
        arpeggiateOnce({
          instrument: regularInstrument,
          notes: regularNotes,
          withinTime: getRandomNumberBetween(
            REGULAR_ARPEGGIATE_MIN_TIME,
            REGULAR_ARPEGGIATE_MAX_TIME
          ),
        });
        nextNote();
        if (window.generativeMusic.rng() < EXTRA_NOTE_CHANCE_P) {
          const extraNote = getRandomElement(regularNotes);
          Tone.Transport.scheduleOnce(() => {
            regularInstrument.triggerAttack(
              extraNote,
              Tone.now(),
              EXTRA_NOTE_VELOCITY
            );
          }, `+${durationsByMidi.get(midi) / 4}`);
        } else if (window.generativeMusic.rng() < EXTRA_CHORD_CHANCE_P) {
          let extraChordOctave = regularOctave;
          while (
            REGULAR_OCTAVES.length > 1 &&
            extraChordOctave === regularOctave
          ) {
            extraChordOctave = getRandomElement(REGULAR_OCTAVES);
          }
          const extraNotes = minor7th(`${note}${extraChordOctave}`, inversion);
          Tone.Transport.scheduleOnce(() => {
            arpeggiateOnce({
              instrument: regularInstrument,
              notes: extraNotes,
              withinTime: getRandomNumberBetween(
                REGULAR_ARPEGGIATE_MIN_TIME,
                REGULAR_ARPEGGIATE_MAX_TIME
              ),
              velocity: EXTRA_NOTE_VELOCITY,
            });
          }, `+${durationsByMidi.get(midi) / 4}`);
        }
      }, `+${durationsByMidi.get(midi)}`);
    }, `+1`);
  };
  return nextNote;
};

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const [regularInstrument, reverseInstrument] = await Promise.all([
    createSampler(samples['vsco2-piano-mf']),
    createReverseSampler(samples['vsco2-piano-mf']),
  ]);

  const durationsByMidi = new Map();
  const nextNote = makeNextNote(
    reverseInstrument,
    regularInstrument,
    durationsByMidi
  );

  const schedule = ({ destination }) => {
    [reverseInstrument, regularInstrument].forEach(instrument =>
      instrument.connect(destination)
    );
    nextNote();
    return () =>
      [regularInstrument, reverseInstrument].forEach(instrument =>
        instrument.releaseAll(0)
      );
  };

  const deactivate = () => {
    [regularInstrument, reverseInstrument].forEach(instrument =>
      instrument.dispose()
    );
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['impact'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

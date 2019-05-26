import { Note, Distance } from 'tonal';
import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';
import pickRandomFromArray from './pick-random-from-array';

const NUM_POTENTIAL_TONIC_PITCH_CLASSES = 5;
const P_SECOND_NOTE = 0.3;
const SECOND_NOTE_DELAY_MULTIPLIER_S = 15;
const MIN_SECOND_NOTE_DELAY_S = 1;
const LOW_OCTAVE_1 = 1;
const LOW_OCTAVE_2 = 2;
const HIGH_OCTAVE_1 = 3;
const HIGH_OCTAVE_2 = 4;
const LOWER_OCTAVES = [LOW_OCTAVE_1, LOW_OCTAVE_2];
const HIGHER_OCTAVES = [HIGH_OCTAVE_1, HIGH_OCTAVE_2];
const MIN_LOW_NOTE_DELAY_S = 2;
const MIN_HIGH_NOTE_DELAY_S = 5;
const MIN_LOW_NOTE_INTERVAL_S = 45;
const MIN_HIGH_NOTE_INTERVAL_S = 75;
const INTERVAL_MULTIPLIER_S = 5;
const VOLUME_ADJUSTMENT = -15;

const tonicPitchClasses = Note.names().slice(
  0,
  NUM_POTENTIAL_TONIC_PITCH_CLASSES
);
const tonicPitchClass = pickRandomFromArray(tonicPitchClasses);

const pitchClassesOverOctaves = (pitchClasses, octaves) =>
  pitchClasses.reduce(
    (notes, pitchClass) =>
      notes.concat(octaves.map(octave => `${pitchClass}${octave}`)),
    []
  );

const lowPitchClasses = [
  tonicPitchClass,
  Distance.transpose(tonicPitchClass, 'P5'),
];
const highPitchClasses = lowPitchClasses.concat(
  ['M2', 'P4'].map(interval => Distance.transpose(tonicPitchClass, interval))
);
const lowNotes = pitchClassesOverOctaves(lowPitchClasses, LOWER_OCTAVES);
const highNotes = pitchClassesOverOctaves(highPitchClasses, HIGHER_OCTAVES);

const startInterval = (
  notes,
  minIntervalInSeconds,
  minDelayInSeconds,
  instrument
) => {
  const playNotes = () => {
    instrument.triggerAttack(pickRandomFromArray(notes));
    if (Math.random() > P_SECOND_NOTE) {
      instrument.triggerAttack(
        pickRandomFromArray(notes),
        Math.random() * SECOND_NOTE_DELAY_MULTIPLIER_S + MIN_SECOND_NOTE_DELAY_S
      );
    }
  };
  Tone.Transport.scheduleRepeat(
    () => {
      playNotes();
    },
    Math.random() * INTERVAL_MULTIPLIER_S + minIntervalInSeconds,
    Math.random() * INTERVAL_MULTIPLIER_S + minDelayInSeconds
  );
};

const getBowls = (samplesSpec, format) =>
  new Promise(resolve => {
    const piano = new Tone.Sampler(
      samplesSpec.samples['kasper-singing-bowls'][format],
      {
        onload: () => resolve(piano),
      }
    );
  });

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename)
    .then(specFile => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      return getBowls(specFile, preferredFormat);
    })
    .then(bowls => {
      const volume = new Tone.Volume(VOLUME_ADJUSTMENT);
      const delay = new Tone.FeedbackDelay({
        wet: 0.5,
        delayTime: 20,
        feedback: 0.8,
      });
      bowls.chain(delay, volume, destination);
      startInterval(
        lowNotes,
        MIN_LOW_NOTE_INTERVAL_S,
        MIN_LOW_NOTE_DELAY_S,
        bowls
      );
      startInterval(
        highNotes,
        MIN_HIGH_NOTE_INTERVAL_S,
        MIN_HIGH_NOTE_DELAY_S,
        bowls
      );

      return () => {
        [bowls, volume, delay].forEach(node => node.dispose());
      };
    });

export default makePiece;

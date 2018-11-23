'use strict';

const { Note, Distance } = require('tonal');
const pickRandomFromArray = require('./pick-random-from-array');

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
  { time, instrument }
) => {
  const playNotes = () => {
    instrument.attack(pickRandomFromArray(notes));
    if (Math.random() > P_SECOND_NOTE) {
      time.createTimeout(() => {
        instrument.attack(pickRandomFromArray(notes));
      }, Math.random() * SECOND_NOTE_DELAY_MULTIPLIER_S + MIN_SECOND_NOTE_DELAY_S);
    }
  };
  time.createTimeout(() => {
    playNotes();
    time.createInterval(() => {
      playNotes();
    }, Math.random() * INTERVAL_MULTIPLIER_S + minIntervalInSeconds);
  }, Math.random() * INTERVAL_MULTIPLIER_S + minDelayInSeconds);
};

const piece = ({ time, instruments }) => {
  const [instrument] = instruments;
  startInterval(lowNotes, MIN_LOW_NOTE_INTERVAL_S, MIN_LOW_NOTE_DELAY_S, {
    time,
    instrument,
  });
  startInterval(highNotes, MIN_HIGH_NOTE_INTERVAL_S, MIN_HIGH_NOTE_DELAY_S, {
    time,
    instrument,
  });
};

module.exports = piece;

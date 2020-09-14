import { Note, Distance } from 'tonal';
import * as Tone from 'tone';
import {
  createSampler,
  wrapActivate,
  getRandomElement,
} from '@generative-music/utilities';
import { sampleNames } from '../meditation.gfm.manifest.json';

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
const MIN_LOW_NOTE_INTERVAL_S = 45;
const MIN_HIGH_NOTE_INTERVAL_S = 75;
const INTERVAL_MULTIPLIER_S = 5;
const VOLUME_ADJUSTMENT = -15;

const tonicPitchClasses = Note.names().slice(
  0,
  NUM_POTENTIAL_TONIC_PITCH_CLASSES
);

const startInterval = (notes, minIntervalInSeconds, instrument) => {
  const playNotes = () => {
    instrument.triggerAttack(getRandomElement(notes), '+1');
    if (Math.random() > P_SECOND_NOTE) {
      instrument.triggerAttack(
        getRandomElement(notes),
        `+${1 +
          Math.random() * SECOND_NOTE_DELAY_MULTIPLIER_S +
          MIN_SECOND_NOTE_DELAY_S}`
      );
    }
    Tone.Transport.scheduleOnce(() => {
      playNotes();
    }, `+${Math.random() * INTERVAL_MULTIPLIER_S + minIntervalInSeconds}`);
  };
  playNotes();
};

const getBowls = samples => createSampler(samples['kasper-singing-bowls']);

const pitchClassesOverOctaves = (pitchClasses, octaves) =>
  pitchClasses.reduce(
    (notes, pitchClass) =>
      notes.concat(octaves.map(octave => `${pitchClass}${octave}`)),
    []
  );

const activate = async ({ destination, sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const bowls = await getBowls(samples);
  const volume = new Tone.Volume(VOLUME_ADJUSTMENT);
  volume.connect(destination);

  const schedule = () => {
    const delay = new Tone.FeedbackDelay({
      wet: 0.5,
      delayTime: 20,
      maxDelay: 20,
      feedback: 0.8,
    });
    bowls.chain(delay, volume);

    const tonicPitchClass = getRandomElement(tonicPitchClasses);

    const lowPitchClasses = [
      tonicPitchClass,
      Distance.transpose(tonicPitchClass, 'P5'),
    ];
    const highPitchClasses = lowPitchClasses.concat(
      ['M2', 'P4'].map(interval =>
        Distance.transpose(tonicPitchClass, interval)
      )
    );
    const lowNotes = pitchClassesOverOctaves(lowPitchClasses, LOWER_OCTAVES);
    const highNotes = pitchClassesOverOctaves(highPitchClasses, HIGHER_OCTAVES);

    startInterval(lowNotes, MIN_LOW_NOTE_INTERVAL_S, bowls);
    startInterval(highNotes, MIN_HIGH_NOTE_INTERVAL_S, bowls);

    return () => {
      bowls.releaseAll();
      delay.dispose();
    };
  };

  const deactivate = () => {
    [bowls, volume].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

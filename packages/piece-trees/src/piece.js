import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
  transpose,
  P1,
  M2,
  M3,
  P4,
  P5,
  M6,
  M7,
  getRandomElement,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../trees.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const MAJOR_SCALE_INTERVALS = [P1, M2, M3, P4, P5, M6, M7];
const OCTAVES = [3, 4, 5, 6];

const getOffsetProgression = () => {
  const progression = [];
  const startingStep = window.generativeMusic.rng() < 0.5 ? 0 : 1;
  const largestStep = window.generativeMusic.rng() * (5 - startingStep) + startingStep;
  for (
    let step = startingStep;
    step <= largestStep;
    step += window.generativeMusic.rng() < 0.5 ? 1 : 2
  ) {
    const chord = [];
    for (let i = step; i >= 0; i -= 2) {
      if (i === 0) {
        chord.push(i);
      } else {
        chord.push(i, -i);
      }
    }
    progression.push(chord);
  }
  return progression;
};

const makeOffsetProgressionToIndiciesProgression = (
  notes,
  startingIndex
) => offsetProgression =>
  offsetProgression.map(chord =>
    chord
      .map(offset => startingIndex + offset)
      .filter(index => index >= 0 && index < notes.length)
  );

const makeIndiciesProgressionToNoteProgression = notes => indiciesProgression =>
  indiciesProgression.map(chord => chord.map(index => notes[index]));

const pipe = (...fns) => x => fns.reduce((y, fn) => fn(y), x);

const getProgression = notes =>
  pipe(
    getOffsetProgression,
    makeOffsetProgressionToIndiciesProgression(
      notes,
      Math.floor(window.generativeMusic.rng() * notes.length)
    ),
    makeIndiciesProgressionToNoteProgression(notes)
  )();

const playProgression = (piano, notes) => {
  const progression = getProgression(notes);
  const perChordDelay = window.generativeMusic.rng() * 3 + 2;
  progression.forEach((chord, i) => {
    chord.forEach(note =>
      piano.triggerAttack(note, `+${i * perChordDelay + window.generativeMusic.rng() / 10}`)
    );
  });
  Tone.Transport.scheduleOnce(() => {
    playProgression(piano, notes);
  }, `+${window.generativeMusic.rng() * 3 + (progression.length + 1) * perChordDelay}`);
};

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const getPianoDestination = () =>
    Promise.resolve(new Tone.Freeverb({ roomSize: 0.6 }).toDestination());

  const [[renderedInstrumentName, sourceInstrumentName]] = sampleNames;

  const piano = await createPrerenderableSampler({
    samples,
    sourceInstrumentName,
    renderedInstrumentName,
    sampleLibrary,
    onProgress,
    notes: toss(['C', 'E', 'G'], OCTAVES).concat(['B6']),
    additionalRenderLength: 0,
    getDestination: getPianoDestination,
  });

  const schedule = ({ destination }) => {
    piano.connect(destination);
    const tonic = getRandomElement([
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ]);
    const scalePitchClasses = MAJOR_SCALE_INTERVALS.map(transpose(tonic));
    const notes = toss(scalePitchClasses, OCTAVES);

    playProgression(piano, notes);

    return () => {
      piano.releaseAll(0);
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['trees'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

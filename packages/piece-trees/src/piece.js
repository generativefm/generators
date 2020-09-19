import * as Tone from 'tone';
import { Scale, Note } from 'tonal';
import {
  createPrerenderedSampler,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../trees.gfm.manifest.json';

const renderedNotes = [3, 4, 5, 6].reduce(
  (allNotes, octave) =>
    allNotes.concat(
      ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(pc => `${pc}${octave}`)
    ),
  []
);

const getOffsetProgression = () => {
  const progression = [];
  const startingStep = Math.random() < 0.5 ? 0 : 1;
  const largestStep = Math.random() * (5 - startingStep) + startingStep;
  for (
    let step = startingStep;
    step <= largestStep;
    step += Math.random() < 0.5 ? 1 : 2
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
      Math.floor(Math.random() * notes.length)
    ),
    makeIndiciesProgressionToNoteProgression(notes)
  )();

const playProgression = (piano, notes) => {
  const progression = getProgression(notes);
  const perChordDelay = Math.random() * 3 + 2;
  progression.forEach((chord, i) => {
    chord.forEach(note =>
      piano.triggerAttack(note, `+${i * perChordDelay + Math.random() / 10}`)
    );
  });
  Tone.Transport.scheduleOnce(() => {
    playProgression(piano, notes);
  }, `+${Math.random() * 3 + (progression.length + 1) * perChordDelay}`);
};

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const getPianoDestination = () =>
    Promise.resolve(new Tone.Freeverb({ roomSize: 0.6 }).toDestination());

  const [[renderedInstrumentName, sourceInstrumentName]] = sampleNames;

  const piano = await createPrerenderedSampler({
    samples,
    sourceInstrumentName,
    renderedInstrumentName,
    sampleLibrary,
    onProgress,
    notes: renderedNotes,
    additionalRenderLength: 0,
    getDestination: getPianoDestination,
  });

  piano.connect(destination);

  const schedule = () => {
    const tonic = Note.names()[Math.floor(Math.random() * Note.names().length)];
    const scalePitchClasses = Scale.notes(tonic, 'major');
    const notes = [3, 4, 5, 6]
      .reduce(
        (allNotes, octave) =>
          allNotes.concat(scalePitchClasses.map(pc => `${pc}${octave}`)),
        []
      )
      .map(note => Note.simplify(note));

    playProgression(piano, notes);

    return () => {
      piano.releaseAll();
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

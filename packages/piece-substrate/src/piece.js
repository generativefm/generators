import Tone from 'tone';
import { Note, Distance, Chord } from 'tonal';
import shuffle from 'shuffle-array';
import { getBuffers } from '@generative-music/utilities';

const findClosest = (samplesByNote, note) => {
  const noteMidi = Note.midi(note);
  const maxInterval = 96;
  let interval = 0;
  while (interval <= maxInterval) {
    const higherNote = Note.fromMidi(noteMidi + interval);
    if (samplesByNote[higherNote]) {
      return higherNote;
    }
    const lowerNote = Note.fromMidi(noteMidi - interval);
    if (samplesByNote[lowerNote]) {
      return lowerNote;
    }
    interval += 1;
  }
  return note;
};

const OCTAVES = [3, 4];
const getNotes = tonic =>
  OCTAVES.reduce(
    (notes, octave) => notes.concat(Chord.notes(`${tonic}${octave}`, 'm7')),
    []
  );

const swapTwo = arr => {
  const copy = arr.slice(0);
  const index1 = Math.floor(Math.random() * copy.length);
  let index2 = index1;
  while (index1 === index2) {
    index2 = Math.floor(Math.random() * copy.length);
  }
  const tmp = copy[index1];
  copy[index1] = copy[index2];
  copy[index2] = tmp;
  return copy;
};

function* makeNoteGenerator(notes) {
  for (let i = 0; i < notes.length; i += 1) {
    yield notes[i];
  }
}

const PITCH_CLASSES = Note.names();

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const masterVol = new Tone.Volume(5).connect(destination);
  const marimbaSamplesByNote = samples['vsco2-marimba'];
  const pianoSamplesByNote = samples['vsco2-piano-mf'];
  return Promise.all([
    getBuffers(marimbaSamplesByNote),
    getBuffers(pianoSamplesByNote),
    new Tone.Reverb(20).set({ wet: 0.5 }).generate(),
  ]).then(([primaryBuffers, secondaryBuffers, reverb]) => {
    reverb.connect(masterVol);
    const tonic =
      PITCH_CLASSES[Math.floor(Math.random() * PITCH_CLASSES.length)];
    const notes = shuffle(getNotes(tonic), { copy: true });

    const activeSources = [];

    const makePlayNote = (
      buffers,
      samplesByNote,
      instrumentDestination,
      semitoneChange,
      fadeIn
    ) => (note, time = 0) => {
      const closestSampledNote = findClosest(samplesByNote, note);
      const difference = Distance.semitones(closestSampledNote, note);
      const buffer = buffers.get(closestSampledNote);
      const playbackRate = Tone.intervalToFrequencyRatio(
        difference + semitoneChange
      );
      const source = new Tone.BufferSource(buffer)
        .set({
          playbackRate,
          fadeIn,
          curve: 'linear',
          onended: () => {
            const i = activeSources.indexOf(source);
            if (i >= 0) {
              activeSources.splice(i, 1);
            }
          },
        })
        .connect(instrumentDestination);
      activeSources.push(source);
      source.start(`+${time + 1}`);
    };

    const playNote = makePlayNote(
      primaryBuffers,
      marimbaSamplesByNote,
      reverb,
      -24,
      0.3
    );
    const playSecondaryNote = makePlayNote(
      secondaryBuffers,
      pianoSamplesByNote,
      reverb,
      -12,
      0.25
    );
    let noteGenerator = makeNoteGenerator(notes);
    const playAndScheduleNext = () => {
      const next = noteGenerator.next();
      if (!next.done) {
        playNote(next.value);
        const pc = Note.pc(next.value);
        const oct = Note.oct(next.value);
        if (Math.random() < 0.5) {
          const delay = Math.random() < 0.5 ? 0 : Math.random() * 2;
          playSecondaryNote(`${pc}${oct + 1}`, delay);
        }

        Tone.Transport.scheduleOnce(() => {
          playAndScheduleNext();
        }, `+${3 + Math.random()}`);
      } else {
        noteGenerator = makeNoteGenerator(swapTwo(notes));
        Tone.Transport.scheduleOnce(() => {
          playAndScheduleNext();
        }, `+${Math.random() + 4}`);
      }
    };
    playAndScheduleNext();
    return () => {
      [primaryBuffers, secondaryBuffers, reverb, ...activeSources].forEach(
        node => {
          node.dispose();
        }
      );
      activeSources.splice(0, activeSources.length);
    };
  });
};

export default makePiece;

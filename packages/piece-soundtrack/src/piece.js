import Tone from 'tone';
import { Distance, Note } from 'tonal';

const findClosest = (note, samplesByNote) => {
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

const getCustomSampler = (
  destination,
  samplesByNote,
  semitoneChange = 24,
  offset = 0
) =>
  new Promise(resolve => {
    const activeSources = [];
    const buffers = new Tone.Buffers(samplesByNote, {
      onload: () => {
        resolve({
          triggerAttack: (note, time = Tone.now()) => {
            const closestSample = findClosest(note, samplesByNote);
            const difference = Distance.semitones(closestSample, note);
            const buffer = buffers.get(closestSample);
            const playbackRate = Tone.intervalToFrequencyRatio(
              difference - semitoneChange + Math.random() * 0.1 - 0.05
            );
            const bufferSource = new Tone.BufferSource(buffer)
              .set({
                playbackRate,
                onended: () => {
                  const i = activeSources.indexOf(bufferSource);
                  if (i >= 0) {
                    activeSources.splice(i, 1);
                  }
                },
              })
              .connect(destination);
            activeSources.push(bufferSource);
            bufferSource.start(time, offset);
          },
          dispose: () => {
            [buffers, ...activeSources].forEach(node => node.dispose());
          },
        });
      },
    });
  });

const SECOND_NOTES = ['D', 'Eb', 'F', 'G', 'A'];
const OCTAVES = [2, 3, 4];

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const reverb = new Tone.Reverb(50).connect(destination);
  const glockDelay = new Tone.PingPongDelay(0.7, 0.7)
    .set({ wet: 0.4 })
    .connect(reverb);
  return Promise.all([
    getCustomSampler(reverb, samples['vsco2-cellos-susvib-mp']),
    getCustomSampler(glockDelay, samples['vsco2-glock'], 36, 0.05),
    reverb.generate(),
  ]).then(([cellos, glock]) => {
    const playProgression = () => {
      const secondNote =
        SECOND_NOTES[Math.floor(Math.random() * SECOND_NOTES.length)];
      const secondNoteTime = Math.random() * 10 + 10 + 1;
      OCTAVES.forEach(octave => {
        cellos.triggerAttack(`C${octave}`, '+1');
        if (Math.random() < 0.75) {
          glock.triggerAttack(
            `C${Math.random() < 0.5 ? 5 : 6}`,
            `+${1 + Math.random() * secondNoteTime}`
          );
        }
        cellos.triggerAttack(`${secondNote}${octave}`, `+${secondNoteTime}`);
        if (Math.random() < 0.75) {
          glock.triggerAttack(
            `${secondNote}${Math.random() < 0.5 ? 5 : 6}`,
            `+${secondNoteTime + Math.random() * 10}`
          );
        }
      });
      Tone.Transport.scheduleOnce(() => {
        playProgression();
      }, `+${Math.random() * 20 + 30}`);
    };
    playProgression();

    return () => {
      [cellos, glock, reverb, glockDelay].forEach(node => node.dispose());
    };
  });
};

export default makePiece;

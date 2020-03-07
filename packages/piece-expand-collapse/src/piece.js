import Tone from 'tone';
import { Note, Distance } from 'tonal';
import { getBuffers } from '@generative-music/piece-utilities';

const toss = (pcs = [], octaves = []) =>
  octaves.reduce(
    (notes, octave) => notes.concat(pcs.map(pc => `${pc}${octave}`)),
    []
  );

const getReversedBuffers = (buffers, samplesByNote) =>
  new Tone.Buffers(
    Reflect.ownKeys(samplesByNote).reduce((reverseBuffers, note) => {
      reverseBuffers[note] = buffers.get(note).slice(0);
      reverseBuffers[note].reverse = true;
      return reverseBuffers;
    }, {})
  );

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

const PITCH_CLASSES = ['C', 'E', 'G'];
const OCTAVES = [3, 4, 5, 6];
const NOTES = toss(PITCH_CLASSES, OCTAVES);

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const pianoSamples = samples['vsco2-piano-mf'];
  return Promise.all([
    getBuffers(pianoSamples),
    new Tone.Reverb({ decay: 4, wet: 0.5 }).generate(),
  ]).then(([pianoBuffers, reverb]) => {
    const feedbackDelay = new Tone.FeedbackDelay({
      delayTime: 1,
      feedback: 0.3,
      wet: 0.1,
    }).connect(destination);
    reverb.connect(feedbackDelay);
    const reversedBuffers = getReversedBuffers(pianoBuffers, pianoSamples);
    const bufferSources = [];

    const bufferSourceOnEnded = bufferSource => {
      const i = bufferSources.indexOf(bufferSource);
      if (i >= 0) {
        bufferSource.dispose();
        bufferSources.splice(i, 1);
      }
    };

    const play = () => {
      const roll = Math.random();
      const time = 5 + roll * 15;
      const p = 0.4 + roll * 0.5;
      NOTES.filter(() => Math.random() < p).forEach(note => {
        const closestSample = findClosest(note, pianoSamples);
        const difference = Distance.semitones(note, closestSample);
        const playbackRate = Tone.intervalToFrequencyRatio(difference);
        const buffer = pianoBuffers.get(closestSample);
        const source = new Tone.BufferSource(buffer)
          .set({ playbackRate, onended: () => bufferSourceOnEnded(source) })
          .connect(reverb);
        const startTime = Math.random() * time;
        source.start(`+${startTime}`, 0, time * 2 - startTime);
        const reverseBuffer = reversedBuffers.get(closestSample);
        const reverseSource = new Tone.BufferSource(reverseBuffer)
          .set({
            playbackRate,
            onended: () => bufferSourceOnEnded(reverseSource),
          })
          .connect(reverb);
        if (reverseBuffer.duration / playbackRate > time) {
          reverseSource.start(
            `+${time + Math.random() / 10}`,
            reverseBuffer.duration - time * playbackRate
          );
        } else {
          reverseSource.start(
            `+${time * 2 -
              reverseBuffer.duration / playbackRate +
              Math.random() / 10}`
          );
        }
        bufferSources.push(source, reverseSource);
      });

      Tone.Transport.scheduleOnce(() => {
        play();
      }, `+${time * 2 + Math.random() + 1}`);
    };

    play();

    return () => {
      [pianoBuffers, reverb, feedbackDelay, ...bufferSources].forEach(node => {
        node.dispose();
      });
      bufferSources.splice(0, bufferSources.length);
    };
  });
};

export default makePiece;

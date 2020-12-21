import * as Tone from 'tone';
import {
  toss,
  sampleNote,
  wrapActivate,
  createPrerenderableBuffers,
  getRandomElement,
} from '@generative-music/utilities';
import { sampleNames } from '../expand-collapse.gfm.manifest.json';

const createReversedBuffers = (buffers, samplesByNote) =>
  new Tone.ToneAudioBuffers(
    Reflect.ownKeys(samplesByNote).reduce((reverseBuffers, note) => {
      reverseBuffers[note] = buffers.get(note).slice(0);
      reverseBuffers[note].reverse = true;
      return reverseBuffers;
    }, {})
  );

const PITCH_CLASSES = ['C', 'E', 'G'];
const OCTAVES = [3, 4, 5, 6];
const NOTES = toss(PITCH_CLASSES, OCTAVES);

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const pianoSamples =
    samples['expand-collapse__vsco2-piano-mf'] || samples['vsco2-piano-mf'];

  const pianoBuffers = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    onProgress,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'expand-collapse__vsco2-piano-mf',
    getDestination: () =>
      new Tone.Reverb({ decay: 4, wet: 0.5 }).toDestination().generate(),
  });

  const reversedBuffers = createReversedBuffers(pianoBuffers, pianoSamples);
  const activeSources = [];

  const handleBufferSourceEnded = bufferSource => {
    const i = activeSources.indexOf(bufferSource);
    if (i >= 0) {
      activeSources.splice(i, 1);
    }
  };

  const sampledNotes = Object.keys(pianoSamples);

  const play = (dest, first = false) => {
    const roll = Math.random();
    const time = 5 + roll * 15;
    const p = 0.4 + roll * 0.5;
    let notes = NOTES.filter(() => Math.random() < p);
    while (first && notes.length === 0) {
      notes = NOTES.filter(() => Math.random() < p);
    }
    const firstNote = first && getRandomElement(notes);
    notes.forEach(note => {
      const { sampledNote, playbackRate } = sampleNote({
        note,
        sampledNotes,
      });
      const buffer = pianoBuffers.get(sampledNote);
      const source = new Tone.ToneBufferSource(buffer)
        .set({ playbackRate, onended: () => handleBufferSourceEnded(source) })
        .connect(dest);
      const startTime = firstNote === note ? 1 : Math.random() * time;
      const reverseBuffer = reversedBuffers.get(sampledNote);
      const reverseSource = new Tone.BufferSource(reverseBuffer)
        .set({
          playbackRate,
          onended: () => handleBufferSourceEnded(reverseSource),
        })
        .connect(dest);
      activeSources.push(source, reverseSource);
      source.start(`+${startTime}`, 0, time * 2 - startTime);

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
    });

    Tone.Transport.scheduleOnce(() => {
      play(dest);
    }, `+${time * 2 + Math.random() + 1}`);
  };

  const schedule = ({ destination }) => {
    const feedbackDelay = new Tone.FeedbackDelay({
      delayTime: 1,
      feedback: 0.3,
      wet: 0.1,
    }).connect(destination);
    play(feedbackDelay, true);

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      feedbackDelay.dispose();
    };
  };

  const deactivate = () => {
    pianoBuffers.dispose();
    reversedBuffers.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

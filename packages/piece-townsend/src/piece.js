import * as Tone from 'tone';
import {
  wrapActivate,
  createPrerenderedSampler,
  createPrerenderedBufferArray,
} from '@generative-music/utilities';
import { sampleNames } from '../townsend.gfm.manifest.json';

const FLUTE_NOTES = ['C3', 'C4', 'G3', 'G4'];

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const flute = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    notes: FLUTE_NOTES,
    sourceInstrumentName: 'vsco2-flute-susvib',
    renderedInstrumentName: 'townsend::vsco2-flute-susvib',
    additionalRenderLength: 2,
    getDestination: () => new Tone.Reverb(50).toDestination().generate(),
    onProgress: val => onProgress(val * 0.2),
  });

  const guitarBuffers = await createPrerenderedBufferArray({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'acoustic-guitar-chords-cmaj',
    renderedInstrumentName: 'townsend::acoustic-guitar-chords-cmaj',
    additionalRenderLength: 0.5,
    getDestination: () =>
      Promise.resolve(
        new Tone.Freeverb({
          roomSize: 0.5,
          dampening: 5000,
          wet: 0.2,
        }).toDestination()
      ),
    onProgress: val => onProgress(val * 0.8 + 0.2),
  });

  const fluteGain = new Tone.Gain().connect(destination);
  flute.connect(fluteGain);
  const intervalTimes = FLUTE_NOTES.map(() => Math.random() * 10 + 5);
  const shortestInterval = Math.min(...intervalTimes);
  const limiter = new Tone.Limiter().connect(destination);
  const activeSources = [];

  const playRandomChord = lastChord => {
    const nextChords = guitarBuffers.filter(chord => chord !== lastChord);
    const randomChord =
      nextChords[Math.floor(Math.random() * nextChords.length)];
    const source = new Tone.ToneBufferSource(randomChord).connect(limiter);
    activeSources.push(source);
    source.onended = () => {
      const i = activeSources.indexOf(source);
      if (i >= 0) {
        activeSources.splice(i, 1);
      }
    };
    source.start('+1');
    Tone.Transport.scheduleOnce(() => {
      playRandomChord(randomChord);
    }, `+${Math.random() * 10 + 5}`);
  };

  const schedule = () => {
    const fluteGainLfo = new Tone.LFO({
      frequency: Math.random() / 100,
      min: 0,
      max: 0.2,
    });
    fluteGainLfo.connect(fluteGain.gain);
    fluteGainLfo.start();

    const delay = new Tone.FeedbackDelay({
      delayTime: 1,
      feedback: 0.7,
      maxDelay: 1,
    });
    fluteGain.connect(delay);

    FLUTE_NOTES.forEach((note, i) => {
      Tone.Transport.scheduleRepeat(
        () => flute.triggerAttack(note, '+1'),
        intervalTimes[i],
        intervalTimes[i] - shortestInterval
      );
    });

    Tone.Transport.scheduleOnce(() => {
      playRandomChord();
    }, Math.random() * 5 + 5);

    return () => {
      fluteGainLfo.stop();
      fluteGainLfo.dispose();
      delay.dispose();
      flute.releaseAll(0);
      activeSources.forEach(source => {
        source.stop(0);
      });
    };
  };

  const deactivate = () => {
    guitarBuffers
      .concat([flute, fluteGain, limiter])
      .forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

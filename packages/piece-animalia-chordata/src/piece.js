import * as Tone from 'tone';
import {
  createBuffer,
  createPrerenderableBufferArray,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../animalia-chordata.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const activeSources = [];
  const filter = new Tone.Filter(500);
  const compressor = new Tone.Compressor().connect(filter);
  const crossFade = new Tone.CrossFade().connect(compressor);

  const temporaryBuffers = [];

  if (
    !samples['animalia-chordata__whales-dryer'] &&
    !samples['animalia-chordata__whales-wetter']
  ) {
    const buffer = await createBuffer(samples.whales[0]);
    const reverseBuffer = Tone.ToneAudioBuffer.fromArray(buffer.toArray());
    reverseBuffer.reverse = true;
    onProgress(0.02);
    samples.whales.push(reverseBuffer);
    temporaryBuffers.push(buffer, reverseBuffer);
  }

  const dryerBuffers = await createPrerenderableBufferArray({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'whales',
    renderedInstrumentName: 'animalia-chordata__whales-dryer',
    getDestination: () =>
      new Tone.Reverb(30)
        .set({ wet: 0.5 })
        .toDestination()
        .generate(),
    onProgress: val => onProgress(val * 0.5),
  });

  const wetterBuffers = await createPrerenderableBufferArray({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'whales',
    renderedInstrumentName: 'animalia-chordata__whales-wetter',
    getDestination: () =>
      new Tone.Reverb(30)
        .set({ wet: 0.9 })
        .toDestination()
        .generate(),
    onProgress: val => onProgress(val * 0.5 + 0.5),
  });

  temporaryBuffers.forEach(buffer => {
    buffer.dispose();
  });

  const play = () => {
    const bufferIndex = Math.round(window.generativeMusic.rng() * 0.5);
    const buffers = [dryerBuffers, wetterBuffers].map(
      bufferArray => bufferArray[bufferIndex]
    );
    const playbackRate = window.generativeMusic.rng() * 0.2 + 0.1;
    buffers.forEach(buf => {
      const source = new Tone.BufferSource(buf)
        .set({
          playbackRate,
          fadeIn: 5,
          fadeOut: 5,
          curve: 'linear',
          onended: () => {
            const i = activeSources.indexOf(source);
            if (i >= 0) {
              activeSources.splice(i, 1);
            }
          },
        })
        .connect(bufferIndex === 0 ? crossFade.a : crossFade.b);
      activeSources.push(source);
      source.start('+1', 3, buf.duration / playbackRate - 3);
    });

    Tone.Transport.scheduleOnce(() => {
      play();
    }, `+${buffers[0].duration / playbackRate - window.generativeMusic.rng() * 15 - 15}`);
  };

  const schedule = ({ destination }) => {
    const feedbackDelay = new Tone.FeedbackDelay({
      delayTime: 0.7,
      feedback: 0.8,
    });
    filter.connect(feedbackDelay);
    const lfo = new Tone.LFO(window.generativeMusic.rng() * 0.005 + 0.005).set({
      phase: 90,
    });
    lfo.connect(crossFade.fade);
    lfo.start();

    play();

    feedbackDelay.connect(destination);

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      feedbackDelay.dispose();
      lfo.dispose();
    };
  };

  const deactivate = () => {
    [compressor, filter, crossFade, ...dryerBuffers, ...wetterBuffers].forEach(
      node => node.dispose()
    );
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['animalia-chordata'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

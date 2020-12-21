import * as Tone from 'tone';
import {
  wrapActivate,
  createPrerenderableBuffers,
  createPitchShiftedSampler,
} from '@generative-music/utilities';
import { sampleNames } from '../buttafingers.gfm.manifest.json';

const NOTES = ['C4', 'E4', 'F4', 'G4'];
const PITCH_CHANGES = [-36, -24];

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const [wines, claves] = await Promise.all([
    Promise.all(
      NOTES.reduce(
        samplers =>
          samplers.concat(
            PITCH_CHANGES.map(pitchShift =>
              createPitchShiftedSampler({
                pitchShift,
                samplesByNote: samples['vcsl-wine-glasses-slow'],
                attack: 3,
                release: 3,
              })
            )
          ),
        []
      )
    ),
    createPrerenderableBuffers({
      samples,
      sampleLibrary,
      sourceInstrumentName: 'vcsl-claves',
      renderedInstrumentName: 'buttafingers__vcsl-claves',
      additionalRenderLength: 0,
      getDestination: () =>
        Promise.resolve(new Tone.Freeverb({ roomSize: 0.6 }).toDestination()),
      onProgress,
    }),
  ]);
  const disposableNodes = [];
  const disposeNode = node => {
    node.dispose();
    const i = disposableNodes.indexOf(node);
    if (i >= 0) {
      disposableNodes.splice(i, 1);
    }
  };
  const compressor = new Tone.Compressor();
  const filter = new Tone.Filter(200, 'lowpass', -48);
  filter.connect(compressor);

  const claveSounds =
    samples['vcsl-claves'] || samples['buttafingers__vcsl-claves'];

  const claveVol = new Tone.Volume(-15);

  const ballBounceClave = () => {
    const panner = new Tone.Panner(Math.random() * 2 - 1).connect(claveVol);
    disposableNodes.push(panner);
    const buffer = claves.get(Math.floor(Math.random() * claveSounds.length));
    let time = Math.random() + 1;
    const deltaMultiplier = Math.random() * 0.1 + 0.75;
    const playbackRate = Math.random() + 0.5;
    for (
      let delayDelta = 1;
      delayDelta >= (1 - deltaMultiplier - 0.15) / 10;
      delayDelta *= deltaMultiplier, time += delayDelta
    ) {
      const source = new Tone.ToneBufferSource(buffer)
        .set({
          playbackRate,
          onended: () => {
            disposeNode(source);
          },
        })
        .connect(panner);
      disposableNodes.push(source);
      source.start(`+${time}`);
    }
    Tone.Transport.scheduleOnce(() => {
      disposeNode(panner);
    }, `+60`);
    Tone.Transport.scheduleOnce(() => {
      ballBounceClave();
    }, `+${Math.random() * 10 + 10}`);
  };

  const schedule = ({ destination }) => {
    compressor.connect(destination);
    const delay = new Tone.FeedbackDelay({
      delayTime: 3,
      feedback: 0.3,
      wet: 0.2,
    });

    claveVol.connect(delay);

    const firstIndex = Math.floor(Math.random() * wines.length);

    wines.forEach((wine, i) => {
      const gain = new Tone.Gain().connect(filter);
      const lfo = new Tone.LFO({
        frequency: Math.random() / 100,
        phase: firstIndex === i ? 270 : Math.random() * 360,
      });
      lfo.connect(gain.gain).start();
      wine.connect(gain);
      disposableNodes.push(gain, lfo);
      const playNote = () => {
        wine.triggerAttack(NOTES[Math.floor(i / 2)], '+1');
        Tone.Transport.scheduleOnce(() => {
          playNote();
        }, '+60');
      };
      if (i === firstIndex) {
        playNote();
      } else {
        Tone.Transport.scheduleOnce(() => {
          playNote();
        }, `+${Math.random() * 60}`);
      }
    });

    Tone.Transport.scheduleOnce(() => {
      ballBounceClave(delay);
    }, `+${Math.random() * 10 + 10}`);

    delay.connect(destination);

    return () => {
      wines.forEach(sampler => {
        sampler.releaseAll(0);
      });
      disposableNodes.forEach(disposeNode);
      delay.dispose();
    };
  };

  const deactivate = () => {
    disposableNodes
      .concat(wines)
      .concat([claves, compressor, filter])
      .forEach(disposeNode);
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

import * as Tone from 'tone';
import {
  createBuffers,
  createPrerenderableBuffers,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../didgeridoobeats.gfm.manifest.json';

const DRUM_LOOP_LENGTH_S = 75;
const BEAT_SIXTEETHS_COUNT = 32;

const getPattern = (quarterP, eighthP, sixteethP) => {
  const pattern = [];
  for (let i = 0; i < BEAT_SIXTEETHS_COUNT; i += 1) {
    if (i % 4 === 0) {
      if (window.generativeMusic.rng() < quarterP) {
        pattern.push(i);
      }
    } else if (i % 2 === 0) {
      if (window.generativeMusic.rng() < eighthP) {
        pattern.push(i);
      }
    } else if (window.generativeMusic.rng() < sixteethP) {
      pattern.push(i);
    }
  }
  return pattern;
};

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const masterVol = new Tone.Volume(-5);
  const drumGain = new Tone.Gain(0).connect(masterVol);
  const hatVolume = new Tone.Volume(-5).connect(drumGain);

  const activeSources = [];

  const percussionInstrument = instrumentName => {
    const instrumentSamples = samples[instrumentName];
    return createBuffers(instrumentSamples).then(buffers => {
      const randomBuffer = () =>
        buffers.get(Math.floor(window.generativeMusic.rng() * instrumentSamples.length));

      let currentBuffer = randomBuffer();
      return {
        newSound: () => {
          currentBuffer = randomBuffer();
        },
        play: t => {
          const bufferSource = new Tone.BufferSource(currentBuffer).connect(
            instrumentName.includes('hats') ? hatVolume : drumGain
          );
          activeSources.push(bufferSource);
          bufferSource.onended = () => {
            const index = activeSources.indexOf(bufferSource);
            if (index >= 0) {
              activeSources.splice(index, 1);
            }
          };
          bufferSource.start(t);
        },
      };
    });
  };

  const didgeridooSamples =
    samples['vcsl-didgeridoo-sus'] ||
    samples['didgeridoobeats__vcsl-didgeridoo-sus'];

  const [hats, kick, snare, didgeridoo] = await Promise.all(
    ['itslucid-lofi-hats', 'itslucid-lofi-kick', 'itslucid-lofi-snare']
      .map(i => percussionInstrument(i))
      .concat([
        createPrerenderableBuffers({
          samples,
          sampleLibrary,
          sourceInstrumentName: 'vcsl-didgeridoo-sus',
          renderedInstrumentName: 'didgeridoobeats__vcsl-didgeridoo-sus',
          additionalRenderLength: 1,
          getDestination: () =>
            Promise.resolve(
              new Tone.Freeverb({ roomSize: 0.7, wet: 0.5 }).toDestination()
            ),
          onProgress: onProgress,
        }),
      ])
  );

  const playDrumLoop = () => {
    drumGain.gain.setValueAtTime(0, Tone.now());
    drumGain.gain.linearRampToValueAtTime(0.2, `+${DRUM_LOOP_LENGTH_S / 2}`);

    Tone.Transport.scheduleOnce(() => {
      drumGain.gain.setValueAtTime(0.2, Tone.now());
      drumGain.gain.linearRampToValueAtTime(0, `+${DRUM_LOOP_LENGTH_S / 2}`);
    }, `+${DRUM_LOOP_LENGTH_S / 2}`);
    const sixteenthTime = window.generativeMusic.rng() * 0.05 + 0.1;

    const hatPattern = getPattern(0.9, 0.5, 0.1);
    const snarePattern = getPattern(0.5, 0.25, 0.1);
    const kickPattern = getPattern(0.5, 0.2, 0.05);

    [hats, snare, kick].forEach(({ newSound }) => newSound());

    [[hats, hatPattern], [snare, snarePattern], [kick, kickPattern]].forEach(
      ([inst, pattern], i) => {
        if (i > 0 || window.generativeMusic.rng() < 0.25) {
          Tone.Transport.scheduleRepeat(
            () => {
              pattern.forEach(beat => {
                inst.play(`+${beat * sixteenthTime + 0.05}`);
              });
            },
            BEAT_SIXTEETHS_COUNT * sixteenthTime,
            '+0.05',
            DRUM_LOOP_LENGTH_S - BEAT_SIXTEETHS_COUNT * sixteenthTime + 0.5
          );
        }
      }
    );

    Tone.Transport.scheduleOnce(() => {
      playDrumLoop();
    }, `+${DRUM_LOOP_LENGTH_S + 3}`);
  };

  const chorus = new Tone.Chorus();

  const playDigeridoo = dest => {
    const index = Math.floor(window.generativeMusic.rng() * didgeridooSamples.length);
    const buffer = didgeridoo.get(index);
    let playbackRate = 1;
    if (window.generativeMusic.rng() < 0.1) {
      playbackRate -= 0.2;
    }
    if (window.generativeMusic.rng() < 0.1) {
      playbackRate -= 0.2;
    }
    const source = new Tone.ToneBufferSource({
      url: buffer,
      playbackRate,
    }).connect(dest);
    activeSources.push(source);
    source.onended = () => {
      const i = activeSources.indexOf(source);
      if (i >= 0) {
        activeSources.splice(index, 1);
      }
    };
    source.start('+1');
    Tone.Transport.scheduleOnce(() => {
      playDigeridoo(dest);
    }, `+${window.generativeMusic.rng() < 0.03 ? window.generativeMusic.rng() * 10 + 10 : window.generativeMusic.rng() * 5 + 5}`);
  };

  const schedule = ({ destination }) => {
    masterVol.connect(destination);
    const didgeridooAutoFilter = new Tone.AutoFilter({
      frequency: 0.06,
      octaves: 4,
      filter: { type: 'bandpass' },
    })
      .set({ wet: 0.7 })
      .start();
    const drumsAutoFilter = new Tone.AutoFilter({
      frequency: 0.08,
      octaves: 4,
      filter: { type: 'bandpass' },
    })
      .set({ wet: 0.7 })
      .start()
      .connect(masterVol);

    drumGain.connect(drumsAutoFilter);

    const delay = new Tone.FeedbackDelay({
      feedback: 0.8,
      delayTime: 0.2,
    }).chain(chorus, didgeridooAutoFilter, masterVol);

    Tone.Transport.scheduleOnce(() => {
      playDrumLoop();
    }, '+5');

    Tone.Transport.scheduleOnce(() => {
      playDigeridoo(delay);
    }, '+1');

    return () => {
      drumGain.gain.cancelScheduledValues(Tone.now());
      drumGain.gain.setValueAtTime(0, Tone.now());
      activeSources.forEach(source => {
        source.stop(0);
      });
      [delay, drumsAutoFilter, didgeridooAutoFilter].forEach(node => {
        node.dispose();
      });
    };
  };

  const deactivate = () => {
    [masterVol, drumGain, hatVolume, chorus].forEach(node => {
      node.dispose();
    });
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

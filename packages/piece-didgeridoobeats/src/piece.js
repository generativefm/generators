import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const DRUM_LOOP_LENGTH_S = 75;
const BEAT_SIXTEETHS_COUNT = 32;
const MIN_DRUMS_VOLUME_DB = -500;
const MAX_DRUMS_VOLUME_DB = -10;

const getBuffers = instrumentSamples =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(instrumentSamples, () => resolve(buffers));
  });

const getPattern = (quarterP, eighthP, sixteethP) => {
  const pattern = [];
  for (let i = 0; i < BEAT_SIXTEETHS_COUNT; i += 1) {
    if (i % 4 === 0) {
      if (Math.random() < quarterP) {
        pattern.push(i);
      }
    } else if (i % 2 === 0) {
      if (Math.random() < eighthP) {
        pattern.push(i);
      }
    } else if (Math.random() < sixteethP) {
      pattern.push(i);
    }
  }
  return pattern;
};

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource,
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename).then(
    ({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      const masterVol = new Tone.Volume(-5).connect(destination);

      const drumsAutoFilter = new Tone.AutoFilter({
        frequency: 0.08,
        octaves: 4,
        filter: { type: 'bandpass' },
      })
        .set({ wet: 0.7 })
        .start()
        .connect(masterVol);
      const volume = new Tone.Volume(MIN_DRUMS_VOLUME_DB).connect(
        drumsAutoFilter
      );
      const hatVolume = new Tone.Volume(-5).connect(volume);

      const percussionInstrument = instrumentName => {
        const instrumentSamples = samples[instrumentName][preferredFormat];
        return getBuffers(instrumentSamples).then(buffers => {
          const randomBuffer = () =>
            buffers.get(Math.floor(Math.random() * instrumentSamples.length));

          let currentBuffer = randomBuffer();
          return {
            newSound: () => {
              currentBuffer = randomBuffer();
            },
            play: t => {
              const bufferSource = new Tone.BufferSource(currentBuffer).connect(
                instrumentName.includes('hats') ? hatVolume : volume
              );
              bufferSource.onended = () => bufferSource.dispose();
              bufferSource.start(t);
            },
          };
        });
      };

      const didgeridooSamples = samples['vcsl-didgeridoo-sus'][preferredFormat];

      return Promise.all(
        ['itslucid-lofi-hats', 'itslucid-lofi-kick', 'itslucid-lofi-snare']
          .map(i => percussionInstrument(i))
          .concat([getBuffers(didgeridooSamples)])
      ).then(([hats, kick, snare, didgeridoo]) => {
        const playDrumLoop = time => {
          volume.volume.linearRampToValueAtTime(
            MAX_DRUMS_VOLUME_DB,
            time + DRUM_LOOP_LENGTH_S / 2
          );
          Tone.Transport.scheduleOnce(volumeTime => {
            volume.volume.linearRampToValueAtTime(
              MIN_DRUMS_VOLUME_DB,
              volumeTime + DRUM_LOOP_LENGTH_S / 2
            );
          }, time + DRUM_LOOP_LENGTH_S / 2);
          const SIXTEENTH_TIME = Math.random() * 0.05 + 0.1;

          const hatPattern = getPattern(0.9, 0.5, 0.1);
          const snarePattern = getPattern(0.5, 0.25, 0.1);
          const kickPattern = getPattern(0.5, 0.2, 0.05);

          [hats, snare, kick].forEach(({ newSound }) => newSound());

          [
            [hats, hatPattern],
            [snare, snarePattern],
            [kick, kickPattern],
          ].forEach(([inst, pattern], i) => {
            if (i > 0 || Math.random() < 0.25) {
              Tone.Transport.scheduleRepeat(
                patternTime => {
                  pattern.forEach(beat => {
                    inst.play(patternTime + beat * SIXTEENTH_TIME);
                  });
                },
                BEAT_SIXTEETHS_COUNT * SIXTEENTH_TIME,
                time,
                DRUM_LOOP_LENGTH_S
              );
            }
          });

          Tone.Transport.scheduleOnce(nextTime => {
            playDrumLoop(nextTime);
          }, time + DRUM_LOOP_LENGTH_S + 2);
        };

        Tone.Transport.scheduleOnce(time => {
          playDrumLoop(time);
        }, 5);

        const didgeridooAutoFilter = new Tone.AutoFilter({
          frequency: 0.06,
          octaves: 4,
          filter: { type: 'bandpass' },
        })
          .set({ wet: 0.7 })
          .start()
          .connect(masterVol);

        const chorus = new Tone.Chorus().connect(didgeridooAutoFilter);
        const delay = new Tone.FeedbackDelay({
          feedback: 0.8,
          delayTime: 0.2,
        }).connect(chorus);
        const reverb = new Tone.Freeverb({ roomSize: 0.7, wet: 0.5 }).connect(
          delay
        );

        const playDigeridoo = time => {
          const index = Math.floor(Math.random() * didgeridooSamples.length);
          const buffer = didgeridoo.get(index);
          let playbackRate = 1;
          if (Math.random() < 0.1) {
            playbackRate -= 0.2;
          }
          if (Math.random() < 0.1) {
            playbackRate -= 0.2;
          }
          const source = new Tone.BufferSource({
            buffer,
            playbackRate,
          }).connect(reverb);
          source.onended = () => source.dispose();
          source.start(time + 1);
          Tone.Transport.scheduleOnce(nextTime => {
            playDigeridoo(nextTime);
          }, time + (Math.random() < 0.03 ? Math.random() * 10 + 10 : Math.random() * 5 + 5));
        };
        playDigeridoo(1);

        return Promise.resolve(() => {
          [
            masterVol,
            drumsAutoFilter,
            volume,
            hatVolume,
            didgeridooAutoFilter,
            chorus,
            delay,
            reverb,
          ].forEach(node => {
            node.dispose();
          });
        });
      });
    }
  );

export default makePiece;

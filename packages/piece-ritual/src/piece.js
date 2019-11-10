import Tone from 'tone';
import { Note, Distance } from 'tonal';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getBuffers = buffersById =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(buffersById, {
      onload: () => resolve(buffers),
    });
  });

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

const getCustomSampler = (samplesByNote, semitoneChange = 24) =>
  new Promise(resolve => {
    const activeSources = [];
    let destination;
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
            bufferSource.start(time);
          },
          dispose: () => {
            [buffers, ...activeSources].forEach(node => node.dispose());
          },
          connect: dest => {
            destination = dest;
          },
        });
      },
    });
  });

const getPercussionSampler = sampleUrls =>
  getBuffers(sampleUrls).then(buffers => {
    const activeSources = [];
    let destination;
    return {
      triggerAttack: time => {
        const buffer = buffers.get(
          Math.floor(Math.random() * sampleUrls.length)
        );
        const source = new Tone.BufferSource(buffer)
          .set({
            onended: () => {
              const i = activeSources.indexOf(source);
              if (i >= 0) {
                activeSources.splice(i, 1);
              }
            },
          })
          .connect(destination);
        source.start(time);
      },
      connect: dest => {
        destination = dest;
      },
      dispose: () => {
        [buffers, ...activeSources].forEach(node => {
          node.dispose();
        });
      },
    };
  });

const violinPhrases = [['G#4', 'F4', 'F#4', 'C#4'], ['A#4', 'F#4', 'G#4']];

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename).then(
    ({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      const didgeridooSamples = samples['vcsl-didgeridoo-sus'][preferredFormat];
      return Promise.all([
        getBuffers(didgeridooSamples),
        new Tone.Reverb(30).connect(destination).generate(),
        getCustomSampler(samples['vsco2-violins-susvib'][preferredFormat]),
        getPercussionSampler(samples['vcsl-bassdrum-hit-ff'][preferredFormat]),
        new Tone.Reverb(15)
          .set({ wet: 0.5 })
          .connect(destination)
          .generate(),
        ...[1, 2, 3, 4, 5].map(id =>
          getPercussionSampler(samples[`vcsl-darbuka-${id}-f`][preferredFormat])
        ),
      ]).then(
        ([
          buffers,
          reverb,
          violins,
          bassdrum,
          percussionReverb,
          ...darbukas
        ]) => {
          const drone = () => {
            const buffer = buffers.get(
              Math.floor(Math.random() * didgeridooSamples.length)
            );
            const playbackRate = Math.random() < 0.9 ? 1 : 0.5;
            const source = new Tone.BufferSource(buffer)
              .set({ fadeIn: 5, playbackRate })
              .connect(reverb);
            source.start('+1');
            Tone.Transport.scheduleOnce(() => {
              drone();
            }, `+${1 + buffer.duration / 3 / playbackRate}`);
          };
          drone();
          violins.connect(reverb);

          const playViolinPhrase = () => {
            const phrase =
              violinPhrases[Math.floor(Math.random() * violinPhrases.length)];

            const totalDelay = phrase.reduce((delay, note) => {
              violins.triggerAttack(note, `+${delay}`);
              return delay + Math.random() * 20 + 20;
            }, Math.random() * 5);

            Tone.Transport.scheduleOnce(() => {
              playViolinPhrase();
            }, `+${totalDelay + 10}`);
          };

          playViolinPhrase();

          const percussionVol = new Tone.Volume().connect(percussionReverb);
          bassdrum.connect(percussionVol);

          const percussionVolLfo = new Tone.LFO(
            Math.random() / 1000 + 0.001,
            -200,
            -10
          ).set({ phase: 90 });
          percussionVolLfo.connect(percussionVol.volume);
          percussionVolLfo.start();

          darbukas.forEach(darbuka => {
            darbuka.connect(percussionVol);
          });

          const percussion = (beatTime, up) => {
            bassdrum.triggerAttack('+1');
            bassdrum.triggerAttack(`+${1 + beatTime * 2}`);

            for (let i = 0; i < 32; i += 1) {
              if (i === 0 || i === 2 || Math.random() < 0.3) {
                darbukas[
                  Math.floor(Math.random() * darbukas.length)
                ].triggerAttack(`+${1 + beatTime * i}`);
              }
            }

            Tone.Transport.scheduleOnce(() => {
              if (up && beatTime > 0.6) {
                percussion(beatTime * (1 - Math.random() * 0.02), false);
              } else if (!up && beatTime < 0.2) {
                percussion(beatTime * (1 + Math.random() * 0.02), true);
              } else if (up) {
                percussion(beatTime * (1 + Math.random() * 0.02), true);
              } else {
                percussion(beatTime * (1 - Math.random() * 0.02), false);
              }
            }, `+${32 * beatTime}`);
          };

          percussion(Math.random() * 0.4 + 0.2, true);

          return () => {
            [
              buffers,
              reverb,
              violins,
              bassdrum,
              percussionReverb,
              percussionVol,
              percussionVolLfo,
              ...darbukas,
            ].forEach(node => {
              node.dispose();
            });
          };
        }
      );
    }
  );

export default makePiece;

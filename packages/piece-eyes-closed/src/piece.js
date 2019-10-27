import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';
import { Distance, Note } from 'tonal';

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

const getCustomSampler = (destination, samplesByNote, semitoneChange = -24) =>
  new Promise(resolve => {
    const activeSources = [];
    const buffers = new Tone.Buffers(samplesByNote, {
      onload: () =>
        resolve({
          triggerAttack: (note, time = '+1') => {
            const closestSample = findClosest(samplesByNote, note);
            const difference = Distance.semitones(closestSample, note);
            const buffer = buffers.get(closestSample);
            const playbackRate = Tone.intervalToFrequencyRatio(
              difference + semitoneChange
            );
            const source = new Tone.BufferSource(buffer)
              .set({
                playbackRate,
                onended: () => {
                  const i = activeSources.indexOf(buffer);
                  if (i >= 0) {
                    activeSources.splice(i, 1);
                  }
                },
              })
              .connect(destination);
            source.start(time);
          },
          dispose: () => {
            [buffers, ...activeSources].forEach(node => node.dispose());
          },
        }),
    });
  });

const getBuffer = url =>
  new Promise(resolve => {
    const buffer = new Tone.Buffer(url, () => resolve(buffer));
  });

const PHRASE = [['G#5', 1], ['F#5', 2], ['D#5', 3.5], ['C#5', 4], ['D#5', 4.5]];
const CHORD = ['G#3', 'G#4'];

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
      const danTranhLfo = new Tone.AutoFilter(Math.random() / 100 + 0.01, 200);
      const pianoLfo = new Tone.AutoFilter(Math.random() / 100 + 0.01, 400);

      [danTranhLfo, pianoLfo].forEach(lfo => {
        lfo.connect(destination);
        lfo.start();
      });
      return Promise.all([
        getBuffer(samples['dan-tranh-gliss-ps'][preferredFormat][0]),
        getCustomSampler(pianoLfo, samples['vsco2-piano-mf'][preferredFormat]),
      ]).then(([danTranh, piano]) => {
        const playDanTranh = () => {
          const offset = Math.pow(Math.random(), 3) * 120;
          const duration = Math.random() * 60 + 60;
          const source = new Tone.BufferSource(danTranh)
            .set({
              fadeIn: 5,
              fadeOut: 5,
            })
            .connect(danTranhLfo);
          source.start('+1', offset, duration);
          Tone.Transport.scheduleOnce(() => {
            playDanTranh();
          }, `+${1 + duration - 5}`);
        };

        playDanTranh();

        const schedulePhrase = () => {
          Tone.Transport.scheduleOnce(() => {
            const multiplier = Math.pow(Math.random(), 2);
            PHRASE.slice(0, Math.ceil(Math.random() * PHRASE.length)).forEach(
              ([note, time], i) => {
                piano.triggerAttack(
                  note,
                  `+${time * (1 + multiplier) + i * multiplier}`
                );
              }
            );
            schedulePhrase();
          }, `+${Math.random() * 60 + 30}`);
        };
        schedulePhrase();

        const scheduleChord = () => {
          Tone.Transport.scheduleOnce(() => {
            CHORD.forEach(note => {
              piano.triggerAttack(note, `+${1 + Math.random() / 10 - 0.05}`);
            });
            scheduleChord();
          }, `+${Math.random() * 60 + 30}`);
        };

        scheduleChord();
      });
    }
  );

export default makePiece;

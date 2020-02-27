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

const getCustomSampler = (destination, samplesByNote, semitoneChange = 24) =>
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
            bufferSource.start(time);
          },
          dispose: () => {
            [buffers, ...activeSources].forEach(node => node.dispose());
          },
        });
      },
    });
  });

const phraseProto = [
  ['C4'],
  ['C6'],
  ['B5'],
  ['D6', 'C6'],
  ['C6', 'B5'],
  ['A5', 'G5'],
  ['G5', 'F5'],
  ['B5', 'A5'],
  ['E5', 'G5'],
  ['C5'],
];

const getPhrase = () =>
  phraseProto.reduce((phrase, nextProtoNotes) => {
    const nextPossibleNotes = nextProtoNotes.filter(
      note => note !== phrase[phrase.length - 1]
    );
    return phrase.concat(
      nextPossibleNotes[Math.floor(Math.random() * nextPossibleNotes.length)]
    );
  }, []);

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const masterVol = new Tone.Volume(5).connect(destination);
  const volume = new Tone.Volume().connect(masterVol);
  const volLfo = new Tone.LFO(0.001, -100, -5).set({
    phase: 90,
  });
  volLfo.connect(volume.volume);
  volLfo.start();
  return Promise.all([
    getCustomSampler(masterVol, samples['vsco2-piano-mf']),
    getCustomSampler(volume, samples['vsco2-violins-susvib'], 36),
  ]).then(([piano, violins]) => {
    const playRandomPhrase = () => {
      let phrase = getPhrase();
      if (Math.random() < 0.5) {
        phrase = phrase.map(
          note => `${note[0]}${Number.parseInt(note[1], 10) + 1}`
        );
      }
      const multiplier = Math.random() + 1.75;
      phrase.forEach((note, i) => {
        const offset = Math.random() * 0.1 - 0.05 + 1;
        if (i <= 2) {
          piano.triggerAttack(note, `+${i * multiplier + offset}`);
        } else if (i >= 3 && i <= 5) {
          piano.triggerAttack(
            note,
            `+${3 * multiplier + ((i - 3) * multiplier) / 3 + offset}`
          );
        } else if (i < phrase.length - 1 || Math.random() < 0.95) {
          piano.triggerAttack(
            note,
            `+${4.5 * multiplier + ((i - 4.5) * multiplier) / 2 + offset}`
          );
        }
      });

      Tone.Transport.scheduleOnce(() => {
        playRandomPhrase();
      }, `+${Math.random() * 5 + multiplier * phrase.length + 3}`);
    };

    playRandomPhrase();

    ['C4', 'G3', 'C5'].forEach(note => {
      const play = () => {
        violins.triggerAttack(note, '+1');

        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${Math.random() * 30 + 30}`);
      };
      play();
    });
    return () => {
      [masterVol, volume, volLfo, piano, violins].forEach(node =>
        node.dispose()
      );
    };
  });
};

export default makePiece;

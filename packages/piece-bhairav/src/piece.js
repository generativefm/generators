import Tone from 'tone';
import { Distance, Interval } from 'tonal';
import { getSampler } from '@generative-music/utilities';

const ragaBhairav = [
  [0, 2],
  [4, 2],
  [5, 2],
  [7, 2],
  [4, 2],
  [5, 2],
  [8, 4],
  [11, 2],
  [12, 4],
  [8, 2],
  [11, 2],
  [8, 2],
  [7, 2],
  [5, 2],
  [7, 2],
  [4, 2],
  [1, 2],
  [0, 4],
];

function* makeRagaGenerator(raga) {
  function getNewPhrase() {
    const phrase = [];
    let noteIdx = Math.floor(Math.random() * (raga.length - 4));
    const maxPhraseLength = Math.ceil(Math.random() * 12);
    const divisor = Math.random() + 0.5;
    for (
      let count = 0;
      phrase.length < maxPhraseLength &&
      noteIdx < raga.length &&
      noteIdx >= 0 &&
      (phrase.length > 1 || Math.random() < 0.95);
      count += 1
    ) {
      const [interval, time] = raga[noteIdx];

      const multiplier =
        phrase.length === maxPhraseLength - 1 || noteIdx === raga.length - 1
          ? 4
          : 1;

      phrase.push([interval, (time / divisor) * multiplier]);

      const step = Math.ceil(Math.random() * 3);
      noteIdx += Math.random() < 0.2 ? -step : step;
    }
    return phrase;
  }

  let phrase;

  while (true) {
    if (
      typeof phrase === 'undefined' ||
      phrase.length <= 1 ||
      Math.random() < 0.5
    ) {
      phrase = getNewPhrase();
    }
    for (const note of phrase) {
      yield note;
    }
  }
}

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getSampler(samples['vsco2-piano-mf']),
    getSampler(samples['vsco2-cellos-susvib-mp'], {
      attack: 2,
      curve: 'linear',
      release: 2,
    }),
    new Tone.Reverb(15).set({ wet: 0.6 }).generate(),
  ]).then(([pianoSampler, cellos, reverb]) => {
    reverb.connect(destination);
    pianoSampler.connect(reverb);

    let tonic = Math.random() < 0.5 ? 'C#4' : 'C#5';

    const playNote = (note, time = 0, velocity = 1) =>
      pianoSampler.triggerAttack(note, `+${1 + time}`, velocity);

    const ragaGenerator = makeRagaGenerator(ragaBhairav);

    const celloFilter = new Tone.AutoFilter(
      Math.random() / 100 + 0.01,
      50,
      3
    ).connect(reverb);
    celloFilter.start();
    cellos.connect(celloFilter);

    const celloDrone = note => {
      cellos.triggerAttack(note, '+1');
      Tone.Transport.scheduleOnce(() => {
        celloDrone(note);
      }, `+${Math.random() * 10 + 5}`);
    };

    ['C#2', 'C#1', 'G#1', 'G#2'].forEach(note => {
      Tone.Transport.scheduleOnce(() => {
        celloDrone(note);
      }, `+${Math.random() * 5}`);
    });

    const playNextNote = () => {
      const { value } = ragaGenerator.next();
      const [interval, time] = value;
      const note = Distance.transpose(tonic, Interval.fromSemitones(interval));
      playNote(note);
      if (Math.random() < (interval === 0 || interval === 12 ? 0.5 : 0.1)) {
        const lowNote =
          Math.random() < 0.5
            ? 'C#3'
            : Distance.transpose(note, Interval.fromSemitones(-12));
        playNote(lowNote);
      }
      Tone.Transport.scheduleOnce(() => {
        if (time > 8 && Math.random() < 0.4) {
          tonic = tonic === 'C#4' ? 'C#5' : 'C#4';
        }
        playNextNote();
      }, `+${time + Math.random() - 0.5}`);
    };

    Tone.Transport.scheduleOnce(() => {
      playNextNote();
    }, `+${Math.random() * 2 + 2}`);

    return () => {
      [reverb, pianoSampler, cellos, celloFilter].forEach(node =>
        node.dispose()
      );
    };
  });
};

export default makePiece;

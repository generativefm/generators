import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
  transpose,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../bhairav.gfm.manifest.json';

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

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const getReverb = () =>
    new Tone.Reverb(15)
      .toDestination()
      .set({ wet: 0.6 })
      .generate();

  const piano = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'bhairav__vsco2-piano-mf',
    getDestination: getReverb,
    notes: toss([0, 4, 7].map(transpose('C#')), [4, 5]),
    onProgress: val => onProgress(val * 0.5),
  });

  const cellos = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-cellos-susvib-mp',
    renderedInstrumentName: 'bhairav__vsco2-cellos-susvib-mp',
    getDestination: getReverb,
    notes: toss(['C#', 'G#'], [1, 2]),
    onProgress: val => onProgress(val * 0.5 + 0.5),
  });
  cellos.set({ attack: 2, curve: 'linear' });

  let tonic = Math.random() < 0.5 ? 'C#4' : 'C#5';

  const playNote = (note, time = 0, velocity = 1) =>
    piano.triggerAttack(note, `+${1 + time}`, velocity);

  const celloDrone = note => {
    cellos.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      celloDrone(note);
    }, `+${Math.random() * 10 + 5}`);
  };

  const playRaga = ragaGenerator => {
    const { value } = ragaGenerator.next();
    const [interval, time] = value;
    const note = transpose(tonic, interval);
    playNote(note);
    if (Math.random() < (interval === 0 || interval === 12 ? 0.5 : 0.1)) {
      const lowNote = Math.random() < 0.5 ? 'C#3' : transpose(note, -12);
      playNote(lowNote);
    }
    Tone.Transport.scheduleOnce(() => {
      if (time > 8 && Math.random() < 0.4) {
        tonic = tonic === 'C#4' ? 'C#5' : 'C#4';
      }
      playRaga(ragaGenerator);
    }, `+${time + Math.random() - 0.5}`);
  };

  const schedule = ({ destination }) => {
    piano.connect(destination);

    const ragaGenerator = makeRagaGenerator(ragaBhairav);

    Tone.Transport.scheduleOnce(() => {
      playRaga(ragaGenerator);
    }, `+${Math.random() * 2 + 2}`);

    const celloFilter = new Tone.AutoFilter(
      Math.random() / 100 + 0.01,
      50,
      3
    ).connect(destination);
    celloFilter.start();
    cellos.connect(celloFilter);

    ['C#2', 'C#1', 'G#1', 'G#2'].forEach(note => {
      Tone.Transport.scheduleOnce(() => {
        celloDrone(note);
      }, `+${Math.random() * 5}`);
    });

    return () => {
      piano.releaseAll();
      cellos.releaseAll();
      celloFilter.dispose();
    };
  };

  const deactivate = () => {
    piano.dispose();
    cellos.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

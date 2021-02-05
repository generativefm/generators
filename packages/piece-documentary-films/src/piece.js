import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
  toss,
  sortNotes,
} from '@generative-music/utilities';
import { sampleNames } from '../documentary-films.gfm.manifest.json';

const phrases = [
  ['A#', 'F', 'G#', 'C#'],
  ['A#', 'F', 'D'],
  ['D', 'D#', 'F'],
  ['C', 'D#', 'D'],
  ['A#', 'F', 'G', 'D'],
];

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const renderedPitchClasses = sortNotes(
    Array.from(new Set(phrases.flat()))
  ).filter((_, i) => i % 2 === 0);

  const getReverb = () => new Tone.Reverb(45).toDestination().generate();

  const trumpet = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-trumpet-sus-mf',
    renderedInstrumentName: 'documentary-films__vsco2-trumpet-sus-mf',
    notes: toss(renderedPitchClasses, [2, 3]),
    onProgress: val => onProgress(val * 0.7),
    getDestination: getReverb,
  });

  const trombone = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-trombone-sus-mf',
    renderedInstrumentName: 'documentary-films__vsco2-trombone-sus-mf',
    notes: toss(renderedPitchClasses, [1]),
    onProgress: val => onProgress(val * 0.25 + 0.7),
    getDestination: getReverb,
  });

  const tuba = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-tuba-sus-mf',
    renderedInstrumentName: 'documentary-films__vsco2-tuba-sus-mf',
    notes: ['A#0'],
    onProgress: val => onProgress(val * 0.05 + 0.95),
    getDestination: getReverb,
  });

  tuba.set({ attack: 0.5, curve: 'linear' });

  const droneTuba = note => {
    tuba.triggerAttack(note, '+1');

    Tone.Transport.scheduleOnce(() => {
      droneTuba(note);
    }, `+${window.generativeMusic.rng() * 3 + 2}`);
  };

  const trumpetPhrase = () => {
    const trumpetOct = Math.floor(window.generativeMusic.rng() * 2) + 2;
    const tromboneOct = 1;
    const trumpetMultiplier = window.generativeMusic.rng() * 10 + 5;
    const tromboneMultiplier = window.generativeMusic.rng() * 10 + 5;
    const tromboneDelay = window.generativeMusic.rng() * 15 + 15;
    const phrase = phrases[Math.floor(window.generativeMusic.rng() * phrases.length)];
    const sliceLength = Math.floor(
      Math.pow(window.generativeMusic.rng(), 0.1) * phrase.length
    );
    phrase.slice(0, sliceLength).forEach((pc, i) => {
      trumpet.triggerAttack(
        `${pc}${trumpetOct}`,
        `+${1 + i * trumpetMultiplier}`
      );
      trombone.triggerAttack(
        `${pc}${tromboneOct}`,
        `${1 + i * tromboneMultiplier + tromboneDelay}`
      );
    });

    Tone.Transport.scheduleOnce(() => {
      trumpetPhrase();
    }, `+${sliceLength * trumpetMultiplier + 1 + window.generativeMusic.rng() * 20}`);
  };

  const schedule = ({ destination }) => {
    const delay = new Tone.FeedbackDelay(0.2, 0.6).connect(destination);
    const trumpetFilter = new Tone.AutoFilter(
      window.generativeMusic.rng() / 100 + 0.01
    ).connect(delay);
    trumpetFilter.start();
    trumpet.connect(trumpetFilter);
    const tromboneFilter = new Tone.AutoFilter(
      window.generativeMusic.rng() / 100 + 0.01
    ).connect(delay);
    tromboneFilter.start();
    trombone.connect(tromboneFilter);
    const tubaFilter = new Tone.AutoFilter(window.generativeMusic.rng() / 100 + 0.01).connect(
      destination
    );
    tubaFilter.start();
    tuba.connect(tubaFilter);

    droneTuba('A#0');
    trumpetPhrase();

    return () => {
      trumpet.releaseAll(0);
      trombone.releaseAll(0);
      tuba.releaseAll(0);

      delay.dispose();
      trumpetFilter.dispose();
      tromboneFilter.dispose();
      tubaFilter.dispose();
    };
  };

  const deactivate = () => {
    [trumpet, trombone, tuba].forEach(node => node.dispose());
  };
  return [deactivate, schedule];
};

export default wrapActivate(activate);

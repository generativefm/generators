import * as Tone from 'tone';
import {
  createPrerenderedSampler,
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

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const renderedPitchClasses = sortNotes(
    Array.from(new Set(phrases.flat()))
  ).filter((_, i) => i % 2 === 0);

  const getReverb = () => new Tone.Reverb(45).toDestination().generate();

  const trumpet = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-trumpet-sus-mf',
    renderedInstrumentName: 'documentary-films::vsco2-trumpet-sus-mf',
    notes: toss(renderedPitchClasses, [2, 3]),
    onProgress: val => onProgress(val * 0.7),
    getDestination: getReverb,
  });

  const trombone = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-trombone-sus-mf',
    renderedInstrumentName: 'documentary-films::vsco2-trombone-sus-mf',
    notes: toss(renderedPitchClasses, [1]),
    onProgress: val => onProgress(val * 0.25 + 0.7),
    getDestination: getReverb,
  });

  const tuba = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-tuba-sus-mf',
    renderedInstrumentName: 'documentary-films::vsco2-tuba-sus-mf',
    notes: ['A#0'],
    onProgress: val => onProgress(val * 0.05 + 0.95),
    getDestination: getReverb,
  });

  tuba.set({ attack: 0.5, curve: 'linear' });

  const droneTuba = note => {
    tuba.triggerAttack(note, '+1');

    Tone.Transport.scheduleOnce(() => {
      droneTuba(note);
    }, `+${Math.random() * 3 + 2}`);
  };

  const trumpetPhrase = () => {
    const trumpetOct = Math.floor(Math.random() * 2) + 2;
    const tromboneOct = 1;
    const trumpetMultiplier = Math.random() * 10 + 5;
    const tromboneMultiplier = Math.random() * 10 + 5;
    const tromboneDelay = Math.random() * 15 + 15;
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    const sliceLength = Math.floor(
      Math.pow(Math.random(), 0.1) * phrase.length
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
    }, `+${sliceLength * trumpetMultiplier + 1 + Math.random() * 20}`);
  };

  const schedule = () => {
    const delay = new Tone.FeedbackDelay(0.2, 0.6).connect(destination);
    const trumpetFilter = new Tone.AutoFilter(
      Math.random() / 100 + 0.01
    ).connect(delay);
    trumpetFilter.start();
    trumpet.connect(trumpetFilter);
    const tromboneFilter = new Tone.AutoFilter(
      Math.random() / 100 + 0.01
    ).connect(delay);
    tromboneFilter.start();
    trombone.connect(tromboneFilter);
    const tubaFilter = new Tone.AutoFilter(Math.random() / 100 + 0.01).connect(
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

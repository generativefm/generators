import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../yesterday.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const randomIntBetween = (min, max) =>
  Math.floor(min + window.generativeMusic.rng() * (max - min));

const scale = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'];

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const sax = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    onProgress,
    notes: scale.filter((_, i) => i % 2 === 0),
    sourceInstrumentName: 'vcsl-tenor-sax-vib',
    renderedInstrumentName: 'yesterday__vcsl-tenor-sax-vib',
    getDestination: () =>
      new Tone.Reverb(20)
        .set({ wet: 0.9 })
        .toDestination()
        .generate(),
  });

  sax.set({ attack: 2, curve: 'linear' });

  const playNote = (note, time = 0) => {
    sax.triggerAttack(note, `+${1 + time}`);
  };

  const getMelody = () => {
    const melody = [];
    const length = window.generativeMusic.rng() < 0.9 ? 4 : 3;
    let currentIndex =
      window.generativeMusic.rng() < 0.5
        ? randomIntBetween(3, scale.length)
        : scale.length - 1;
    for (let i = 0; i < length; i += 1) {
      melody.push(scale[currentIndex]);
      if (i === 0) {
        currentIndex = randomIntBetween(1, currentIndex - 1);
      } else if (i === 1) {
        currentIndex = randomIntBetween(
          currentIndex + 1,
          scale.indexOf(melody[0])
        );
      } else if (i === 2) {
        currentIndex = randomIntBetween(0, scale.indexOf(melody[1]));
      }
    }
    return melody;
  };

  const playMelody = () => {
    const melody = getMelody();
    const baseTime = window.generativeMusic.rng() * 2 + 1;
    melody.forEach((note, i) => {
      playNote(note, i >= 2 ? i * baseTime + baseTime : i * baseTime);
    });

    playNote(`${melody[melody.length - 1].charAt(0)}${1}`);

    Tone.Transport.scheduleOnce(
      () => playMelody(),
      `+${baseTime * 8 + window.generativeMusic.rng()}`
    );
  };

  const schedule = ({ destination }) => {
    const autoFilter = new Tone.AutoFilter(
      window.generativeMusic.rng() / 100,
      1500,
      2
    ).connect(destination);
    const delay = new Tone.FeedbackDelay(0.5, 0.85).connect(autoFilter);
    sax.connect(delay);
    autoFilter.start();
    playMelody();
    return () => {
      sax.releaseAll(0);
      autoFilter.dispose();
      delay.dispose();
    };
  };

  const deactivate = () => {
    sax.dispose();
  };
  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['yesterday'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

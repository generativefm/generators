import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  shuffleArray,
  wrapActivate,
  P1,
  M3,
  P4,
  P5,
  transpose,
  getOctave,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../return-to-form.gfm.manifest.json';

const INTERVALS = [P1, M3, P4, P5];
const STARTING_TONICS = ['C3', 'C4'];
const NOTE_TIME_S = 2;

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const piano = await createPrerenderableSampler({
    notes: toss(['C', 'E', 'G', 'B'], [2, 3, 4, 5]),
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'return-to-form__vsco2-piano-mf',
    getDestination: () =>
      Promise.resolve(new Tone.Freeverb({ roomSize: 0.5 }).toDestination()),
    onProgress,
  });

  let tonics = STARTING_TONICS;

  const play = () => {
    if (Math.random() < 0.2) {
      const up =
        (tonics.some(tonic => getOctave(tonic) <= 2) || Math.random() < 0.5) &&
        !tonics.some(tonic => getOctave(tonic) >= 5);
      const change = Math.random() < 0.5 ? P5 : M3;
      tonics = tonics.map(tonic => transpose(tonic, up ? change : -change));
    }
    shuffleArray(
      tonics.reduce(
        (notes, tonic) => notes.concat(INTERVALS.map(transpose(tonic))),
        []
      )
    )
      .slice(0, 5)
      .forEach((note, i) => {
        for (let j = 0; j < 4; j += 1) {
          piano.triggerAttack(
            note,
            `+${i * NOTE_TIME_S + j * 8 * NOTE_TIME_S}`
          );
        }
      });
    Tone.Transport.scheduleOnce(() => {
      play();
    }, `+${32 * NOTE_TIME_S}`);
  };

  const schedule = () => {
    tonics = STARTING_TONICS;
    const delay = new Tone.FeedbackDelay({
      delayTime: NOTE_TIME_S / 2,
      maxDelay: NOTE_TIME_S / 2,
      feedback: 0.7,
      wet: 0.3,
    }).connect(destination);
    piano.connect(delay);
    play();

    return () => {
      piano.releaseAll(0);
      delay.dispose();
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

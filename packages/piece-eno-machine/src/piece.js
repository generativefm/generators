import * as Tone from 'tone';
import {
  createSampler,
  wrapActivate,
  getRandomNumberBetween,
  toss,
  invert,
  major9th,
} from '@generative-music/utilities';
import { sampleNames } from '../eno-machine.gfm.manifest.json';

const OCTAVES = [3, 4, 5];
const MIN_REPEAT_S = 20;
const MAX_REPEAT_S = 60;
const NOTES = toss(invert(major9th('Db'), 1), OCTAVES);

const getPiano = samples => createSampler(samples['vsco2-piano-mf']);

const activate = async ({ destination, sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const piano = await getPiano(samples);
  piano.connect(destination);

  const schedule = () => {
    NOTES.forEach(note => {
      const interval = getRandomNumberBetween(MIN_REPEAT_S, MAX_REPEAT_S);
      const delay = getRandomNumberBetween(0, MAX_REPEAT_S - MIN_REPEAT_S);
      const playNote = () => piano.triggerAttack(note, '+1');
      Tone.Transport.scheduleRepeat(playNote, interval, `+${delay}`);
    });

    return () => {
      piano.releaseAll(0);
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate, ['vsco2-piano-mf']);

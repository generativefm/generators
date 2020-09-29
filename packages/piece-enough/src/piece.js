import * as Tone from 'tone';
import {
  wrapActivate,
  minor7th,
  createPitchShiftedSampler,
} from '@generative-music/utilities';
import { sampleNames } from '../enough.gfm.manifest.json';

const activate = async ({ destination, sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const corAnglaisSamplesByNote = samples['sso-cor-anglais'];
  const corAnglais = await createPitchShiftedSampler({
    samplesByNote: corAnglaisSamplesByNote,
    pitchShift: -24,
    attack: 5,
    release: 5,
    curve: 'linear',
  });
  const masterVol = new Tone.Volume(-10).connect(destination);
  const delayVolume = new Tone.Volume(-28);
  const compressor = new Tone.Compressor().connect(masterVol);

  const playChord = () => {
    minor7th('A#3')
      .concat(minor7th('A#4'))
      .filter(() => Math.random() < 0.5)
      .slice(0, 4)
      .forEach(note => corAnglais.triggerAttack(note, `+${Math.random() * 2}`));
    Tone.Transport.scheduleOnce(() => {
      playChord();
    }, `+${Math.random() * 5 + 12}`);
  };

  const schedule = () => {
    const delay = new Tone.FeedbackDelay({
      feedback: 0.5,
      delayTime: 10,
      maxDelay: 10,
    }).chain(delayVolume, masterVol);
    corAnglais.connect(compressor);
    compressor.connect(delay);
    playChord();

    return () => {
      corAnglais.releaseAll(0);
      delay.dispose();
    };
  };

  const deactivate = () => {
    [corAnglais, delayVolume, compressor].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

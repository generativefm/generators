import * as Tone from 'tone';
import {
  wrapActivate,
  minor7th,
  createPitchShiftedSampler,
  toss,
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
  const delayVolume = new Tone.Volume(-28).connect(masterVol);
  const compressor = new Tone.Compressor().connect(masterVol);

  const notes = toss(['A#'], [3, 4])
    .map(minor7th)
    .flat();

  const playChord = (first = false) => {
    let chord = notes.filter(() => Math.random() < 0.5).slice(0, 4);
    while (first && chord.length === 0) {
      chord = notes.filter(() => Math.random() < 0.5).slice(0, 4);
    }
    const immediateNoteIndex = first
      ? Math.floor(Math.random() * chord.length)
      : -1;
    chord.forEach((note, i) =>
      corAnglais.triggerAttack(
        note,
        `+${immediateNoteIndex === i ? 0 : Math.random() * 2}`
      )
    );
    Tone.Transport.scheduleOnce(() => {
      playChord();
    }, `+${Math.random() * 5 + 12}`);
  };

  const schedule = () => {
    const delay = new Tone.FeedbackDelay({
      feedback: 0.5,
      delayTime: 10,
      maxDelay: 10,
    }).connect(delayVolume);
    corAnglais.connect(compressor);
    compressor.connect(delay);
    playChord(true);

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

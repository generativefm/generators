import * as Tone from 'tone';
import {
  wrapActivate,
  createPrerenderableSampler,
} from '@generative-music/utilities';
import { sampleNames } from '../at-sunrise.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const NOTES = ['C3', 'F3', 'G3', 'C4', 'F4', 'G4', 'C5', 'E5', 'G5', 'C6'];

function* makeValueOscillator(min, max) {
  let up = true;
  let value = up ? min : max;
  while (1) {
    const delta = window.generativeMusic.rng() * 0.2;
    if (up) {
      value += delta;
    } else {
      value -= delta;
    }
    if (up && value > max) {
      up = false;
    } else if (!up && value < min) {
      up = true;
    }
    yield value;
  }
}

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const vibraphone = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    onProgress,
    pitchShift: -12,
    notes: NOTES.filter(note => note !== 'G3' && note !== 'G4'),
    sourceInstrumentName: 'vcsl-vibraphone-soft-mallets-mp',
    renderedInstrumentName: 'at-sunrise__vcsl-vibraphone-soft-mallets-mp',
    getDestination: () => new Tone.Reverb(5).toDestination().generate(),
  });

  const vol = new Tone.Volume(10);
  const filter = new Tone.Filter(2000);
  filter.connect(vol);

  const play = (note, timeGenerator) => {
    vibraphone.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      play(note, timeGenerator);
    }, `+${window.generativeMusic.rng() * timeGenerator.next().value + timeGenerator.next().value}`);
  };

  const schedule = ({ destination }) => {
    vol.connect(destination);
    const delay = new Tone.FeedbackDelay({
      delayTime: 0.2,
      feedback: 0.7,
    }).connect(filter);
    vibraphone.connect(delay);

    const timeGenerator = makeValueOscillator(5, 20);

    NOTES.forEach(note => {
      play(note, timeGenerator);
    });

    return () => {
      vibraphone.releaseAll(0);
      delay.dispose();
    };
  };

  const deactivate = () => {
    filter.dispose();
    vol.dispose();
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['at-sunrise'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

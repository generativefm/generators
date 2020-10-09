import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../peace.gfm.manifest.json';

const NOTES = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'];

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const fluteVolume = new Tone.Volume(-8);

  const flute = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    onProgress,
    notes: NOTES,
    sourceInstrumentName: 'native-american-flute-susvib',
    renderedInstrumentName: 'peace::native-american-flute-susvib',
    additionalRenderLength: 1,
    getDestination: () =>
      new Tone.Reverb({ decay: 10 }).toDestination().generate(),
    pitchShift: -9,
  });

  flute.set({ fadeIn: 5, fadeOut: 5, curve: 'linear' });

  const schedule = () => {
    const delay = new Tone.FeedbackDelay({
      feedback: 0.7,
      delayTime: 1,
      wet: 0.3,
    }).connect(destination);
    fluteVolume.connect(delay);
    flute.connect(fluteVolume);

    const playRandom = lastNote => {
      const eligibleNotes = NOTES.filter(note => note !== lastNote);
      const randomNote =
        eligibleNotes[Math.floor(Math.random() * eligibleNotes.length)];
      flute.triggerAttackRelease(randomNote, Math.random() * 2 + 10, '+1');
      Tone.Transport.scheduleOnce(() => {
        playRandom(randomNote);
      }, `+${Math.random() * 10 + 15}`);
    };

    playRandom();

    return () => {
      flute.releaseAll(0);
      delay.dispose();
    };
  };

  const deactivate = () => {
    flute.dispose();
    fluteVolume.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

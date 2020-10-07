import * as Tone from 'tone';
import {
  wrapActivate,
  createPrerenderedSampler,
  getRandomElement,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../soundtrack.gfm.manifest.json';

const SECOND_NOTES = ['D', 'Eb', 'F', 'G', 'A'];
const OCTAVES = [2, 3, 4];

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const getReverb = () => new Tone.Reverb(50).toDestination().generate();
  const renderedPitchClasses = ['C'].concat(
    SECOND_NOTES.filter((_, i) => i % 2 !== 0)
  );

  const cellos = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    notes: toss(renderedPitchClasses, OCTAVES),
    sourceInstrumentName: 'vsco2-cellos-susvib-mp',
    renderedInstrumentName: 'soundtrack::vsco2-cellos-susvib-mp',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.5),
    pitchShift: -24,
  });

  cellos.connect(destination);

  const glock = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    notes: toss(renderedPitchClasses, [5, 6]),
    sourceInstrumentName: 'vsco2-glock',
    renderedInstrumentName: 'soundtrack::vsco2-glock',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.5 + 0.5),
    pitchShift: -36,
  });

  glock.set({
    attack: 0.05,
    curve: 'exponential',
  });

  const playProgression = () => {
    const secondNote = getRandomElement(SECOND_NOTES);
    const secondNoteTime = Math.random() * 10 + 10 + 1;
    OCTAVES.forEach(octave => {
      cellos.triggerAttack(`C${octave}`, '+1');
      if (Math.random() < 0.75) {
        glock.triggerAttack(
          `C${Math.random() < 0.5 ? 5 : 6}`,
          `+${1 + Math.random() * secondNoteTime}`
        );
      }
      cellos.triggerAttack(`${secondNote}${octave}`, `+${secondNoteTime}`);
      if (Math.random() < 0.75) {
        glock.triggerAttack(
          `${secondNote}${Math.random() < 0.5 ? 5 : 6}`,
          `+${secondNoteTime + Math.random() * 10}`
        );
      }
    });
    Tone.Transport.scheduleOnce(() => {
      playProgression();
    }, `+${Math.random() * 20 + 30}`);
  };

  const schedule = () => {
    const glockDelay = new Tone.PingPongDelay(0.7, 0.7)
      .set({ wet: 0.4 })
      .connect(destination);

    glock.connect(glockDelay);

    playProgression();

    return () => {
      glock.releaseAll(0);
      cellos.releaseAll(0);
      glockDelay.dispose();
    };
  };

  const deactivate = () => {
    [cellos, glock].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

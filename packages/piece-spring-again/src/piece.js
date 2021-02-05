import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  createSampler,
  wrapActivate,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../spring-again.gfm.manifest.json';

const OCTAVES = [3, 4, 5];
const NOTES = toss(['C', 'D', 'E', 'F', 'G', 'A', 'B'], OCTAVES);

const MELODY_DISTANCE = 3;
const melodyFromNote = (
  note = NOTES[Math.floor(window.generativeMusic.rng() * NOTES.length)]
) => {
  const index = NOTES.findIndex(n => n === note);
  const min = Math.max(index - MELODY_DISTANCE, 0);
  const max = Math.min(index + MELODY_DISTANCE + 1, NOTES.length);
  return NOTES[Math.floor(window.generativeMusic.rng() * (max - min) + min)];
};

const repeat = (fn, interval) => {
  const schedule = time => {
    Tone.Transport.scheduleOnce((...args) => {
      fn(...args);
      schedule(`+${interval}`);
    }, time);
  };
  schedule();
};

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const piano = await createPrerenderableSampler({
    notes: NOTES.filter((_, i) => i % 2 === 0),
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'spring-again__vsco2-piano-mf',
    getDestination: () =>
      Promise.resolve(
        new Tone.Freeverb({
          roomSize: 0.7,
          dampening: 6000,
        }).toDestination()
      ),
    onProgress,
  });
  const [violins, cello] = await Promise.all([
    createSampler(samples['vsco2-violins-susvib']),
    createSampler(samples['vsco2-cello-susvib-f']),
  ]);
  const volume = new Tone.Volume(-5);

  const schedule = ({ destination }) => {
    volume.connect(destination);
    const delay = new Tone.FeedbackDelay({
      feedback: 0.5,
      delayTime: 0.44,
    }).connect(volume);
    piano.connect(delay);
    const playableNotes = NOTES.filter(
      ([pc, octave]) => octave < 5 || pc === 'C'
    );
    const phrase = [
      playableNotes[Math.floor(window.generativeMusic.rng() * playableNotes.length)],
    ];
    for (let i = 1; i < window.generativeMusic.rng() * 5 + 5; i += 1) {
      phrase.push(melodyFromNote(phrase[phrase.length - 1]));
    }

    const notesPerSecond = window.generativeMusic.rng() * 2 + 5;

    repeat(() => {
      phrase.forEach((note, i) => {
        piano.triggerAttack(note, `+${i / notesPerSecond}`);
      });
    }, phrase.length / notesPerSecond);
    repeat(() => {
      const index = Math.floor(window.generativeMusic.rng() * phrase.length);
      phrase[index] = melodyFromNote(phrase[index]);
    }, (phrase.length / notesPerSecond) * 2);
    violins.connect(volume);
    violins.volume.value = -2;
    cello.connect(volume);
    cello.volume.value = -8;
    repeat(() => {
      if (window.generativeMusic.rng() < 0.9) {
        const note = phrase[Math.floor(window.generativeMusic.rng() * phrase.length)];
        violins.triggerAttack(note);
        const [pc] = note;
        if (window.generativeMusic.rng() < 0.2) {
          cello.triggerAttack(`${pc}${1}`);
        }
      }
    }, (phrase.length * 5) / notesPerSecond);

    return () => {
      [piano, violins, cello].forEach(sampler => {
        sampler.releaseAll(0);
      });
      delay.dispose();
    };
  };

  const deactivate = () => {
    [piano, violins, cello, volume].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

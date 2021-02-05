import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
  toss,
  getRandomElement,
  getPitchClass,
} from '@generative-music/utilities';
import getSimilarNotes from './get-similar-notes';
import { sampleNames } from '../pulse-code-modulation.gfm.manifest.json';

const DRONE_OCTAVES = [4, 5];
const PIANO_OCTAVES = [4, 5, 6];
const GUITAR_OCTAVES = [2, 3];
const PITCH_CLASSES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const DRONE_NOTES = toss(PITCH_CLASSES, DRONE_OCTAVES);

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const getReverb = () =>
    new Tone.Reverb(15)
      .set({ wet: 0.9 })
      .toDestination()
      .generate();

  const renderedNotes = DRONE_NOTES.filter((_, i) => i % 3 === 0);
  const droneSamplers = await Promise.all(
    DRONE_NOTES.map(() =>
      createPrerenderableSampler({
        samples,
        sampleLibrary,
        notes: renderedNotes,
        sourceInstrumentName: 'vsco2-violins-susvib',
        renderedInstrumentName: 'pulse-code-modulation__vsco2-violins-susvib',
        getDestination: getReverb,
        onProgress: val => onProgress(val * 0.33),
        pitchShift: -24,
      })
    )
  );
  const guitarSampler = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    notes: toss(PITCH_CLASSES.filter((_, i) => i % 3 === 0), GUITAR_OCTAVES),
    sourceInstrumentName: 'acoustic-guitar',
    renderedInstrumentName: 'pulse-code-modulation__acoustic-guitar',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.33 + 0.33),
  });
  guitarSampler.set({ attack: 3, curve: 'linear' });
  const pianoSampler = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    notes: toss(PITCH_CLASSES.filter((_, i) => i % 3 === 0), PIANO_OCTAVES),
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'pulse-code-modulation__vsco2-piano-mf',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.33 + 0.66),
  });

  const filter = new Tone.Filter(window.generativeMusic.rng() * 300 + 300);

  const droneGainsByNote = droneSamplers.reduce((dronesHash, sampler, i) => {
    const note = DRONE_NOTES[i];
    const gain = new Tone.Gain(0).connect(filter);
    sampler.connect(gain);
    dronesHash[note] = gain;
    return dronesHash;
  }, {});

  const playChord = (notes = getSimilarNotes([], DRONE_OCTAVES)) => {
    const time = window.generativeMusic.rng() * 30 + 30;
    notes.forEach(note => {
      const { gain } = droneGainsByNote[note];
      gain.cancelScheduledValues(Tone.now());
      gain.setValueAtTime(gain.value, Tone.now());
      gain.linearRampToValueAtTime(1, `+${time / 2}`);
    });
    const nextNotes = getSimilarNotes(
      notes.filter(() => window.generativeMusic.rng() < 0.5),
      DRONE_OCTAVES
    );
    const notesToMute = notes.filter(note => !nextNotes.includes(note));
    Tone.Transport.scheduleOnce(() => {
      notesToMute.forEach(note => {
        const { gain } = droneGainsByNote[note];
        gain.cancelScheduledValues(Tone.now());
        gain.setValueAtTime(gain.value, Tone.now());
        gain.linearRampToValueAtTime(0, `+${time / 2}`);
      });
      if (window.generativeMusic.rng() < 0.75) {
        let primarySampler;
        let primaryOctaves;
        let secondarySampler;
        let secondaryOctaves;
        if (window.generativeMusic.rng() < 0.5) {
          primarySampler = pianoSampler;
          primaryOctaves = PIANO_OCTAVES;
          secondarySampler = guitarSampler;
          secondaryOctaves = GUITAR_OCTAVES;
        } else {
          primarySampler = guitarSampler;
          primaryOctaves = GUITAR_OCTAVES;
          secondarySampler = pianoSampler;
          secondaryOctaves = PIANO_OCTAVES;
        }
        const firstPc = getPitchClass(getRandomElement(notes));
        const noteTime = 1 + window.generativeMusic.rng();
        primarySampler.triggerAttack(
          `${firstPc}${getRandomElement(primaryOctaves)}`,
          `+${noteTime}`
        );
        if (window.generativeMusic.rng() < 0.5) {
          secondarySampler.triggerAttack(
            `${firstPc}${getRandomElement(secondaryOctaves)}`,
            `+${noteTime * 3}`
          );
        }
        if (window.generativeMusic.rng() < 0.5) {
          const otherNoteTime = 3 + window.generativeMusic.rng() * 2;
          const secondPc = getPitchClass(
            getRandomElement(
              notes.filter(note => getPitchClass(note) !== firstPc)
            )
          );
          primarySampler.triggerAttack(
            `${secondPc}${getRandomElement(primaryOctaves)}`,
            `+${otherNoteTime}`
          );

          if (window.generativeMusic.rng() < 0.5) {
            secondarySampler.triggerAttack(
              `${secondPc}${getRandomElement(secondaryOctaves)}`,
              `+${otherNoteTime * 3}`
            );
          }
        }
      }
      Tone.Transport.scheduleOnce(() => {
        playChord(nextNotes);
      }, `+${time / 4}`);
    }, `+${time / 2}`);
  };

  const changeFilterFrequency = () => {
    const time = window.generativeMusic.rng() * 30 + 30;
    const frequency = window.generativeMusic.rng() * 300 + 300;
    filter.frequency.cancelScheduledValues(Tone.now());
    filter.frequency.setValueAtTime(filter.frequency.value, Tone.now());
    filter.frequency.linearRampToValueAtTime(frequency, `+${time}`);
    Tone.Transport.scheduleOnce(() => {
      changeFilterFrequency();
    }, `+${time}`);
  };

  const schedule = ({ destination }) => {
    filter.connect(destination);
    pianoSampler.connect(destination);
    guitarSampler.connect(destination);
    droneSamplers.forEach((sampler, i) => {
      const note = DRONE_NOTES[i];
      const play = () => {
        sampler.triggerAttack(note, '+1');
        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${30 - window.generativeMusic.rng() * 5}`);
      };
      play();
    });

    playChord();
    changeFilterFrequency();

    return () => {
      droneSamplers.concat([guitarSampler, pianoSampler]).forEach(sampler => {
        sampler.releaseAll(0);
      });
      Object.values(droneGainsByNote).forEach(({ gain }) => {
        gain.cancelScheduledValues(Tone.now());
        gain.setValueAtTime(0, Tone.now());
      });
    };
  };
  const deactivate = () => {
    droneSamplers
      .concat(Object.values(droneGainsByNote))
      .concat([guitarSampler, pianoSampler, filter])
      .forEach(node => {
        node.dispose();
      });
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

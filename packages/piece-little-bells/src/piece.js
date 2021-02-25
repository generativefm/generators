import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
  minor7th,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../little-bells.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const PITCH_CLASSES = ['F', 'G', 'G#', 'A', 'A#', 'B'];
const BASE_P_TO_PLAY = 0.1;
const MODULO_DIVISOR_ONE = 4;
const MODULO_DIVISOR_TWO = 2;
const LOWER_INTERVAL_TIME = 22;
const HIGHER_INTERVAL_TIME = 20;

const makeChordInterval = instrument => (
  tonic,
  interval,
  shouldPlayImmediately = false
) => {
  let hasPlayed = false;
  Tone.Transport.scheduleRepeat(
    () => {
      const notes = minor7th(tonic);
      const numNotesToPlay = Math.floor(
        window.generativeMusic.rng() * (notes.length + 1)
      );
      let playedNotes = 0;
      let beat = 1;
      while (
        playedNotes < numNotesToPlay ||
        (shouldPlayImmediately && !hasPlayed)
      ) {
        const chanceToPlay =
          BASE_P_TO_PLAY +
          (beat % MODULO_DIVISOR_ONE === 1 ? BASE_P_TO_PLAY : 0) +
          (beat % MODULO_DIVISOR_TWO === 1 ? BASE_P_TO_PLAY : 0);
        if (
          window.generativeMusic.rng() < chanceToPlay ||
          (shouldPlayImmediately && !hasPlayed)
        ) {
          const noteIndex = Math.floor(
            window.generativeMusic.rng() * notes.length
          );
          const note = notes[noteIndex];
          notes.splice(noteIndex, 1);
          instrument.triggerAttack(note, `+${beat}`);
          playedNotes += 1;
          hasPlayed = true;
        }
        beat += 1;
      }
    },
    interval,
    Tone.now()
  );
};

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const getGlockDestination = () =>
    Promise.resolve(
      new Tone.Freeverb({ roomSize: 0.9, dampening: 2000 }).toDestination()
    );

  const notes = Array.from(
    new Set(
      toss(PITCH_CLASSES, [4, 5])
        .sort()
        .map(minor7th)
        .flat()
        .map(note => Tone.Midi(note).toMidi())
    )
  )
    .sort()
    .filter((_, i) => i % 3 === 0)
    .map(midi => Tone.Midi(midi).toNote());

  const glock = await createPrerenderableSampler({
    notes,
    samples,
    sampleLibrary,
    onProgress,
    sourceInstrumentName: 'vsco2-glock',
    renderedInstrumentName: 'little-bells__vsco2-glock',
    additionalRenderLength: 1,
    getDestination: getGlockDestination,
  });

  const schedule = ({ destination }) => {
    const delay = new Tone.FeedbackDelay({
      delayTime: 8,
      maxDelay: 8,
      feedback: 0.7,
      wet: 0.5,
    });

    glock.chain(delay, destination);

    const chordInterval = makeChordInterval(glock);
    const pitchClass =
      PITCH_CLASSES[
        Math.floor(window.generativeMusic.rng() * PITCH_CLASSES.length)
      ];
    const p = window.generativeMusic.rng();
    chordInterval(`${pitchClass}4`, LOWER_INTERVAL_TIME, p >= 0.33);
    chordInterval(`${pitchClass}5`, HIGHER_INTERVAL_TIME, p < 0.66);

    return () => {
      delay.dispose();
    };
  };

  const deactivate = () => {
    glock.dispose();
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['little-bells'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

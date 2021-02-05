import * as Tone from 'tone';
import {
  createSampler,
  wrapActivate,
  minor7th,
} from '@generative-music/utilities';
import combineNotesWithOctaves from './combine-notes-with-octaves';
import { sampleNames } from '../lemniscate.gfm.manifest.json';

const TONIC = 'A#';
const OCTAVES = [2, 3, 4, 5, 6];

const notes = combineNotesWithOctaves([TONIC], OCTAVES).reduce(
  (allNotes, note) => allNotes.concat(minor7th(note)),
  []
);

const INSTRUMENT_NAME = 'vsco2-piano-mf';
const MIN_REPEAT_S = 30;
const MAX_REPEAT_S = 80;

const generateTiming = (instruments, getPlayProbability) => {
  notes.forEach(note => {
    const interval =
      window.generativeMusic.rng() * (MAX_REPEAT_S - MIN_REPEAT_S) + MIN_REPEAT_S;
    const delay = interval - MIN_REPEAT_S;
    Tone.Transport.scheduleRepeat(
      () => {
        const random = window.generativeMusic.rng();
        const probability = getPlayProbability();
        if (random <= probability) {
          instruments.forEach(instrument =>
            instrument.triggerAttack(note, '+1')
          );
        }
      },
      interval,
      delay
    );
  });
};

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const rightPanner = new Tone.Panner();
  const leftPanner = new Tone.Panner();
  const pianoSamples = samples[INSTRUMENT_NAME];
  const instruments = await Promise.all([
    createSampler(pianoSamples),
    createSampler(pianoSamples),
  ]);

  const schedule = ({ destination }) => {
    [rightPanner, leftPanner].forEach(panner => {
      panner.connect(destination);
    });
    const primaryControlLfo = new Tone.LFO(1 / 480).set({ phase: 270 });

    const negate = new Tone.Negate();
    const rightPanSignal = new Tone.Add(1);

    primaryControlLfo.chain(negate, rightPanSignal);
    rightPanSignal.connect(rightPanner.pan);

    const leftPanSignal = new Tone.Negate();
    rightPanSignal.connect(leftPanSignal);
    leftPanSignal.connect(leftPanner.pan);

    const [firstInstrument, secondInstrument] = instruments;
    firstInstrument.chain(rightPanner);
    secondInstrument.chain(leftPanner);

    const lfoMeter = new Tone.Meter({ normalRange: true });
    primaryControlLfo.connect(lfoMeter);

    generateTiming(
      [firstInstrument, secondInstrument],
      () => lfoMeter.getValue(),
      'both'
    );
    generateTiming([firstInstrument], () => 1 - lfoMeter.getValue());
    generateTiming([secondInstrument], () => 1 - lfoMeter.getValue());

    primaryControlLfo.start();

    return () => {
      [
        primaryControlLfo,
        negate,
        rightPanSignal,
        leftPanSignal,
        lfoMeter,
      ].forEach(node => node.dispose());
      [firstInstrument, secondInstrument].forEach(sampler =>
        sampler.releaseAll(0)
      );
    };
  };

  const deactivate = () => {
    instruments
      .concat([leftPanner, rightPanner])
      .forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

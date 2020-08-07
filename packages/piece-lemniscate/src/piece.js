import * as Tone from 'tone';
import { getSampler, makePiece } from '@generative-music/utilities';
import { minor7th } from './theory/chords';
import combineNotesWithOctaves from './combine-notes-with-octaves';

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
      Math.random() * (MAX_REPEAT_S - MIN_REPEAT_S) + MIN_REPEAT_S;
    const delay = Math.random() * (MAX_REPEAT_S - MIN_REPEAT_S) - MIN_REPEAT_S;
    Tone.Transport.scheduleRepeat(
      () => {
        const random = Math.random();
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

const activate = ({ destination, samples }) => {
  const rightPanner = new Tone.Panner().connect(destination);
  const leftPanner = new Tone.Panner().connect(destination);
  const pianoSamples = samples[INSTRUMENT_NAME];
  return Promise.all([getSampler(pianoSamples), getSampler(pianoSamples)]).then(
    instruments => {
      const schedule = () => {
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
            sampler.releaseAll()
          );
        };
      };

      const deactivate = () => {
        instruments
          .concat([leftPanner, rightPanner])
          .forEach(node => node.dispose());
      };

      return [deactivate, schedule];
    }
  );
};

export default makePiece(activate);

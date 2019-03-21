import { Chord, Array } from 'tonal';
import randomNumber from 'random-number';
import fetchSpecFile from '@generative-music/samples.generative.fm/browser-client';
import Tone from 'tone';

const OCTAVES = [3, 4, 5];
const MIN_REPEAT_S = 20;
const MAX_REPEAT_S = 60;

const NOTES = Array.rotate(1, Chord.notes('DbM9')).reduce(
  (withOctaves, note) =>
    withOctaves.concat(OCTAVES.map(octave => `${note}${octave}`)),
  []
);

const getPiano = (samplesSpec, format) =>
  new Promise(resolve => {
    const piano = new Tone.Sampler(
      samplesSpec.samples['vsco2-piano-mf'][format],
      {
        onload: () => resolve(piano),
      }
    );
  });

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename)
    .then(specFile => getPiano(specFile, preferredFormat))
    .then(piano => {
      piano.connect(destination);
      NOTES.forEach(note => {
        const interval = randomNumber({ min: MIN_REPEAT_S, max: MAX_REPEAT_S });
        const delay = randomNumber({
          min: 0,
          max: MAX_REPEAT_S - MIN_REPEAT_S,
        });
        const playNote = () => piano.triggerAttack(note, '+1');
        Tone.Transport.scheduleRepeat(playNote, interval, `+${delay}`);
      });
      return () => {
        piano.dispose();
      };
    });
};

export default makePiece;

import Tone from 'tone';
import { Chord, Note, Distance } from 'tonal';
import { getBuffers } from '@generative-music/utilities';

const findClosest = (note, samplesByNote) => {
  const noteMidi = Note.midi(note);
  const maxInterval = 96;
  let interval = 0;
  while (interval <= maxInterval) {
    const higherNote = Note.fromMidi(noteMidi + interval);
    if (samplesByNote[higherNote]) {
      return higherNote;
    }
    const lowerNote = Note.fromMidi(noteMidi - interval);
    if (samplesByNote[lowerNote]) {
      return lowerNote;
    }
    interval += 1;
  }
  return note;
};

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const corAnglaisSamplesByNote = samples['sso-cor-anglais'];
  return getBuffers(corAnglaisSamplesByNote).then(corAnglais => {
    const masterVol = new Tone.Volume(-10).connect(destination);
    const delayVolume = new Tone.Volume(-28);
    const delay = new Tone.FeedbackDelay({
      feedback: 0.5,
      delayTime: 10,
      wet: 1,
    }).chain(delayVolume, masterVol);
    const compressor = new Tone.Compressor().fan(masterVol, delay);
    const bufferSources = [];
    const playNote = (note, time) => {
      const closestSample = findClosest(note, corAnglaisSamplesByNote);
      const difference = Distance.semitones(note, closestSample);
      const buffer = corAnglais.get(closestSample);
      const bufferSource = new Tone.BufferSource(buffer).connect(compressor);
      bufferSources.push(bufferSource);
      const playbackRate = Tone.intervalToFrequencyRatio(difference - 24);
      bufferSource.set({
        playbackRate,
        fadeIn: 5,
        fadeOut: 5,
        curve: 'linear',
        onended: () => {
          const index = bufferSources.indexOf(bufferSource);
          if (index >= 0) {
            bufferSource.dispose();
            bufferSources.splice(index, 1);
          }
        },
      });
      bufferSource.start(time);
    };
    const tonic = 'A#3';
    const playChord = () => {
      Chord.notes(tonic, 'm7')
        .concat(Chord.notes(Distance.transpose(tonic, '8P'), 'm7'))
        .filter(() => Math.random() < 0.5)
        .slice(0, 4)
        .forEach(note => playNote(note, `+${Math.random() * 2}`));
      Tone.Transport.scheduleOnce(() => {
        playChord();
      }, `+${Math.random() * 5 + 12}`);
    };
    playChord();
    return () => {
      [corAnglais, delayVolume, delay, compressor, ...bufferSources].forEach(
        node => node.dispose()
      );
      bufferSources.splice(bufferSources.length);
    };
  });
};

export default makePiece;

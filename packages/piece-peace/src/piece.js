import Tone from 'tone';
import { getBuffers } from '@generative-music/utilities';

const NOTES = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'];

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const samplesByNote = samples['native-american-flute-susvib'];
  return Promise.all([
    getBuffers(samplesByNote),
    new Tone.Reverb({
      decay: 10,
    }).generate(),
  ]).then(([flute, reverb]) => {
    const bufferSources = [];
    reverb.connect(destination);
    const delay = new Tone.FeedbackDelay({
      feedback: 0.7,
      delayTime: 1,
      wet: 0.3,
    }).connect(reverb);

    const fluteVolume = new Tone.Volume(-8).connect(delay);

    const playbackRate = Math.random() * 0.25 + 0.5;

    const playRandom = lastNote => {
      const eligibleNotes = NOTES.filter(note => note !== lastNote);
      const randomNote =
        eligibleNotes[Math.floor(Math.random() * eligibleNotes.length)];
      const source = new Tone.BufferSource(flute.get(randomNote)).set({
        playbackRate,
        fadeIn: 5,
        fadeOut: 5,
        curve: 'linear',
        onended: () => {
          const i = bufferSources.indexOf(source);
          if (i >= 0) {
            source.dispose();
            bufferSources.splice(i, 1);
          }
        },
      });
      bufferSources.push(source);
      source.connect(fluteVolume);
      source.start('+1', 0, Math.random() * 2 + 10);

      Tone.Transport.scheduleOnce(() => {
        playRandom(randomNote);
      }, `+${Math.random() * 10 + 15}`);
    };

    playRandom();

    return () => {
      [flute, reverb, delay, fluteVolume, ...bufferSources].forEach(node => {
        node.dispose();
      });
      bufferSources.splice(0, bufferSources.length);
    };
  });
};

export default makePiece;

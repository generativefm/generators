import Tone from 'tone';
import { getBuffers, getSampler } from '@generative-music/utilities';

const toss = (pcs = [], octaves = []) =>
  octaves.reduce(
    (notes, octave) => notes.concat(pcs.map(pc => `${pc}${octave}`)),
    []
  );

const PIANO_NOTES = toss(['C#', 'D#'], [3, 4, 5, 6]);
const GUITAR_NOTES = ['G2', 'C3', 'G3', 'C4'];

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getBuffers(samples['guitar-namaste']),
    getSampler(samples['vsco2-piano-mf']),
  ]).then(([buffers, piano]) => {
    const autoFilter = new Tone.AutoFilter(Math.random() / 50, 200, 5)
      .start()
      .connect(destination);
    const delay = new Tone.FeedbackDelay({
      feedback: 0.5,
      wet: 0.5,
      delayTime: 1.5,
    }).connect(autoFilter);
    const guitarVol = new Tone.Volume(-10).connect(delay);

    const playPiano = () => {
      const randomPianoNote =
        PIANO_NOTES[Math.floor(Math.random() * PIANO_NOTES.length)];

      piano.triggerAttack(randomPianoNote);

      Tone.Transport.scheduleOnce(() => {
        playPiano();
      }, `+${Math.random() * 10 + 10}`);
    };

    Tone.Transport.scheduleOnce(() => {
      playPiano();
    }, `+${Math.random() * 10 + 10}`);

    piano.connect(delay);

    const bufferSources = [];

    const initialDelays = GUITAR_NOTES.map(() => Math.random() * 45);
    const minDelay = Math.min(...initialDelays);

    GUITAR_NOTES.forEach((note, i) => {
      const b = buffers.get(note);

      const play = () => {
        const bufferSource = new Tone.BufferSource(b)
          .set({
            fadeIn: 5,
            fadeOut: 5,
            curve: 'linear',
            playbackRate: 0.6,
            onended: () => {
              const index = bufferSources.indexOf(bufferSource);
              if (index >= 0) {
                bufferSource.dispose();
                bufferSources.splice(index, 1);
              }
            },
          })
          .connect(guitarVol);
        bufferSources.push(bufferSource);
        bufferSource.start('+1', 0, 14);
        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${Math.random() * 15 + 30}`);
      };
      Tone.Transport.scheduleOnce(() => {
        play();
      }, `+${initialDelays[i] - minDelay}`);
    });

    return () => {
      [buffers, piano, autoFilter, delay, guitarVol, ...bufferSources].forEach(
        node => node.dispose()
      );
      bufferSources.splice(0, bufferSources.length);
    };
  });
};

export default makePiece;

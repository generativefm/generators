import Tone from 'tone';
import { getPrerenderedSampler } from '@generative-music/utilities';

const getReverb = () =>
  new Tone.Reverb(15)
    .set({ wet: 0.5 })
    .toMaster()
    .generate();

const makeOxalis = (notes = []) => ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getPrerenderedSampler(notes, samples['vsco2-piano-mf'], getReverb, 15),
    getPrerenderedSampler(
      notes.slice(1).map(note => {
        const pc = note.slice(0, note.length - 1);
        const oct = Number.parseInt(note.slice(-1), 10);
        return `${pc}${oct + 1}`;
      }),
      samples['vsco2-glock'],
      getReverb,
      15
    ),
  ]).then(([piano, glock]) => {
    const delay = new Tone.FeedbackDelay(5, 0.5).connect(destination);
    const glockVol = new Tone.Volume(-15).connect(delay);
    const first = Math.floor(Math.random() * notes.length);
    piano.connect(delay);
    glock.connect(glockVol);
    notes.forEach((note, i) => {
      let initialized = false;
      const play = () => {
        const isFirst = i === first;
        if (isFirst) {
          piano.trigger(note, '+1');
        }
        Tone.Transport.scheduleOnce(() => {
          piano.trigger(note, '+1');
          if (Math.random() < 0.05) {
            const pc = note.slice(0, note.length - 1);
            const oct = Number.parseInt(note.slice(-1), 10);
            glock.trigger(`${pc}${Math.max(oct + 1, 5)}`, '+1');
          }
          play();
        }, `+${Math.random() * 15 + (initialized || isFirst ? 15 : 0) * (i === 0 ? 3 : 1)}`);
        initialized = true;
      };
      play();
    });

    return () => {
      [piano, glock, delay, glockVol].forEach(node => node.dispose());
    };
  });
};

export default makeOxalis;

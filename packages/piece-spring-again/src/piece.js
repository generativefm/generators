import Tone from 'tone';
import { Scale, Note } from 'tonal';
import fetchSampleSpec from '@generative-music/samples.generative.fm/browser-client';

const getInstrument = samplesByNote =>
  new Promise(resolve => {
    const instrument = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(instrument),
    });
  });

const toss = (pcs = [], octaves = []) =>
  octaves.reduce(
    (notes, octave) => notes.concat(pcs.map(pc => `${pc}${octave}`)),
    []
  );

const OCTAVES = [3, 4, 5];
const NOTES = toss(Scale.notes('C major'), OCTAVES);

const MELODY_DISTANCE = 3;
const melodyFromNote = (
  note = NOTES[Math.floor(Math.random() * NOTES.length)]
) => {
  const index = NOTES.findIndex(n => n === note);
  const min = Math.max(index - MELODY_DISTANCE, 0);
  const max = Math.min(index + MELODY_DISTANCE + 1, NOTES.length);
  return NOTES[Math.floor(Math.random() * (max - min) + min)];
};

const NOTES_PER_SECOND = Math.random() * 2 + 5;

const makePiece = ({ audioContext, destination, preferredFormat }) =>
  fetchSampleSpec()
    .then(({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      return Promise.all([
        getInstrument(samples['vsco2-piano-mf'][preferredFormat]),
        getInstrument(samples['vsco2-violins-susvib'][preferredFormat]),
        getInstrument(samples['vsco2-cello-susvib-f'][preferredFormat]),
      ]);
    })
    .then(([piano, violins, cello]) => {
      const volume = new Tone.Volume(-5);
      const delay = new Tone.FeedbackDelay({ feedback: 0.5, delayTime: 0.44 });
      const reverb = new Tone.Freeverb({
        roomSize: 0.7,
        wet: 1,
        dampening: 6000,
      });
      piano.chain(reverb, delay, volume, destination);
      const playableNotes = NOTES.filter(
        note => Note.oct(note) < 5 || Note.pc(note) === 'C'
      );
      const phrase = [
        playableNotes[Math.floor(Math.random() * playableNotes.length)],
      ];
      for (let i = 1; i < Math.random() * 5 + 5; i += 1) {
        phrase.push(melodyFromNote(phrase[phrase.length - 1]));
      }
      Tone.Transport.scheduleRepeat(() => {
        phrase.forEach((note, i) => {
          piano.triggerAttack(note, `+${i / NOTES_PER_SECOND}`);
        });
      }, phrase.length / NOTES_PER_SECOND);
      Tone.Transport.scheduleRepeat(() => {
        const index = Math.floor(Math.random() * phrase.length);
        phrase[index] = melodyFromNote(phrase[index]);
      }, (phrase.length / NOTES_PER_SECOND) * 2);
      violins.chain(volume);
      violins.volume.value = -2;
      cello.chain(volume);

      cello.volume.value = -8;
      Tone.Transport.scheduleRepeat(() => {
        if (Math.random() < 0.9) {
          const note = phrase[Math.floor(Math.random() * phrase.length)];
          violins.triggerAttack(note);
          const pc = Note.pc(note);
          if (Math.random() < 0.2) {
            cello.triggerAttack(`${pc}${1}`);
          }
        }
      }, (phrase.length * 5) / NOTES_PER_SECOND);
      return () => {
        [piano, violins, cello, reverb, delay, volume].forEach(node =>
          node.dispose()
        );
      };
    });

export default makePiece;

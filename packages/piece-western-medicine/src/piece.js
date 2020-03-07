import Tone from 'tone';
import { Distance, Note } from 'tonal';
import { getBuffers } from '@generative-music/utilities';

const toss = (pcs = [], octaves = []) =>
  octaves.reduce(
    (notes, octave) => notes.concat(pcs.map(pc => `${pc}${octave}`)),
    []
  );

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

const getCustomSampler = (samplesByNote, destination) => {
  const activeSources = [];
  const reverb = new Tone.Reverb(15);
  const reverbWetLfo = new Tone.LFO(Math.random() / 100 + 0.01, 0.25, 1);
  reverbWetLfo.connect(reverb.wet);
  reverbWetLfo.start();
  reverb.connect(destination);
  return Promise.all([getBuffers(samplesByNote), reverb.generate()]).then(
    ([buffers]) => ({
      triggerAttack: (note, time = Tone.now()) => {
        const closestSample = findClosest(note, samplesByNote);
        const difference = Distance.semitones(closestSample, note);
        const buffer = buffers.get(closestSample);
        buffer.reverse = Math.random() < 0.5;
        const playbackRate = Tone.intervalToFrequencyRatio(
          difference - 24 + Math.random() * 0.1 - 0.05
        );
        const bufferSource = new Tone.BufferSource(buffer)
          .set({
            playbackRate,
            onended: () => {
              const i = activeSources.indexOf(bufferSource);
              if (i >= 0) {
                activeSources.splice(i, 1);
              }
            },
          })
          .connect(reverb);
        activeSources.push(bufferSource);
        bufferSource.start(time);
      },
      dispose: () => {
        [buffers, reverb, reverbWetLfo, ...activeSources].forEach(node =>
          node.dispose()
        );
      },
    })
  );
};

const HARMONICS_NOTES = ['C4', 'G4', 'C3', 'C5'];
const MARIMBA_OCTS = [2, 3, 4, 5, 6];
const HARP_NOTES = ['C4', 'G4', 'C5', 'G5', 'C6', 'G6'];
const PIANO_NOTES = toss(['C', 'E', 'G'], [3, 4, 5, 6]);

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const filter = new Tone.Filter(3000).connect(destination);
  return Promise.all(
    ['guitar-harmonics', 'vsco2-marimba', 'vsco2-harp', 'vsco2-piano-mf'].map(
      instrumentName => getCustomSampler(samples[instrumentName], filter)
    )
  ).then(([harmonics, marimba, harp, piano]) => {
    const playHarmonics = () => {
      const note =
        HARMONICS_NOTES[Math.floor(Math.random() * HARMONICS_NOTES.length)];
      harmonics.triggerAttack(note, '+1');
      Tone.Transport.scheduleOnce(() => {
        playHarmonics();
      }, `+${Math.random() * 20 + 5}`);
    };
    playHarmonics();

    const playMarimba = () => {
      const notes = ['C', 'G'].map(
        note =>
          `${note}${
            MARIMBA_OCTS[Math.floor(Math.random() * MARIMBA_OCTS.length)]
          }`
      );
      notes.forEach(note => {
        marimba.triggerAttack(note, `+${Math.random() * 0.2 + 1}`);
      });
      Tone.Transport.scheduleOnce(() => {
        playMarimba();
      }, `+${Math.random() * 20 + 20}`);
    };
    playMarimba();

    const playHarp = () => {
      const note = HARP_NOTES[Math.floor(Math.random() * HARP_NOTES.length)];

      harp.triggerAttack(note, '+1');
      Tone.Transport.scheduleOnce(() => {
        playHarp();
      }, `+${Math.random() * 10 + 10}`);
    };
    playHarp();

    piano.triggerAttack('C3');
    const playPiano = () => {
      const notes = Array.from({
        length: Math.ceil(Math.random() * 5),
      }).map(() => PIANO_NOTES[Math.floor(Math.random() * PIANO_NOTES.length)]);
      const maxOffset = Math.random() * 3;

      notes.forEach(note => {
        piano.triggerAttack(note, `+${1 + Math.random() * maxOffset}`);
      });

      Tone.Transport.scheduleOnce(() => {
        playPiano();
      }, `+${Math.random() * 15 + 15}`);
    };
    playPiano();

    return () => {
      [harmonics, marimba, harp, piano, filter].forEach(node => node.dispose());
    };
  });
};

export default makePiece;

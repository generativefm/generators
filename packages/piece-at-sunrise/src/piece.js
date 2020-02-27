import Tone from 'tone';
import { Distance } from 'tonal';

const findClosest = (samplesByNote, note) => {
  const noteMidi = new Tone.Midi(note).toMidi();
  const maxInterval = 96;
  let interval = 0;
  while (interval <= maxInterval) {
    const higherNote = new Tone.Midi(noteMidi + interval).toNote();
    if (samplesByNote[higherNote]) {
      return higherNote;
    }
    const lowerNote = new Tone.Midi(noteMidi - interval).toNote();
    if (samplesByNote[lowerNote]) {
      return lowerNote;
    }
    interval += 1;
  }
  return note;
};

const getBuffers = samplesByNote =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(samplesByNote, {
      onload: () => resolve(buffers),
    });
  });

const NOTES = ['C3', 'F3', 'G3', 'C4', 'F4', 'G4', 'C5', 'E5', 'G5', 'C6'];

function* makeValueOscillator(min, max) {
  let up = true;
  let value = up ? min : max;
  while (1) {
    const delta = Math.random() * 0.2;
    if (up) {
      value += delta;
    } else {
      value -= delta;
    }
    if (up && value > max) {
      up = false;
    } else if (!up && value < min) {
      up = true;
    }
    yield value;
  }
}

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getBuffers(samples['vcsl-vibraphone-soft-mallets-mp']),
    new Tone.Reverb(5).generate(),
  ]).then(([buffers, reverb]) => {
    const vol = new Tone.Volume(10).connect(destination);
    const activeSources = [];
    const filter = new Tone.Filter(2000);
    filter.connect(vol);
    reverb.connect(filter);
    const delay = new Tone.FeedbackDelay({
      delayTime: 0.2,
      feedback: 0.7,
    }).connect(reverb);
    const valueOscillator = makeValueOscillator(5, 20);
    const play = note => {
      const closestSample = findClosest(
        samples['vcsl-vibraphone-soft-mallets-mp'],
        note
      );
      const difference = Distance.semitones(closestSample, note);
      const buffer = buffers.get(closestSample);
      const playbackRate = Tone.intervalToFrequencyRatio(difference - 12);
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
        .connect(delay);
      activeSources.push(bufferSource);
      bufferSource.start('+1');
      Tone.Transport.scheduleOnce(() => {
        play(note);
      }, `+${Math.random() * valueOscillator.next().value + valueOscillator.next().value}`);
    };
    NOTES.forEach(note => {
      play(note);
    });
    return () => {
      [buffers, reverb, filter, delay, ...activeSources].forEach(node =>
        node.dispose()
      );
    };
  });
};

export default makePiece;

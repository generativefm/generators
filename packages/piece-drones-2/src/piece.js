import Tone from 'tone';
import { Note, Distance } from 'tonal';
import { getBuffers } from '@generative-music/piece-utilities';

const NOTES = ['C4', 'G4', 'C5', 'G5', 'E5'];

const findClosest = (samplesByNote, note) => {
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

  const samplesByNote = samples['vsco2-violins-susvib'];

  return getBuffers(samplesByNote).then(buffers => {
    const filter = new Tone.Filter(6000, 'lowpass', -48).connect(destination);
    const disposableNodes = [filter, buffers];

    const drone = (note, droneDestination, pitchShift = 0, reverse = false) => {
      const closestSampledNote = findClosest(samplesByNote, note);
      const difference = Distance.semitones(closestSampledNote, note);
      const playbackRate = Tone.intervalToFrequencyRatio(
        difference + pitchShift
      );
      const buffer = buffers.get(closestSampledNote);
      if (!disposableNodes.includes(buffer)) {
        disposableNodes.push(buffer);
      }
      const source = new Tone.BufferSource(buffer)
        .set({
          reverse,
          playbackRate,
          onended: () => {
            const i = disposableNodes.indexOf(source);
            if (i >= 0) {
              source.dispose();
              disposableNodes.splice(i, 1);
            }
          },
        })
        .connect(droneDestination);
      source.start('+1');
    };
    const autoFilter = new Tone.AutoFilter(Math.random() / 10, 150, 4)
      .connect(filter)
      .start();

    const lfoMin = Math.random() / 100;
    const lfoMax = lfoMin * 10;

    const frequencyLfo = new Tone.LFO({ min: lfoMin, max: lfoMax });

    frequencyLfo.connect(autoFilter.frequency);
    frequencyLfo.start();

    disposableNodes.push(autoFilter, frequencyLfo);

    NOTES.forEach(note => {
      const playDrone = () => {
        drone(note, autoFilter, -36);
        Tone.Transport.scheduleOnce(() => {
          playDrone();
        }, `+${Math.random() * 20 + 40}`);
      };
      playDrone();
    });

    const startDrone = (note, droneDestination, delay) => {
      const playDrone = () => {
        drone(note, droneDestination, -24, true);
        Tone.Transport.scheduleOnce(() => {
          playDrone();
        }, `+${Math.random() * 45 + 45}`);
      };
      Tone.Transport.scheduleOnce(() => {
        playDrone();
      }, `+${delay}`);
    };
    const firstDroneDelay = Math.random() * 15 + 15;
    const secondDroneDelay = firstDroneDelay + Math.random() * 30;
    startDrone('D5', filter, firstDroneDelay);
    startDrone('E5', filter, secondDroneDelay);
    startDrone('C5', filter, 60 + Math.random() * 60);
    return () => {
      disposableNodes.forEach(node => node.dispose());
      disposableNodes.splice(0, disposableNodes.length);
    };
  });
};

export default makePiece;

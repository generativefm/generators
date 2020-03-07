import Tone from 'tone';
import { Note, Distance } from 'tonal';
import { getBuffers } from '@generative-music/utilities';

const NOTES = ['C4', 'G4', 'E4'];

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

  const instrumentNames = ['vsco2-trumpet-sus-f', 'vsco2-trumpet-sus-mf'];

  const masterVol = new Tone.Volume(-12).connect(destination);
  const disposableNodes = [masterVol];
  return Promise.all(
    instrumentNames.map(instrumentName => getBuffers(samples[instrumentName]))
  )
    .then(instrumentBuffers =>
      instrumentBuffers.forEach((buffers, i) => {
        disposableNodes.push(buffers);
        const instrumentName = instrumentNames[i];
        const samplesByNote = samples[instrumentName];
        const drone = (
          note,
          droneDestination,
          pitchShift = 0,
          reverse = false
        ) => {
          const closestSampledNote = findClosest(samplesByNote, note);
          const difference = Distance.semitones(closestSampledNote, note);
          const playbackRate = Tone.intervalToFrequencyRatio(
            difference + pitchShift
          );
          const buffer = buffers.get(closestSampledNote);
          const source = new Tone.BufferSource(buffer)
            .set({
              reverse,
              playbackRate,
              onended: () => {
                const index = disposableNodes.indexOf(source);
                if (index >= 0) {
                  source.dispose();
                  disposableNodes.splice(index, 1);
                }
              },
            })
            .connect(droneDestination);
          source.start('+1');
        };
        const autoFilter = new Tone.AutoFilter(Math.random() / 10, 150, 4)
          .connect(masterVol)
          .start();

        const lfoMin = Math.random() / 100;
        const lfoMax = lfoMin * 10;

        const frequencyLfo = new Tone.LFO({ min: lfoMin, max: lfoMax });

        frequencyLfo.connect(autoFilter.frequency);
        frequencyLfo.start();

        const lastVol = new Tone.Volume();
        const lastVolLfo = new Tone.LFO({
          min: -100,
          max: -10,
          frequency: Math.random() / 100,
          phase: 90,
        });
        lastVolLfo.connect(lastVol.volume);
        lastVolLfo.start();
        lastVol.connect(autoFilter);

        disposableNodes.push(autoFilter, frequencyLfo, lastVol, lastVolLfo);

        NOTES.forEach((note, noteIndex) => {
          const playDrone = () => {
            if (noteIndex === NOTES.length - 1) {
              drone(note, lastVol, -36);
            }
            drone(note, autoFilter, -36);
            Tone.Transport.scheduleOnce(() => {
              playDrone();
            }, `+${Math.random() * 20 + 40}`);
          };
          playDrone();
        });
      })
    )
    .then(() => () => {
      disposableNodes.forEach(node => node.dispose());
      disposableNodes.splice(0, disposableNodes.length);
    });
};

export default makePiece;

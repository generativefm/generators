import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';
import { Note, Distance } from 'tonal';

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

const getBuffer = url =>
  new Promise(resolve => {
    const buffer = new Tone.Buffer(url, () => resolve(buffer));
  });

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename).then(
    ({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      const masterVol = new Tone.Volume(-12).connect(destination);
      const disposableNodes = [masterVol];
      ['vsco2-trumpet-sus-f', 'vsco2-trumpet-sus-mf'].forEach(
        instrumentName => {
          const samplesByNote = samples[instrumentName][preferredFormat];
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
            const url = samplesByNote[closestSampledNote];
            return getBuffer(
              url.includes('samples')
                ? url
                : `./samples/${instrumentName}/${url}`
            ).then(buffer => {
              disposableNodes.push(buffer);
              const source = new Tone.BufferSource(buffer).connect(
                droneDestination
              );
              source.reverse = reverse;
              source.onended = () => {
                const i = disposableNodes.findIndex(node => node === source);
                if (i >= 0) {
                  disposableNodes.splice(i, 1);
                }
                source.dispose();
              };
              source.playbackRate.value = playbackRate;
              source.start('+1');
            });
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

          NOTES.forEach((note, i) => {
            const playDrone = () => {
              if (i === NOTES.length - 1) {
                drone(note, lastVol, -36);
              }
              drone(note, autoFilter, -36);
              Tone.Transport.scheduleOnce(() => {
                playDrone();
              }, `+${Math.random() * 20 + 40}`);
            };
            playDrone();
          });
        }
      );
      return Promise.resolve(() => {
        disposableNodes.forEach(node => node.dispose());
      });
    }
  );

export default makePiece;

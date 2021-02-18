import * as Tone from 'tone';
import {
  createBuffers,
  wrapActivate,
  sampleNote,
} from '@generative-music/utilities';
import { sampleNames } from '../drones.gfm.manifest.json';

const NOTES = ['C4', 'G4', 'E4'];

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const instrumentBuffers = await Promise.all(
    sampleNames.map(instrumentName => createBuffers(samples[instrumentName]))
  );

  const schedule = ({ destination }) => {
    const disposableNodes = [];

    instrumentBuffers.forEach((buffers, i) => {
      const instrumentName = sampleNames[i];
      const samplesByNote = samples[instrumentName];
      const drone = (
        note,
        droneDestination,
        pitchShift = 0,
        reverse = false
      ) => {
        const { sampledNote, playbackRate } = sampleNote({
          note,
          pitchShift,
          sampledNotes: Object.keys(samplesByNote),
        });
        const buffer = buffers.get(sampledNote);
        const source = new Tone.BufferSource(buffer)
          .set({
            reverse,
            playbackRate,
            onended: () => {
              const index = disposableNodes.indexOf(source);
              if (index >= 0) {
                disposableNodes.splice(index, 1);
              }
            },
          })
          .connect(droneDestination);
        source.start('+1');
      };
      const autoFilter = new Tone.AutoFilter(
        window.generativeMusic.rng() / 10,
        150,
        4
      )
        .connect(destination)
        .start();

      const lfoMin = window.generativeMusic.rng() / 100;
      const lfoMax = lfoMin * 10;

      const frequencyLfo = new Tone.LFO({ min: lfoMin, max: lfoMax });

      frequencyLfo.connect(autoFilter.frequency);
      frequencyLfo.start();

      const lastGain = new Tone.Gain();
      lastGain.connect(autoFilter);

      const lastGainLfo = new Tone.LFO({
        frequency: window.generativeMusic.rng() / 100,
        phase: 90,
      });
      lastGainLfo.connect(lastGain.gain);
      lastGainLfo.start();

      NOTES.forEach((note, noteIndex) => {
        const playDrone = () => {
          if (noteIndex === NOTES.length - 1) {
            drone(note, lastGain, -36);
          }
          drone(note, autoFilter, -36);
          Tone.Transport.scheduleOnce(() => {
            playDrone();
          }, `+${window.generativeMusic.rng() * 20 + 40}`);
        };
        playDrone();
      });

      disposableNodes.push(autoFilter, frequencyLfo, lastGainLfo, lastGain);
    });

    return () => {
      disposableNodes.forEach(node => {
        node.dispose();
      });
    };
  };

  const deactivate = () => {
    instrumentBuffers.forEach(buffers => {
      buffers.dispose();
    });
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

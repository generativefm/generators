import * as Tone from 'tone';
import {
  createBuffers,
  sampleNote,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../drones-2.gfm.manifest.json';

const NOTES = ['C4', 'G4', 'C5', 'G5', 'E5'];

const activate = async ({ destination, sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const samplesByNote = samples['vsco2-violins-susvib'];
  const sampledNotes = Object.keys(samplesByNote);

  const buffers = await createBuffers(samplesByNote);

  const filter = new Tone.Filter(6000, 'lowpass', -48).connect(destination);
  const activeSources = [];

  const drone = (note, droneDestination, pitchShift = 0, reverse = false) => {
    const { sampledNote, playbackRate } = sampleNote({
      note,
      sampledNotes,
      pitchShift,
    });
    const buffer = buffers.get(sampledNote);
    const source = new Tone.BufferSource(buffer)
      .set({
        reverse,
        playbackRate,
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(droneDestination);
    source.start('+1');
  };

  const schedule = () => {
    const autoFilter = new Tone.AutoFilter(Math.random() / 10, 150, 4)
      .connect(filter)
      .start();

    const lfoMin = Math.random() / 100;
    const lfoMax = lfoMin * 10;

    const frequencyLfo = new Tone.LFO({ min: lfoMin, max: lfoMax });

    frequencyLfo.connect(autoFilter.frequency);
    frequencyLfo.start();

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
      activeSources.forEach(source => source.dispose());
      autoFilter.dispose();
      frequencyLfo.dispose();
    };
  };

  const deactivate = () => {
    filter.dispose();
  };
  return [deactivate, schedule];
};

export default wrapActivate(activate);

import * as Tone from 'tone';
import {
  wrapActivate,
  major7th,
  createPitchShiftedSampler,
  createPrerenderedSampler,
  getRandomElement,
} from '@generative-music/utilities';
import { sampleNames } from '../homage.gfm.manifest.json';

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const masterVol = new Tone.Volume(5).connect(destination);
  const violinNotes = ['C3', 'C4'];
  const pianoNotes = [...major7th('C5'), ...major7th('C6'), 'C7'];

  const piano = await createPitchShiftedSampler({
    samplesByNote: samples['vsco2-piano-mf'],
    pitchShift: -24,
    attack: 0,
  });
  piano.connect(masterVol);

  const violins = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    onProgress,
    notes: violinNotes,
    sourceInstrumentName: 'vsco2-violins-susvib',
    renderedInstrumentName: 'homage::vsco2-violins-susvib',
    getDestination: () => new Tone.Reverb(50).toDestination().generate(),
    pitchShift: -24,
  });

  const violinVolume = new Tone.Volume(-15).connect(masterVol);
  const filter = new Tone.Filter(50).connect(violinVolume);
  violins.connect(filter);

  const pianoChain = () => {
    const note = getRandomElement(pianoNotes);
    piano.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      pianoChain();
    }, `+${Math.random() * 10}`);
  };

  const violinDrone = note => {
    violins.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      violinDrone(note);
    }, `+${Math.random() * 10}`);
  };

  const schedule = () => {
    const filterLfo = new Tone.LFO(
      Math.random() * 0.001 + 0.0005,
      100,
      2000
    ).set({
      phase: 90,
    });
    filterLfo.connect(filter.frequency);
    filterLfo.start();

    violinNotes.forEach(note => violinDrone(note));
    pianoChain();

    return () => {
      piano.releaseAll(0);
      violins.releaseAll(0);
      filterLfo.dispose();
    };
  };

  const deactivate = () => {
    [piano, violins, filter].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

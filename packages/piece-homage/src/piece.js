import * as Tone from 'tone';
import {
  wrapActivate,
  major7th,
  createPitchShiftedSampler,
  createPrerenderableSampler,
  getRandomElement,
} from '@generative-music/utilities';
import { sampleNames } from '../homage.gfm.manifest.json';

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const violinNotes = ['C3', 'C4'];
  const pianoNotes = [...major7th('C5'), ...major7th('C6'), 'C7'];

  const piano = await createPitchShiftedSampler({
    samplesByNote: samples['vsco2-piano-mf'],
    pitchShift: -24,
    attack: 0,
  });

  const violins = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    onProgress,
    notes: violinNotes,
    sourceInstrumentName: 'vsco2-violins-susvib',
    renderedInstrumentName: 'homage__vsco2-violins-susvib',
    getDestination: () => new Tone.Reverb(50).toDestination().generate(),
    pitchShift: -24,
  });

  const violinVolume = new Tone.Volume(-15);
  const filter = new Tone.Filter(50).connect(violinVolume);
  violins.connect(filter);

  const pianoChain = () => {
    const note = getRandomElement(pianoNotes);
    piano.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      pianoChain();
    }, `+${window.generativeMusic.rng() * 10}`);
  };

  const violinDrone = note => {
    violins.triggerAttack(note, '+1');
    Tone.Transport.scheduleOnce(() => {
      violinDrone(note);
    }, `+${window.generativeMusic.rng() * 10}`);
  };

  const schedule = ({ destination }) => {
    const filterLfo = new Tone.LFO(
      window.generativeMusic.rng() * 0.001 + 0.0005,
      100,
      2000
    ).set({
      phase: 90,
    });
    filterLfo.connect(filter.frequency);
    filterLfo.start();
    piano.connect(destination);
    violinVolume.connect(destination);

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

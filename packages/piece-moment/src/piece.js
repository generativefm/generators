import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
  getPitchClass,
  getOctave,
} from '@generative-music/utilities';
import { sampleNames } from '../moment.gfm.manifest.json';

const NOTES = ['C2', 'E2', 'G2', 'C3', 'E3', 'G3', 'C4', 'E4', 'G4'];

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const masterVol = new Tone.Volume(-5).connect(destination);

  const basePrerenderableOpts = {
    samples,
    sampleLibrary,
    notes: NOTES,
    getDestination: () =>
      new Tone.Reverb(10)
        .set({ wet: 0.5 })
        .toDestination()
        .generate(),
  };

  const guitar = await createPrerenderableSampler(
    Object.assign({}, basePrerenderableOpts, {
      sourceInstrumentName: 'acoustic-guitar',
      renderedInstrumentName: 'moment__acoustic-guitar',
      onProgress: val => onProgress(val * 0.33),
    })
  );

  guitar.connect(masterVol);

  const hum1 = await createPrerenderableSampler(
    Object.assign({}, basePrerenderableOpts, {
      sourceInstrumentName: 'alex-hum-1',
      renderedInstrumentName: 'moment__alex-hum-1',
      onProgress: val => onProgress(val * 0.33 + 0.33),
    })
  );

  const hum2 = await createPrerenderableSampler(
    Object.assign({}, basePrerenderableOpts, {
      sourceInstrumentName: 'alex-hum-1',
      renderedInstrumentName: 'moment__alex-hum-2',
      onProgress: val => onProgress(val * 0.33 + 0.66),
    })
  );

  const compressor = new Tone.Compressor().connect(masterVol);
  const humVolume = new Tone.Volume(-15).connect(compressor);

  [hum1, hum2].forEach(humSampler => {
    humSampler.set({
      attack: 3,
      release: 3,
      curve: 'linear',
    });
    humSampler.connect(humVolume);
  });

  const lastHumTime = new Map();
  const playHums = note => {
    const now = Tone.now();
    if (!lastHumTime.has(note) || now - lastHumTime.get(note) > 30) {
      [hum1, hum2].forEach(humSampler =>
        humSampler.triggerAttackRelease(note, Math.random() + 4)
      );
      lastHumTime.set(note, now);
    }
  };

  const schedule = () => {
    const firstDelays = NOTES.map(
      note => Math.random() * 20 * (getPitchClass(note) === 'E' ? 3 : 1)
    );
    const minFirstDelay = Math.min(...firstDelays);

    NOTES.forEach((note, i) => {
      const pc = getPitchClass(note);
      const play = (time = (Math.random() * 20 + 5) * (pc === 'E' ? 3 : 1)) => {
        Tone.Transport.scheduleOnce(() => {
          const octave = getOctave(note);
          if (
            (octave === 3 || (octave === 2 && pc === 'G')) &&
            Math.random() < 0.1
          ) {
            playHums(note);
          } else if (Math.random() < 0.1) {
            playHums('E3');
          }
          guitar.triggerAttack(note);
          play();
        }, `+${time}`);
      };
      play(firstDelays[i] - minFirstDelay);
    });

    return () => {
      [guitar, hum1, hum2].forEach(sampler => {
        sampler.releaseAll(0);
      });
    };
  };

  const deactivate = () => {
    [guitar, hum1, hum2, compressor, humVolume, masterVol].forEach(node =>
      node.dispose()
    );
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

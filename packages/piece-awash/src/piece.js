import * as Tone from 'tone';
import {
  wrapActivate,
  createPrerenderableSampler,
  createPrerenderableBuffers,
} from '@generative-music/utilities';
import { sampleNames } from '../awash.gfm.manifest.json';

const NOTES = ['C3', 'D#3', 'G3', 'A#3', 'C4', 'D#4', 'G4', 'A#4'];

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const oceanDrumSamples =
    samples['awash__vcsl-ocean-drum'] || samples['vcsl-ocean-drum'];

  const guitar = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    notes: NOTES,
    sourceInstrumentName: 'dry-guitar-vib',
    renderedInstrumentName: 'awash__dry-guitar-vib',
    getDestination: () => new Tone.Reverb(7).toDestination(),
    additionalRenderLength: 2,
    onProgress: val => onProgress(val / 2),
  });

  const oceanDrum = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vcsl-ocean-drum',
    renderedInstrumentName: 'awash__vcsl-ocean-drum',
    getDestination: () => new Tone.Reverb(7).toDestination(),
    additionalRenderLength: 1,
    onProgress: val => onProgress(val / 2 + 0.5),
  });

  guitar.set({ curve: 'linear', attack: 10, release: 15 });

  const filter = new Tone.Filter(5000, 'notch', -12);
  guitar.connect(filter);

  const schedule = ({ destination }) => {
    const delay1 = new Tone.FeedbackDelay({
      feedback: 0.7,
      delayTime: Math.random() * 0.2 + 0.8,
    }).connect(destination);
    const delay2 = new Tone.FeedbackDelay({
      feedback: 0.5,
      delayTime: 0.25,
    }).connect(delay1);
    const autoFilter = new Tone.AutoFilter(Math.random() / 10, 200, 5)
      .start()
      .connect(delay2);

    filter.connect(autoFilter);

    const activeSources = [];

    const firstOceanDelays = oceanDrumSamples.map(() => Math.random() * 30);
    const minOceanDelay = Math.min(...firstOceanDelays);

    oceanDrumSamples.forEach((_, i) => {
      const buffer = oceanDrum.get(i);
      const play = () => {
        buffer.reverse = Math.random() < 0.5;
        const source = new Tone.BufferSource(buffer)
          .set({
            fadeIn: 3,
            fadeOut: 3,
            curve: 'linear',
            playbackRate: 0.5,
            onended: () => {
              const index = activeSources.indexOf(source);
              if (index >= 0) {
                activeSources.splice(index, 1);
              }
            },
          })
          .connect(destination);
        activeSources.push(source);
        source.start('+1');
        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${Math.random() * buffer.duration * 2 + buffer.duration * 2 + 1}`);
      };
      Tone.Transport.scheduleOnce(() => {
        play();
      }, `+${firstOceanDelays[i] - minOceanDelay}`);
    });

    const firstIndex = Math.floor(Math.random() * NOTES.length);

    NOTES.forEach((note, i) => {
      const play = () => {
        guitar.triggerAttack(note, '+1');
        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${Math.random() * 25 + 25}`);
      };
      if (i === firstIndex) {
        play();
      } else {
        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${Math.random() * 50}`);
      }
    });

    return () => {
      guitar.releaseAll(0);
      activeSources.forEach(source => {
        source.dispose();
      });
      [delay1, delay2, autoFilter].forEach(node => node.dispose());
    };
  };

  const deactivate = () => {
    [filter, guitar, oceanDrum].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

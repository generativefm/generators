import * as Tone from 'tone';
import {
  createPrerenderedSampler,
  createPrerenderedBuffers,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../above-the-rain.gfm.manifest.json';

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const getReverb = () => new Tone.Reverb(15).toDestination().generate();
  const chorus = await createPrerenderedBuffers({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'sso-chorus-female',
    renderedInstrumentName: 'above-the-rain::sso-chorus-female',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.5),
  });

  const trumpet = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    notes: ['C', 'E', 'G'].map(pc => `${pc}3`),
    sourceInstrumentName: 'vsco2-trumpet-sus-mf',
    renderedInstrumentName: 'above-the-rain::vsco2-trumpet-sus-mf',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.5 + 0.5),
  });

  trumpet.set({ attack: 5, curve: 'linear' });

  const compressor = new Tone.Compressor().connect(destination);
  trumpet.connect(compressor);

  const playbackRate = 0.25;
  const vol = new Tone.Volume(-10);
  const activeSources = [];
  const play = notes => {
    const note = notes[Math.floor(Math.random() * notes.length)];
    const buf = chorus.get(note);
    const source = new Tone.BufferSource(buf)
      .set({
        playbackRate,
        fadeIn: 4,
        fadeOut: 4,
        curve: 'linear',
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i > -1) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(vol);
    source.start('+1', 0, buf.duration / playbackRate);
    activeSources.push(source);

    if (Math.random() < 0.15) {
      const [pc] = note;
      trumpet.triggerAttack(`${pc}3`, `${1 + Math.random() * 5}`);
    }

    Tone.Transport.scheduleOnce(() => {
      play(notes);
    }, `+${buf.duration / playbackRate - 4 + Math.random() * 5 - 2.5}`);
  };

  const schedule = () => {
    const autoFilter = new Tone.AutoFilter(Math.random() / 100 + 0.01, 100, 4);
    autoFilter.connect(compressor);
    autoFilter.start();

    vol.connect(autoFilter);

    play(['C5']);
    play(['A5', 'G5', 'F5', 'D5', 'E5']);
    play(['C6']);

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      trumpet.releaseAll(0);
      autoFilter.dispose();
    };
  };

  const deactivate = () => {
    [chorus, trumpet, vol].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

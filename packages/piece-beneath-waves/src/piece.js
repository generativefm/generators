import * as Tone from 'tone';
import {
  createPrerenderableBuffers,
  wrapActivate,
  getRandomElement,
} from '@generative-music/utilities';
import { sampleNames } from '../beneath-waves.gfm.manifest.json';

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const getReverb = () => new Tone.Reverb(15).toDestination().generate();

  const chorus = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    keyFilter: key => key === 'C5' || key === 'C6',
    sourceInstrumentName: 'sso-chorus-female',
    renderedInstrumentName: 'beneath-waves__sso-chorus-female',
    getDestination: getReverb,
    onProgress: val => onProgress(val / 2),
  });

  const corAnglais = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    keyFilter: key => key === 'F3' || key === 'F4',
    sourceInstrumentName: 'sso-cor-anglais',
    renderedInstrumentName: 'beneath-waves__sso-cor-anglais',
    getDestination: getReverb,
    onProgress: val => onProgress((val + 1) / 2),
  });

  const compressor = new Tone.Compressor().connect(destination);

  const synthGain = new Tone.Gain().connect(compressor);
  const lPan = new Tone.Panner(-1);
  const rPan = new Tone.Panner(1);
  const lSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
  }).connect(lPan);
  const rSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
  }).connect(rPan);

  const sub = () => {
    lSynth.triggerAttackRelease(38, 0.5, '+1');
    rSynth.triggerAttackRelease(38, 0.5, '+1.5');

    Tone.Transport.scheduleOnce(() => {
      sub();
    }, '+8');
  };

  const playbackRate = 0.15;
  const vol = new Tone.Volume(-10);

  const activeSources = [];

  const play = notes => {
    const note = getRandomElement(notes);
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

    Tone.Transport.scheduleOnce(() => {
      play(notes);
    }, `+${buf.duration / playbackRate - (1 + Math.random() * 5)}`);
  };

  const playCorAnglais = () => {
    const note = `F${Math.floor(Math.random() * 2) + 3}`;
    const buf = corAnglais.get(note);
    const source = new Tone.BufferSource(buf)
      .set({
        playbackRate: 0.15,
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
    source.start('+1');
    activeSources.push(source);

    Tone.Transport.scheduleOnce(() => {
      playCorAnglais();
    }, `+${buf.duration * 10 + Math.random() * buf.duration * 10}`);
  };

  const schedule = () => {
    const delay = new Tone.FeedbackDelay({
      feedback: 0.7,
      delayTime: 2,
      maxDelay: 2,
    }).connect(synthGain);

    rPan.connect(delay);
    lPan.connect(delay);

    const synthGainLfo = new Tone.LFO(Math.random() / 100 + 0.01).set({
      phase: 90,
    });
    synthGainLfo.connect(synthGain.gain);
    synthGainLfo.start();

    const autoFilter = new Tone.AutoFilter(Math.random() / 100 + 0.01, 75, 6);
    autoFilter.connect(compressor);
    autoFilter.start();
    vol.connect(autoFilter);

    play(['C5']);
    play(['C6']);
    sub();

    Tone.Transport.scheduleOnce(() => {
      playCorAnglais();
    }, `+${Math.random() * 60}`);

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });

      lSynth.triggerRelease();
      rSynth.triggerRelease();

      delay.dispose();
      synthGainLfo.dispose();
      autoFilter.dispose();
    };
  };

  const deactivate = () => {
    [
      chorus,
      corAnglais,
      compressor,
      synthGain,
      lPan,
      rPan,
      lSynth,
      rSynth,
      vol,
      ...activeSources,
    ].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

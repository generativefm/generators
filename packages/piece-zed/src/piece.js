import * as Tone from 'tone';
import {
  wrapActivate,
  toss,
  createPrerenderableInstrument,
  createPrerenderedBuffer,
} from '@generative-music/utilities';
import { sampleNames } from '../piece.gfm.manifest.json';

const PITCH_CLASSES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const OCTAVES = [3, 4];
const NOTES = toss(PITCH_CLASSES, OCTAVES);

const createSynth = async context => {
  const synth = new Tone.DuoSynth({
    voice0: {
      oscillator: {
        type: 'square',
      },
      envelope: {
        attack: 5,
        release: 12,
      },
      filterEnvelope: {
        attack: 5,
        release: 12,
      },
    },
    voice1: {
      oscillator: {
        type: 'sawtooth',
      },
      envelope: {
        attack: 5,
        release: 12,
      },
      filterEnvelope: {
        attack: 5,
        release: 12,
      },
    },
    harmonicity: 0,
    vibratoRate: 0.45,
    vibratoAmount: 0.45,
    volume: -20,
  });
  const reverb = await new Tone.Reverb({ decay: 20 })
    .set({ wet: 0.5 })
    .connect(context.destination)
    .generate();
  synth.connect(reverb);
  return {
    instrument: synth,
    dispose: () => {
      synth.dispose();
      reverb.dispose();
    },
  };
};

const createNoise = async context => {
  const reverb = await new Tone.Reverb({ decay: 20 })
    .set({ wet: 0.35 })
    .connect(context.destination)
    .generate();
  const noiseSynthFxGain = new Tone.Gain().connect(reverb);
  const noiseSynth = new Tone.NoiseSynth({
    envelope: { sustain: 1, attack: 0 },
    volume: -40,
  }).connect(noiseSynthFxGain);

  const noiseSynthFxGainLfo = new Tone.LFO({ type: 'square' })
    .set({ phase: 270 })
    .connect(noiseSynthFxGain.gain)
    .start();

  const noiseSynthFxGainLfoFrequencyLfo = new Tone.LFO({
    min: 2,
    max: 20,
    frequency: 0.075,
  })
    .set({ phase: 90 })
    .connect(noiseSynthFxGainLfo.frequency)
    .start();

  return {
    start: () => noiseSynth.triggerAttack(),
    dispose: () => {
      [
        reverb,
        noiseSynthFxGain,
        noiseSynth,
        noiseSynthFxGainLfo,
        noiseSynthFxGainLfoFrequencyLfo,
      ].forEach(node => node.dispose());
    },
  };
};

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const padSynth = await createPrerenderableInstrument({
    sampleLibrary,
    samples,
    createInstrument: createSynth,
    notes: NOTES,
    noteDuration: 20,
    renderedInstrumentName: 'zed__pad',
    onProgress: val => onProgress(val * 0.95),
  });

  padSynth.set({
    attack: 5,
    release: 12,
  });

  if (!samples['zed__noise']) {
    const fullNoiseSynthBuffer = await createPrerenderedBuffer({
      createSource: createNoise,
      duration: 2 / 0.075,
    });
    const noiseSynthBuffer = fullNoiseSynthBuffer.slice(1);
    fullNoiseSynthBuffer.dispose();
    samples['zed__noise'] = [noiseSynthBuffer];
    sampleLibrary.save([['zed__noise', [noiseSynthBuffer]]]);
    onProgress(1);
  }

  const padFilter = new Tone.Filter({ type: 'lowpass' }).connect(destination);
  padSynth.connect(padFilter);
  const noiseFilter = new Tone.Filter({ type: 'lowpass' }).connect(destination);
  const noiseSynthMasterGain = new Tone.Gain().connect(noiseFilter);

  const noisePlayer = new Tone.Player(samples['zed__noise'][0])
    .set({ loop: true })
    .connect(noiseSynthMasterGain);

  const schedule = () => {
    const noiseSynthMasterGainLfo = new Tone.LFO({
      frequency: Math.random() * 0.05 + 0.05,
    })
      .set({ phase: 90 })
      .connect(noiseSynthMasterGain.gain)
      .start();

    const noiseSynthMasterGainLfoFrequencyLfo = new Tone.LFO({
      min: 0.01,
      max: 0.05,
      frequency: Math.random() * 0.05 + 0.05,
    })
      .connect(noiseSynthMasterGainLfo.frequency)
      .start();

    const padFilterFreqLfo = new Tone.LFO({
      min: 100,
      max: 250,
      frequency: Math.random() * 0.05 + 0.05,
    })
      .connect(padFilter.frequency)
      .start();

    const noiseFilterFreqLfo = new Tone.LFO({
      min: 5000,
      max: 10000,
      frequency: Math.random() * 0.05 + 0.05,
    })
      .connect(noiseFilter.frequency)
      .start();

    noisePlayer.start();

    const playRandomChord = () => {
      const root = Math.floor(Math.random() * (NOTES.length - 5));
      const chord = [root, root + 2, root + 5];
      const notes = chord.map(index => NOTES[index]);
      const baseDuration = Math.random() * 3 + 4;
      notes.forEach(note => {
        padSynth.triggerAttackRelease(
          note,
          baseDuration + Math.random() - 0.5,
          `+${Math.random()}`
        );
      });

      Tone.Transport.scheduleOnce(() => {
        playRandomChord();
      }, `+${Math.random() * 3 + 4 + Math.random() * 3 + 4}`);
    };

    playRandomChord();

    return () => {
      padSynth.releaseAll(0);
      noisePlayer.stop(0);
      [
        noiseSynthMasterGainLfo,
        noiseSynthMasterGainLfoFrequencyLfo,
        padFilterFreqLfo,
        noiseFilterFreqLfo,
      ].forEach(lfo => lfo.dispose());
    };
  };

  const deactivate = () => {
    [
      padSynth,
      noisePlayer,
      padFilter,
      noiseFilter,
      noiseSynthMasterGain,
    ].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

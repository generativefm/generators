import * as Tone from 'tone';
import {
  wrapActivate,
  transpose,
  createPrerenderableBufferArray,
  createPrerenderableSampler,
  createPitchShiftedSampler,
} from '@generative-music/utilities';
import { sampleNames, id } from '../piece.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const BASE_TIME_UNIT = 0.54;

const createPercussionInstrument = (buffer) => {
  const output = new Tone.Gain();
  const activeSources = [];

  const connect = (...args) => {
    output.connect(...args);
  };

  const triggerAttack = (time, velocity = 1) => {
    const gain = new Tone.Gain(velocity).connect(output);
    const source = new Tone.ToneBufferSource(buffer)
      .set({
        onended: () => {
          const index = activeSources.indexOf(source);
          if (index > -1) {
            activeSources.splice(index, 1);
          }
        },
      })
      .connect(gain);
    source.start(time);
  };

  const releaseAll = (time) => {
    activeSources.forEach((source) => {
      source.set({ fadeOut: 0 });
      source.stop(time);
    });
  };

  const dispose = () => {
    activeSources.forEach((node) => {
      node.stop();
    });
  };

  return { connect, toDestination, triggerAttack, dispose, releaseAll };
};

const getPercussionDestination = () =>
  new Tone.Reverb(10).set({ wet: 0.15 }).generate();

const activate = async ({ sampleLibrary, onProgress }) => {
  const defaultSamples = await sampleLibrary.request(
    Tone.getContext(),
    sampleNames
  );
  const samples = Object.assign({}, defaultSamples, {
    'itslucid-lofi-hats': defaultSamples['itslucid-lofi-hats']
      ? [defaultSamples['itslucid-lofi-hats'][8]]
      : null,
    'itslucid-lofi-kicks': defaultSamples['itslucid-lofi-kicks']
      ? [defaultSamples['itslucid-lofi-kicks'][0]]
      : null,
    'itslucid-lofi-snares': defaultSamples['itslucid-lofi-snares']
      ? [defaultSamples['itslucid-lofi-snares'][10]]
      : null,
  });
  const [hatBuffer] = await createPrerenderableBufferArray({
    samples,
    sourceInstrumentName: 'itslucid-lofi-hats',
    renderedInstrumentName: 'skyline__itslucid-lofi-hats',
    sampleLibrary,
    getDestination: getPercussionDestination,
    additionalRenderLength: 0.5,
    onProgress: (val) => onProgress(val * 0.25),
  });
  const [kickBuffer] = await createPrerenderableBufferArray({
    samples,
    sourceInstrumentName: 'itslucid-lofi-kicks',
    renderedInstrumentName: 'skyline__itslucid-lofi-kicks',
    sampleLibrary,
    getDestination: getPercussionDestination,
    additionalRenderLength: 0.5,
    onProgress: (val) => onProgress(val * 0.25 + 0.25),
  });
  const [snareBuffer] = await createPrerenderableBufferArray({
    samples,
    sourceInstrumentName: 'itslucid-lofi-snares',
    renderedInstrumentName: 'skyline__itslucid-lofi-snares',
    sampleLibrary,
    getDestination: getPercussionDestination,
    additionalRenderLength: 0.5,
    onProgress: (val) => onProgress(val * 0.25 + 0.5),
  });
  const violins = await createPrerenderableSampler({
    notes: ['C4', 'G4', 'G5'],
    pitchShift: -24,
    samples,
    sourceInstrumentName: 'vsco2-violins-susvib',
    renderedInstrumentName: 'skyline__vsco2-violins-susvib',
    sampleLibrary,
    getDestination: () => new Tone.Reverb(30).set({ wet: 0.5 }).generate(),
    onProgress: (val) => onProgress(val * 0.25 + 0.75),
  });
  const hats = createPercussionInstrument(hatBuffer);
  const kick = createPercussionInstrument(kickBuffer);
  const snare = createPercussionInstrument(snareBuffer);
  const panner = new Tone.Panner();
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { release: 1, releaseCurve: 'linear' },
    volume: -10,
  }).connect(panner);
  const lowpass = new Tone.Filter(500);
  violins.connect(lowpass);

  const schedule = ({ destination }) => {
    lowpass.connect(destination);
    panner.connect(destination);
    const percussionAutoFilter = new Tone.AutoFilter(
      Math.random() * 0.005 + 0.002,
      1000
    )
      .start()
      .connect(destination);
    [hats, kick, snare].forEach((instrument) => {
      instrument.connect(destination);
    });

    Tone.Transport.scheduleRepeat((time) => {
      panner.pan.setValueAtTime(panner.pan.value, time + 1);
      panner.pan.linearRampToValueAtTime(Math.random() * 2 - 1, time + 3);
      panner.set({ pan: Math.random() * 2 - 1 });
      synth.triggerAttackRelease('C2', 1, time + 1);

      const shouldPlayHats = Math.random() < 0.95;
      for (
        let sixteenthNoteIndex = 0;
        sixteenthNoteIndex < 32 && shouldPlayHats;
        sixteenthNoteIndex += 1
      ) {
        if (sixteenthNoteIndex % 2 === 0 || Math.random() < 0.1) {
          hatSampler.triggerAttack(
            time + 1 + (sixteenthNoteIndex * BASE_TIME_UNIT) / 4,
            0.03
          );
        }
      }
      kickSampler.triggerAttack(time + 1, 0.25);
      if (Math.random() < 0.2) {
        kickSampler.triggerAttack(time + 1 + BASE_TIME_UNIT, 0.25);
      }
      if (Math.random() < 0.2) {
        kickSampler.triggerAttack(time + 1 + BASE_TIME_UNIT * 7, 0.25);
      }
      if (Math.random() < 0.1) {
        return;
      }
      if (Math.random() < 0.33) {
        snareSampler.triggerAttack(time + 1 + 3.25 * BASE_TIME_UNIT, 0.2);
      }
      snareSampler.triggerAttack(time + 1 + 4 * BASE_TIME_UNIT, 0.2);
      if (Math.random() < 0.05) {
        snareSampler.triggerAttack(time + 1 + 7.5 * BASE_TIME_UNIT, 0.2);
        snareSampler.triggerAttack(time + 1 + 7.75 * BASE_TIME_UNIT, 0.2);
      }
    }, BASE_TIME_UNIT * 8);

    let lastExtraNote = 'A';
    let lastExtraNoteTime = Tone.now();

    const drone = () => {
      sampler.triggerAttack('C4');

      Tone.Transport.scheduleOnce(() => {
        drone();
      }, `+${Math.random() * 10}`);

      if (Tone.now() - lastExtraNoteTime < 20 || Math.random() < 0.7) {
        return;
      }

      lastExtraNote = Math.random() < 0.6 || lastExtraNote === 'A' ? 'G' : 'A';
      lastExtraNoteTime = Tone.now();
      sampler.triggerAttack(`${lastExtraNote}4`);
      if (Math.random() < 0.2) {
        sampler.triggerAttack(`${lastExtraNote}5`);
      }
    };
    drone();

    return () => {
      percussionAutoFilter.dispose();
      [hats, kick, snare].forEach((instrument) => {
        instrument.releaseAll(0);
      });
    };

    const deactivate = () => {
      [
        lowpass,
        violins,
        hats,
        kick,
        snare,
        hatBuffer,
        kickBuffer,
        snareBuffer,
        panner,
        synth,
      ].forEach((node) => {
        node.dispose();
      });
    };

    return [deactivate, schedule];
  };
};

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

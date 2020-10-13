import * as Tone from 'tone';
import {
  createBuffer,
  createPitchShiftedSampler,
  wrapActivate,
  getRandomElement,
  getPitchClass,
  getOctave,
} from '@generative-music/utilities';
import { sampleNames } from '../420hz-gamma-waves-for-big-brain.gfm.manifest.json';

const getRandomPhase = () => Math.random() * 360;

const MAX_DRONE_GAIN = 0.4;

const activate = async ({ destination, sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const stereoWidener = new Tone.StereoWidener();
  const crossFade = new Tone.CrossFade().connect(stereoWidener);
  const pianoGain = new Tone.Gain().connect(stereoWidener);

  const chords = [
    ['G3', 'C4', 'E4'],
    ['E4', 'A4', 'C5'],
    ['D4', 'G4', 'B4'],
    ['C4', 'F4', 'G4'],
  ];

  const [waveBuffer, pitchShiftPiano, ...droneStacks] = await Promise.all([
    createBuffer(samples.waves[0]),
    createPitchShiftedSampler({
      samplesByNote: samples['vsco2-piano-mf'],
      pitchShift: -24,
    }),
    ...chords.map(async chord => {
      const gain = new Tone.Gain(0);
      const sampler = await createPitchShiftedSampler({
        samplesByNote: samples['sso-chorus-male'],
        pitchShift: -24,
      });
      sampler.connect(gain);
      return [chord, gain, sampler];
    }),
  ]);

  pitchShiftPiano.connect(pianoGain);

  const activeSources = [];

  const loopWaves = () => {
    const playbackRate = 0.5;
    const source = new Tone.BufferSource(waveBuffer)
      .set({
        fadeIn: 5,
        fadeOut: 5,
        curve: 'linear',
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
        playbackRate,
      })
      .connect(crossFade.b);
    activeSources.push(source);
    source.start('+1', 0, waveBuffer.duration / playbackRate - 5);

    Tone.Transport.scheduleOnce(() => {
      loopWaves();
    }, `+${waveBuffer.duration / playbackRate - 5}`);
  };

  const drone = (chorus, note, min, max) => {
    chorus.triggerAttack(note, '+1');

    Tone.Transport.scheduleOnce(() => {
      drone(chorus, note, min, max);
    }, `+${Math.random() * (max - min) + min}`);
  };

  let unmutedDroneGain = getRandomElement(droneStacks)[1];
  unmutedDroneGain.gain.setValueAtTime(MAX_DRONE_GAIN, Tone.now());

  const changeChord = () => {
    const transitionTime = Math.ceil(Math.random() * 10 + 10);
    const mutedDroneStacks = droneStacks.filter(
      ([, gain]) => gain !== unmutedDroneGain
    );
    const nextUnmutedDroneStack = getRandomElement(mutedDroneStacks);
    unmutedDroneGain.gain.cancelScheduledValues(Tone.now());
    unmutedDroneGain.gain.setValueAtTime(
      unmutedDroneGain.gain.value,
      Tone.now()
    );
    unmutedDroneGain.gain.linearRampToValueAtTime(0, `+${transitionTime}`);
    unmutedDroneGain = nextUnmutedDroneStack[1];
    unmutedDroneGain.gain.setValueAtTime(0, Tone.now());
    unmutedDroneGain.gain.linearRampToValueAtTime(
      MAX_DRONE_GAIN,
      `+${transitionTime}`
    );

    const nextChordChangeDelay = Math.random() * 10 + 10;

    const [unmutedDroneChord] = nextUnmutedDroneStack;

    const date = new Date();
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const playChance = (minutes / 60) % 1;
    const octaveChange = hours <= 6 || hours >= 18 ? 2 : 1;
    unmutedDroneChord
      .filter(() => Math.random() < playChance)
      .forEach(note => {
        const noteTime =
          Math.random() * (nextChordChangeDelay + transitionTime / 2) +
          transitionTime / 2;
        const pc = getPitchClass(note);
        const oct = getOctave(note);
        pitchShiftPiano.triggerAttack(
          `${pc}${oct + octaveChange}`,
          `+${noteTime}`
        );
      });

    Tone.Transport.scheduleOnce(() => {
      changeChord();
    }, `+${transitionTime + nextChordChangeDelay}`);
  };

  stereoWidener.connect(destination);

  const schedule = () => {
    const pianoGainLfo = new Tone.LFO(Math.random() / 10000 + 0.0001).set({
      phase: getRandomPhase(),
    });
    pianoGainLfo.connect(pianoGain.gain);
    pianoGainLfo.start();

    const crossFadeLfo = new Tone.LFO(Math.random() / 10000 + 0.0001).set({
      phase: 90,
    });
    crossFadeLfo.connect(crossFade.fade);
    crossFadeLfo.start();

    const stereoLfo = new Tone.LFO(Math.random() / 100 + 0.01, 0.5, 1).set({
      phase: getRandomPhase(),
    });
    stereoLfo.connect(stereoWidener.width);
    stereoLfo.start();

    const autoLowPass = new Tone.AutoFilter(Math.random() / 100 + 0.01, 100, 1)
      .set({ filter: { rolloff: -96 } })
      .connect(crossFade.a);
    autoLowPass.start();

    Tone.Transport.scheduleOnce(() => {
      changeChord();
    }, `+${Math.random() * 10 + 10}`);

    droneStacks.forEach(([chord, volume, sampler]) => {
      volume.connect(autoLowPass);
      chord.forEach(note => {
        drone(sampler, note, 20, 10);
      });
    });

    loopWaves();

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      pitchShiftPiano.releaseAll(0);
      droneStacks.forEach(([, gainNode, sampler]) => {
        gainNode.gain.cancelScheduledValues(Tone.now());
        gainNode.gain.setValueAtTime(0, Tone.now());
        sampler.releaseAll(0);
      });
      [pianoGainLfo, crossFadeLfo, stereoLfo, autoLowPass].forEach(node => {
        node.dispose();
      });
    };
  };

  const deactivate = () => {
    [
      stereoWidener,
      crossFade,
      pianoGain,
      waveBuffer,
      pitchShiftPiano,
      ...droneStacks.reduce(
        (disposableNodes, [, gain, sampler]) =>
          disposableNodes.concat([gain, sampler]),
        []
      ),
    ].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

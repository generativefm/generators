import * as Tone from 'tone';
import {
  wrapActivate,
  createPrerenderableSampler,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../no-refrain.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const activate = async ({ sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const piano = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    onProgress,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'no-refrain__vsco2-piano-mf',
    getDestination: () =>
      new Tone.Reverb(5)
        .set({ wet: 0.5 })
        .toDestination()
        .generate(),
    notes: ['A2', 'C3', 'G3', 'G2', 'G3'].concat(
      toss(['C', 'E', 'G', 'B'], [4, 5])
    ),
  });

  const rightHandPcs = ['C', 'D', 'E', 'G', 'B', 'C'];
  let rightHandOct = 4;
  const leftHand = () => {
    const time = window.generativeMusic.rng() / 1.5 + 0.7;
    ['A2', 'C3', 'G3', 'G2', 'D3', 'G3'].forEach((note, i) => {
      piano.triggerAttack(note, `+${1 + i * time + window.generativeMusic.rng() / 5 - 0.1}`);
      if (window.generativeMusic.rng() < 0.8) {
        const rightHandPcIndex = Math.floor(
          window.generativeMusic.rng() * rightHandPcs.length
        );
        const rightHandPc = rightHandPcs[rightHandPcIndex];
        const oct =
          rightHandPcIndex < rightHandPcs.length - 1
            ? rightHandOct
            : rightHandOct + 1;
        piano.triggerAttack(
          `${rightHandPc}${oct}`,
          `+${1 + i * time + window.generativeMusic.rng() / 5 - 0.1}`
        );
      }
    });

    if (window.generativeMusic.rng() < 0.1) {
      const rightHandPcIndex = Math.floor(window.generativeMusic.rng() * rightHandPcs.length);
      const rightHandPc = rightHandPcs[rightHandPcIndex];
      const oct =
        rightHandPcIndex < rightHandPcs.length - 1
          ? rightHandOct
          : rightHandOct + 1;
      piano.triggerAttack(
        `${rightHandPc}${oct}`,
        `+${1 + 12 * time + window.generativeMusic.rng() / 5 - 0.1}`
      );
    }

    if (rightHandOct === 4 && window.generativeMusic.rng() < 0.05) {
      rightHandOct = 5;
    } else if (rightHandOct === 5 && window.generativeMusic.rng() < 0.1) {
      rightHandOct = 4;
    }

    Tone.Transport.scheduleOnce(() => {
      leftHand();
    }, `+${time * 16 + window.generativeMusic.rng() * 1.5}`);
  };

  const schedule = ({ destination }) => {
    piano.connect(destination);
    leftHand();
    return () => {
      piano.releaseAll(0);
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['no-refrain'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

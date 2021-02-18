import { getContext, setContext, Gain, Compressor } from 'tone';
import makeActiveStage from './make-active-stage';

const wrapActivate = (activate, { gain = 1 } = {}) => async options => {
  if (getContext() !== options.context) {
    setContext(options.context);
  }
  window.generativeMusic = window.generativeMusic || {};
  window.generativeMusic.rng = window.generativeMusic.rng || Math.random;
  const [deactivate, schedule] = await activate(options);
  const compressorNode = new Compressor();
  console.log(gain);
  const gainNode = new Gain(gain).connect(compressorNode);
  compressorNode.connect(options.destination);
  return makeActiveStage({
    deactivate,
    schedule,
    destination: gainNode,
  });
};

export default wrapActivate;

import createBuffer from './create-buffer';
import createBuffers from './create-buffers';
import createSampler from './create-sampler';
import createPrerenderableSampler from './create-prerenderable-sampler';
import wrapActivate from './wrap-activate';
import getRandomNumberBetween from './get-random-number-between';
import getRandomElement from './get-random-element';
import toss from './toss';
import renderBuffer from './render-buffer';
import createPrerenderableBufferArray from './create-prerenderable-buffer-array';
import getClosestNote from './get-closest-note';
import sampleNote from './sample-note';
import createPrerenderableBuffers from './create-prerenderable-buffers';
import createPitchShiftedSampler from './create-pitch-shifted-sampler';
import shuffleArray from './shuffle-array';
import createPrerenderableSampledBuffers from './create-prerenderable-sampled-buffers';
import createReverseSampler from './create-reverse-sampler';
import createPrerenderableInstrument from './create-prerenderable-instrument';
import createPrerenderedBuffer from './create-prerendered-buffer';

export * from './theory/index';
export {
  createBuffer,
  createBuffers,
  createSampler,
  createPrerenderableSampler,
  wrapActivate,
  getRandomNumberBetween,
  getRandomElement,
  toss,
  renderBuffer,
  createPrerenderableBufferArray,
  getClosestNote,
  sampleNote,
  createPrerenderableBuffers,
  createPitchShiftedSampler,
  shuffleArray,
  createPrerenderableSampledBuffers,
  createReverseSampler,
  createPrerenderableInstrument,
  createPrerenderedBuffer,
};

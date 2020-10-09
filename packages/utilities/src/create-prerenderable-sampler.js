import createSampler from './create-sampler';
import createPrerenderableSampledBuffers from './create-prerenderable-sampled-buffers';

const createPrerenderableSampler = async options => {
  const { notes } = options;
  const prerenderedBuffers = await createPrerenderableSampledBuffers(options);
  const prerenderedNoteMap = notes.reduce((o, note) => {
    o[note] = prerenderedBuffers.get(note);
    return o;
  }, {});
  return createSampler(prerenderedNoteMap);
};

export default createPrerenderableSampler;

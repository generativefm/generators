import createSampler from './create-sampler';
import createPrerenderedSampledBuffers from './create-prerendered-sampled-buffers';

const createPrerenderedSampler = async options => {
  const { notes } = options;
  const prerenderedBuffers = await createPrerenderedSampledBuffers(options);
  const prerenderedNoteMap = notes.reduce((o, note) => {
    o[note] = prerenderedBuffers.get(note);
    return o;
  }, {});
  return createSampler(prerenderedNoteMap);
};

export default createPrerenderedSampler;

import createPrerenderedBufferArray from './create-prerendered-buffer-array';
import createBuffers from './create-buffers';

const createPrerenderedBuffers = async options => {
  const bufferArray = await createPrerenderedBufferArray(options);
  return createBuffers(bufferArray);
};

export default createPrerenderedBuffers;

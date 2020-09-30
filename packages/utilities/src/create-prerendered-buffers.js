import createPrerenderedBufferArray from './create-prerendered-buffer-array';
import createBuffers from './create-buffers';
import renderBuffer from './render-buffer';
import noop from './noop';

const createPrerenderedBuffers = async options => {
  const {
    samples,
    sourceInstrumentName,
    renderedInstrumentName,
    sampleLibrary,
    getDestination,
    additionalRenderLength = 0,
    onProgress = noop,
    bufferSourceOptions = {},
  } = options;
  if (samples[renderedInstrumentName]) {
    return createBuffers(samples[renderedInstrumentName]);
  }
  if (Array.isArray(samples[sourceInstrumentName])) {
    const bufferArray = await createPrerenderedBufferArray(options);
    return createBuffers(bufferArray);
  }
  const keys = Object.keys(samples[sourceInstrumentName]);
  const values = Object.values(samples[sourceInstrumentName]);
  const renderedBuffers = await Promise.all(
    values.map(async (buffer, i) => {
      const renderedBuffer = await renderBuffer({
        buffer,
        getDestination,
        bufferSourceOptions,
        duration: buffer.duration + additionalRenderLength,
      });
      onProgress((i + 1) / values.length);
      return renderedBuffer;
    })
  );
  const renderedBuffersByKey = renderedBuffers.reduce(
    (o, renderedBuffer, i) => {
      const key = keys[i];
      o[key] = renderedBuffer;
      return o;
    },
    {}
  );
  sampleLibrary.save([[renderedInstrumentName, renderedBuffersByKey]]);
  return createBuffers(renderedBuffersByKey);
};

export default createPrerenderedBuffers;

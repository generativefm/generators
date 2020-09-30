import createBuffer from './create-buffer';
import renderBuffer from './render-buffer';
import noop from './noop';

const createPrerenderedBufferArray = async ({
  samples,
  sourceInstrumentName,
  renderedInstrumentName,
  sampleLibrary,
  getDestination,
  additionalRenderLength = 0,
  onProgress = noop,
  bufferSourceOptions = {},
} = {}) => {
  if (samples[renderedInstrumentName]) {
    return Promise.all(
      samples[renderedInstrumentName].map(buffer => createBuffer(buffer))
    );
  }
  const sourceBuffers = await Promise.all(
    samples[sourceInstrumentName].map(buffer => createBuffer(buffer))
  );
  const renderedBuffers = await Promise.all(
    sourceBuffers.map(async (buffer, i) => {
      const renderedBuffer = await renderBuffer({
        buffer,
        getDestination,
        bufferSourceOptions,
        duration: buffer.duration + additionalRenderLength,
      });
      buffer.dispose();
      onProgress((i + 1) / sourceBuffers.length);
      return renderedBuffer;
    })
  );
  sampleLibrary.save([[renderedInstrumentName, renderedBuffers]]);
  return renderedBuffers;
};

export default createPrerenderedBufferArray;

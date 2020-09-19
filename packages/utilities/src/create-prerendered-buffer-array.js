import createBuffer from './create-buffer';
import renderBuffer from './render-buffer';
import noop from './noop';

const createPrerenderedBufferArray = async ({
  samples,
  sourceInstrumentName,
  renderedInstrumentName,
  sampleLibrary,
  additionalRenderLength,
  getDestination,
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
  const renderedBuffers = [];
  for (let i = 0; i < sourceBuffers.length; i += 1) {
    const buffer = sourceBuffers[i];
    //eslint-disable-next-line no-await-in-loop
    const renderedBuffer = await renderBuffer({
      buffer,
      getDestination,
      bufferSourceOptions,
      duration: buffer.duration + additionalRenderLength,
    });
    buffer.dispose();
    renderedBuffers.push(renderedBuffer);
    onProgress((i + 1) / sourceBuffers.length);
  }
  sampleLibrary.save([[renderedInstrumentName, renderedBuffers]]);
  return renderedBuffers;
};

export default createPrerenderedBufferArray;

import createSampler from './create-sampler';
import createBuffer from './create-buffer';
import sampleNote from './sample-note';
import renderBuffer from './render-buffer';
import noop from './noop';

const renderNote = async ({
  note,
  samplesByNote,
  getDestination,
  additionalRenderLength,
  bufferSourceOptions = {},
}) => {
  const { playbackRate, sampledNote } = sampleNote({
    note,
    sampledNotes: Object.keys(samplesByNote),
  });
  const noteBuffer = await createBuffer(samplesByNote[sampledNote]);
  const renderedBuffer = await renderBuffer({
    getDestination,
    buffer: noteBuffer,
    duration: noteBuffer.duration / playbackRate + additionalRenderLength,
    bufferSourceOptions: Object.assign({}, bufferSourceOptions, {
      playbackRate,
    }),
  });
  noteBuffer.dispose();
  return renderedBuffer;
};

const createPrerenderedSampler = async ({
  notes,
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
    return createSampler(samples[renderedInstrumentName]);
  }
  const samplesByNote = samples[sourceInstrumentName];
  const renderedBuffersByNote = {};
  await Promise.all(
    notes.map(async (note, i) => {
      const buffer = await renderNote({
        note,
        samplesByNote,
        getDestination,
        additionalRenderLength,
        bufferSourceOptions,
      });
      renderedBuffersByNote[note] = buffer;
      onProgress((i + 1) / notes.length);
    })
  );
  sampleLibrary.save([[renderedInstrumentName, renderedBuffersByNote]]);
  return createSampler(renderedBuffersByNote);
};

export default createPrerenderedSampler;

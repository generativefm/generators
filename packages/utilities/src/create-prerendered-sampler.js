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
  additionalRenderLength,
  getDestination,
  onProgress = noop,
  bufferSourceOptions = {},
} = {}) => {
  if (samples[renderedInstrumentName]) {
    return createSampler(samples[renderedInstrumentName]);
  }
  const samplesByNote = samples[sourceInstrumentName];
  const renderedBuffersByNote = {};
  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i];
    //eslint-disable-next-line no-await-in-loop
    const buffer = await renderNote({
      note,
      samplesByNote,
      getDestination,
      additionalRenderLength,
      bufferSourceOptions,
    });
    onProgress((i + 1) / notes.length);
    renderedBuffersByNote[note] = buffer;
  }
  sampleLibrary.save([[renderedInstrumentName, renderedBuffersByNote]]);
  return createSampler(renderedBuffersByNote);
};

export default createPrerenderedSampler;

import sampleNote from './sample-note';
import createBuffer from './create-buffer';
import renderBuffer from './render-buffer';

const createPrerenderedSampledBuffer = async ({
  note,
  samplesByNote,
  getDestination,
  additionalRenderLength,
  bufferSourceOptions = {},
  pitchShift = 0,
}) => {
  const { playbackRate, sampledNote } = sampleNote({
    note,
    pitchShift,
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

export default createPrerenderedSampledBuffer;

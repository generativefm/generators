import createPrerenderedBuffer from './create-prerendered-buffer';
import createSampler from './create-sampler';
import noop from './utilities/noop';

const createPrerenderedInstrument = async ({
  createInstrument,
  notes,
  noteDuration,
  sampleLibrary,
  samples,
  renderedInstrumentName,
  onProgress = noop,
}) => {
  if (samples[renderedInstrumentName]) {
    return createSampler(samples[renderedInstrumentName]);
  }

  let renderedCount = 0;
  const noteBuffers = await Promise.all(
    notes.map(async note => {
      const createSourceForNote = async context => {
        const { instrument, dispose } = await Promise.resolve(
          createInstrument(context)
        );
        const start = () => {
          instrument.triggerAttackRelease(note, noteDuration);
        };
        return { start, dispose };
      };
      const renderedBuffer = await createPrerenderedBuffer({
        createSource: createSourceForNote,
        duration: noteDuration,
      });
      renderedCount += 1;
      onProgress(renderedCount / notes.length);
      return renderedBuffer;
    })
  );
  const noteBuffersByNote = noteBuffers.reduce((byNote, buffer, i) => {
    const note = notes[i];
    byNote[note] = buffer;
    return byNote;
  }, {});
  sampleLibrary.save([[renderedInstrumentName, noteBuffersByNote]]);
  return createSampler(noteBuffersByNote);
};

export default createPrerenderedInstrument;

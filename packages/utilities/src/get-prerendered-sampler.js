import * as Tone from 'tone';
import getSampledBufferSource from './get-sampled-buffer-source';

const renderNote = (note, samplesByNote, getDestination, renderTime) => {
  let resolvedDestination;
  //eslint-disable-next-line new-cap
  return Tone.Offline(() => {
    return Promise.all([
      getDestination().then(destination => {
        resolvedDestination = destination;
        return destination;
      }),
      getSampledBufferSource(note, samplesByNote),
    ]).then(([destination, bufferSource]) => {
      bufferSource.connect(destination);
      bufferSource.start(0);
    });
  }, renderTime).then(buffer => {
    resolvedDestination.dispose();
    return buffer;
  });
};

const getPrerenderedSampler = (
  renderedNotes,
  samplesByNote,
  getDestination,
  renderTime
) =>
  Promise.all(
    renderedNotes.map(note =>
      renderNote(note, samplesByNote, getDestination, renderTime)
    )
  ).then(renderedBuffers => {
    const buffersByMidi = renderedBuffers.reduce((byMidi, buffer, i) => {
      const note = renderedNotes[i];
      const midi = new Tone.Frequency(note).toMidi();
      byMidi.set(midi, buffer);
      return byMidi;
    }, new Map());
    const activeSources = [];
    let output;
    return {
      trigger: (note, time) => {
        const midi = new Tone.Frequency(note).toMidi();
        if (!buffersByMidi.has(midi)) {
          throw new Error(`Requested midi ${midi} (${note}) was not rendered`);
        }
        const buffer = buffersByMidi.get(midi);
        const source = new Tone.BufferSource({ buffer })
          .set({
            onended: () => {
              const i = activeSources.indexOf(source);
              if (i >= 0) {
                activeSources.splice(i, 1);
              }
            },
          })
          .connect(output);
        activeSources.push(source);
        source.start(time);
      },
      dispose: () => {
        activeSources.forEach(source => source.dispose());
      },
      connect: node => {
        output = node;
      },
    };
  });

export default getPrerenderedSampler;

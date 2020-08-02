import * as Tone from 'tone';
import findClosest from './find-closest';
import getBuffer from './get-buffer';

const getSampledBufferSource = (note, samplesByNote) => {
  const samplesByMidi = Object.keys(samplesByNote).reduce(
    (byMidi, sampledNote) => {
      byMidi.set(
        new Tone.Frequency(sampledNote).toMidi(),
        samplesByNote[sampledNote]
      );
      return byMidi;
    },
    new Map()
  );
  const midi = new Tone.Frequency(note).toMidi();
  const difference = findClosest(midi, samplesByMidi);
  const playbackRate = Tone.intervalToFrequencyRatio(difference);
  const closestSampleUrl = samplesByMidi.get(midi - difference);
  const bufferSource = new Tone.BufferSource({ playbackRate });
  return getBuffer(closestSampleUrl).then(buffer => {
    bufferSource.set({ buffer });
    return bufferSource;
  });
};

export default getSampledBufferSource;

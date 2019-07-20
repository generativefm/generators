import Tone from 'tone';

const getBuffers = samplesByNote =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(samplesByNote, {
      onload: () => resolve(buffers),
    });
  });

export default getBuffers;

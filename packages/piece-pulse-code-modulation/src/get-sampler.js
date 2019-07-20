import Tone from 'tone';

const getSampler = (samplesByNote, opts = {}) =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(
      samplesByNote,
      Object.assign(
        {
          onload: () => resolve(sampler),
        },
        opts
      )
    );
  });

export default getSampler;

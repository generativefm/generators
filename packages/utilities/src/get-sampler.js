import Tone from 'tone';

const getSampler = (urlMap, opts = {}) => {
  const urls = Array.isArray(urlMap) ? urlMap : Object.values(urlMap);
  if (urls.every(url => url instanceof AudioBuffer)) {
    return Promise.resolve(new Tone.Sampler(urlMap, opts));
  }
  return new Promise(resolve => {
    const sampler = new Tone.Sampler(
      urlMap,
      Object.assign({}, opts, {
        onload: () => resolve(sampler),
      })
    );
  });
};

export default getSampler;

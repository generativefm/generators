import * as Tone from 'tone';

const getBuffers = urlMap => {
  const urls = Array.isArray(urlMap) ? urlMap : Object.values(urlMap);
  if (urls.every(url => url instanceof AudioBuffer)) {
    return Promise.resolve(new Tone.Buffers(urlMap));
  }
  return new Promise(resolve => {
    const buffers = new Tone.Buffers(urlMap, {
      onload: () => resolve(buffers),
    });
  });
};

export default getBuffers;

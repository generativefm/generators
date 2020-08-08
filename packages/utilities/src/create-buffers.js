import * as Tone from 'tone';

const createBuffers = urlMap => {
  const urls = Array.isArray(urlMap) ? urlMap : Object.values(urlMap);
  if (urls.every(url => url instanceof AudioBuffer)) {
    return Promise.resolve(new Tone.ToneAudioBuffers(urlMap));
  }
  return new Promise(resolve => {
    const buffers = new Tone.ToneAudioBuffers(urlMap, () => {
      resolve(buffers);
    });
  });
};

export default createBuffers;

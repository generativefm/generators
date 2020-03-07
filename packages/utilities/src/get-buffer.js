import Tone from 'tone';

const getBuffer = url =>
  url instanceof AudioBuffer
    ? Promise.resolve(new Tone.Buffer(url))
    : new Promise(resolve => {
        const buffer = new Tone.Buffer(url, () => {
          resolve(buffer);
        });
      });

export default getBuffer;

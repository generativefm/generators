import * as Tone from 'tone';

const createBuffer = url =>
  url instanceof AudioBuffer
    ? Promise.resolve(new Tone.ToneAudioBuffer(url))
    : new Promise(resolve => {
        const buffer = new Tone.ToneAudioBuffer(url, () => {
          resolve(buffer);
        });
      });

export default createBuffer;

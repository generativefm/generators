import * as Tone from 'tone';
import createBuffers from './get-buffers';

describe('createBuffers', () => {
  it('should return a promise that resolves to an instance of ToneAudioBuffers', () => {
    const stringUrl = './base/test-assets/noise-1s.ogg';
    const audioBufferUrl = Tone.context.createBuffer(1, 44100, 44100);
    const urlMaps = [
      [stringUrl],
      {
        note: stringUrl,
      },
      [audioBufferUrl],
      {
        note: audioBufferUrl,
      },
    ];
    const results = urlMaps.map(urlMap => createBuffers(urlMap));
    results.forEach(result => {
      expect(result).to.be.an.instanceOf(Promise);
    });
    return Promise.all(results).then(resolvedResults => {
      resolvedResults.forEach(result => {
        expect(result).to.be.an.instanceOf(Tone.ToneAudioBuffers);
      });
    });
  });
});

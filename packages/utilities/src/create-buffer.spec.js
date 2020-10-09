import * as Tone from 'tone';
import createBuffer from './create-buffer';

describe('createBuffer', () => {
  it('should return a promise', () => {
    expect(createBuffer('')).to.be.instanceOf(Promise);
    expect(
      createBuffer(Tone.context.createBuffer(1, 44100, 44100))
    ).to.be.an.instanceOf(Promise);
  });
  it('should resolve a string url with a Tone Buffer', () => {
    return createBuffer('./base/test-assets/noise-1s.ogg').then(result =>
      expect(result).to.be.an.instanceOf(Tone.ToneAudioBuffer)
    );
  });
  it('should resolve an AudioBuffer with a Tone Buffer', () => {
    return createBuffer(Tone.context.createBuffer(1, 44100, 44100)).then(
      result => expect(result).to.be.an.instanceOf(Tone.ToneAudioBuffer)
    );
  });
});

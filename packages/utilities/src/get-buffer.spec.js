/*eslint-env mocha*/

import expect from 'chai/interface/expect';
import Tone from 'tone';
import getBuffer from './get-buffer';

describe('getBuffer', () => {
  it('should return a promise', () => {
    expect(getBuffer('')).to.be.instanceOf(Promise);
    expect(
      getBuffer(Tone.context.createBuffer(1, 44100, 44100))
    ).to.be.an.instanceOf(Promise);
  });
  it('should resolve a string url with a Tone Buffer', () => {
    return getBuffer('./base/test-assets/noise-1s.ogg').then(result =>
      expect(result).to.be.an.instanceOf(Tone.Buffer)
    );
  });
  it('should resolve an AudioBuffer with a Tone Buffer', () => {
    return getBuffer(Tone.context.createBuffer(1, 44100, 44100)).then(result =>
      expect(result).to.be.an.instanceOf(Tone.Buffer)
    );
  });
});

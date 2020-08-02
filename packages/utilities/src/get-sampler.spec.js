import * as Tone from 'tone';
import getSampler from './get-sampler';

describe('getSampler', () => {
  it('should return a promise that resolves to an instance of Tone.Sampler', () => {
    const urls = [
      './base/test-assets/noise-1s.ogg',
      Tone.context.createBuffer(1, 44100, 44100),
    ];
    const results = urls.map(url => getSampler({ 100: url }));
    results.forEach(result => {
      expect(result).to.be.an.instanceOf(Promise);
    });
    return Promise.all(results).then(resolvedResults => {
      resolvedResults.forEach(result => {
        expect(result).to.be.an.instanceOf(Tone.Sampler);
      });
    });
  });
  it('should pass options to the sampler', () => {
    const urls = [
      './base/test-assets/noise-1s.ogg',
      Tone.context.createBuffer(1, 44100, 44100),
    ];
    const opts = {
      attack: 69,
    };
    const results = urls.map(url => getSampler({ 100: url }, opts));
    results.forEach(result => {
      expect(result).to.be.an.instanceOf(Promise);
    });
    return Promise.all(results).then(resolvedResults => {
      resolvedResults.forEach(result => {
        expect(result).to.have.a.property('attack', opts.attack);
      });
    });
  });
});

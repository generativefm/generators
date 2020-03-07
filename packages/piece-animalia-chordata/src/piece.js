import Tone from 'tone';
import { getBuffer } from '@generative-music/utilities';

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return getBuffer(samples.whales[0]).then(buffer => {
    const activeSources = [];
    const vol = new Tone.Volume(-7).connect(destination);
    const compressor = new Tone.Compressor().connect(vol);
    const reverb = new Tone.Reverb(30).set({ wet: 0.5 }).connect(compressor);
    const pingPongDelay = new Tone.PingPongDelay(0.7, 0.8).connect(reverb);
    const lfo = new Tone.LFO(Math.random() * 0.005 + 0.005, 0.5, 0.9).set({
      phase: 90,
    });
    lfo.start();
    lfo.connect(reverb.wet);

    const filter = new Tone.Filter(500).connect(pingPongDelay);

    reverb.generate();

    const play = () => {
      buffer.reverse = Math.random() < 0.5;
      const playbackRate = Math.random() * 0.2 + 0.1;
      const source = new Tone.BufferSource(buffer)
        .set({
          playbackRate,
          fadeIn: 5,
          fadeOut: 5,
          curve: 'linear',
          onended: () => {
            const i = activeSources.indexOf(source);
            if (i >= 0) {
              activeSources.splice(i, 1);
            }
          },
        })
        .connect(filter);
      activeSources.push(source);
      source.start('+1', 3, buffer.duration / playbackRate - 3);
      Tone.Transport.scheduleOnce(() => {
        play();
      }, `+${buffer.duration / playbackRate - Math.random() * 15 - 15}`);
    };
    play();
    return () => {
      [vol, compressor, reverb, pingPongDelay, lfo, filter, buffer].forEach(
        node => node.dispose()
      );
    };
  });
};

export default makePiece;

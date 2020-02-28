import Tone from 'tone';

const getBuffer = url =>
  new Promise(resolve => {
    const buffer = new Tone.Buffer(url, () => resolve(buffer));
    if (url instanceof AudioBuffer) {
      resolve(buffer);
    }
  });

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getBuffer(samples['idling-truck'][0]),
    new Tone.Reverb(5).set({ wet: 0.5 }).generate(),
  ]).then(([buffer, reverb]) => {
    const activeSources = [];
    const vol = new Tone.Volume(10).connect(destination);
    reverb.connect(vol);
    const filter = new Tone.AutoFilter(Math.random() / 30).connect(reverb);
    filter.start();
    const lfo = new Tone.LFO(Math.random() / 100, 0.05, 0.25);
    lfo.start();
    const play = () => {
      const source = new Tone.BufferSource(buffer)
        .set({
          onended: () => {
            const i = activeSources.indexOf(source);
            if (i >= 0) {
              activeSources.splice(i, 1);
            }
          },
        })
        .connect(filter);
      lfo.connect(source.playbackRate);
      source.start();
      Tone.Transport.scheduleOnce(() => {
        play();
      }, `+${buffer.duration / 0.25 - Math.random()}`);
    };
    play();
    return () =>
      [buffer, vol, reverb, filter, lfo, ...activeSources].forEach(node =>
        node.dispose()
      );
  });
};

export default makePiece;

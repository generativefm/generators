import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getBuffers = urls =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(urls, {
      onload: () => resolve(buffers),
    });
  });

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename).then(
    ({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }

      const activeSources = [];

      const getBufferPlayer = (
        bufferUrls,
        buffers,
        bufferDestination,
        getP
      ) => {
        const firstDelays = bufferUrls.map(() => Math.random() * 90);
        const minFirstDelay = Math.min(...firstDelays);
        bufferUrls
          .map((url, i) => buffers.get(i))
          .forEach((buffer, i) => {
            const play = () => {
              if (Math.random() < getP()) {
                const source = new Tone.BufferSource(buffer).set({
                  playbackRate: 0.75,
                  onended: () => {
                    const sourceIndex = activeSources.indexOf(source);
                    if (sourceIndex >= 0) {
                      activeSources.splice(sourceIndex, 1);
                    }
                  },
                });
                activeSources.push(source);
                source.connect(bufferDestination);
                source.start('+1');
              }

              Tone.Transport.scheduleOnce(() => {
                play();
              }, `+${Math.random() * 60 + 30}`);
            };
            const firstDelay = firstDelays[i] - minFirstDelay;
            Tone.Transport.scheduleOnce(() => {
              play();
            }, `+${firstDelay}`);
          });
      };

      const coilSpankUrls = samples['guitar-coil-spank'][preferredFormat];
      const dustyUrls = samples['guitar-dusty'][preferredFormat];

      return Promise.all([
        getBuffers(coilSpankUrls),
        getBuffers(dustyUrls),
        new Tone.Reverb(30)
          .set({ wet: 0.6 })
          .connect(destination)
          .generate(),
      ]).then(([coilSpankBuffers, dustyBuffers, reverb]) => {
        const dustyVol = new Tone.Volume(-7).connect(reverb);
        const getCoilSpankP = () => 1 - ((Tone.now() / 60) % 60) / 60;
        const getDustyP = () => 1 - getCoilSpankP();
        getBufferPlayer(coilSpankUrls, coilSpankBuffers, reverb, getCoilSpankP);
        getBufferPlayer(dustyUrls, dustyBuffers, dustyVol, getDustyP);
        return () =>
          [
            coilSpankBuffers,
            dustyBuffers,
            reverb,
            dustyVol,
            ...activeSources,
          ].forEach(node => node.dispose());
      });
    }
  );

export default makePiece;

import * as Tone from 'tone';
import {
  createPrerenderableBuffers,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../stratospheric.gfm.manifest.json';

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const activeSources = [];

  const getBufferPlayer = (bufferUrls, buffers, bufferDestination, getP) => {
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

  const coilSpankUrls =
    samples['stratospheric__guitar-coil-spank'] || samples['guitar-coil-spank'];
  const dustyUrls =
    samples['stratospheric__guitar-dusty'] || samples['guitar-dusty'];

  const getReverb = () =>
    new Tone.Reverb(30)
      .set({ wet: 0.6 })
      .toDestination()
      .generate();

  const coilSpankBuffers = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'guitar-coil-spank',
    renderedInstrumentName: 'stratospheric__guitar-coil-spank',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.5),
  });

  const dustyBuffers = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'guitar-dusty',
    renderedInstrumentName: 'stratospheric__guitar-dusty',
    getDestination: getReverb,
    onProgress: val => onProgress(val * 0.5 + 0.5),
  });

  const dustyVol = new Tone.Volume(-15).connect(destination);
  const getCoilSpankP = () => 1 - ((Tone.now() / 60) % 60) / 60;
  const getDustyP = () => 1 - getCoilSpankP();

  const schedule = () => {
    getBufferPlayer(
      coilSpankUrls,
      coilSpankBuffers,
      destination,
      getCoilSpankP
    );
    getBufferPlayer(dustyUrls, dustyBuffers, dustyVol, getDustyP);

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
    };
  };

  const deactivate = () => {
    [coilSpankBuffers, dustyBuffers, dustyVol, ...activeSources].forEach(node =>
      node.dispose()
    );
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

import * as Tone from 'tone';
import {
  createBuffer,
  renderBuffer,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../last-transit.gfm.manifest.json';

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  let reverbBuffers = samples['last-transit__idling-truck'];
  if (!reverbBuffers) {
    const buffer = await createBuffer(samples['idling-truck'][0]);
    const bufferWithReverb = await renderBuffer({
      buffer,
      getDestination: () =>
        new Tone.Reverb(5)
          .set({ wet: 0.5 })
          .toDestination()
          .generate(),
      duration: buffer.duration,
    });
    buffer.dispose();
    reverbBuffers = [bufferWithReverb];
    sampleLibrary.save([['last-transit__idling-truck', reverbBuffers]]);
  }

  const [bufferWithReverb] = reverbBuffers;
  const activeSources = [];
  const vol = new Tone.Volume(10);

  const play = ({ sourceDestination, playbackRateLfo }) => {
    const source = new Tone.BufferSource(bufferWithReverb)
      .set({
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(sourceDestination);
    activeSources.push(source);
    playbackRateLfo.connect(source.playbackRate);
    source.start();
    Tone.Transport.scheduleOnce(() => {
      play({ sourceDestination, playbackRateLfo });
    }, `+${bufferWithReverb.duration / 0.25 - Math.random()}`);
  };

  const schedule = ({ destination }) => {
    vol.connect(destination);
    const filter = new Tone.AutoFilter(Math.random() / 30).connect(vol);
    filter.start();
    const lfo = new Tone.LFO(Math.random() / 100, 0.05, 0.25);
    lfo.start();
    play({ sourceDestination: filter, playbackRateLfo: lfo });

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      filter.dispose();
      lfo.dispose();
    };
  };

  const deactivate = () => {
    [vol, ...activeSources].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

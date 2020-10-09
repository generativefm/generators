import * as Tone from 'tone';
import getSamplesByFormat from '@generative-music/samples-alex-bainter';
import createProvider from '@generative-music/web-provider';
import createLibrary from '@generative-music/web-library';
import SaveWorker from '@generative-music/web-provider/worker/save-worker.esm';

const { ogg } = getSamplesByFormat();
const provider = createProvider(new SaveWorker());
const library = createLibrary({ sampleIndex: ogg, provider });

// overridden by webpack to load a specific piece;
import activate from 'piece';

const toneContext = Tone.getContext();

const onProgress = value => {
  console.log(`${Math.round(value * 100)}%`);
};

activate({
  onProgress,
  context: toneContext,
  sampleLibrary: library,
  destination: toneContext.destination,
}).then(([, schedule]) => {
  console.log('activated');

  let dispose = schedule();

  Tone.Transport.start();

  window.stop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    dispose();
  };

  window.start = () => {
    dispose = schedule();

    Tone.Transport.start();
  };

  window.reset = () => {
    console.log('resetting');
    window.stop();
    window.start();
  };
});

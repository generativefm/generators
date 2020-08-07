import * as Tone from 'tone';
import getSamplesByFormat from '@generative-music/samples-alex-bainter';

const { ogg: samples } = getSamplesByFormat();

// overridden by webpack to load a specific piece;
import activate from 'piece';

const toneContext = Tone.getContext();

activate({
  context: toneContext,
  samples,
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

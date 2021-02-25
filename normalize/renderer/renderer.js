'use strict';

const path = require('path');
const { ipcRenderer } = require('electron');
const Tone = require('tone');
const createLibrary = require('@generative-music/fs-library');
const createProvider = require('@generative-music/fs-provider');
const getSampleIndex = require('@generative-music/samples-alex-bainter');

const INITIAL_GAIN = 1;
const FIRST_GAIN_DELTA = 1;
const TRACK_TIME = 60;

const sampleFileHost = path.join(
  __dirname,
  '../../../samples-alex-bainter/dist'
);

// 1. gain = 1, delta = 1;
// 2. Record for 60 seconds and track db.
// 3. If db is greater than -1, stop recording, set delta = delta / 2, reduce gain by delta, and go back to step 2.
// 4. If db is less than -2, increase gain by delta and go back to step 2.
// 5. Otherwise, current gain value is the adjustment needed.

const sampleIndex = getSampleIndex({ host: sampleFileHost, format: 'ogg' });

const sampleLibrary = createLibrary({
  provider: createProvider(),
  sampleIndex,
});

ipcRenderer.once('begin', async (event, { pieceId }) => {
  const piecePath = path.join(__dirname, `../../packages/piece-${pieceId}`);
  require.cache[path.join(__dirname, '../../node_modules/tone/build/Tone.js')] =
    require.cache[require.resolve('tone')];

  const activate = require(piecePath);
  const meter = new Tone.Meter();
  let gain = INITIAL_GAIN;
  let nextGainDelta = FIRST_GAIN_DELTA;
  const gainNode = new Tone.Gain(gain).connect(meter);

  const [deactivate, schedule] = await activate({
    sampleLibrary,
    context: Tone.getContext(),
    destination: gainNode,
  });

  let isRampingUp = true;

  const startMetering = () => {
    let maxDbForGain = -Infinity;
    let endEventId;
    const meterInterval = setInterval(() => {
      maxDbForGain = Math.max(maxDbForGain, meter.getValue());
      if (maxDbForGain < -1) {
        return;
      }
      clearInterval(meterInterval);
      Tone.Transport.clear(endEventId);
      if (isRampingUp) {
        nextGainDelta /= 2;
      }
      isRampingUp = false;
      gainNode.gain.value -= nextGainDelta;
      console.log(
        `${maxDbForGain}db is too loud, reducing gain to ${gainNode.gain.value}`
      );
      setTimeout(() => {
        startMetering();
      }, 10);
    }, 10);

    endEventId = Tone.Transport.scheduleOnce(() => {
      clearInterval(meterInterval);
      if (maxDbForGain > -2) {
        console.log(
          `suggested gain: ${
            gainNode.gain.value
          } for a maxDb of ${maxDbForGain}`
        );
        Tone.Transport.stop();
        end();
        deactivate();
        ipcRenderer.send('complete', gainNode.gain.value);
        return;
      }
      if (!isRampingUp) {
        nextGainDelta /= 2;
      }
      isRampingUp = true;
      gainNode.gain.value += nextGainDelta;
      console.log(
        `${maxDbForGain}db is too quiet, increasing gain to ${
          gainNode.gain.value
        }`
      );
      setTimeout(() => {
        startMetering();
      }, 10);
    }, Tone.now() + TRACK_TIME);
  };

  const end = schedule();
  console.log(
    `starting volume check of ${pieceId} with gain of ${gainNode.gain.value}`
  );
  startMetering();

  Tone.Transport.start();
});

ipcRenderer.send('ready');

'use strict';

const path = require('path');
const { ipcRenderer } = require('electron');
const Tone = require('tone');
const createLibrary = require('@generative-music/fs-library');
const createProvider = require('@generative-music/fs-provider');
const getSampleIndex = require('@generative-music/samples-alex-bainter');

const sampleFileHost = path.join(
  __dirname,
  '../../../samples-alex-bainter/dist'
);

const sampleIndex = getSampleIndex({ host: sampleFileHost, format: 'ogg' });

const sampleLibrary = createLibrary({
  provider: createProvider(),
  sampleIndex,
});

ipcRenderer.once('begin', async (event, { pieceId, renderTime }) => {
  const piecePath = path.join(__dirname, `../../packages/piece-${pieceId}`);
  require.cache[path.join(__dirname, '../../node_modules/tone/build/Tone.js')] =
    require.cache[require.resolve('tone')];
  const activate = require(piecePath);
  const meter = new Tone.Meter();
  const [deactivate, schedule] = await activate({
    sampleLibrary,
    context: Tone.getContext(),
    destination: meter,
  });

  const end = schedule();
  let maxDb = -Infinity;
  const meterInterval = setInterval(() => {
    maxDb = Math.max(maxDb, meter.getValue());
  });

  Tone.Transport.scheduleOnce(() => {
    clearInterval(meterInterval);
    Tone.Transport.stop();
    end();
    deactivate();
    ipcRenderer.send('complete', maxDb);
  }, renderTime);

  Tone.Transport.start();
});

ipcRenderer.send('ready');

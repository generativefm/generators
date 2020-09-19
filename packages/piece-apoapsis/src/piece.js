import * as Tone from 'tone';
import {
  createBuffers,
  createPrerenderedSampler,
  wrapActivate,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../apoapsis.gfm.manifest.json';

const pianoNotes = toss(['C', 'E', 'G', 'B'], [3, 4, 5]);
const violinNotes = toss(['C', 'E', 'G', 'B'], [2, 3, 4]);

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  if (samples['vsco2-piano-mf']) {
    const buffers = await createBuffers(samples['vsco2-piano-mf']);
    samples['vsco2-piano-mf-reverse'] = Object.keys(
      samples['vsco2-piano-mf']
    ).reduce((obj, note) => {
      obj[note] = buffers.get(note);
      obj[note].reverse = true;
      return obj;
    }, {});
  }

  const getPianoDestination = () =>
    Promise.resolve(
      new Tone.Freeverb({ roomSize: 0.9, wet: 0.5 }).toDestination()
    );
  const getViolinDestination = () =>
    Promise.resolve(
      new Tone.Freeverb({ roomSize: 0.8, wet: 0.5 }).toDestination()
    );

  const reversePiano = await createPrerenderedSampler({
    notes: pianoNotes,
    samples,
    sourceInstrumentName: 'vsco2-piano-mf-reverse',
    renderedInstrumentName: 'apoapsis::vsco2-piano-mf-reverse',
    sampleLibrary,
    additionalRenderLength: 1,
    getDestination: getPianoDestination,
    onProgress: val => onProgress(val * 0.5),
  });

  const violins = await createPrerenderedSampler({
    notes: violinNotes,
    samples,
    sourceInstrumentName: 'vsco2-violins-susvib',
    renderedInstrumentName: 'apoapsis::vsco2-violins-susvib',
    sampleLibrary,
    additionalRenderLength: 1,
    getDestination: getViolinDestination,
    onProgress: val => onProgress(val * 0.5 + 0.5),
    bufferSourceOptions: {
      fadeOut: 8,
      curve: 'linear',
    },
  });

  const violinVol = new Tone.Volume(-25);

  violins.chain(violinVol, destination);

  const schedule = () => {
    const delay1 = new Tone.FeedbackDelay({
      feedback: 0.7,
      delayTime: 0.2,
      wet: 0.5,
    });
    const delay2Time = Math.random() * 10 + 20;
    const delay2 = new Tone.FeedbackDelay({
      feedback: 0.6,
      delayTime: delay2Time,
      maxDelay: delay2Time,
      wet: 0.5,
    });

    reversePiano.chain(delay1, delay2, destination);

    violinNotes.forEach(note => {
      Tone.Transport.scheduleRepeat(
        () => violins.triggerAttack(note, '+1'),
        Math.random() * 120 + 60,
        `+${Math.random() * 15 + 15}`
      );
    });

    const intervals = pianoNotes.map(() => Math.random() * 30 + 30);
    const minInterval = Math.min(...intervals);
    pianoNotes.forEach((note, i) => {
      const intervalTime = intervals[i];
      Tone.Transport.scheduleRepeat(
        () => reversePiano.triggerAttack(note, '+1'),
        intervalTime,
        intervalTime - minInterval
      );
    });

    return () => {
      reversePiano.releaseAll();
      violins.releaseAll();
      [delay1, delay2].forEach(node => node.dispose());
    };
  };

  const deactivate = () => {
    [violins, reversePiano].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

import * as Tone from 'tone';
import {
  createBuffers,
  createSampler,
  wrapActivate,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../neuroplasticity.gfm.manifest.json';
import gainAdjustments from '../../../normalize/gain.json';

const PIANO_NOTES = toss(['C#', 'D#'], [3, 4, 5, 6]);
const GUITAR_NOTES = ['G2', 'C3', 'G3', 'C4'];

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const [buffers, piano] = await Promise.all([
    createBuffers(samples['guitar-namaste']),
    createSampler(samples['vsco2-piano-mf']),
  ]);

  const guitarVol = new Tone.Volume(-10);
  const activeSources = [];

  const schedule = ({ destination }) => {
    const autoFilter = new Tone.AutoFilter(window.generativeMusic.rng() / 50, 200, 5)
      .start()
      .connect(destination);
    const delay = new Tone.FeedbackDelay({
      feedback: 0.5,
      wet: 0.5,
      delayTime: 1.5,
    }).connect(autoFilter);
    guitarVol.connect(delay);
    piano.connect(delay);

    const initialDelays = GUITAR_NOTES.map(() => window.generativeMusic.rng() * 45);
    const minDelay = Math.min(...initialDelays);

    GUITAR_NOTES.forEach((note, i) => {
      const b = buffers.get(note);

      const play = () => {
        const bufferSource = new Tone.BufferSource(b)
          .set({
            fadeIn: 5,
            fadeOut: 5,
            curve: 'linear',
            playbackRate: 0.6,
            onended: () => {
              const index = activeSources.indexOf(bufferSource);
              if (index >= 0) {
                bufferSource.dispose();
                activeSources.splice(index, 1);
              }
            },
          })
          .connect(guitarVol);
        activeSources.push(bufferSource);
        bufferSource.start('+1', 0, 14);
        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${window.generativeMusic.rng() * 15 + 30}`);
      };
      Tone.Transport.scheduleOnce(() => {
        play();
      }, `+${initialDelays[i] - minDelay}`);
    });

    const playPiano = () => {
      const randomPianoNote =
        PIANO_NOTES[Math.floor(window.generativeMusic.rng() * PIANO_NOTES.length)];

      piano.triggerAttack(randomPianoNote);

      Tone.Transport.scheduleOnce(() => {
        playPiano();
      }, `+${window.generativeMusic.rng() * 10 + 10}`);
    };

    Tone.Transport.scheduleOnce(() => {
      playPiano();
    }, `+${window.generativeMusic.rng() * 10 + 10}`);

    return () => {
      activeSources.forEach(source => {
        source.set({ fadeOut: 0 }).stop(0);
      });
      autoFilter.dispose();
      delay.dispose();
    };
  };

  const deactivate = () => {
    [buffers, piano, guitarVol].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

const GAIN_ADJUSTMENT = gainAdjustments['neuroplasticity'];

export default wrapActivate(activate, { gain: GAIN_ADJUSTMENT });

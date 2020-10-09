import * as Tone from 'tone';
import {
  createBuffers,
  sampleNote,
  wrapActivate,
  toss,
  minor7th,
} from '@generative-music/utilities';
import { sampleNames } from '../day-dream.gfm.manifest.json';

const NOON_SEMITONE_CHANGE = 15;
const MIDNIGHT_SEMITONE_CHANGE = 30;

const NOTES = toss(['C'], [4, 5, 6])
  .map(minor7th)
  .flat();

const activate = async ({ destination, sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const samplesByNote = samples['vsco2-piano-mf'];
  const sampledNotes = Object.keys(samplesByNote);
  const buffers = await createBuffers(samplesByNote);
  const activeSources = [];
  const playNote = note => {
    const date = new Date();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    let semitoneChange;
    if (hour >= 12) {
      const hoursPastNoon = hour - 12;
      const secondsPastNoon = hoursPastNoon * 60 * 60 + minute * 60 + second;
      const pctToMidnight = secondsPastNoon / (12 * 60 * 60 - 1);
      semitoneChange =
        pctToMidnight * (MIDNIGHT_SEMITONE_CHANGE - NOON_SEMITONE_CHANGE) +
        NOON_SEMITONE_CHANGE;
    } else {
      const secondsPastMidnight = hour * 60 * 60 + minute * 60 + second;
      const pctToNoon = secondsPastMidnight / (12 * 60 * 60 - 1);
      semitoneChange =
        pctToNoon * (NOON_SEMITONE_CHANGE - MIDNIGHT_SEMITONE_CHANGE) +
        MIDNIGHT_SEMITONE_CHANGE;
    }
    const { sampledNote, playbackRate } = sampleNote({
      note,
      sampledNotes,
      pitchShift: -semitoneChange,
    });
    const buffer = buffers.get(sampledNote);
    const bufferSource = new Tone.BufferSource(buffer).connect(destination);
    bufferSource.set({
      playbackRate,
      onended: () => {
        const index = activeSources.indexOf(bufferSource);
        if (index >= 0) {
          activeSources.splice(index, 1);
        }
      },
    });
    activeSources.push(bufferSource);
    bufferSource.start('+1');
    return semitoneChange;
  };

  const schedule = () => {
    const firstDelays = NOTES.map(
      () =>
        Math.random() *
          ((NOON_SEMITONE_CHANGE + MIDNIGHT_SEMITONE_CHANGE) / 2) +
        15
    );

    const minFirstDelay = Math.min(...firstDelays);

    NOTES.forEach((note, i) => {
      const play = time => {
        Tone.Transport.scheduleOnce(() => {
          const semitoneChange = playNote(note);
          play(Math.random() * (semitoneChange + 12) + 3);
        }, `+${time}`);
      };
      play(firstDelays[i] - minFirstDelay);
    });

    return () => {
      activeSources.forEach(node => node.stop());
    };
  };

  const deactivate = () => {
    buffers.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

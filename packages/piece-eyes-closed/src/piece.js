import * as Tone from 'tone';
import {
  createBuffer,
  createPitchShiftedSampler,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../eyes-closed.gfm.manifest.json';

const PHRASE = [['G#5', 1], ['F#5', 2], ['D#5', 3.5], ['C#5', 4], ['D#5', 4.5]];
const CHORD = ['G#3', 'G#4'];

const activate = async ({ destination, sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const danTranh = await createBuffer(samples['dan-tranh-gliss-ps'][0]);
  const piano = await createPitchShiftedSampler({
    samplesByNote: samples['vsco2-piano-mf'],
    pitchShift: -24,
  });

  const activeSources = [];

  const playDanTranh = dest => {
    const offset = Math.pow(Math.random(), 3) * 120;
    const duration = Math.random() * 60 + 60;
    const source = new Tone.BufferSource(danTranh)
      .set({
        fadeIn: 5,
        fadeOut: 5,
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(dest);
    activeSources.push(source);
    source.start('+1', offset, duration);
    Tone.Transport.scheduleOnce(() => {
      playDanTranh(dest);
    }, `+${1 + duration - 5}`);
  };

  const schedulePhrase = () => {
    Tone.Transport.scheduleOnce(() => {
      const multiplier = Math.pow(Math.random(), 2);
      PHRASE.slice(0, Math.ceil(Math.random() * PHRASE.length)).forEach(
        ([note, time], i) => {
          piano.triggerAttack(
            note,
            `+${time * (1 + multiplier) + i * multiplier}`
          );
        }
      );
      schedulePhrase();
    }, `+${Math.random() * 60 + 30}`);
  };

  const scheduleChord = () => {
    Tone.Transport.scheduleOnce(() => {
      CHORD.forEach(note => {
        piano.triggerAttack(note, `+${1 + Math.random() / 10 - 0.05}`);
      });
      scheduleChord();
    }, `+${Math.random() * 60 + 30}`);
  };

  const schedule = () => {
    const danTranhFilter = new Tone.AutoFilter(Math.random() / 100 + 0.01, 200);
    const pianoFilter = new Tone.AutoFilter(Math.random() / 100 + 0.01, 400);

    [danTranhFilter, pianoFilter].forEach(filter => {
      filter.connect(destination);
      filter.start();
    });

    piano.connect(pianoFilter);
    playDanTranh(danTranhFilter);
    schedulePhrase();
    scheduleChord();

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      piano.releaseAll(0);
      danTranhFilter.dispose();
      pianoFilter.dispose();
    };
  };

  const deactivate = () => {
    [danTranh, piano].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

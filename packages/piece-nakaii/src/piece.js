import * as Tone from 'tone';
import {
  createPitchShiftedSampler,
  wrapActivate,
} from '@generative-music/utilities';
import { sampleNames } from '../nakaii.gfm.manifest.json';

const phraseProto = [
  ['C4'],
  ['C6'],
  ['B5'],
  ['D6', 'C6'],
  ['C6', 'B5'],
  ['A5', 'G5'],
  ['G5', 'F5'],
  ['B5', 'A5'],
  ['E5', 'G5'],
  ['C5'],
];

const getPhrase = () =>
  phraseProto.reduce((phrase, nextProtoNotes) => {
    const nextPossibleNotes = nextProtoNotes.filter(
      note => note !== phrase[phrase.length - 1]
    );
    return phrase.concat(
      nextPossibleNotes[Math.floor(window.generativeMusic.rng() * nextPossibleNotes.length)]
    );
  }, []);

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const violinGain = new Tone.Gain(0);

  const piano = await createPitchShiftedSampler({
    samplesByNote: samples['vsco2-piano-mf'],
    pitchShift: -24,
  });

  const violins = await createPitchShiftedSampler({
    samplesByNote: samples['vsco2-violins-susvib'],
    pitchShift: -36,
  });

  violins.connect(violinGain);

  const playRandomPhrase = () => {
    let phrase = getPhrase();
    if (window.generativeMusic.rng() < 0.5) {
      phrase = phrase.map(
        note => `${note[0]}${Number.parseInt(note[1], 10) + 1}`
      );
    }
    const multiplier = window.generativeMusic.rng() + 1.75;
    phrase.forEach((note, i) => {
      const offset = window.generativeMusic.rng() * 0.1 - 0.05 + 1;
      if (i <= 2) {
        piano.triggerAttack(note, `+${i * multiplier + offset}`);
      } else if (i >= 3 && i <= 5) {
        piano.triggerAttack(
          note,
          `+${3 * multiplier + ((i - 3) * multiplier) / 3 + offset}`
        );
      } else if (i < phrase.length - 1 || window.generativeMusic.rng() < 0.95) {
        piano.triggerAttack(
          note,
          `+${4.5 * multiplier + ((i - 4.5) * multiplier) / 2 + offset}`
        );
      }
    });

    Tone.Transport.scheduleOnce(() => {
      playRandomPhrase();
    }, `+${window.generativeMusic.rng() * 5 + multiplier * phrase.length + 3}`);
  };

  const schedule = ({ destination }) => {
    violinGain.connect(destination);
    piano.connect(destination);
    const gainLfo = new Tone.LFO(0.001, 0, 1).set({
      phase: 90,
    });
    gainLfo.connect(violinGain.gain);
    gainLfo.start();

    playRandomPhrase();

    ['C4', 'G3', 'C5'].forEach(note => {
      const play = () => {
        violins.triggerAttack(note, '+1');

        Tone.Transport.scheduleOnce(() => {
          play();
        }, `+${window.generativeMusic.rng() * 30 + 30}`);
      };
      play();
    });

    return () => {
      violins.releaseAll(0);
      piano.releaseAll(0);
      gainLfo.dispose();
    };
  };

  const deactivate = () => {
    [violinGain, piano, violins].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

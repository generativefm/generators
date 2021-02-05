import Chain from 'markov-chains';
import * as Tone from 'tone';
import { createSampler, wrapActivate } from '@generative-music/utilities';
import instructions from './instructions.json';
import { sampleNames } from '../aisatsana.gfm.manifest.json';

const BPM = 102;
const SECONDS_PER_MINUTE = 60;
const EIGHTH_NOTES_IN_BEAT = 2;
const EIGHTH_NOTE_INTERVAL_S =
  SECONDS_PER_MINUTE / (EIGHTH_NOTES_IN_BEAT * BPM);
const DELIMITER = ',';
const SONG_LENGTH = 301;

const getPiano = samples => createSampler(samples['vsco2-piano-mf']);

const activate = async ({ sampleLibrary }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const notes = instructions.tracks[1].notes.slice(0);
  const eighthNotes = [];

  for (let time = 0; time <= SONG_LENGTH; time += EIGHTH_NOTE_INTERVAL_S) {
    const names = notes
      .filter(
        note => time <= note.time && note.time < time + EIGHTH_NOTE_INTERVAL_S
      )
      .map(({ name }) => name)
      .sort();
    eighthNotes.push(names.join(DELIMITER));
  }

  const phrases = [];
  const phraseLength = 32;
  const enCopy = eighthNotes.slice(0);
  while (enCopy.length > 0) {
    phrases.push(enCopy.splice(0, phraseLength));
  }

  const phrasesWithIndex = phrases.map(phrase =>
    phrase.map((names, i) =>
      names.length === 0 ? `${i}` : `${i}${DELIMITER}${names}`
    )
  );

  const chain = new Chain(phrasesWithIndex);

  const piano = await getPiano(samples);

  const schedule = ({ destination }) => {
    piano.connect(destination);

    const schedulePhrase = () => {
      const phrase = chain.walk();
      phrase.forEach(str => {
        const [t, ...names] = str.split(DELIMITER);
        const parsedT = Number.parseInt(t, 10);
        names.forEach(name => {
          const waitTime = parsedT * EIGHTH_NOTE_INTERVAL_S;
          piano.triggerAttack(
            name,
            `+${waitTime + 1 + window.generativeMusic.rng() * 0.05 - 0.025}`
          );
        });
      });
    };
    Tone.Transport.scheduleRepeat(
      schedulePhrase,
      phraseLength * EIGHTH_NOTE_INTERVAL_S
    );
    return () => {
      piano.releaseAll(0);
    };
  };

  const deactivate = () => {
    piano.dispose();
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

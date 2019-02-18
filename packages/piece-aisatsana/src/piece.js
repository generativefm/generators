import Chain from 'markov-chains';
import fetchSpecFile from '@generative-music/samples.generative.fm';
import Tone from 'tone';
import instructions from './instructions.json';

const BPM = 102;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const EIGHTH_NOTES_IN_BEAT = 2;
const EIGHTH_NOTE_INTERVAL_S =
  SECONDS_PER_MINUTE / (EIGHTH_NOTES_IN_BEAT * BPM);
const EIGHTH_NOTE_INTERVAL_MS =
  EIGHTH_NOTE_INTERVAL_S * MILLISECONDS_PER_SECOND;
const DELIMITER = ',';
const SONG_LENGTH = 301;

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
  phrase.map(
    (names, i) => (names.length === 0 ? `${i}` : `${i}${DELIMITER}${names}`)
  )
);

const chain = new Chain(phrasesWithIndex);

const getPiano = (samplesSpec, format) =>
  new Promise(resolve => {
    const piano = new Tone.Sampler(
      samplesSpec.samples['vsco2-piano-mf'][format],
      {
        onload: () => resolve(piano),
      }
    );
  });

const makePiece = ({ destination, audioContext, preferredFormat }) =>
  fetchSpecFile()
    .then(samplesSpec => {
      if (audioContext !== Tone.context) {
        Tone.setContext(audioContext);
      }
      return getPiano(samplesSpec, preferredFormat);
    })
    .then(piano => {
      piano.connect(destination);
      const timeoutsToClear = [];
      const schedule = () => {
        const phrase = chain.walk();
        phrase.forEach(str => {
          const [t, ...names] = str.split(DELIMITER);
          const parsedT = Number.parseInt(t, 10);
          names.forEach(name =>
            timeoutsToClear.push(
              setTimeout(
                () => piano.triggerAttack(name, '+1'),
                parsedT * EIGHTH_NOTE_INTERVAL_MS
              )
            )
          );
        });
      };
      schedule();
      const interval = setInterval(
        schedule,
        phraseLength * EIGHTH_NOTE_INTERVAL_MS
      );
      return () => {
        piano.dispose();
        clearInterval(interval);
        timeoutsToClear.forEach(timeout => clearTimeout(timeout));
      };
    });

export default makePiece;

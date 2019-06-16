import Tone from 'tone';
import { Chord, Note, Distance } from 'tonal';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const NOON_SEMITONE_CHANGE = 15;
const MIDNIGHT_SEMITONE_CHANGE = 30;

const findClosest = (note, samplesByNote) => {
  const noteMidi = Note.midi(note);
  const maxInterval = 96;
  let interval = 0;
  while (interval <= maxInterval) {
    const higherNote = Note.fromMidi(noteMidi + interval);
    if (samplesByNote[higherNote]) {
      return higherNote;
    }
    const lowerNote = Note.fromMidi(noteMidi - interval);
    if (samplesByNote[lowerNote]) {
      return lowerNote;
    }
    interval += 1;
  }
  return note;
};

const getBuffers = samplesByNote =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(samplesByNote, {
      onload: () => resolve(buffers),
    });
  });

const NOTES = [4, 5, 6].reduce(
  (allNotes, octave) => allNotes.concat(Chord.notes(`C${octave}`, 'm7')),
  []
);

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename).then(
    ({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      const samplesByNote = samples['vsco2-piano-mf'][preferredFormat];
      return getBuffers(samplesByNote).then(buffers => {
        const bufferSources = [];
        const playNote = note => {
          const date = new Date();
          const hour = date.getHours();
          const minute = date.getMinutes();
          const second = date.getSeconds();
          let semitoneChange;
          if (hour >= 12) {
            const hoursPastNoon = hour - 12;
            const secondsPastNoon =
              hoursPastNoon * 60 * 60 + minute * 60 + second;
            const pctToMidnight = secondsPastNoon / (12 * 60 * 60 - 1);
            semitoneChange =
              pctToMidnight *
                (MIDNIGHT_SEMITONE_CHANGE - NOON_SEMITONE_CHANGE) +
              NOON_SEMITONE_CHANGE;
          } else {
            const secondsPastMidnight = hour * 60 * 60 + minute * 60 + second;
            const pctToNoon = secondsPastMidnight / (12 * 60 * 60 - 1);
            semitoneChange =
              pctToNoon * (NOON_SEMITONE_CHANGE - MIDNIGHT_SEMITONE_CHANGE) +
              MIDNIGHT_SEMITONE_CHANGE;
          }
          const closestSample = findClosest(note, samplesByNote);
          const difference = Distance.semitones(closestSample, note);
          const buffer = buffers.get(closestSample);
          const bufferSource = new Tone.BufferSource(buffer).connect(
            destination
          );
          const playbackRate = Tone.intervalToFrequencyRatio(
            difference - semitoneChange
          );
          bufferSource.set({
            playbackRate,
            onended: () => {
              const index = bufferSources.indexOf(bufferSource);
              if (index >= 0) {
                bufferSource.dispose();
                bufferSources.splice(index, 1);
              }
            },
          });

          bufferSource.start('+1');

          return semitoneChange;
        };

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
          [buffers, ...bufferSources].forEach(node => node.dispose());
          bufferSources.splice(0, bufferSources.length);
        };
      });
    }
  );

export default makePiece;

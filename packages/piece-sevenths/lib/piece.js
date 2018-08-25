'use strict';

const pickRandom = require('pick-random');
const randomNumber = require('random-number');
const tonal = require('tonal');

const CHORDS = ['m7', 'maj7', '7'];
// eslint-disable-next-line no-magic-numbers
const OCTAVES = [2, 3, 4, 5];
const MIN_ARPEGGIO_TIME_S = 0.25;
const MAX_ARPEGGIO_TIME_S = 5;
const MIN_NEXT_CHORD_TIME_S = 3;
const MAX_NEXT_CHORD_TIME_S = 15;

const makeScheduleChord = ({ time, instrument }) => {
  const scheduleChord = () => {
    const [tonic] = pickRandom(tonal.Note.names());
    const [chordType] = pickRandom(CHORDS);
    const [octave] = pickRandom(OCTAVES);
    const octavedTonic = `${tonic}${octave}`;
    const intervals = tonal.Chord.intervals(chordType);
    const inversion = randomNumber({ min: 0, max: 3, integer: true });
    const notes = intervals.map((interval, i) =>
      tonal.Distance.transpose(
        octavedTonic,
        i < inversion ? tonal.Interval.invert(interval) : interval
      )
    );
    const chordTime = randomNumber({
      min: MIN_NEXT_CHORD_TIME_S,
      max: MAX_NEXT_CHORD_TIME_S,
    });
    time.createTimeout(() => {
      const arpeggioTime = randomNumber({
        min: MIN_ARPEGGIO_TIME_S,
        max: MAX_ARPEGGIO_TIME_S,
      });
      notes.forEach(note => {
        const noteTime = randomNumber({ min: 0, max: arpeggioTime });
        time.createTimeout(() => {
          instrument.attack(note);
        }, noteTime);
      });
      scheduleChord();
    }, chordTime);
  };
  return scheduleChord;
};

const piece = ({ time, instruments }) => {
  const [instrument] = instruments;
  makeScheduleChord({ time, instrument })();
};

module.exports = piece;

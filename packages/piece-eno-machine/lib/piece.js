'use strict';

const tonal = require('tonal');
const randomNumber = require('random-number');

const OCTAVES = [3, 4, 5];
const MIN_REPEAT_S = 20;
const MAX_REPEAT_S = 60;

const NOTES = tonal.Array.rotate(1, tonal.Chord.notes('DbM9')).reduce(
  (withOctaves, note) =>
    withOctaves.concat(OCTAVES.map(octave => `${note}${octave}`)),
  []
);

const piece = ({ time, instruments }) => {
  const [instrument] = instruments;
  NOTES.forEach(note => {
    const interval = randomNumber({ min: MIN_REPEAT_S, max: MAX_REPEAT_S });
    const delay = randomNumber({ min: 0, max: MAX_REPEAT_S - MIN_REPEAT_S });
    const playNote = () => instrument.attack(note);
    time.createInterval(playNote, interval, delay);
  });
};

module.exports = piece;

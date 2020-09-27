import FULL_NOTE_REGEX from './full-note-regex';

const getOctave = (note = '') => {
  const match = note.match(FULL_NOTE_REGEX);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[2], 10);
};

export default getOctave;

import FULL_NOTE_REGEX from './full-note-regex';

const getPitchClass = (note = '') => {
  const match = note.match(FULL_NOTE_REGEX);
  if (!match) {
    return null;
  }
  return match[1];
};

export default getPitchClass;

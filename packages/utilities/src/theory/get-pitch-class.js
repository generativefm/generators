import FULL_NOTE_REGEX from './full-note-regex';

const getPitchClass = (note = '') => note.match(FULL_NOTE_REGEX)[1];

export default getPitchClass;

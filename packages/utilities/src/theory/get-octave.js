import FULL_NOTE_REGEX from './full-note-regex';

const getOctave = (note = '') => note.match(FULL_NOTE_REGEX)[2];

export default getOctave;

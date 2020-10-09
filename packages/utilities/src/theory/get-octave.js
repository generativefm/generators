const getOctave = (note = '') => {
  const match = note.match(/[abcdefg][#b]?(\d+)/i);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
};

export default getOctave;

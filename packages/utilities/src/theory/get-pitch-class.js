const getPitchClass = (note = '') => {
  const match = note.match(/([abcdefg][#b]?)\d*/i);
  if (!match) {
    return null;
  }
  return match[1];
};

export default getPitchClass;

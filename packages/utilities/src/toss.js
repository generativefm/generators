const toss = (pitchClasses = [], octaves = []) =>
  octaves.reduce(
    (notes, octave) => notes.concat(pitchClasses.map(pc => `${pc}${octave}`)),
    []
  );

export default toss;

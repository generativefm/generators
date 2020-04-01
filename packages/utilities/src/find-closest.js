const findClosest = (midi, samplesByMidi) => {
  const MAX_INTERVAL = 96;
  let interval = 0;
  while (interval < MAX_INTERVAL) {
    if (samplesByMidi.has(midi + interval)) {
      return -interval;
    } else if (samplesByMidi.has(midi - interval)) {
      return interval;
    }
    interval += 1;
  }
  throw new Error(`No nearby samples found for midi ${midi}`);
};

export default findClosest;

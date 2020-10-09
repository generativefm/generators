// https://github.com/Tonejs/Tone.js/blob/ed0d3b08be2b95220fffe7cce7eac32a5b77580e/Tone/instrument/Sampler.ts#L183

const MAX_INTERVAL = 96;
const getClosestNote = ({ targetMidi, searchedMidiSet }) => {
  for (let interval = 0; interval <= MAX_INTERVAL; interval += 1) {
    const closestMidi = [targetMidi + interval, targetMidi - interval].find(
      midi => searchedMidiSet.has(midi)
    );
    if (typeof closestMidi !== 'undefined') {
      return closestMidi;
    }
  }
  throw new Error(`No nearby samples found for midi ${targetMidi}`);
};

export default getClosestNote;

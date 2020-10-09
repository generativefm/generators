import normalizeNote from './normalize-note';
import getPitchClass from './get-pitch-class';
import getOctave from './get-octave';
import pitchClassIndiciesByValue from './pitch-class-indicies-by-value';
import curry2 from '../utilities/curry-2';

const _getDistance = (note1, note2) => {
  const [
    [note1PitchClassIndex, note1Octave],
    [note2PitchClassIndex, note2Octave],
  ] = [note1, note2]
    .map(normalizeNote)
    .map(note => [
      pitchClassIndiciesByValue[getPitchClass(note)],
      getOctave(note),
    ]);
  const octaveChange = note2Octave - note1Octave;
  const pitchClassChange = note2PitchClassIndex - note1PitchClassIndex;
  return pitchClassChange + octaveChange * 12;
};

const getDistance = (note1, note2) => {
  if (typeof note2 === 'undefined') {
    return curry2(_getDistance)(note1);
  }
  return _getDistance(note1, note2);
};

export default getDistance;

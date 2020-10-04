import pitchClasses from './pitch-classes';
import pitchClassIndiciesByValue from './pitch-class-indicies-by-value';

const transposePitchClass = (pitchClass, semitones) => {
  const pitchClassIndex = pitchClassIndiciesByValue[pitchClass];
  const nextIndexForPositiveChange = (pitchClassIndex + semitones) % 12;
  if (nextIndexForPositiveChange >= 0) {
    return pitchClasses[nextIndexForPositiveChange];
  }
  return pitchClasses[nextIndexForPositiveChange + 12];
};

export default transposePitchClass;

import pitchClasses from './pitch-classes';

const pitchClassIndiciesByValue = pitchClasses.reduce(
  (byIndex, pitchClass, index) => {
    byIndex[pitchClass] = index;
    return byIndex;
  },
  {}
);

export default pitchClassIndiciesByValue;

import transpose from './transpose';

const chord = (tonic, intervals) =>
  [tonic].concat(intervals.map(transpose(tonic)));

export default chord;

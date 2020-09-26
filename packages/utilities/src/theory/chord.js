import transpose from './transpose';
import invert from './invert';

const chord = (tonic, intervals, inversion = 0) =>
  invert([tonic].concat(intervals.map(transpose(tonic))), inversion);

export default chord;

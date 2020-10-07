import simplifyNote from './simplify-note';
import getPitchClass from './get-pitch-class';
import getOctave from './get-octave';
import pitchClassIndiciesByValue from './pitch-class-indicies-by-value';

const sortNotes = (notes = []) =>
  notes
    .map(simplifyNote)
    .map(note => [getPitchClass(note), getOctave(note)])
    .sort((a, b) => {
      const [pcA, octA] = a;
      const [pcB, octB] = b;
      if (octA !== octB) {
        return octA - octB;
      }
      return pitchClassIndiciesByValue[pcA] - pitchClassIndiciesByValue[pcB];
    })
    .map(parts => parts.join(''));

export default sortNotes;

import { of, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { getOctave, getPitchClass } from '@generative-music/utilities';

const octaved = ({ p, octaveChange, notes }) => source => {
  const noteSet = new Set(notes);
  return source.pipe(
    mergeMap(note =>
      noteSet.has(note) && Math.random() < p
        ? from([
            note,
            `${getPitchClass(note)}${getOctave(note) + octaveChange}`,
          ])
        : of(note)
    )
  );
};

export default octaved;

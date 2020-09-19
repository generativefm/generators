import { Note } from 'tonal';
import { of, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

const octaved = ({ p, octaveChange, notes }) => source => {
  const noteSet = new Set(notes);
  return source.pipe(
    mergeMap(note =>
      noteSet.has(note) && Math.random() < p
        ? from([note, `${Note.pc(note)}${Note.oct(note) + octaveChange}`])
        : of(note)
    )
  );
};

export default octaved;

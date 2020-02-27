import Tone from 'tone';

const getSampler = samplesByNote =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(sampler),
    });
  });

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const pcTranspose = (note, semitones) => {
  const currentIndex = NOTES.indexOf(note);
  const naiveIndex = currentIndex + semitones;
  const octaveChange = Math.floor(naiveIndex / 12);
  const realIndex =
    naiveIndex >= 0 ? naiveIndex % 12 : (12 + (naiveIndex % 12)) % 12;
  return [NOTES[realIndex], octaveChange];
};

const transpose = (note, semitones) => {
  const matches = /([A,B,C,D,E,F,G,#]{1,2})(\d*)/.exec(note);
  if (matches !== null) {
    // eslint-disable-next-line no-unused-vars
    const [_, pc, octaveStr] = matches;
    const [newPc, octaveChange] = pcTranspose(pc, semitones);
    if (octaveStr) {
      return `${newPc}${Number(octaveStr) + octaveChange}`;
    }
    return newPc;
  }
  return note;
};

function* makeNoteGenerator(notes) {
  for (
    let i = 0;
    i < notes.length;
    i === notes.length - 1 ? (i = 0) : (i += 1)
  ) {
    yield notes[i];
  }
}

const trillNoteSets = [['D5', 'C5'], ['D#5', 'D5'], ['F5', 'D#5']];

const trillGenerators = trillNoteSets.map(notes => makeNoteGenerator(notes));

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return getSampler(samples['vsco2-piano-mf']).then(piano => {
    piano.connect(destination);
    const splatterNotes = transposeUp => {
      const multiplier = Math.pow(Math.random(), 2) * 0.5 + 0.01;
      ['C3', 'D#3', 'G3', 'A#3', 'D4']
        .map(note => (transposeUp ? transpose(note, 5) : note))
        .forEach((note, i) => {
          piano.triggerAttack(
            note,
            `+${1 + multiplier * i + Math.random() / 50 - 0.01}`
          );
        });
    };

    const trillNotes = transposeUp => {
      const trillerGeneratorIndex = Math.floor(
        Math.random() * trillGenerators.length
      );
      const trillGenerator = trillGenerators[trillerGeneratorIndex];

      const trill = Array.from({
        length: Math.ceil(Math.random() * 8) + 12,
      })
        .map(() => trillGenerator.next().value)
        .map(note =>
          transposeUp && trillGenerator !== 3 ? transpose(note, 5) : note
        );
      const upper = Math.random() * 0.5 + 0.4;
      const lower = Math.random() * 0.1 + 0.2;
      const getNoteWaitTime = x =>
        -4 * (lower - upper) * Math.pow(x, 2) + 4 * (lower - upper) * x + upper;
      const lastTrillTime = (Math.random() < 0.5
        ? trill
        : trill.reverse()
      ).reduce((lastNoteTime, note, i) => {
        const noteTime = lastNoteTime + getNoteWaitTime(i / (trill.length - 1));
        piano.triggerAttack(
          note,
          `+${noteTime + Math.random() / 50 - 0.01}`,
          0.5
        );
        return noteTime;
      }, 1 - upper);

      return lastTrillTime;
    };

    const playMoment = () => {
      const up = Math.random() < 0.5;
      splatterNotes(up);
      const lastTrillTime = trillNotes(up);

      Tone.Transport.scheduleOnce(() => {
        playMoment();
      }, `+${Math.random() * 5 + lastTrillTime - 0.5}`);
    };

    playMoment();

    return () => {
      piano.dispose();
    };
  });
};

export default makePiece;

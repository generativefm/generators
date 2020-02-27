import Tone from 'tone';

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

const getSampler = (samplesByNote, baseUrl = '') =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      baseUrl,
      onload: () => resolve(sampler),
    });
  });

const TREMOLO_PATTERN = [
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
  true,
  false,
];

const MIN_BPM = 40;
const MAX_BPM = 80;

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getSampler(samples['vsco2-piano-mf']),
    getSampler(samples['vsco2-piano-mf']),
    new Tone.Reverb(15).set({ wet: 0.5 }).generate(),
  ]).then(([piano1, piano2, reverb]) => {
    const filter = new Tone.Filter().connect(reverb);
    const filterFreqLfo = new Tone.LFO(
      Math.random() / 1000 + 0.001,
      200,
      1000
    ).set({ phase: Math.random() * 360 });
    filterFreqLfo.connect(filter.frequency);
    filterFreqLfo.start();
    const volume = new Tone.Volume().connect(filter);
    const synth = new Tone.Synth().set({ volume: -25 }).connect(destination);
    reverb.connect(destination);

    const tremoloChord = (
      transposition = 0,
      bpm = Math.random() * (MAX_BPM - MIN_BPM) + MIN_BPM,
      up = Math.random() < 0.5
    ) => {
      const notes = ['C3', 'E3', 'G3', 'B3'].map(note =>
        transpose(note, transposition)
      );
      const [bassNote] = notes;
      synth.set({ envelope: { release: 60 / bpm } });
      synth.triggerAttackRelease(
        transpose(bassNote, -12),
        (60 / bpm) * 3,
        '+1'
      );
      piano1.triggerAttack(notes, '+1');

      notes
        .filter(() => Math.random() < 0.5)
        .forEach(note => {
          piano2.triggerAttack(
            transpose(note, 12),
            `+${Math.random() * ((60 / bpm) * 3 - 1) + 1}`
          );
        });

      TREMOLO_PATTERN.forEach((isOn, i) => {
        volume.volume.setValueAtTime(
          isOn ? 0 : -50,
          `+${1 + i * (60 / bpm / 4)}`
        );
      });

      let semitoneChange = 0;
      if (Math.random() < 0.25) {
        if (transposition === -10) {
          semitoneChange = 5;
        } else if (transposition === 10) {
          semitoneChange = -5;
        } else {
          semitoneChange = Math.random() < 0.5 ? 5 : -5;
        }
      }

      let nextBpm;
      let nextUp = up;
      const pctDelta = Math.random() * 0.005;
      if (bpm <= MIN_BPM && !up) {
        nextBpm = bpm * (1 + pctDelta);
        nextUp = true;
      } else if (bpm >= MAX_BPM && up) {
        nextBpm = bpm * (1 - pctDelta);
        nextUp = false;
      } else if (up) {
        nextBpm = bpm * (1 + pctDelta);
      } else {
        nextBpm = bpm * (1 - pctDelta);
      }

      Tone.Transport.scheduleOnce(() => {
        tremoloChord(transposition + semitoneChange, nextBpm, nextUp);
      }, `+${(60 / bpm) * 4}`);
    };

    tremoloChord();

    piano1.connect(volume);

    const chorus = new Tone.Chorus().connect(reverb);
    const chorusWetLfo = new Tone.LFO(Math.random() / 1000 + 0.001).set({
      phase: Math.random() * 360,
    });
    chorusWetLfo.connect(chorus.wet);
    chorusWetLfo.start();
    piano2.connect(chorus);

    return () => {
      [
        piano1,
        piano2,
        reverb,
        filter,
        filterFreqLfo,
        volume,
        synth,
        chorus,
        chorusWetLfo,
      ].forEach(node => {
        node.dispose();
      });
    };
  });
};

export default makePiece;

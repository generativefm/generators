import * as Tone from 'tone';
import {
  transpose,
  wrapActivate,
  createPrerenderableSampler,
  sortNotes,
  getDistance,
} from '@generative-music/utilities';
import { sampleNames } from '../transmission.gfm.manifest.json';

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

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const renderedNotes = sortNotes(
    ['C3', 'E3', 'G3', 'B3']
      .map(note => [-15, -5, 0, 5, 15, 27].map(transpose(note)))
      .flat()
  ).filter((note, i, notes) => {
    if (i === notes.length - 1) {
      return true;
    }
    const distanceToNext = getDistance(note, notes[i + 1]);
    return distanceToNext > 2;
  });

  const [tremPiano, piano] = await Promise.all(
    Array.from({ length: 2 }, () =>
      createPrerenderableSampler({
        samples,
        sampleLibrary,
        onProgress,
        notes: renderedNotes,
        sourceInstrumentName: 'vsco2-piano-mf',
        renderedInstrumentName: 'transmission__vsco2-piano-mf',
        getDestination: () =>
          new Tone.Reverb(15)
            .set({ wet: 0.5 })
            .toDestination()
            .generate(),
      })
    )
  );

  const filter = new Tone.Filter().connect(destination);
  const gain = new Tone.Gain().connect(filter);
  const synth = new Tone.Synth().set({ volume: -25 }).connect(destination);

  const tremoloChord = (
    transposition = 0,
    bpm = Math.random() * (MAX_BPM - MIN_BPM) + MIN_BPM,
    up = Math.random() < 0.5
  ) => {
    const notes = ['C3', 'E3', 'G3', 'B3'].map(transpose(transposition));
    const [bassNote] = notes;
    synth.set({ envelope: { release: 60 / bpm } });
    synth.triggerAttackRelease(transpose(bassNote, -12), (60 / bpm) * 3, '+1');
    tremPiano.triggerAttack(notes, '+1');

    notes
      .filter(() => Math.random() < 0.5)
      .forEach(note => {
        piano.triggerAttack(
          transpose(note, 12),
          `+${Math.random() * ((60 / bpm) * 3 - 1) + 1}`
        );
      });

    TREMOLO_PATTERN.forEach((isOn, i) => {
      gain.gain.setValueAtTime(isOn ? 1 : 0.5, `+${1 + i * (60 / bpm / 4)}`);
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

  tremPiano.connect(gain);

  const chorus = new Tone.Chorus().connect(destination);
  piano.connect(chorus);

  const schedule = () => {
    const chorusWetLfo = new Tone.LFO(Math.random() / 1000 + 0.001).set({
      phase: Math.random() * 360,
    });

    const filterFreqLfo = new Tone.LFO(
      Math.random() / 1000 + 0.001,
      200,
      1000
    ).set({ phase: Math.random() * 360 });
    filterFreqLfo.connect(filter.frequency);
    filterFreqLfo.start();

    chorusWetLfo.connect(chorus.wet);
    chorusWetLfo.start();

    tremoloChord();

    return () => {
      gain.gain.cancelScheduledValues(Tone.now());
      tremPiano.releaseAll(0);
      piano.releaseAll(0);
      chorusWetLfo.dispose();
      filterFreqLfo.dispose();
    };
  };

  const deactivate = () => {
    [filter, gain, synth, chorus, tremPiano, piano].forEach(node => {
      node.dispose();
    });
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

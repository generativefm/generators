import * as Tone from 'tone';
import {
  createBuffers,
  createPrerenderableSampler,
  createPrerenderableBuffers,
  createPrerenderableSampledBuffers,
  wrapActivate,
  toss,
  getPitchClass,
  getOctave,
  getRandomElement,
  sampleNote,
} from '@generative-music/utilities';
import { sampleNames } from '../stream-of-consciousness.gfm.manifest.json';

const chords = [
  ['C3', 'E3', 'G3', 'B3'],
  ['C3', 'Eb3', 'G3', 'B3'],
  ['B2', 'D3', 'G3', 'B3'],
  ['A2', 'C#3', 'G3', 'A3'],
];

const nextChordMap = new Map([
  [0, [0, 1, 3]],
  [1, [0, 2, 3]],
  [2, [0, 3]],
  [3, [0, 2]],
]);

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);

  const stirBuffers = await createPrerenderableBuffers({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'snare-brush-stir',
    renderedInstrumentName: 'stream-of-consciousness__snare-brush-stir',
    getDestination: () =>
      new Tone.Reverb(15)
        .set({ wet: 0.6 })
        .toDestination()
        .generate(),
    onProgress: val => onProgress(val / 3),
  });

  const hitBuffers = await createBuffers(samples['snare-brush-hit-p']);
  const rideBuffers = await createBuffers(samples['ride-brush-p']);
  const renderedPitchClasses = ['C', 'E', 'G'];
  const renderedReversePianoNotes = toss(renderedPitchClasses, [3, 4]);

  const reversePianoBuffers = await createPrerenderableSampledBuffers({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'stream-of-consciousness__vsco2-piano-mf-reverse',
    notes: renderedReversePianoNotes,
    reverse: true,
    getDestination: () =>
      new Tone.Reverb(30)
        .set({ wet: 0.75 })
        .toDestination()
        .generate(),
    onProgress: val => onProgress((val + 1) / 3),
  });

  const lowPiano = await createPrerenderableSampler({
    samples,
    sampleLibrary,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'stream-of-consciousness__vsco2-piano-mf-low',
    notes: toss(renderedPitchClasses, [5, 6, 7]),
    getDestination: () =>
      new Tone.Reverb(30)
        .set({ wet: 0.75 })
        .toDestination()
        .generate(),
    pitchShift: -24,
    onProgress: val => onProgress((val + 2) / 3),
  });

  const activeSources = [];
  const stirVol = new Tone.Volume(-5);
  const stirBuffer = stirBuffers.get(0);
  const stir = () => {
    const source = new Tone.ToneBufferSource(stirBuffer)
      .set({
        curve: 'linear',
        fadeIn: 5,
        fadeOut: 5,
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(stirVol);
    activeSources.push(source);
    source.start('+1', 0, stirBuffer.duration - 5);
    Tone.Transport.scheduleOnce(() => {
      stir();
    }, `+${stirBuffer.duration - 10 - Math.random() * 5}`);
  };

  const hitVol = new Tone.Volume(-4);

  const randomHit = (time = '+1') => {
    const randomBuffer = hitBuffers.get(
      Math.floor(Math.random() * samples['snare-brush-hit-p'].length)
    );
    const hitSource = new Tone.ToneBufferSource(randomBuffer)
      .set({
        playbackRate: Math.random() * 0.1 + 0.95,
        onended: () => {
          const i = activeSources.indexOf(hitSource);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(hitVol);
    activeSources.push(hitSource);
    hitSource.start(time);
  };

  const randomRide = (time = '+1') => {
    const randomBuffer = rideBuffers.get(
      Math.floor(Math.random() * samples['ride-brush-p'].length)
    );
    const source = new Tone.ToneBufferSource(randomBuffer)
      .set({
        playbackRate: Math.random() * 0.1 + 0.95,
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(hitVol);
    activeSources.push(source);
    source.start(time);
  };

  const synth = new Tone.Synth({ oscillator: { type: 'sine' } }).set({
    volume: -7,
  });

  const playReversePiano = (note, time, duration, dest) => {
    const { sampledNote, playbackRate } = sampleNote({
      sampledNotes: renderedReversePianoNotes,
      note,
    });

    const buffer = reversePianoBuffers.get(sampledNote);
    const source = new Tone.ToneBufferSource(buffer).set({
      playbackRate,
      onended: () => {
        const i = activeSources.indexOf(source);
        if (i >= 0) {
          activeSources.splice(i, 1);
        }
      },
    });
    activeSources.push(source);
    source.connect(dest);
    const bufferDuration = buffer.duration;
    const adjustedDuration = duration * playbackRate;
    if (bufferDuration > adjustedDuration) {
      const offset = bufferDuration - adjustedDuration;
      source.start(time, offset);
    } else {
      const waitTime = duration - bufferDuration / playbackRate;
      Tone.Transport.scheduleOnce(() => {
        source.start(time);
      }, `+${waitTime}`);
    }
  };

  let chordI = 0;
  let measure = 0;
  const playMeasure = (
    reversePianoDestination,
    bpm = Math.random() * 40 + 60,
    up = Math.random() < 0.5
  ) => {
    const beats = 8;
    const spb = (1 / bpm) * 60;
    const chord = chords[chordI];
    const chordCopy = chord.slice(0);
    const arpeggio = [];
    while (chordCopy.length) {
      const i = Math.floor(Math.random() * chordCopy.length);
      const note = chordCopy[i];
      chordCopy.splice(i, 1);
      arpeggio.push(note);
    }
    for (let i = 0; i < beats; i += 1) {
      const time = 1 + i * spb + (Math.random() * 0.005 - 0.0025);
      if (i === 0) {
        synth.triggerAttackRelease('C2', 0.05, `+${time}`);
        chord
          .filter(() => Math.random() < 0.9)
          .forEach(note => {
            playReversePiano(
              note,
              `+${time}`,
              spb * 2 + Math.random() * 0.5,
              reversePianoDestination
            );
          });
        if (Math.random() < 0.25) {
          chord
            .filter(() => Math.random() < 0.9)
            .forEach(note => {
              const pc = getPitchClass(note);
              const oct = getOctave(note);
              playReversePiano(
                `${pc}${oct + 1}`,
                `+${time}`,
                spb * 2 + Math.random() * 0.5,
                reversePianoDestination
              );
            });
        }
        const nextChordIndicies = nextChordMap.get(chordI);
        chordI = getRandomElement(nextChordIndicies);
      } else if (i === 2 || i === 6) {
        randomHit(`+${time}`);
      } else if ((i === 3 || i === 7) && Math.random() < 0.3) {
        randomHit(`+${time + spb / 2}`);
      }
      if (i === 7 && Math.random() < 0.1) {
        synth.triggerAttackRelease('C2', 0.05, `+${time + spb / 2}`);
      }
      randomRide(`+${time}`);
      const note = arpeggio[i % arpeggio.length];
      const pc = getPitchClass(note);
      const oct = getOctave(note);
      const pianoDelay = Math.random() * 0.1 - 0.05;
      lowPiano.triggerAttack(`${pc}${oct + 3}`, `+${time + pianoDelay}`);
      lowPiano.triggerAttack(`${pc}${oct + 4}`, `+${time + pianoDelay}`);
    }

    if (measure === 2) {
      measure = 0;
    } else {
      measure += 1;
    }

    Tone.Transport.scheduleOnce(() => {
      if (bpm >= 100) {
        playMeasure(
          reversePianoDestination,
          bpm * (1 - Math.random() * 0.001),
          false
        );
      } else if (bpm <= 60) {
        playMeasure(
          reversePianoDestination,
          bpm * (1 + Math.random() * 0.001),
          true
        );
      } else if (up) {
        playMeasure(
          reversePianoDestination,
          bpm * (1 + Math.random() * 0.001),
          true
        );
      } else {
        playMeasure(
          reversePianoDestination,
          bpm * (1 - Math.random() * 0.001),
          false
        );
      }
    }, `+${spb * beats}`);
  };

  const schedule = () => {
    const percussionAutoFilter = new Tone.AutoFilter(
      Math.random() / 500 + 0.005,
      150,
      6
    ).connect(destination);
    percussionAutoFilter.start();

    hitVol.connect(percussionAutoFilter);
    synth.connect(percussionAutoFilter);

    const pianoAutoFilter = new Tone.AutoFilter(
      Math.random() / 500 + 0.005,
      150,
      6
    ).connect(destination);
    pianoAutoFilter.start();

    lowPiano.connect(pianoAutoFilter);

    const stirAutoFilter = new Tone.AutoFilter(
      Math.random() / 500 + 0.005,
      150,
      6
    );
    stirAutoFilter.start();
    stirAutoFilter.connect(destination);
    stirVol.connect(stirAutoFilter);

    stir();
    playMeasure(pianoAutoFilter);

    return () => {
      activeSources.forEach(source => {
        source.stop(0);
      });
      lowPiano.releaseAll(0);
      [percussionAutoFilter, pianoAutoFilter, stirAutoFilter].forEach(node =>
        node.dispose()
      );
    };
  };

  const deactivate = () => {
    [
      stirBuffers,
      hitBuffers,
      rideBuffers,
      reversePianoBuffers,
      lowPiano,
      synth,
      stirVol,
      hitVol,
    ].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

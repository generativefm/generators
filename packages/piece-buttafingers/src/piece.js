import Tone from 'tone';
import { Note, Distance } from 'tonal';
import { getBuffers } from '@generative-music/utilities';

const NOTES = ['C4', 'E4', 'F4', 'G4', 'B5', 'A5'];
const PITCH_CHANGES = [-36, -24];

const getPitchShiftedSampler = (samplesByNote, changeInSemitones = 0) => {
  const disposableNodes = [];
  const disposeNode = node => {
    node.dispose();
    const i = disposableNodes.findIndex(n => n === node);
    if (i >= 0) {
      disposableNodes.splice(i, 1);
    }
  };
  const findClosest = note => {
    const noteMidi = Note.midi(note);
    const maxInterval = 96;
    let interval = 0;
    while (interval <= maxInterval) {
      const higherNote = Note.fromMidi(noteMidi + interval);
      if (samplesByNote[higherNote]) {
        return higherNote;
      }
      const lowerNote = Note.fromMidi(noteMidi - interval);
      if (samplesByNote[lowerNote]) {
        return lowerNote;
      }
      interval += 1;
    }
    return note;
  };
  let destination;
  return getBuffers(samplesByNote).then(buffers => ({
    triggerAttack: (note, time) => {
      const closestSample = findClosest(note);
      const difference = Distance.semitones(note, closestSample);
      const bufferSource = new Tone.BufferSource(
        buffers.get(closestSample)
      ).connect(destination);
      const playbackRate = Tone.intervalToFrequencyRatio(
        -difference + changeInSemitones
      );
      bufferSource.set({
        playbackRate,
        onended: () => disposeNode(bufferSource),
        fadeIn: 3,
        fadeOut: 3,
      });
      disposableNodes.push(bufferSource);
      bufferSource.start(time);
    },
    connect: node => {
      destination = node;
    },
    dispose: () => {
      buffers.dispose();
      disposableNodes.forEach(node => node.dispose());
    },
  }));
};

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const masterVol = new Tone.Volume(-7).connect(destination);
  return Promise.all([
    Promise.all(
      NOTES.reduce(
        samplers =>
          samplers.concat(
            PITCH_CHANGES.map(change =>
              getPitchShiftedSampler(samples['vcsl-wine-glasses-slow'], change)
            )
          ),
        []
      )
    ),
    getBuffers(samples['vcsl-claves']),
  ]).then(([wines, claves]) => {
    const disposableNodes = [];
    const disposeNode = node => {
      node.dispose();
      const i = disposableNodes.findIndex(n => n === node);
      if (i >= 0) {
        disposableNodes.splice(i, 1);
      }
    };
    const compressor = new Tone.Compressor().connect(masterVol);
    const filter = new Tone.Filter(1000);
    filter.connect(compressor);
    const startDelays = wines.map(() => Math.random() * 60);
    const minStartDelay = Math.min(...startDelays);
    wines.forEach((wine, i) => {
      const vol = new Tone.Volume().connect(filter);
      const lfo = new Tone.LFO({
        min: -500,
        max: 30,
        frequency: Math.random() / 100,
        phase: Math.random() * 360,
      });
      lfo.connect(vol.volume).start();
      wine.connect(vol);
      const playNote = () => {
        wine.triggerAttack(NOTES[i], '+1');
        Tone.Transport.scheduleOnce(() => {
          playNote();
        }, '+60');
      };
      Tone.Transport.scheduleOnce(() => {
        playNote();
      }, `+${startDelays[i] - minStartDelay + 1}`);
    });

    const claveSounds = samples['vcsl-claves'];
    const delay = new Tone.FeedbackDelay({
      delayTime: 3,
      feedback: 0.3,
      wet: 0.2,
    }).connect(masterVol);
    const reverb = new Tone.Freeverb({ roomSize: 0.6, wet: 1 }).connect(delay);
    const ballBounceClave = () => {
      const panner = new Tone.Panner(Math.random() * 2 - 1).connect(reverb);
      disposableNodes.push(panner);
      const buffer = claves.get(Math.floor(Math.random() * claveSounds.length));
      let time = Math.random() + 1;
      const deltaMultiplier = Math.random() * 0.1 + 0.75;
      const playbackRate = Math.random() + 0.5;
      for (
        let delayDelta = 1;
        delayDelta >= (1 - deltaMultiplier - 0.15) / 10;
        delayDelta *= deltaMultiplier, time += delayDelta
      ) {
        const source = new Tone.BufferSource(buffer)
          .set({
            playbackRate,
            volume: -35,
            onended: () => disposeNode(source),
          })
          .connect(panner);
        disposableNodes.push(source);
        source.start(`+${time}`);
      }
      Tone.Transport.scheduleOnce(() => {
        disposeNode(panner);
      }, `+60`);
      Tone.Transport.scheduleOnce(() => {
        ballBounceClave();
      }, `+${Math.random() * 10 + 10}`);
    };
    Tone.Transport.scheduleOnce(() => {
      ballBounceClave();
    }, `+${Math.random() * 10 + 10}`);

    return () => {
      disposableNodes.forEach(node => disposeNode(node));
      wines
        .concat([claves, compressor, filter, delay, reverb])
        .forEach(node => node.dispose());
    };
  });
};

export default makePiece;

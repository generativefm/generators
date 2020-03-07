import Tone from 'tone';
import { Note, Distance, Chord } from 'tonal';
import { getBuffers } from '@generative-music/piece-utilities';

const findClosest = (samplesByNote, note) => {
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

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const masterVol = new Tone.Volume(5).connect(destination);
  const pianoSamples = samples['vsco2-piano-mf'];
  const violinSamples = samples['vsco2-violins-susvib'];

  const activeSources = [];

  const makePlayNote = (
    buffers,
    samplesByNote,
    noteDestination = masterVol
  ) => note => {
    const closestSampledNote = findClosest(samplesByNote, note);
    const difference = Distance.semitones(closestSampledNote, note);
    const buffer = buffers.get(closestSampledNote);
    const playbackRate = Tone.intervalToFrequencyRatio(difference - 24);
    const source = new Tone.BufferSource(buffer)
      .set({
        playbackRate,
        onended: () => {
          const i = activeSources.indexOf(source);
          if (i >= 0) {
            activeSources.splice(i, 1);
          }
        },
      })
      .connect(noteDestination);
    activeSources.push(source);
    source.start('+1');
  };

  return Promise.all([
    getBuffers(pianoSamples),
    getBuffers(violinSamples),
    new Tone.Reverb(50).generate(),
  ]).then(([pianoBuffers, violinBuffers, reverb]) => {
    const violinVolume = new Tone.Volume(-15).connect(masterVol);
    reverb.connect(violinVolume);
    const filter = new Tone.Filter(50).connect(reverb);
    const filterLfo = new Tone.LFO(
      Math.random() * 0.001 + 0.0005,
      100,
      2000
    ).set({
      phase: 90,
    });
    filterLfo.connect(filter.frequency);
    filterLfo.start();
    const playPiano = makePlayNote(pianoBuffers, pianoSamples);
    const playViolins = makePlayNote(violinBuffers, violinSamples, filter);

    const pianoNotes = [
      ...Chord.notes('C5', 'maj7'),
      ...Chord.notes('C6', 'maj7'),
      'C7',
    ];

    const pianoChain = () => {
      const note = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];
      Tone.Transport.scheduleOnce(() => {
        playPiano(note);
        pianoChain();
      }, `+${Math.random() * 10}`);
    };

    const violinDrone = note => {
      playViolins(note);
      Tone.Transport.scheduleOnce(() => {
        violinDrone(note);
      }, `+${Math.random() * 10}`);
    };

    const violinNotes = ['C3', 'C4'];

    violinNotes.forEach(note => violinDrone(note));

    pianoChain();

    return () => {
      [
        pianoBuffers,
        violinBuffers,
        reverb,
        filter,
        filterLfo,
        ...activeSources,
      ].forEach(node => node.dispose());
    };
  });
};

export default makePiece;

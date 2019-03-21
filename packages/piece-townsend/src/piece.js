import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm/browser-client';

const FLUTE_NOTES = ['C3', 'C4', 'G3', 'G4'];

const getFlute = (samplesSpec, format) =>
  new Promise(resolve => {
    const flute = new Tone.Sampler(
      samplesSpec.samples['vsco2-flute-susvib'][format],
      {
        onload: () => resolve(flute),
      }
    );
  });

const getGuitarSounds = (samplesSpec, format) =>
  Promise.all(
    samplesSpec.samples['acoustic-guitar-chords-cmaj'][format].map(
      url =>
        new Promise(resolve => {
          const buffer = new Tone.Buffer(url, () => resolve(buffer));
        })
    )
  );

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename)
    .then(samplesSpec => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      return Promise.all([
        getFlute(samplesSpec, preferredFormat),
        getGuitarSounds(samplesSpec, preferredFormat),
      ]);
    })
    .then(([flute, guitarBuffers]) => {
      const volume = new Tone.Volume(-10);

      const volumeLfo = new Tone.LFO({
        frequency: Math.random() / 100,
        min: -30,
        max: -10,
      });
      volumeLfo.connect(flute.volume);
      volumeLfo.start();
      const fluteReverb = new Tone.Reverb(50);
      fluteReverb.wet.value = 1;
      const delay = new Tone.FeedbackDelay({ delayTime: 1, feedback: 0.7 });
      fluteReverb.generate().then(() => {
        flute.chain(fluteReverb, delay, volume, destination);

        const intervalTimes = FLUTE_NOTES.map(() => Math.random() * 10 + 5);

        const shortestInterval = Math.min(...intervalTimes);

        FLUTE_NOTES.forEach((note, i) => {
          Tone.Transport.scheduleRepeat(
            () => flute.triggerAttack(note, '+1'),
            intervalTimes[i],
            intervalTimes[i] - shortestInterval
          );
        });
      });

      const reverb = new Tone.Freeverb({
        roomSize: 0.5,
        dampening: 5000,
        wet: 0.2,
      });
      const compressor = new Tone.Compressor();
      reverb.chain(compressor, volume, destination);

      const playRandomChord = lastChord => {
        const nextChords = guitarBuffers.filter(chord => chord !== lastChord);
        const randomChord =
          nextChords[Math.floor(Math.random() * nextChords.length)];
        const source = new Tone.BufferSource(randomChord).connect(reverb);
        source.onended = () => {
          source.dispose();
        };
        source.start('+1');
        Tone.Transport.scheduleOnce(() => {
          playRandomChord(randomChord);
        }, `+${Math.random() * 10 + 10}`);
      };

      Tone.Transport.scheduleOnce(() => {
        playRandomChord();
      }, Math.random() * 5 + 5);

      return () => {
        [
          flute,
          ...guitarBuffers,
          volumeLfo,
          fluteReverb,
          reverb,
          compressor,
        ].forEach(node => node.dispose());
      };
    });

export default makePiece;

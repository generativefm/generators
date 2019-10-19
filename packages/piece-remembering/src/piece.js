import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getSampler = samplesByNote =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(sampler),
    });
  });

const PITCH_CLASSES = ['C', 'D', 'E', 'G', 'A', 'C'];
const getPhrase = octave => {
  const notes = PITCH_CLASSES.map(pc => `${pc}${octave}`).concat([
    `${PITCH_CLASSES[0]}${octave + 1}`,
  ]);
  return Array.from({ length: 4 }).map(
    () => notes[Math.floor(Math.random() * notes.length)]
  );
};

const getPhrases = (octaves = [3, 4, 5, 6]) =>
  octaves.map(octave => getPhrase(octave));

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename).then(
    ({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      return getSampler(samples['vsco2-piano-mf'][preferredFormat]).then(
        piano => {
          const reverb = new Tone.Freeverb(0.5)
            .set({ wet: 0.5 })
            .connect(destination);
          piano.connect(reverb);

          const playPhrase = () => {
            const phrases = getPhrases();
            const divisor = Math.random() * 0.15 + 0.5;
            phrases.forEach(phrase =>
              phrase.forEach((note, i) => {
                if (Math.random() < 0.85) {
                  piano.triggerAttack(
                    note,
                    `+${i / divisor + Math.random() / 5 - 0.1}`
                  );
                }
              })
            );

            Tone.Transport.scheduleOnce(() => {
              playPhrase();
            }, `+${phrases[0].length / divisor + Math.random() * 5 + 3}`);
          };
          playPhrase();
          return () => {
            [piano, reverb].forEach(node => node.dispose());
          };
        }
      );
    }
  );

export default makePiece;

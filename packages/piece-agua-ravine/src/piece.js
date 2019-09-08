import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getSampler = samplesByNote =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(sampler),
    });
  });

const phrase1 = [
  ['G4', 'B4', 'E5'],
  ['F4', 'A4', 'D5'],
  ['E4', 'G4', 'C5'],
  ['D4', 'F4', 'B4'],
  ['C4', 'E4', 'A4'],
  ['B3', 'D4', 'G4'],
  ['A3', 'C4', 'F4'],
  ['G3', 'B3', 'E4'],
];
const phrase2 = [['C2'], ['C3'], ['G2']];
const phrase3 = [['C4'], ['G4'], ['C5'], ['C4', 'G4', 'B4']];
const phrase4 = [['C3'], ['G3'], ['C4'], ['F3'], ['E3']];
const phrase5 = [['C2'], ['A2'], ['C3']];
const phrase6 = [['D3'], ['G3'], ['D4'], ['A4'], ['C5']];
const phrase7 = [['D4', 'G4', 'C5'], ['C4', 'G4', 'C5']];

const phrases = [phrase1, phrase2, phrase3, phrase4, phrase5, phrase6, phrase7];

const vibeNotes = ['C3', 'C4', 'C5', 'G3', 'G4', 'G5'];

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
      return Promise.all([
        getSampler(samples['vsco2-piano-mf'][preferredFormat]),
        getSampler(samples['vcsl-vibraphone-soft-mallets-mp'][preferredFormat]),
        new Tone.Reverb(15)
          .set({ wet: 0.5 })
          .connect(destination)
          .generate(),
        new Tone.Reverb(30)
          .set({ wet: 0.8 })
          .connect(destination)
          .generate(),
      ]).then(([piano, vibes, pianoReverb, vibesReverb]) => {
        vibes.connect(vibesReverb);
        piano.connect(pianoReverb);
        const playPhrase = (
          phrase = phrases[Math.floor(Math.random() * phrases.length)]
        ) => {
          const noteTime = (Math.random() * 2 + 3) / phrase.length;
          (Math.random() < 0.25 ? phrase.slice(0).reverse() : phrase)
            .slice(0, Math.ceil(Math.random() * phrase.length - 1))
            .forEach((notes, i) => {
              notes.forEach(note => {
                piano.triggerAttack(
                  note,
                  `+${(1 + i + Math.random() / 20 - 0.025) * noteTime +
                    Math.random() / 10 -
                    0.05}`
                );
              });
            });

          Tone.Transport.scheduleOnce(() => {
            playPhrase();
          }, `+${Math.random() * 5 + 3}`);
        };
        playPhrase();

        const playVibes = () => {
          Tone.Transport.scheduleOnce(() => {
            //eslint-disable-next-line prefer-const
            let [vibeNote1, vibeNote2] = Array.from({ length: 2 }).map(
              () => vibeNotes[Math.floor(Math.random() * vibeNotes.length)]
            );
            do {
              vibeNote2 =
                vibeNotes[Math.floor(Math.random() * vibeNotes.length)];
            } while (vibeNote1 === vibeNote2);

            [vibeNote1, vibeNote2].forEach(note => {
              vibes.triggerAttack(note, `+${1 + Math.random() / 10 - 0.05}`);
            });
            playVibes();
          }, `+${Math.random() * 40 + 20}`);
        };
        playVibes();

        return () => {
          [piano, vibes, pianoReverb, vibesReverb].forEach(node =>
            node.dispose()
          );
        };
      });
    }
  );

export default makePiece;

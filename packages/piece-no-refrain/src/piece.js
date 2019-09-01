import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getSampler = samplesByNote =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      attack: 0.12,
      onload: () => resolve(sampler),
    });
  });

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
        new Tone.Reverb(5)
          .set({ wet: 0.5 })
          .connect(destination)
          .generate(),
      ]).then(([piano, reverb]) => {
        piano.connect(reverb);

        const rightHandPcs = ['C', 'D', 'E', 'G', 'B', 'C'];
        let rightHandOct = 4;
        const leftHand = () => {
          const time = Math.random() / 1.5 + 0.7;
          ['A2', 'C3', 'G3', 'G2', 'D3', 'G3'].forEach((note, i) => {
            piano.triggerAttack(
              note,
              `+${1 + i * time + Math.random() / 5 - 0.1}`
            );
            if (Math.random() < 0.8) {
              const rightHandPcIndex = Math.floor(
                Math.random() * rightHandPcs.length
              );
              const rightHandPc = rightHandPcs[rightHandPcIndex];
              const oct =
                rightHandPcIndex < rightHandPcs.length - 1
                  ? rightHandOct
                  : rightHandOct + 1;
              piano.triggerAttack(
                `${rightHandPc}${oct}`,
                `+${1 + i * time + Math.random() / 5 - 0.1}`
              );
            }
          });

          if (Math.random() < 0.1) {
            const rightHandPcIndex = Math.floor(
              Math.random() * rightHandPcs.length
            );
            const rightHandPc = rightHandPcs[rightHandPcIndex];
            const oct =
              rightHandPcIndex < rightHandPcs.length - 1
                ? rightHandOct
                : rightHandOct + 1;
            piano.triggerAttack(
              `${rightHandPc}${oct}`,
              `+${1 + 12 * time + Math.random() / 5 - 0.1}`
            );
          }

          if (rightHandOct === 4 && Math.random() < 0.05) {
            rightHandOct = 5;
          } else if (rightHandOct === 5 && Math.random() < 0.1) {
            rightHandOct = 4;
          }

          Tone.Transport.scheduleOnce(() => {
            leftHand();
          }, `+${time * 16 + Math.random() * 1.5}`);
        };

        leftHand();
      });
    }
  );

export default makePiece;

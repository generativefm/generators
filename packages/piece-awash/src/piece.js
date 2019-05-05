import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const NOTES = ['C3', 'D#3', 'G3', 'A#3', 'C4', 'D#4', 'G4', 'A#4'];

const getSampler = samplesByNote =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(sampler),
    });
  });

const getBuffers = samplesByNote =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(samplesByNote, {
      onload: () => resolve(buffers),
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

      const oceanDrumSamples = samples['vcsl-ocean-drum'][preferredFormat];
      const reverb = new Tone.Reverb(7).set({ wet: 1 }).connect(destination);

      return Promise.all([
        getSampler(samples['dry-guitar-vib'][preferredFormat]),
        getBuffers(oceanDrumSamples),
        reverb.generate(),
      ]).then(([guitar, oceanDrum]) => {
        guitar.set({ curve: 'linear', attack: 10, release: 15 });
        const delay1 = new Tone.FeedbackDelay({
          feedback: 0.7,
          delayTime: Math.random() * 0.2 + 0.8,
        }).connect(reverb);
        const delay2 = new Tone.FeedbackDelay({
          feedback: 0.5,
          delayTime: 0.25,
        }).connect(delay1);
        const autoFilter = new Tone.AutoFilter(Math.random() / 10, 200, 5)
          .start()
          .connect(delay2);
        const filter = new Tone.Filter(5000, 'notch', -12).connect(autoFilter);
        guitar.connect(filter);

        const disposableNodes = [
          guitar,
          oceanDrum,
          reverb,
          delay1,
          delay2,
          autoFilter,
          filter,
        ];

        NOTES.forEach(note => {
          const play = () => {
            guitar.triggerAttack(note, '+1');
            Tone.Transport.scheduleOnce(() => {
              play();
            }, `+${Math.random() * 25 + 25}`);
          };
          Tone.Transport.scheduleOnce(() => {
            play();
          }, `+${Math.random() * 25 + 10}`);
        });

        const firstOceanDelays = oceanDrumSamples.map(() => Math.random() * 30);
        const minOceanDelay = Math.min(...firstOceanDelays);
        oceanDrumSamples.forEach((_, i) => {
          const buffer = oceanDrum.get(i);
          const play = () => {
            buffer.reverse = Math.random() < 0.5;
            const source = new Tone.BufferSource(buffer)
              .set({
                fadeIn: 3,
                fadeOut: 3,
                curve: 'linear',
                playbackRate: 0.5,
                onended: () => {
                  const index = disposableNodes.findIndex(
                    node => node === source
                  );
                  if (index >= 0) {
                    disposableNodes.splice(i, 1);
                  }
                  source.dispose();
                },
              })
              .connect(reverb);
            disposableNodes.push(source);
            source.start('+1');
            Tone.Transport.scheduleOnce(() => {
              play();
            }, `+${Math.random() * buffer.duration * 2 + buffer.duration * 2 + 1}`);
          };
          Tone.Transport.scheduleOnce(() => {
            play();
          }, `+${firstOceanDelays[i] - minOceanDelay + 1}`);
        });

        return () => {
          disposableNodes.forEach(node => node.dispose());
        };
      });
    }
  );

export default makePiece;

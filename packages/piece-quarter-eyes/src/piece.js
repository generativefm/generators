import Tone from 'tone';
import { Chord } from 'tonal';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getStrings = samplesByNote =>
  new Promise(resolve => {
    const strings = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(strings),
    });
  });

const getPercussionInstrument = samples =>
  new Promise(resolve => {
    const percussionInstrument = buffers => {
      const sources = [];
      let destination;

      const triggerAttack = time => {
        const buffer = buffers.get(Math.floor(Math.random() * samples.length));
        const source = new Tone.BufferSource(buffer)
          .set({
            onended: () => {
              const i = sources.indexOf(source);
              if (i >= 0) {
                source.dispose();
                sources.splice(i, 1);
              }
            },
          })
          .connect(destination);
        sources.push(source);
        source.start(time);
      };

      const dispose = () => {
        sources.forEach(node => node.dispose());
        sources.splice(0, sources.length);
        buffers.dispose();
      };

      const connect = node => {
        destination = node;
      };

      return { triggerAttack, dispose, connect };
    };

    const buffers = new Tone.Buffers(samples, {
      onload: () => resolve(percussionInstrument(buffers)),
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
      Tone.context.latencyHint = 'interactive';
      return Promise.all([
        new Tone.Reverb({ decay: 15, wet: 0.5 }).generate(),
        getStrings(samples['vsco2-cellos-susvib-mp'][preferredFormat]),
        ...[
          'vcsl-bassdrum-hit-f',
          'vcsl-bassdrum-hit-ff',
          'vcsl-sleighbells',
          'vcsl-finger-cymbals',
          'vcsl-tom',
        ].map(instrumentName =>
          getPercussionInstrument(samples[instrumentName][preferredFormat])
        ),
      ]).then(
        ([
          reverb,
          strings,
          bassdrum1,
          bassdrum2,
          sleighbells,
          fingerCymbals,
          tom,
        ]) => {
          reverb.connect(destination);
          strings.connect(reverb);
          bassdrum1.connect(reverb);
          bassdrum2.connect(reverb);
          sleighbells.connect(reverb);
          fingerCymbals.connect(reverb);
          const tomVol = new Tone.Volume(-10).connect(reverb);
          tom.connect(tomVol);
          const chord = Chord.notes('C1', 'm7');
          const measureLength = Math.random() + 5;
          let p = 1;
          let pDelta = 0.02;
          let didStringsPlayPreviously = false;
          const play = () => {
            bassdrum1.triggerAttack(`+${1 + Math.random() / 100}`);
            bassdrum2.triggerAttack(`+${1 + Math.random() / 100}`);

            if (Math.random() < p) {
              sleighbells.triggerAttack(`+${1 + measureLength / 2}`);
            } else {
              fingerCymbals.triggerAttack(`+${1 + measureLength / 2}`);
            }

            for (let i = 0; i < measureLength; i += measureLength / 16) {
              if (Math.random() < 1 - p) {
                tom.triggerAttack(`+${1 + i + Math.random() / 100}`);
                if (Math.random() < (1 - p) / 2) {
                  tom.triggerAttack(
                    `+${1 + i + Math.random() / 100 + measureLength / 32}`
                  );
                }
              }
            }

            if (Math.random() < (1 - p) / 10) {
              bassdrum1.triggerAttack(
                `+${1 +
                  Math.random() / 100 +
                  measureLength -
                  measureLength / 8}`
              );
              bassdrum2.triggerAttack(
                `+${1 +
                  Math.random() / 100 +
                  measureLength -
                  measureLength / 8}`
              );
            }

            let didPlayStrings = false;
            if (Math.random() < (1 - p) / 1.25 && !didStringsPlayPreviously) {
              const note = chord[Math.floor(Math.random() * chord.length)];
              strings.triggerAttack(note, `+1`);
              didPlayStrings = true;
            }

            didStringsPlayPreviously = didPlayStrings;

            if (p < 0.5 || p >= 1) {
              pDelta = -pDelta;
            }

            p = p + pDelta;

            Tone.Transport.scheduleOnce(() => {
              play();
            }, `+${measureLength}`);
          };

          play();
          return () => {
            [
              reverb,
              strings,
              bassdrum1,
              bassdrum2,
              sleighbells,
              fingerCymbals,
              tom,
            ].forEach(node => node.dispose());
            Tone.context.latencyHint = 'balanced';
          };
        }
      );
    }
  );

export default makePiece;

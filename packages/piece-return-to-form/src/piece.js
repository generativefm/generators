import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';
import { Distance, Note } from 'tonal';

const INTERVALS = ['1P', '3M', '4P', '5P'];
const STARTING_TONICS = ['C3', 'C4'];
const NOTE_TIME_S = 2;

const getSampledInstrument = samplesByNote =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      onload: () => resolve(sampler),
    });
  });

// https://stackoverflow.com/a/2450976
const shuffle = array => {
  let currentIndex = array.length;
  let temporaryValue;
  let randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};

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
      return getSampledInstrument(
        samples['vsco2-piano-mf'][preferredFormat]
      ).then(piano => {
        const delay = new Tone.FeedbackDelay({
          delayTime: NOTE_TIME_S / 2,
          feedback: 0.7,
          wet: 0.3,
        }).connect(destination);
        const reverb = new Tone.Freeverb({ roomSize: 0.5 }).connect(delay);
        piano.connect(reverb);
        let tonics = STARTING_TONICS;

        const play = () => {
          if (Math.random() < 0.2 || false) {
            const up =
              (tonics.some(tonic => Note.oct(tonic) <= 2) ||
                Math.random() < 0.5) &&
              !tonics.some(tonic => Note.oct(tonic) >= 5);
            const change = Math.random() < 0.5 ? '5P' : '3M';
            tonics = tonics.map(tonic =>
              Distance.transpose(tonic, `${up ? '' : '-'}${change}`)
            );
          }
          shuffle(
            tonics.reduce(
              (notes, tonic) =>
                notes.concat(
                  INTERVALS.map(interval =>
                    Note.simplify(Distance.transpose(tonic, interval), false)
                  )
                ),
              []
            )
          )
            .slice(0, 5)
            .forEach((note, i) => {
              for (let j = 0; j < 4; j += 1) {
                piano.triggerAttack(
                  note,
                  `+${i * NOTE_TIME_S + j * 8 * NOTE_TIME_S}`
                );
              }
            });
          Tone.Transport.scheduleOnce(() => {
            play();
          }, `+${32 * NOTE_TIME_S}`);
        };

        play();

        return () => {
          [piano, delay, reverb].forEach(node => {
            node.dispose();
          });
        };
      });
    }
  );

export default makePiece;

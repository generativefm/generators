import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';
import { Distance, Note } from 'tonal';
import findClosestSample from './find-closest-sample';
import getBuffers from './get-buffers';
import uniquePitchClasses from './unique-pitch-classes';
import getRandomPitchClasses from './get-random-pitch-classes';
import getSampler from './get-sampler';
import pickRandom from './pick-random';

const DRONE_OCTAVES = [4, 5];
const PIANO_OCTAVES = [4, 5, 6];
const GUITAR_OCTAVES = [2, 3];

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
      const droneSamples = samples['vsco2-violins-susvib'][preferredFormat];

      return Promise.all([
        getBuffers(droneSamples),
        getSampler(samples['vsco2-piano-mf'][preferredFormat]),
        getSampler(samples['acoustic-guitar'][preferredFormat], {
          attack: 3,
          curve: 'linear',
        }),
        new Tone.Reverb(15)
          .set({ wet: 0.9 })
          .connect(destination)
          .generate(),
      ]).then(([droneBuffers, pianoSampler, guitarSampler, reverb]) => {
        const filter = new Tone.Filter(Math.random() * 300 + 300).connect(
          reverb
        );
        pianoSampler.connect(reverb);
        guitarSampler.connect(reverb);
        const activeSources = [];
        const makeDrone = note => {
          const closestSampledNote = findClosestSample(droneSamples, note);
          const difference = Distance.semitones(closestSampledNote, note);
          const playbackRate = Tone.intervalToFrequencyRatio(difference - 24);
          const buffer = droneBuffers.get(closestSampledNote);
          const volume = new Tone.Volume(-100);
          const play = () => {
            const source = new Tone.BufferSource(buffer)
              .set({
                playbackRate,
                fadeIn: 2,
                fadeOut: 2,
                curve: 'linear',
                onended: () => {
                  const i = activeSources.indexOf(source);
                  if (i >= 0) {
                    activeSources.splice(i, 1);
                  }
                },
              })
              .connect(volume);
            activeSources.push(source);
            source.start('+1');
            Tone.Transport.scheduleOnce(() => {
              play();
            }, `+${buffer.duration / playbackRate - 4 - Math.random()}`);
          };
          play();
          return volume;
        };

        const dronesByNote = uniquePitchClasses
          .reduce(
            (notes, pc) =>
              notes.concat(DRONE_OCTAVES.map(oct => `${pc}${oct}`)),
            []
          )
          .reduce((dronesHash, note) => {
            dronesHash[note] = makeDrone(note).connect(filter);
            return dronesHash;
          }, {});

        const playChord = (pitchClasses = getRandomPitchClasses()) => {
          const time = Math.random() * 30 + 30;
          const notes = pitchClasses
            .reduce(
              (withOctaves, pc) =>
                withOctaves.concat(DRONE_OCTAVES.map(oct => `${pc}${oct}`)),
              []
            )
            .filter(() => Math.random() < (11 - pitchClasses.length) / 10)
            .reduce(
              (noYuckyIntervals, note) =>
                noYuckyIntervals.every(otherNote => {
                  const distance = Math.abs(
                    Distance.semitones(note, otherNote)
                  );
                  return distance !== 6 && distance !== 1;
                })
                  ? noYuckyIntervals.concat([note])
                  : noYuckyIntervals,
              []
            );
          notes.forEach(note => {
            dronesByNote[note].volume.linearRampToValueAtTime(
              0,
              `+${time / 2}`
            );
          });
          const playedPitchClasses = Array.from(
            new Set(notes.map(note => Note.pc(note)))
          );
          const nextPitchClasses = getRandomPitchClasses(
            playedPitchClasses.filter(() => Math.random() < 0.5)
          );
          const notesToMute = notes.filter(
            note => !nextPitchClasses.includes(Note.pc(note))
          );
          Tone.Transport.scheduleOnce(() => {
            notesToMute.forEach(note => {
              dronesByNote[note].volume.linearRampToValueAtTime(
                -100,
                `+${time / 2}`
              );
            });
            if (Math.random() < 0.75) {
              let primarySampler;
              let primaryOctaves;
              let secondarySampler;
              let secondaryOctaves;
              if (Math.random() < 0.5) {
                primarySampler = pianoSampler;
                primaryOctaves = PIANO_OCTAVES;
                secondarySampler = guitarSampler;
                secondaryOctaves = GUITAR_OCTAVES;
              } else {
                primarySampler = guitarSampler;
                primaryOctaves = GUITAR_OCTAVES;
                secondarySampler = pianoSampler;
                secondaryOctaves = PIANO_OCTAVES;
              }
              const firstPc = Note.pc(pickRandom(notes));
              const noteTime = 1 + Math.random();
              primarySampler.triggerAttack(
                `${firstPc}${pickRandom(primaryOctaves)}`,
                `+${noteTime}`
              );
              if (Math.random() < 0.5) {
                secondarySampler.triggerAttack(
                  `${firstPc}${pickRandom(secondaryOctaves)}`,
                  `+${noteTime * 3}`
                );
              }
              if (Math.random() < 0.5) {
                const otherNoteTime = 3 + Math.random() * 2;
                const secondPc = Note.pc(
                  pickRandom(pitchClasses.filter(pc => pc !== firstPc))
                );
                primarySampler.triggerAttack(
                  `${secondPc}${pickRandom(primaryOctaves)}`,
                  `+${otherNoteTime}`
                );

                if (Math.random() < 0.5) {
                  secondarySampler.triggerAttack(
                    `${secondPc}${pickRandom(secondaryOctaves)}`,
                    `+${otherNoteTime * 3}`
                  );
                }
              }
            }
            Tone.Transport.scheduleOnce(() => {
              playChord(nextPitchClasses);
            }, `+${time / 4}`);
          }, `+${time / 2}`);
        };

        const changeFilterFrequency = () => {
          const time = Math.random() * 30 + 30;
          const frequency = Math.random() * 300 + 300;
          filter.frequency.linearRampToValueAtTime(frequency, `+${time}`);
          Tone.Transport.scheduleOnce(() => {
            changeFilterFrequency();
          }, `+${time}`);
        };

        playChord();
        changeFilterFrequency();

        Tone.Transport.start();

        return () =>
          [
            droneBuffers,
            pianoSampler,
            guitarSampler,
            reverb,
            filter,
            ...activeSources,
            ...Object.values(dronesByNote),
          ].forEach(node => node.dispose());
      });
    }
  );

export default makePiece;

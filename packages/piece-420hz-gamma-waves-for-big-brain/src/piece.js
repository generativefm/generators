import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const pitchShiftSampler = (samplesByNote, destination, semitoneChange = 0) =>
  new Promise(resolve => {
    const midiNoteMap = new Map(
      Reflect.ownKeys(samplesByNote).map(note => [
        new Tone.Midi(note).toMidi(),
        note,
      ])
    );
    const activeSources = [];
    const buffers = new Tone.Buffers(samplesByNote, {
      onload: () => {
        resolve({
          play(note, time) {
            const midi = new Tone.Midi(note);
            let buffer;
            let interval;
            for (let i = 0; !buffer && i < 24; i += 1) {
              //eslint-disable-next-line no-loop-func
              [i, -i].some(transposition => {
                const transposedMidi = midi.transpose(transposition);
                if (midiNoteMap.has(transposedMidi.toMidi())) {
                  buffer = buffers.get(transposedMidi.toNote());
                  interval = -transposition;
                  return true;
                }
                return false;
              });
            }
            if (buffer) {
              const playbackRate = Tone.intervalToFrequencyRatio(
                interval + semitoneChange
              );
              const source = new Tone.BufferSource(buffer).set({
                playbackRate,
                onended: () => {
                  const i = activeSources.indexOf(buffer);
                  if (i >= 0) {
                    activeSources.splice(i, 1);
                  }
                },
              });
              source.connect(destination);
              source.start(time);
            }
          },
          dispose: () => {
            [buffers, ...activeSources].forEach(node => node.dispose());
            activeSources.splice(0, activeSources.length);
          },
        });
      },
    });
  });

const getBuffer = url =>
  new Promise(resolve => {
    const buffer = new Tone.Buffer(url, () => {
      resolve(buffer);
    });
  });

const getRandomPhase = () => Math.random() * 360;
const getOppositePhase = phase => (phase >= 180 ? phase - 180 : phase + 180);

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
      const stereoWidener = new Tone.StereoWidener().connect(destination);
      const wavesVol = new Tone.Volume().connect(stereoWidener);
      const dronesVol = new Tone.Volume().connect(stereoWidener);
      const volLfoFreq = Math.random() / 10000 + 0.0001;
      const wavesVolPhase = getRandomPhase();
      const wavesVolLfo = new Tone.LFO(volLfoFreq, -100, -10).set({
        phase: wavesVolPhase,
      });
      const dronesVolLfo = new Tone.LFO(volLfoFreq, -100, 0).set({
        phase: getOppositePhase(wavesVolPhase),
      });
      wavesVolLfo.start();
      dronesVolLfo.start();
      wavesVolLfo.connect(wavesVol.volume);
      dronesVolLfo.connect(dronesVol.volume);

      const stereoLfo = new Tone.LFO(Math.random() / 100 + 0.01, 0.5, 1);
      stereoLfo.connect(stereoWidener.width);
      stereoLfo.start();
      const autoLowPass = new Tone.AutoFilter(
        Math.random() / 100 + 0.01,
        100,
        1
      )
        .set({ filter: { rolloff: -96 } })
        .connect(dronesVol);
      autoLowPass.start();
      const chords = [
        ['G3', 'C4', 'E4'],
        ['E4', 'A4', 'C5'],
        ['D4', 'G4', 'B4'],
        ['C4', 'F4', 'G4'],
      ];

      const pianoVolLfo = new Tone.LFO(
        Math.random() / 10000 + 0.0001,
        -100,
        0
      ).set({
        phase: getRandomPhase(),
      });
      const pianoVol = new Tone.Volume().connect(destination);
      pianoVolLfo.connect(pianoVol.volume);
      pianoVolLfo.start();
      return Promise.all([
        getBuffer(samples.waves[preferredFormat][0]),
        pitchShiftSampler(
          samples['vsco2-piano-mf'][preferredFormat],
          pianoVol,
          -24
        ),
        ...chords.map(chord => {
          const volume = new Tone.Volume(-100).connect(autoLowPass);
          return pitchShiftSampler(
            samples['sso-chorus-male'][preferredFormat],
            volume,
            -24
          ).then(sampler => [chord, volume, sampler]);
        }),
      ]).then(([waveBuffer, pitchShiftPiano, ...droneStacks]) => {
        const loopWaves = () => {
          const playbackRate = 0.5;
          const source = new Tone.BufferSource(waveBuffer)
            .set({ fadeIn: 5, fadeOut: 5, curve: 'linear', playbackRate })
            .connect(wavesVol);
          source.start('+1', 0, waveBuffer.duration / playbackRate - 5);

          Tone.Transport.scheduleOnce(() => {
            loopWaves();
          }, `+${waveBuffer.duration / playbackRate - 5}`);
        };

        loopWaves();

        const drone = (chorus, note, min, max) => {
          chorus.play(note, '+1');

          Tone.Transport.scheduleOnce(() => {
            drone(chorus, note, min, max);
          }, `+${Math.random() * (max - min) + min}`);
        };
        // eslint-disable-next-line no-unused-vars
        droneStacks.forEach(([chord, volume, sampler]) => {
          chord.forEach(note => {
            drone(sampler, note, 20, 10);
          });
        });

        let unmutedDroneVolume =
          droneStacks[Math.floor(Math.random() * droneStacks.length)][1];
        unmutedDroneVolume.volume.value = -10;

        const changeChord = () => {
          const transitionTime = Math.ceil(Math.random() * 10 + 10);
          const mutedDroneStacks = droneStacks.filter(
            // eslint-disable-next-line no-unused-vars
            ([chord, volume]) => volume !== unmutedDroneVolume
          );
          const nextUnmutedDroneStack =
            mutedDroneStacks[
              Math.floor(Math.random() * mutedDroneStacks.length)
            ];
          unmutedDroneVolume.volume.linearRampToValueAtTime(
            -100,
            `+${transitionTime}`
          );
          unmutedDroneVolume = nextUnmutedDroneStack[1];
          unmutedDroneVolume.volume.value = -100;
          unmutedDroneVolume.volume.linearRampToValueAtTime(
            -10,
            `+${transitionTime}`
          );

          const nextChordChangeDelay = Math.random() * 10 + 10;

          const [unmutedDroneChord] = nextUnmutedDroneStack;

          const date = new Date();
          const minutes = date.getMinutes();
          const hours = date.getHours();
          const playChance = (minutes / 60) % 1;
          const octaveChange = hours <= 6 || hours >= 18 ? 2 : 1;
          unmutedDroneChord
            .filter(() => Math.random() < playChance)
            .forEach(note => {
              const noteTime =
                Math.random() * (nextChordChangeDelay + transitionTime / 2) +
                transitionTime / 2;
              const [pc, octStr] = note;
              const oct = Number.parseInt(octStr, 10);
              pitchShiftPiano.play(
                `${pc}${oct + octaveChange}`,
                `+${noteTime}`
              );
            });

          Tone.Transport.scheduleOnce(() => {
            changeChord();
          }, `+${transitionTime + nextChordChangeDelay}`);
        };

        Tone.Transport.scheduleOnce(() => {
          changeChord();
        }, `+${Math.random() * 10 + 10}`);

        Tone.Transport.start();

        return () => {
          [
            stereoWidener,
            wavesVol,
            dronesVol,
            wavesVolLfo,
            dronesVolLfo,
            stereoLfo,
            autoLowPass,
            pianoVolLfo,
            pianoVol,
            waveBuffer,
            pitchShiftPiano,
            ...droneStacks.reduce(
              // eslint-disable-next-line no-unused-vars
              (disposableNodes, [chord, volume, sampler]) =>
                disposableNodes.concat([volume, sampler]),
              []
            ),
          ].forEach(node => node.dispose());
        };
      });
    }
  );

export default makePiece;

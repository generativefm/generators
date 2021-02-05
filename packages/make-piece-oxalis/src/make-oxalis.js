import * as Tone from 'tone';
import {
  createPrerenderableSampler,
  wrapActivate,
  getPitchClass,
  getOctave,
} from '@generative-music/utilities';

const getReverb = () =>
  new Tone.Reverb(15)
    .set({ wet: 0.5 })
    .toDestination()
    .generate();

const makeOxalis = ({ notes = [], renderedInstrumentPrefix = '' }) => {
  const renderedPianoName = `${renderedInstrumentPrefix}__vsco2-piano-mf`;
  const renderedGlockName = `${renderedInstrumentPrefix}__vsco2-glock`;
  const activate = async ({ sampleLibrary, onProgress }) => {
    const samples = await sampleLibrary.request(Tone.context, [
      [renderedPianoName, 'vsco2-piano-mf'],
      [renderedGlockName, 'vsco2-glock'],
    ]);
    const piano = await createPrerenderableSampler({
      samples,
      sampleLibrary,
      notes,
      sourceInstrumentName: 'vsco2-piano-mf',
      renderedInstrumentName: renderedPianoName,
      getDestination: getReverb,
      onProgress: val => onProgress(val / 2),
    });

    const glock = await createPrerenderableSampler({
      samples,
      sampleLibrary,
      notes: notes.slice(1).map(note => {
        const pc = getPitchClass(note);
        const oct = getOctave(note);
        return `${pc}${oct + 1}`;
      }),
      sourceInstrumentName: 'vsco2-glock',
      renderedInstrumentName: renderedGlockName,
      getDestination: getReverb,
      onProgress: val => onProgress((val + 1) / 2),
    });
    const glockVol = new Tone.Volume(-15);

    const schedule = ({ destination }) => {
      const delay = new Tone.FeedbackDelay({
        delayTime: 5,
        maxDelay: 5,
        feedback: 0.5,
      }).connect(destination);
      const first = Math.floor(window.generativeMusic.rng() * notes.length);
      glockVol.connect(delay);
      glock.connect(glockVol);
      piano.connect(delay);
      notes.forEach((note, i) => {
        let initialized = false;
        const play = () => {
          const isFirst = i === first;
          if (isFirst) {
            piano.triggerAttack(note, '+1');
          }
          Tone.Transport.scheduleOnce(() => {
            piano.triggerAttack(note, '+1');
            if (window.generativeMusic.rng() < 0.05) {
              const pc = note.slice(0, note.length - 1);
              const oct = Number.parseInt(note.slice(-1), 10);
              glock.triggerAttack(`${pc}${Math.max(oct + 1, 5)}`, '+1');
            }
            play();
          }, `+${window.generativeMusic.rng() * 15 + (initialized || isFirst ? 15 : 0) * (i === 0 ? 3 : 1)}`);
          initialized = true;
        };
        play();
      });

      return () => {
        piano.releaseAll(0);
        glock.releaseAll(0);
        delay.dispose();
      };
    };

    const deactivate = () => {
      [piano, glock].forEach(node => node.dispose());
    };

    return [deactivate, schedule];
  };

  return wrapActivate(activate);
};

export default makeOxalis;

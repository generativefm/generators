import Tone from 'tone';

const getSampler = (samplesByNote, baseUrl = '') =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(samplesByNote, {
      baseUrl,
      onload: () => resolve(sampler),
      attack: 2,
      release: 2,
      curve: 'linear',
    });
  });

const randomIntBetween = (min, max) =>
  Math.floor(min + Math.random() * (max - min));

const scale = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'];

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getSampler(samples['vcsl-tenor-sax-vib']),
    new Tone.Reverb(20).set({ wet: 0.9 }).generate(),
  ]).then(([sax, reverb]) => {
    const autoFilter = new Tone.AutoFilter(
      Math.random() / 100,
      1500,
      2
    ).connect(destination);
    autoFilter.start();
    reverb.connect(autoFilter);
    const delay = new Tone.FeedbackDelay(0.5, 0.85).connect(reverb);
    sax.connect(delay);
    reverb.generate();
    const playNote = (note, time = 0) => {
      sax.triggerAttack(note, `+${1 + time}`);
    };

    const getMelody = () => {
      const melody = [];
      const length = Math.random() < 0.9 ? 4 : 3;
      let currentIndex =
        Math.random() < 0.5
          ? randomIntBetween(3, scale.length)
          : scale.length - 1;
      for (let i = 0; i < length; i += 1) {
        melody.push(scale[currentIndex]);
        if (i === 0) {
          currentIndex = randomIntBetween(1, currentIndex - 1);
        } else if (i === 1) {
          currentIndex = randomIntBetween(
            currentIndex + 1,
            scale.indexOf(melody[0])
          );
        } else if (i === 2) {
          currentIndex = randomIntBetween(0, scale.indexOf(melody[1]));
        }
      }
      return melody;
    };

    const playMelody = () => {
      const melody = getMelody();
      const baseTime = Math.random() * 2 + 1;
      melody.forEach((note, i) => {
        playNote(note, i >= 2 ? i * baseTime + baseTime : i * baseTime);
      });

      playNote(`${melody[melody.length - 1].charAt(0)}${1}`);

      Tone.Transport.scheduleOnce(
        () => playMelody(),
        `+${baseTime * 8 + Math.random()}`
      );
    };

    playMelody();

    return () => {
      [sax, reverb, autoFilter, delay].forEach(node => node.dispose());
    };
  });
};

export default makePiece;

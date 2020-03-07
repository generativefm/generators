import Tone from 'tone';
import { getBuffers, getSampler } from '@generative-music/utilities';

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  return Promise.all([
    getBuffers(samples['sso-chorus-female']),
    getSampler(samples['vsco2-trumpet-sus-mf'], {
      attack: 5,
      curve: 'linear',
    }),
    new Tone.Reverb(15).generate(),
  ]).then(([chorus, trumpet, reverb]) => {
    const compressor = new Tone.Compressor().connect(destination);
    trumpet.connect(reverb);
    reverb.connect(compressor);
    const autoFilter = new Tone.AutoFilter(Math.random() / 100 + 0.01, 100, 4);
    autoFilter.connect(reverb);
    autoFilter.start();
    const playbackRate = 0.25;
    const vol = new Tone.Volume(-10);
    vol.connect(autoFilter);
    const activeSources = [];
    const play = notes => {
      const note = notes[Math.floor(Math.random() * notes.length)];
      const buf = chorus.get(note);
      const source = new Tone.BufferSource(buf)
        .set({
          playbackRate,
          fadeIn: 4,
          fadeOut: 4,
          curve: 'linear',
          onended: () => {
            const i = activeSources.indexOf(source);
            if (i > -1) {
              activeSources.splice(i, 1);
            }
          },
        })
        .connect(vol);
      source.start('+1', 0, buf.duration / playbackRate);
      activeSources.push(source);

      if (Math.random() < 0.15) {
        const [pc] = note;
        trumpet.triggerAttack(`${pc}3`, `${1 + Math.random() * 5}`);
      }

      Tone.Transport.scheduleOnce(() => {
        play(notes);
      }, `+${buf.duration / playbackRate - 4 + Math.random() * 5 - 2.5}`);
    };

    play(['C5']);
    play(['A5', 'G5', 'F5', 'D5', 'E5']);
    play(['C6']);

    return () => {
      [chorus, trumpet, reverb, autoFilter, vol].forEach(node =>
        node.dispose()
      );
    };
  });
};

export default makePiece;

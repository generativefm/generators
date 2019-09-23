import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getBuffers = (samplesByNote, opts = {}) =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(
      samplesByNote,
      Object.assign({}, opts, { onload: () => resolve(buffers) })
    );
  });

const getSampler = (samplesByNote, opts) =>
  new Promise(resolve => {
    const sampler = new Tone.Sampler(
      samplesByNote,
      Object.assign(
        {
          onload: () => resolve(sampler),
        },
        opts
      )
    );
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
        getBuffers(samples['sso-chorus-female'][preferredFormat]),
        getSampler(samples['vsco2-trumpet-sus-mf'][preferredFormat], {
          attack: 5,
          curve: 'linear',
        }),
        new Tone.Reverb(15).generate(),
      ]).then(([chorus, trumpet, reverb]) => {
        const compressor = new Tone.Compressor().connect(destination);
        trumpet.connect(reverb);
        reverb.connect(compressor);
        const autoFilter = new Tone.AutoFilter(
          Math.random() / 100 + 0.01,
          100,
          4
        );
        autoFilter.connect(reverb);
        autoFilter.start();
        const playbackRate = 0.25;
        const vol = new Tone.Volume(-10);
        vol.connect(autoFilter);
        const play = notes => {
          const note = notes[Math.floor(Math.random() * notes.length)];
          const buf = chorus.get(note);
          const source = new Tone.BufferSource(buf)
            .set({ playbackRate, fadeIn: 4, fadeOut: 4, curve: 'linear' })
            .connect(vol);
          source.start('+1', 0, buf.duration / playbackRate);

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
    }
  );

export default makePiece;

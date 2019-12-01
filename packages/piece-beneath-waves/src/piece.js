import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const getBuffers = (samplesByNote, opts = {}) =>
  new Promise(resolve => {
    const buffers = new Tone.Buffers(
      samplesByNote,
      Object.assign({}, opts, { onload: () => resolve(buffers) })
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
        getBuffers(samples['sso-cor-anglais'][preferredFormat]),
        new Tone.Reverb(15).generate(),
      ]).then(([chorus, corAnglais, reverb]) => {
        const compressor = new Tone.Compressor().connect(destination);
        const synthVol = new Tone.Volume().connect(compressor);

        const synthVolumeLfo = new Tone.LFO(
          Math.random() / 100 + 0.01,
          -30,
          -5
        ).set({
          phase: 90,
        });
        synthVolumeLfo.connect(synthVol.volume);
        synthVolumeLfo.start();

        const delay = new Tone.FeedbackDelay(2, 0.7).connect(synthVol);
        const lPan = new Tone.Panner(-1).connect(delay);
        const rPan = new Tone.Panner(1).connect(delay);
        const lSynth = new Tone.Synth({
          oscillator: { type: 'sine' },
        }).connect(lPan);
        const rSynth = new Tone.Synth({
          oscillator: { type: 'sine' },
        }).connect(rPan);

        const sub = () => {
          lSynth.triggerAttackRelease(38, 0.5, '+1');
          rSynth.triggerAttackRelease(38, 0.5, '+1.5');

          Tone.Transport.scheduleOnce(() => {
            sub();
          }, '+8');
        };

        sub();

        reverb.connect(compressor);
        const autoFilter = new Tone.AutoFilter(
          Math.random() / 100 + 0.01,
          75,
          6
        );
        autoFilter.connect(reverb);
        autoFilter.start();
        const playbackRate = 0.15;
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

          Tone.Transport.scheduleOnce(() => {
            play(notes);
          }, `+${buf.duration / playbackRate - (1 + Math.random() * 5)}`);
        };

        const playCorAnglais = () => {
          const note = `F${Math.floor(Math.random() * 2) + 3}`;
          const buf = corAnglais.get(note);
          const source = new Tone.BufferSource(buf)
            .set({
              playbackRate: 0.15,
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
          source.start('+1');
          activeSources.push(source);

          Tone.Transport.scheduleOnce(() => {
            playCorAnglais();
          }, `+${buf.duration * 10 + Math.random() * buf.duration * 10}`);
        };

        Tone.Transport.scheduleOnce(() => {
          playCorAnglais();
        }, `+${Math.random() * 60}`);

        play(['C5']);
        play(['C6']);

        return () => {
          [chorus, reverb, autoFilter, vol, ...activeSources].forEach(node =>
            node.dispose()
          );
        };
      });
    }
  );

export default makePiece;

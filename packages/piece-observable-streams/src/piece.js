import * as Tone from 'tone';
import { Scale, Note, Chord } from 'tonal';
import { of, from, Observable } from 'rxjs';
import { repeat, mergeMap } from 'rxjs/operators';
import {
  createPrerenderedSampler,
  wrapActivate,
  toss,
} from '@generative-music/utilities';
import { sampleNames } from '../observable-streams.gfm.manifest.json';
import octaved from './operators/octaved';
import shortTermThrottleByNote from './operators/short-term-throttle-by-note';

const TONIC = 'C';
const SCALE = 'major';
const NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
const COR_ANGALAIS_NOTES = toss(['C', 'E', 'G'], [4, 5]);

const CHORDS_BY_NOTE = Scale.chords(SCALE)
  .filter(name => name !== '5' && name !== '64')
  .reduce(
    (chords, name) => chords.concat([Chord.notes(`${TONIC}4${name}`)]),
    []
  )
  .reduce((map, chord) => {
    chord.forEach(note => {
      if (map.has(note)) {
        map.set(note, map.get(note).concat([chord]));
      } else {
        map.set(note, [chord]);
      }
    });
    return map;
  }, new Map());

const minDelay = 700;

const getDelayTimeInMS = () => Math.random() * 10000 + minDelay;

const scheduledNote = (noteArg, timeArg) =>
  Observable.create(observer => {
    let note = noteArg;
    let time = timeArg;
    if (typeof note === 'undefined') {
      note = NOTES[Math.floor(Math.random() * NOTES.length)];
    }
    if (typeof time === 'undefined') {
      time = getDelayTimeInMS() / 1000;
    }
    Tone.Transport.scheduleOnce(() => {
      observer.next(note);
      observer.complete();
    }, `+${time}`);
  });

const humanize = () => source =>
  source.pipe(mergeMap(note => scheduledNote(note, Math.random() / 10)));

const delayed = () => source =>
  source.pipe(
    mergeMap(note => {
      if (Math.random() < 0.2) {
        return scheduledNote(note);
      }
      return of(note);
    })
  );

const chord = p => source =>
  source.pipe(
    mergeMap(note => {
      if (CHORDS_BY_NOTE.has(note) && Math.random() < p) {
        const chordsWithNote = CHORDS_BY_NOTE.get(note);
        return from(
          chordsWithNote[Math.floor(Math.random() * chordsWithNote.length)]
        );
      }
      return of(note);
    })
  );

const renderedPitchClassSet = new Set(['C', 'E', 'G', 'B']);
const renderedPianoNotes = Array.from(
  new Set(
    Array.from(CHORDS_BY_NOTE)
      .map(([, chords]) => chords)
      .flat(2)
      .concat(NOTES)
      .concat(
        NOTES.map(note =>
          [1, -1, -2].map(octChange => {
            const pc = Note.pc(note);
            const oct = Note.oct(note) + octChange;
            return `${pc}${oct}`;
          })
        ).flat()
      )
  )
).filter(note => renderedPitchClassSet.has(note[0]));

const renderedViolinNotes = renderedPianoNotes.filter(([, oct]) => oct > 3);

const notes$ = scheduledNote().pipe(
  repeat(),
  octaved({ p: 0.2, octaveChange: 1, notes: NOTES }),
  octaved({ p: 0.2, octaveChange: -1, notes: NOTES }),
  octaved({ p: 0.4, octaveChange: -2, notes: NOTES }),
  delayed(),
  shortTermThrottleByNote(3),
  chord(0.2),
  humanize()
);

const activate = async ({ destination, sampleLibrary, onProgress }) => {
  const samples = await sampleLibrary.request(Tone.context, sampleNames);
  const violinVol = new Tone.Volume(-15);
  const corAnglaisVol = new Tone.Volume(-40);

  const piano = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    notes: renderedPianoNotes,
    sourceInstrumentName: 'vsco2-piano-mf',
    renderedInstrumentName: 'observable-streams::vsco2-piano-mf',
    additionalRenderLength: 3,
    getDestination: () =>
      Promise.resolve(
        new Tone.Freeverb({ roomSize: 0.5, wet: 0.6 }).toDestination()
      ),
    onProgress: val => onProgress(val * 0.33),
  });

  const violin = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    notes: renderedViolinNotes,
    sourceInstrumentName: 'vsco2-violin-arcvib',
    renderedInstrumentName: 'observable-streams::vsco2-violin-arcvib',
    additionalRenderLength: 0,
    getDestination: () =>
      Promise.resolve(
        new Tone.Freeverb({ roomSize: 0.9, wet: 1 }).toDestination()
      ),
    onProgress: val => onProgress(0.33 + val * 0.33),
    bufferSourceOptions: {
      fadeOut: 4,
      curve: 'linear',
    },
  });

  const corAnglais = await createPrerenderedSampler({
    samples,
    sampleLibrary,
    notes: COR_ANGALAIS_NOTES,
    sourceInstrumentName: 'sso-cor-anglais',
    renderedInstrumentName: 'observable-streams::sso-cor-anglais',
    additionalRenderLength: 3,
    getDestination: () =>
      Promise.resolve(
        new Tone.Freeverb({ roomSize: 0.9, wet: 1 }).toDestination()
      ),
    onProgress: val => onProgress(0.66 + val * 0.33),
  });

  piano.connect(destination);
  violin.connect(violinVol);
  corAnglais.connect(corAnglaisVol);

  const schedule = () => {
    const violinDelay = new Tone.FeedbackDelay({
      feedback: 0.75,
      delayTime: 0.08,
      wet: 0.5,
    });

    const corAnglaisDelay1 = new Tone.FeedbackDelay({
      feedback: 0.75,
      delayTime: 0.5,
      wet: 0.5,
    });
    const corAnglaisDelay2 = new Tone.FeedbackDelay({
      feedback: 0.7,
      delayTime: 5,
      maxDelay: 5,
      wet: 0.5,
    });

    violinVol.chain(violinDelay, destination);
    corAnglaisVol.chain(corAnglaisDelay1, corAnglaisDelay2, destination);

    const intervals = COR_ANGALAIS_NOTES.map(() => Math.random() * 10 + 10);
    const minInterval = Math.min(...intervals);
    COR_ANGALAIS_NOTES.forEach((note, i) => {
      const interval = intervals[i];
      Tone.Transport.scheduleRepeat(
        () => corAnglais.triggerAttack(note, '+1'),
        interval,
        interval - minInterval
      );
    });
    let lastViolinTimeS = Tone.now();
    const noteSubscription = notes$.subscribe(note => {
      if (
        Math.random() < 0.1 &&
        Note.oct(note) > 3 &&
        Tone.now() - lastViolinTimeS > 20
      ) {
        lastViolinTimeS = Tone.now();
        violin.triggerAttack(note, '+1');
      } else {
        piano.triggerAttack(note, '+1');
      }
    });

    return () => {
      [violinDelay, corAnglaisDelay1, corAnglaisDelay2].forEach(node => {
        node.dispose();
      });
      [violin, corAnglais, piano].forEach(sampler => {
        sampler.releaseAll();
      });
      noteSubscription.unsubscribe();
    };
  };

  const deactivate = () => {
    [piano, violin, corAnglais].forEach(node => node.dispose());
  };

  return [deactivate, schedule];
};

export default wrapActivate(activate);

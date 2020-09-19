import * as Tone from 'tone';
import { filter } from 'rxjs/operators';

const shortTermThrottleByNote = timeInSeconds => {
  const lastTimes = new Map();
  return source =>
    source.pipe(
      filter(note => {
        const now = Tone.now();
        if (lastTimes.has(note)) {
          const lastTime = lastTimes.get(note);
          if (now - lastTime < timeInSeconds) {
            return false;
          }
        }
        lastTimes.set(note, now);
        return true;
      })
    );
};

export default shortTermThrottleByNote;

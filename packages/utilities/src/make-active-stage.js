import { Gain, now, Transport } from 'tone';
import undefinedValue from './utilities/undefined';
import noop from './utilities/noop';

const FADE_TIME = 0.1;

const makeActiveStage = ({ deactivate, schedule, destination }) => {
  let isDeactivated = false;
  const endFns = [];

  const wrappedSchedule = () => {
    if (isDeactivated) {
      throw new Error("Can't schedule after deactivation");
    }
    if (endFns.length > 0) {
      console.warn("Rescheduling a piece that wasn't ended");
    }
    const gainNode = new Gain(0).connect(destination);
    const end = schedule({ destination: gainNode });
    if (typeof end !== 'function') {
      return noop;
    }
    let isEnded = false;
    const wrappedEnd = () => {
      if (isEnded) {
        return undefinedValue;
      }
      const currentTime = now();
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + FADE_TIME);
      Transport.scheduleOnce(() => {
        gainNode.gain.dispose();
      }, currentTime + FADE_TIME);
      isEnded = true;
      endFns.splice(endFns.indexOf(wrappedEnd), 1);
      return end();
    };
    endFns.push(wrappedEnd);
    const currentTime = now();
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(1, currentTime + FADE_TIME);
    return wrappedEnd;
  };

  const wrappedDeactivate = () => {
    if (isDeactivated) {
      return undefinedValue;
    }
    isDeactivated = true;
    endFns.forEach(end => end());
    return deactivate();
  };

  return [wrappedDeactivate, wrappedSchedule];
};

export default makeActiveStage;

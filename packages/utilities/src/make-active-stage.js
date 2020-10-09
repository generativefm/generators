import undefinedValue from './utilities/undefined';
import noop from './utilities/noop';

const makeActiveStage = (deactivate, schedule) => {
  let isDeactivated = false;
  const endFns = [];

  const wrappedSchedule = () => {
    if (isDeactivated) {
      throw new Error("Can't schedule after deactivation");
    }
    if (endFns.length > 0) {
      console.warn("Rescheduling a piece that wasn't ended");
    }
    const end = schedule();
    if (typeof end !== 'function') {
      return noop;
    }
    let isEnded = false;
    const wrappedEnd = () => {
      if (isEnded) {
        return undefinedValue;
      }
      isEnded = true;
      endFns.splice(endFns.indexOf(wrappedEnd), 1);
      return end();
    };
    endFns.push(wrappedEnd);
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

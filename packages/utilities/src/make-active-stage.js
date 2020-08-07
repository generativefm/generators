import undefinedValue from './undefined';
import noop from './noop';

const makeActiveStage = (deactivate, schedule) => {
  let isDeactivated = false;
  const endFns = [];

  const wrappedSchedule = () => {
    if (isDeactivated) {
      throw new Error("Can't schedule after deactivation");
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

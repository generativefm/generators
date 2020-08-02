import undefinedValue from './undefined';
import noop from './noop';

const makeActiveStage = (deactivate, schedule) => {
  let isDeactivated = false;
  const disposeFns = [];

  const wrappedSchedule = () => {
    if (isDeactivated) {
      throw new Error("Can't schedule after deactivation");
    }
    const dispose = schedule();
    if (typeof dispose !== 'function') {
      return noop;
    }
    let isDisposed = false;
    const wrappedEnd = () => {
      if (isDisposed) {
        return undefinedValue;
      }
      isDisposed = true;
      disposeFns.splice(disposeFns.indexOf(wrappedEnd), 1);
      return dispose();
    };
    disposeFns.push(wrappedEnd);
    return wrappedEnd;
  };

  const wrappedDeactivate = () => {
    if (isDeactivated) {
      return undefinedValue;
    }
    isDeactivated = true;
    disposeFns.forEach(dispose => dispose());
    return deactivate();
  };

  return [wrappedDeactivate, wrappedSchedule];
};

export default makeActiveStage;

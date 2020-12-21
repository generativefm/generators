import { getContext, setContext } from 'tone';
import makeActiveStage from './make-active-stage';

const wrapActivate = activate => async options => {
  if (getContext() !== options.context) {
    setContext(options.context);
  }
  const [deactivate, schedule] = await activate(options);
  return makeActiveStage({
    deactivate,
    schedule,
    destination: options.destination,
  });
};

export default wrapActivate;

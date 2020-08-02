import { getContext, setContext } from 'tone';
import makeActiveStage from './make-active-stage';

const makePiece = activate => options => {
  if (getContext() !== options.context) {
    setContext(options.context);
  }

  return activate(options).then(([deactivate, schedule]) =>
    makeActiveStage(deactivate, schedule)
  );
};

export default makePiece;

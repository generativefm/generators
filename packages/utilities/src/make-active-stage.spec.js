import { Gain } from 'tone';
import makeActiveStage from './make-active-stage';
import noop from './utilities/noop';

const makeCallAwareFn = () => {
  const callAwareFn = () => {
    callAwareFn.called = true;
    callAwareFn.callCount = callAwareFn.callCount
      ? callAwareFn.callCount + 1
      : 1;
  };
  return callAwareFn;
};

const destination = new Gain();

describe('makeActiveStage', () => {
  it('should return an array of two functions, deactivate and schedule', () => {
    expect(makeActiveStage({ deactivate: noop, schedule: noop, destination }))
      .to.be.an.instanceOf(Array)
      .of.length(2);
  });
  describe('deactivate', () => {
    it('should call the deactivate parameter', () => {
      const deactivateParameter = makeCallAwareFn();
      const [deactivate] = makeActiveStage({
        deactivate: deactivateParameter,
        schedule: noop,
        destination,
      });
      deactivate();
      expect(deactivateParameter).to.have.property('called', true);
    });
    it('should not call the deactive parameter multiple times', () => {
      const deactivateParameter = makeCallAwareFn();
      const [deactivate] = makeActiveStage({
        deactivate: deactivateParameter,
        schedule: noop,
        destination,
      });
      deactivate();
      deactivate();
      expect(deactivateParameter).to.have.property('callCount', 1);
    });
    it('should call any uncalled end functions', () => {
      const end = makeCallAwareFn();
      const scheduleParameter = () => end;
      const [deactivate, schedule] = makeActiveStage({
        deactivate: noop,
        schedule: scheduleParameter,
        destination,
      });
      schedule();
      deactivate();
      expect(end).to.have.property('called', true);
    });
    it('should not call end functions which were already called', () => {
      const end = makeCallAwareFn();
      const scheduleParameter = () => end;
      const [deactivate, schedule] = makeActiveStage({
        deactivate: noop,
        schedule: scheduleParameter,
        destination,
      });
      const endFromSchedule = schedule();
      endFromSchedule();
      deactivate();
      expect(end).to.have.property('callCount', 1);
    });
    it('should not call end functions multiple times', () => {
      const end = makeCallAwareFn();
      const scheduleParameter = () => end;
      const [deactivate, schedule] = makeActiveStage({
        deactivate: noop,
        schedule: scheduleParameter,
        destination,
      });
      schedule();
      deactivate();
      deactivate();
      expect(end).to.have.property('callCount', 1);
    });
    it('should not attempt to call non-function results of scheduleParameter', () => {
      const scheduleParameter = () => 'NOT_A_FUNCTION';
      const [deactivate, schedule] = makeActiveStage({
        deactivate: noop,
        schedule: scheduleParameter,
        destination,
      });
      schedule();
      expect(() => deactivate()).not.to.throw();
    });
  });
  describe('schedule', () => {
    it('should call the scheduleParameter and return a function which calls the result', () => {
      const end = makeCallAwareFn();
      const scheduleResult = end;
      const scheduleParameter = () => scheduleResult;
      const [, schedule] = makeActiveStage({
        deactivate: noop,
        schedule: scheduleParameter,
        destination,
      });
      const endFromSchedule = schedule();
      endFromSchedule();
      expect(end).to.have.property('called', true);
    });
    it('should throw an error when called after deactivate was called', () => {
      const [deactivate, schedule] = makeActiveStage({
        deactivate: noop,
        schedule: noop,
        destination,
      });
      deactivate();
      expect(() => schedule()).to.throw();
    });
    it('should return a function even if scheduleParameter does not', () => {
      const scheduleParameter = () => 'NOT_A_FUNCTION';
      const [, schedule] = makeActiveStage({
        deactivate: noop,
        schedule: scheduleParameter,
        destination,
      });
      const result = schedule();
      expect(result).to.be.a('function');
    });
  });
});

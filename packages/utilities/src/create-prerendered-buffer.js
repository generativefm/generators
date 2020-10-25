import { Offline } from 'tone';

const _createPrerenderedBuffer = async ({ createSource, duration }) => {
  let disposeSource;
  const renderedBufer = await Offline(async offlineContext => {
    const { start, dispose } = await Promise.resolve(
      createSource(offlineContext)
    );
    disposeSource = dispose;
    start();
  }, duration);
  disposeSource();
  return renderedBufer;
};

const queue = [];
const createPrerenderedBuffer = options =>
  new Promise(resolve => {
    const renderFn = async () => {
      const renderedBuffer = await _createPrerenderedBuffer(options);
      const index = queue.indexOf(renderFn);
      queue.splice(index, 1);
      resolve(renderedBuffer);
      if (queue.length > 0) {
        queue[0]();
      }
    };
    queue.push(renderFn);
    if (queue.length === 1) {
      renderFn();
    }
  });

export default createPrerenderedBuffer;

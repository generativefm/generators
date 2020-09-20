import * as Tone from 'tone';

const _renderBuffer = async ({
  buffer,
  getDestination,
  duration,
  bufferSourceOptions = {},
}) => {
  const disposableNodes = [];
  const renderedBuffer = await Tone.Offline(async () => {
    const destination = await getDestination();
    const bufferSource = new Tone.ToneBufferSource(
      Object.assign({}, bufferSourceOptions, {
        url: buffer,
      })
    );
    bufferSource.connect(destination);
    disposableNodes.push(destination);
    disposableNodes.push(bufferSource);
    bufferSource.start();
  }, duration);
  disposableNodes.forEach(node => {
    node.dispose();
  });
  return renderedBuffer;
};

const queue = [];
const renderBuffer = options =>
  new Promise(resolve => {
    const renderFn = async () => {
      const renderedBuffer = await _renderBuffer(options);
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

export default renderBuffer;

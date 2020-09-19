import * as Tone from 'tone';

const renderBuffer = async ({
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

export default renderBuffer;

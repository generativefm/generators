import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const makePiece = ({
  audioContext,
  destination,
  preferredFormat,
  sampleSource = {},
}) =>
  fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename).then(
    ({ samples }) => {
      if (Tone.context !== audioContext) {
        Tone.setContext(audioContext);
      }
      // create piece
      return () => {
        // clean up
      };
    }
  );

export default makePiece;

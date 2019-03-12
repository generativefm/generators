import Tone from 'tone';
import fetchSpecFile from '@generative-music/samples.generative.fm';

const makePiece = ({ audioContext, destination, preferredFormat, sampleSource}) => fetchSpecFile(sampleSource.baseUrl, sampleSource.specFilename)
  // create piece
  return Promise.resolve(() => {
    // clean up
  });
}

export default makePiece;

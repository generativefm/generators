import * as Tone from 'tone';

const cloneAudioBuffer = audioBuffer => {
  const clone = Tone.context.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  for (
    let channelNumber = 0;
    channelNumber < audioBuffer.numberOfChannels;
    channelNumber += 1
  ) {
    clone.copyToChannel(
      audioBuffer.getChannelData(channelNumber),
      channelNumber
    );
  }
  return clone;
};

const createBuffer = url => {
  if (url instanceof AudioBuffer) {
    return Promise.resolve(new Tone.ToneAudioBuffer(cloneAudioBuffer(url)));
  }
  if (url instanceof Tone.ToneAudioBuffer) {
    return Promise.resolve(
      new Tone.ToneAudioBuffer(cloneAudioBuffer(url.get()))
    );
  }
  return new Promise(resolve => {
    const buffer = new Tone.ToneAudioBuffer(url, () => {
      resolve(buffer);
    });
  });
};

export default createBuffer;

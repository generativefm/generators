const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.9/Tone.js';
script.onload = () => {
  const video = document.querySelector('video');
  if (!video) {
    console.log('no video element!');
  }
  const mediaElNode = Tone.getContext().createMediaElementSource(video);
  const meter = new Tone.Meter().toDestination();
  Tone.connect(mediaElNode, meter);
  let maxDb = -Infinity;
  setInterval(() => {
    const value = meter.getValue();
    if (value > maxDb) {
      console.log(value);
      maxDb = value;
    }
  }, 10);
};

document.body.append(script);

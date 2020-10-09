import { getRandomNumberBetween } from '@generative-music/utilities';

const arpeggiateOnce = ({ instrument, notes, withinTime, velocity = 1 }) => {
  notes.forEach(note => {
    const time = getRandomNumberBetween(0, withinTime);
    instrument.triggerAttack(note, `+${time}`, velocity);
  });
};

export default arpeggiateOnce;

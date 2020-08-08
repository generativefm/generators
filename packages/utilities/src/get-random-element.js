import getRandomNumberBetween from './get-random-number-between';

const pickRandomElement = (arr = []) =>
  arr[Math.floor(getRandomNumberBetween(0, arr.length))];

export default pickRandomElement;

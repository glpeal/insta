/**
 * Sleep for a specified number of milliseconds
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get random delay between min and max seconds
 */
export const getRandomDelay = (minSeconds, maxSeconds) => {
  const minMs = minSeconds * 1000;
  const maxMs = maxSeconds * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

/**
 * Human-like typing delay
 */
export const typeWithDelay = async (element, text, minDelay = 50, maxDelay = 150) => {
  for (const char of text) {
    await element.type(char);
    await sleep(Math.random() * (maxDelay - minDelay) + minDelay);
  }
};

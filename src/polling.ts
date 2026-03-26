import { JassieTimeoutError } from './errors.js';

export interface PollConfig<T> {
  fetcher: () => Promise<T>;
  isComplete: (result: T) => boolean;
  interval?: number;
  timeout?: number;
  onPoll?: (result: T) => void;
}

export async function poll<T>(config: PollConfig<T>): Promise<T> {
  const {
    fetcher,
    isComplete,
    interval = 5000,
    timeout = 600000, // 10 minutes
    onPoll,
  } = config;

  const deadline = Date.now() + timeout;

  while (true) {
    const result = await fetcher();
    if (onPoll) onPoll(result);
    if (isComplete(result)) return result;

    if (Date.now() + interval > deadline) {
      throw new JassieTimeoutError(
        `Polling timed out after ${timeout / 1000}s`,
      );
    }

    await sleep(interval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

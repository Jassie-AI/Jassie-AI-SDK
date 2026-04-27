import type { ImageStreamEvent } from '../types.js';

interface QueueItem {
  value?: ImageStreamEvent;
  done: boolean;
  error?: Error;
}

export class ImageStream implements AsyncIterable<ImageStreamEvent> {
  private queue: QueueItem[] = [];
  private resolve: ((item: QueueItem) => void) | null = null;
  private abortController: AbortController;
  private ended = false;

  constructor(abortController?: AbortController) {
    this.abortController = abortController ?? new AbortController();
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  _push(event: ImageStreamEvent): void {
    if (this.ended) return;
    const item: QueueItem = { value: event, done: false };
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r(item);
    } else {
      this.queue.push(item);
    }
  }

  _end(): void {
    if (this.ended) return;
    this.ended = true;
    const item: QueueItem = { done: true };
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r(item);
    } else {
      this.queue.push(item);
    }
  }

  _error(err: Error): void {
    if (this.ended) return;
    this.ended = true;
    const item: QueueItem = { done: true, error: err };
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r(item);
    } else {
      this.queue.push(item);
    }
  }

  abort(): void {
    this.abortController.abort();
    this._end();
  }

  /** Iterate progress events via callback. Resolves when the stream ends. */
  async eachEvent(cb: (event: ImageStreamEvent) => void): Promise<void> {
    const iterator = this[Symbol.asyncIterator]();
    let result = await iterator.next();
    while (!result.done) {
      cb(result.value);
      result = await iterator.next();
    }
  }

  /** Collect and return the final completed event (or null if not found). */
  async finalResult(): Promise<ImageStreamEvent | null> {
    let last: ImageStreamEvent | null = null;
    await this.eachEvent((event) => {
      if (event.type === 'completed') {
        last = event;
      }
    });
    return last;
  }

  private next(): Promise<QueueItem> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!);
    }
    return new Promise<QueueItem>((resolve) => {
      this.resolve = resolve;
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<ImageStreamEvent> {
    const self = this;
    return {
      next(): Promise<IteratorResult<ImageStreamEvent>> {
        return self.next().then((item) => {
          if (item.error) {
            throw item.error;
          }
          if (item.done) {
            return { value: undefined as unknown as ImageStreamEvent, done: true as const };
          }
          return { value: item.value!, done: false as const };
        });
      },
    };
  }

  ['@@asyncIterator'](): AsyncIterator<ImageStreamEvent> {
    return this[Symbol.asyncIterator]();
  }
}

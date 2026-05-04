import type { VoiceChatEvent } from '../types.js';

interface QueueItem {
  value?: VoiceChatEvent;
  done: boolean;
  error?: Error;
}

export class VoiceChatStream implements AsyncIterable<VoiceChatEvent> {
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

  _push(event: VoiceChatEvent): void {
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

  /** Iterate voice chat events via callback. Resolves when the stream ends. */
  async eachEvent(cb: (event: VoiceChatEvent) => void): Promise<void> {
    const iterator = this[Symbol.asyncIterator]();
    let result = await iterator.next();
    while (!result.done) {
      cb(result.value);
      result = await iterator.next();
    }
  }

  /** Collect the final "done" event with full text and user_text. */
  async finalResult(): Promise<VoiceChatEvent | null> {
    let last: VoiceChatEvent | null = null;
    await this.eachEvent((event) => {
      if (event.type === 'done') {
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

  [Symbol.asyncIterator](): AsyncIterator<VoiceChatEvent> {
    const self = this;
    return {
      next(): Promise<IteratorResult<VoiceChatEvent>> {
        return self.next().then((item) => {
          if (item.error) {
            throw item.error;
          }
          if (item.done) {
            return { value: undefined as unknown as VoiceChatEvent, done: true as const };
          }
          return { value: item.value!, done: false as const };
        });
      },
    };
  }

  // Babel/Metro fallback
  ['@@asyncIterator'](): AsyncIterator<VoiceChatEvent> {
    return this[Symbol.asyncIterator]();
  }
}

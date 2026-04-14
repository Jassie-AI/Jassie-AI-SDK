import type { JassieChunk } from '../types.js';

interface QueueItem {
  value?: JassieChunk;
  done: boolean;
  error?: Error;
}

export class JassieStream implements AsyncIterable<JassieChunk> {
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

  /** Called by transports to push a chunk */
  _push(chunk: JassieChunk): void {
    if (this.ended) return;
    const item: QueueItem = { value: chunk, done: false };
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r(item);
    } else {
      this.queue.push(item);
    }
  }

  /** Called by transports when the stream ends */
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

  /** Called by transports on error */
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

  /** Cancel the stream */
  abort(): void {
    this.abortController.abort();
    this._end();
  }

  /** Iterate text chunks via callback. Resolves when the stream ends. */
  async eachText(cb: (text: string) => void): Promise<void> {
    const iterator = this[Symbol.asyncIterator]();
    let result = await iterator.next();
    while (!result.done) {
      if (result.value.type === 'text' && result.value.content) {
        cb(result.value.content);
      }
      result = await iterator.next();
    }
  }

  /** Collect all text chunks into a single string */
  async finalText(): Promise<string> {
    let text = '';
    await this.eachText((t) => { text += t; });
    return text;
  }

  private next(): Promise<QueueItem> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!);
    }
    return new Promise<QueueItem>((resolve) => {
      this.resolve = resolve;
    });
  }

  // Plain async iterator — no async generator syntax, which Hermes
  // (React Native's JS engine) does not support.
  [Symbol.asyncIterator](): AsyncIterator<JassieChunk> {
    const self = this;
    return {
      next(): Promise<IteratorResult<JassieChunk>> {
        return self.next().then((item) => {
          if (item.error) {
            throw item.error;
          }
          if (item.done) {
            return { value: undefined as unknown as JassieChunk, done: true as const };
          }
          return { value: item.value!, done: false as const };
        });
      },
    };
  }

  // Babel/Metro fallback — Babel's _asyncIterator helper checks this
  // string key when Symbol.asyncIterator is not found on the object.
  ['@@asyncIterator'](): AsyncIterator<JassieChunk> {
    return this[Symbol.asyncIterator]();
  }
}

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

  /** Collect all text chunks into a single string */
  async finalText(): Promise<string> {
    let text = '';
    for await (const chunk of this) {
      if (chunk.type === 'text') {
        text += chunk.content;
      }
    }
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

  async *[Symbol.asyncIterator](): AsyncIterator<JassieChunk> {
    while (true) {
      const item = await this.next();
      if (item.error) throw item.error;
      if (item.done) return;
      yield item.value!;
    }
  }
}

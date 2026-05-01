import type {
  ClientInterface,
  ImageGenerateParams,
  ImageTaskResponse,
  PollOptions,
} from '../types.js';
import { poll } from '../polling.js';
import type { ImageStream } from '../streaming/image-stream.js';

export class Image {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Generate an image synchronously (v1). Blocks until the image is ready. */
  async generate(params: ImageGenerateParams): Promise<ImageTaskResponse> {
    return this.client._request<ImageTaskResponse>(
      'POST',
      '/v1/generate-image',
      params,
    );
  }

  /** Start async image generation (v2). Returns immediately with a taskId. */
  async generateAsync(params: ImageGenerateParams): Promise<ImageTaskResponse> {
    return this.client._request<ImageTaskResponse>(
      'POST',
      '/v2/generate-image',
      params,
    );
  }

  /**
   * Check image task status.
   *
   * - `status(taskId)` → single JSON status check.
   * - `status(taskId, { onPoll, interval, timeout })` → polls until
   *   the task reaches a terminal state.
   */
  async status(
    taskId: string,
    options?: PollOptions,
  ): Promise<ImageTaskResponse> {
    const path = options?.showcase
      ? `/v2/generate-image/${taskId}?showcase=true`
      : `/v2/generate-image/${taskId}`;
    const fetcher = () =>
      this.client._request<ImageTaskResponse>('GET', path);

    if (!options) {
      return fetcher();
    }

    return poll<ImageTaskResponse>({
      fetcher,
      isComplete: (res) =>
        res.status === 'succeeded' || res.status === 'failed',
      interval: options.interval,
      timeout: options.timeout,
      onPoll: options.onPoll,
    });
  }

  /**
   * Stream image generation status via Server-Sent Events (SSE).
   * Returns an ImageStream (async iterable) that yields status,
   * preview, and completion events in real time.
   *
   * ```ts
   * const stream = client.image.statusStream(taskId);
   * for await (const event of stream) { ... }
   * ```
   */
  statusStream(taskId: string): ImageStream {
    return this.client._imageStream(
      `/v2/generate-image/${taskId}?stream=true`,
      null,
    );
  }
}

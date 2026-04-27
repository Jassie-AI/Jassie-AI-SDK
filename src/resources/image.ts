import type {
  ImageGenerateParams,
  ImageTaskResponse,
  ImageStreamEvent,
  PollOptions,
} from '../types.js';
import { poll } from '../polling.js';
import { ImageStream } from '../streaming/image-stream.js';

export interface ImageClient {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
  _imageStream(path: string, body: any): ImageStream;
}

export class Image {
  private client: ImageClient;

  constructor(client: ImageClient) {
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
    const fetcher = () =>
      this.client._request<ImageTaskResponse>(
        'GET',
        `/v2/generate-image/${taskId}`,
      );

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

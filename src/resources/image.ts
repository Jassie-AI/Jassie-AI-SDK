import type {
  ClientInterface,
  ImageGenerateParams,
  ImageTaskResponse,
  PollOptions,
} from '../types.js';
import { poll } from '../polling.js';
import type { ImageStream } from '../streaming/image-stream.js';

const PIXEL_LITE_MAX_DIM = 2048;
const PIXEL_LITE_MAX_PIXELS = 2048 * 2048;

/** Clamp dimensions for jassie-pixel-lite and strip unsupported fields. */
function prepareParams(params: ImageGenerateParams): ImageGenerateParams {
  const out = { ...params };

  if (out.model === 'jassie-pixel-lite') {
    // pixel-lite does not support reference images
    delete out.image;

    // Clamp width/height to server max
    if (typeof out.width === 'number') {
      out.width = Math.min(out.width, PIXEL_LITE_MAX_DIM);
      out.width = out.width - (out.width % 16); // must be multiple of 16
    }
    if (typeof out.height === 'number') {
      out.height = Math.min(out.height, PIXEL_LITE_MAX_DIM);
      out.height = out.height - (out.height % 16);
    }

    // Clamp total pixels
    if (typeof out.width === 'number' && typeof out.height === 'number') {
      while (out.width * out.height > PIXEL_LITE_MAX_PIXELS) {
        if (out.width >= out.height) {
          out.width -= 16;
        } else {
          out.height -= 16;
        }
      }
    }
  }

  return out;
}

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
      prepareParams(params),
    );
  }

  /** Start async image generation (v2). Returns immediately with a taskId. */
  async generateAsync(params: ImageGenerateParams): Promise<ImageTaskResponse> {
    return this.client._request<ImageTaskResponse>(
      'POST',
      '/v2/generate-image',
      prepareParams(params),
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
        res.status === 'succeeded' || res.status === 'failed' || res.status === 'cancelled',
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

  /** Cancel an image generation task. */
  async cancel(taskId: string): Promise<ImageTaskResponse> {
    return this.client._request<ImageTaskResponse>(
      'DELETE',
      `/v2/generate-image/${taskId}`,
    );
  }
}

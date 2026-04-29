import type {
  ClientInterface,
  VideoGenerateParams,
  VideoTaskResponse,
  PollOptions,
} from '../types.js';
import { poll } from '../polling.js';

export class Video {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Start video generation. Returns immediately with a taskId. */
  async generate(params: VideoGenerateParams): Promise<VideoTaskResponse> {
    return this.client._request<VideoTaskResponse>(
      'POST',
      '/v1/generate-video',
      params,
    );
  }

  /**
   * Check video task status.
   *
   * - `status(taskId)` → single status check (one HTTP call).
   * - `status(taskId, { onPoll, interval, timeout })` → polls until the task
   *   reaches a terminal state (`succeeded` or `failed`), invoking `onPoll`
   *   on every poll iteration.
   */
  async status(
    taskId: string,
    options?: PollOptions,
  ): Promise<VideoTaskResponse> {
    const fetcher = () =>
      this.client._request<VideoTaskResponse>(
        'GET',
        `/v1/generate-video/${taskId}`,
      );

    if (!options) {
      return fetcher();
    }

    return poll<VideoTaskResponse>({
      fetcher,
      isComplete: (res) =>
        res.status === 'succeeded' || res.status === 'failed',
      interval: options.interval,
      timeout: options.timeout,
      onPoll: options.onPoll,
    });
  }
}

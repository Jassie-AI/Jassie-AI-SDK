import type {
  ClientInterface,
  MusicGenerateParams,
  MusicTaskResponse,
  PollOptions,
} from '../types.js';
import { poll } from '../polling.js';

export class Music {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Start music generation. Returns immediately with a taskId. */
  async generate(params: MusicGenerateParams): Promise<MusicTaskResponse> {
    return this.client._request<MusicTaskResponse>(
      'POST',
      '/v1/generate-music',
      params,
    );
  }

  /**
   * Check music task status.
   *
   * - `status(taskId)` → single status check (one HTTP call).
   * - `status(taskId, { onPoll, interval, timeout })` → polls until the task
   *   reaches a terminal state (`completed` or `failed`), invoking `onPoll`
   *   on every poll iteration.
   */
  async status(
    taskId: string,
    options?: PollOptions,
  ): Promise<MusicTaskResponse> {
    const fetcher = () =>
      this.client._request<MusicTaskResponse>(
        'GET',
        `/v1/generate-music/${taskId}`,
      );

    if (!options) {
      return fetcher();
    }

    return poll<MusicTaskResponse>({
      fetcher,
      isComplete: (res) =>
        res.status === 'completed' || res.status === 'failed',
      interval: options.interval,
      timeout: options.timeout,
      onPoll: options.onPoll,
    });
  }
}

import type {
  MusicGenerateParams,
  MusicTaskResponse,
  PollOptions,
} from '../types.js';
import { poll } from '../polling.js';

export interface MusicClient {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
}

export class Music {
  private client: MusicClient;

  constructor(client: MusicClient) {
    this.client = client;
  }

  /** Start music generation (async task) */
  async generate(params: MusicGenerateParams): Promise<MusicTaskResponse> {
    return this.client._request<MusicTaskResponse>(
      'POST',
      '/v1/generate-music',
      params,
    );
  }

  /** Check status of a music task */
  async status(taskId: string): Promise<MusicTaskResponse> {
    return this.client._request<MusicTaskResponse>(
      'GET',
      `/v1/generate-music/${taskId}`,
    );
  }

  /** Poll until the music task reaches a terminal status */
  async poll(
    taskId: string,
    options?: PollOptions,
  ): Promise<MusicTaskResponse> {
    return poll<MusicTaskResponse>({
      fetcher: () => this.status(taskId),
      isComplete: (res) =>
        res.status === 'completed' || res.status === 'failed',
      interval: options?.interval,
      timeout: options?.timeout,
      onPoll: options?.onPoll,
    });
  }

  /** Generate music and wait for completion */
  async generateAndWait(
    params: MusicGenerateParams,
    options?: PollOptions,
  ): Promise<MusicTaskResponse> {
    const task = await this.generate(params);
    return this.poll(task.taskId, options);
  }
}

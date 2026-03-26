import type {
  VideoGenerateParams,
  VideoTaskResponse,
  PollOptions,
} from '../types.js';
import { poll } from '../polling.js';

export interface VideoClient {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
}

export class Video {
  private client: VideoClient;

  constructor(client: VideoClient) {
    this.client = client;
  }

  /** Start video generation (async task) */
  async generate(params: VideoGenerateParams): Promise<VideoTaskResponse> {
    return this.client._request<VideoTaskResponse>(
      'POST',
      '/v1/generate-video',
      params,
    );
  }

  /** Check status of a video task */
  async status(taskId: string): Promise<VideoTaskResponse> {
    return this.client._request<VideoTaskResponse>(
      'GET',
      `/v1/generate-video/${taskId}`,
    );
  }

  /** Poll until the video task reaches a terminal status */
  async poll(
    taskId: string,
    options?: PollOptions,
  ): Promise<VideoTaskResponse> {
    return poll<VideoTaskResponse>({
      fetcher: () => this.status(taskId),
      isComplete: (res) =>
        res.status === 'succeeded' || res.status === 'failed',
      interval: options?.interval,
      timeout: options?.timeout,
      onPoll: options?.onPoll,
    });
  }

  /** Generate a video and wait for completion */
  async generateAndWait(
    params: VideoGenerateParams,
    options?: PollOptions,
  ): Promise<VideoTaskResponse> {
    const task = await this.generate(params);
    return this.poll(task.taskId, options);
  }
}

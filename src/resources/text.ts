import type {
  TextGenerateParams,
  TextStreamParams,
  TextResponse,
  JassieChunk,
} from '../types.js';
import type { JassieStream } from '../streaming/stream.js';

export interface TextClient {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
  _stream(method: string, path: string, body: any): JassieStream;
}

export class Text {
  private client: TextClient;

  constructor(client: TextClient) {
    this.client = client;
  }

  /** Non-streaming text generation */
  async generate(params: TextGenerateParams): Promise<TextResponse> {
    return this.client._request<TextResponse>('POST', '/v1/generate-text', {
      ...params,
      stream: false,
    });
  }

  /** Streaming text generation */
  stream(params: TextStreamParams | Omit<TextStreamParams, 'stream'>): JassieStream {
    return this.client._stream('POST', '/v1/generate-text', {
      ...params,
      stream: true,
    });
  }

  /** Overloaded create: returns stream if stream=true, otherwise Promise */
  create(params: TextStreamParams): JassieStream;
  create(params: TextGenerateParams): Promise<TextResponse>;
  create(
    params: TextGenerateParams | TextStreamParams,
  ): JassieStream | Promise<TextResponse> {
    if (params.stream === true) {
      return this.stream(params);
    }
    return this.generate({ ...params, stream: false } as TextGenerateParams);
  }
}

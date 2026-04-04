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

  /** Create a text generation. Set stream: true for real-time streaming. */
  create(params: TextStreamParams): JassieStream;
  create(params: TextGenerateParams): Promise<TextResponse>;
  create(
    params: TextGenerateParams | TextStreamParams,
  ): JassieStream | Promise<TextResponse> {
    if (params.stream === true) {
      return this.client._stream('POST', '/v1/generate-text', {
        ...params,
        stream: true,
      });
    }
    return this.client._request<TextResponse>('POST', '/v1/generate-text', {
      ...params,
      stream: false,
    });
  }
}

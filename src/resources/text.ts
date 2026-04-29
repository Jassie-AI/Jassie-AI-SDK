import type {
  ClientInterface,
  TextGenerateParams,
  TextStreamParams,
  TextResponse,
} from '../types.js';
import type { JassieStream } from '../streaming/stream.js';

export class Text {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Generate a text response. Set stream: true for real-time streaming. */
  generate(params: TextStreamParams): JassieStream;
  generate(params: TextGenerateParams): Promise<TextResponse>;
  generate(
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

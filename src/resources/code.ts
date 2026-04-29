import type {
  ClientInterface,
  CodeGenerateParams,
  CodeStreamParams,
  TextResponse,
} from '../types.js';
import type { JassieStream } from '../streaming/stream.js';

export class Code {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Generate code. Set stream: true for real-time streaming. */
  generate(params: CodeStreamParams): JassieStream;
  generate(params: CodeGenerateParams): Promise<TextResponse>;
  generate(
    params: CodeGenerateParams | CodeStreamParams,
  ): JassieStream | Promise<TextResponse> {
    if (params.stream === true) {
      return this.client._stream('POST', '/v1/generate-code', {
        ...params,
        stream: true,
      });
    }
    return this.client._request<TextResponse>('POST', '/v1/generate-code', {
      ...params,
      stream: false,
    });
  }
}

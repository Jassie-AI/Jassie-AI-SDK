import type {
  CodeGenerateParams,
  CodeStreamParams,
  TextResponse,
} from '../types.js';
import type { JassieStream } from '../streaming/stream.js';

export interface CodeClient {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
  _stream(method: string, path: string, body: any): JassieStream;
}

export class Code {
  private client: CodeClient;

  constructor(client: CodeClient) {
    this.client = client;
  }

  /** Non-streaming code generation */
  async generate(params: CodeGenerateParams): Promise<TextResponse> {
    return this.client._request<TextResponse>('POST', '/v1/generate-code', {
      ...params,
      stream: false,
    });
  }

  /** Streaming code generation */
  stream(params: CodeStreamParams | Omit<CodeStreamParams, 'stream'>): JassieStream {
    return this.client._stream('POST', '/v1/generate-code', {
      ...params,
      stream: true,
    });
  }

  /** Overloaded create: returns stream if stream=true, otherwise Promise */
  create(params: CodeStreamParams): JassieStream;
  create(params: CodeGenerateParams): Promise<TextResponse>;
  create(
    params: CodeGenerateParams | CodeStreamParams,
  ): JassieStream | Promise<TextResponse> {
    if (params.stream === true) {
      return this.stream(params);
    }
    return this.generate({ ...params, stream: false } as CodeGenerateParams);
  }
}

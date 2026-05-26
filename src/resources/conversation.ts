import type { ClientInterface, ConversationParams } from '../types.js';
import type { JassieStream } from '../streaming/stream.js';

export class Conversation {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /**
   * Stream a multimodal conversation via POST /v1/conversation.
   * Supports text, image, video, and audio inputs.
   * When modalities includes 'audio', audio chunks are streamed back.
   */
  stream(params: ConversationParams): JassieStream {
    const modalities: string[] = params.text
      ? ['text', 'audio']
      : ['audio'];

    const body: Record<string, unknown> = {
      messages: params.messages,
      stream: true,
      modalities,
    };
    if (params.maxTokens != null) body.maxTokens = params.maxTokens;
    if (params.speaker) body.speaker = params.speaker;
    if (params.temperature != null) body.temperature = params.temperature;

    return this.client._stream('POST', '/v1/conversation', body);
  }
}

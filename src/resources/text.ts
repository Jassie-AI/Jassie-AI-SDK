import type {
  ClientInterface,
  TextGenerateParams,
  TextStreamParams,
  TextResponse,
  ConversationStreamParams,
  TTSParams,
  TTSResponse,
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

  /**
   * Stream a conversation via /v1/conversation.
   * Supports text, images, video, and audio input/output.
   * This endpoint handles multimodal messages natively.
   */
  conversation(params: ConversationStreamParams): JassieStream {
    const body: Record<string, unknown> = {
      messages: params.messages,
      stream: true,
    };
    if (params.max_tokens != null) body.max_tokens = params.max_tokens;
    if (params.maxTokens != null) body.max_tokens = params.maxTokens;
    if (params.temperature != null) body.temperature = params.temperature;
    if (params.modalities) body.modalities = params.modalities;
    if (params.speaker) body.speaker = params.speaker;
    if (params.voiceSample) body.voiceSample = params.voiceSample;
    if (params.voiceSampleText) body.voiceSampleText = params.voiceSampleText;
    if (params.web) body.web = params.web;

    return this.client._stream('POST', '/v1/conversation', body);
  }

  /**
   * Convert text to speech audio.
   *
   * Returns a base64-encoded PCM-16 WAV at 24 kHz.
   * Supports pre-loaded voices (by speaker name) and on-the-fly
   * voice cloning (via voiceSample).
   */
  async tts(params: TTSParams): Promise<TTSResponse> {
    return this.client._request<TTSResponse>('POST', '/v1/tts', params);
  }
}

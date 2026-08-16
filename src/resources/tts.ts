import type { ClientInterface } from '../types.js';

export interface Voice {
  id: string;
  name: string;
  type: 'built-in' | 'cloned';
}

export interface VoicesResponse {
  voices: Voice[];
}

export interface TTSSynthesizeParams {
  text: string;
  speaker?: string;
  language?: string;
}

export class TTS {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Synthesize speech from text. Returns raw WAV audio as ArrayBuffer. */
  async synthesize(params: TTSSynthesizeParams): Promise<ArrayBuffer> {
    const response = await this.client._requestRaw('POST', '/v1/tts', params);
    return response.arrayBuffer();
  }

  /** List available voices on the TTS server. */
  async voices(): Promise<VoicesResponse> {
    return this.client._request<VoicesResponse>('GET', '/v1/voices');
  }
}

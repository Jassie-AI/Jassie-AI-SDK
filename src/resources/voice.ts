import type { VoiceTTSParams, VoiceSTTParams, VoiceSTTResponse } from '../types.js';

export interface VoiceClient {
  _requestMultipart<T>(path: string, formData: FormData): Promise<T>;
  _requestMultipartRaw(path: string, formData: FormData): Promise<Response>;
}

export class Voice {
  private client: VoiceClient;

  constructor(client: VoiceClient) {
    this.client = client;
  }

  /** Generate speech audio from text (TTS). Returns an ArrayBuffer of audio data. */
  async tts(params: VoiceTTSParams): Promise<ArrayBuffer> {
    const formData = new FormData();
    formData.append('model', params.model);
    formData.append('text', params.text);
    if (params.output_format) formData.append('output_format', params.output_format);
    if (params.voiceId) formData.append('voiceId', params.voiceId);
    if (params.sampleVoice) formData.append('sample_voice', params.sampleVoice, 'sample.mp3');

    const response = await this.client._requestMultipartRaw('/v1/text-to-speech', formData);
    return response.arrayBuffer();
  }

  /** Transcribe audio to text (STT). Returns the transcribed text. */
  async stt(params: VoiceSTTParams): Promise<string> {
    const formData = new FormData();
    formData.append('model', params.model);
    formData.append('file', params.file, (params.file as File).name || 'audio.webm');
    if (params.language) formData.append('language', params.language);

    const result = await this.client._requestMultipart<VoiceSTTResponse>('/v1/speech-to-text', formData);
    return result.text;
  }
}

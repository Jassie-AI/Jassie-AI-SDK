import type { ClientInterface, VoiceTTSParams, VoiceSTTParams, VoiceSTTResponse, VoicePreset, VoiceListResponse } from '../types.js';

export class Voice {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** List all available voice presets with metadata and preview URLs. */
  async list(): Promise<VoicePreset[]> {
    const result = await this.client._request<VoiceListResponse>('GET', '/voices');
    return result.voices;
  }

  /** Get the audio preview for a voice preset. Returns an ArrayBuffer of MP3 data. */
  async preview(voiceId: string): Promise<ArrayBuffer> {
    const response = await this.client._request<Response>('GET', `/voices/${voiceId}/preview`);
    // The raw response is returned when the content type is not JSON
    return (response as unknown as Response).arrayBuffer();
  }

  /** Generate speech audio from text (TTS). Returns an ArrayBuffer of audio data. */
  async tts(params: VoiceTTSParams): Promise<ArrayBuffer> {
    const formData = new FormData();
    formData.append('model', params.model);
    formData.append('text', params.text);
    if (params.output_format) formData.append('output_format', params.output_format);
    if (params.voiceId) formData.append('voiceId', params.voiceId);
    if (params.sampleVoice) {
      const sampleBlob = params.sampleVoice instanceof Blob
        ? params.sampleVoice
        : new Blob([params.sampleVoice], { type: 'audio/mpeg' });
      formData.append('sample_voice', sampleBlob, 'sample.mp3');
    }

    const response = await this.client._requestMultipartRaw('/v1/text-to-speech', formData);
    return response.arrayBuffer();
  }

  /** Transcribe audio to text (STT). Returns the transcribed text. */
  async stt(params: VoiceSTTParams): Promise<string> {
    const formData = new FormData();
    formData.append('model', params.model);
    formData.append('file', params.file, (params.file as File).name || 'audio.webm');

    const result = await this.client._requestMultipart<VoiceSTTResponse>('/v1/speech-to-text', formData);
    return result.text;
  }
}

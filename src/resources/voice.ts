import type { ClientInterface, VoiceTTSParams, VoiceSTTParams, VoiceChatParams, VoiceSTTResponse, VoicePreset, VoiceListResponse } from '../types.js';
import type { VoiceChatStream } from '../streaming/voice-chat-stream.js';

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

  /**
   * Start a real-time voice chat session.
   * Sends audio + conversation history to the server and returns
   * a VoiceChatStream that yields events: searching, text_chunk, audio, done, error.
   */
  chat(params: VoiceChatParams): VoiceChatStream {
    const formData = new FormData();
    const audioBlob = params.audio instanceof Blob ? params.audio : new Blob([params.audio]);
    formData.append('audio', audioBlob, 'recording.webm');
    if (params.messages) {
      formData.append('messages', JSON.stringify(params.messages));
    }
    if (params.speaker) formData.append('speaker', params.speaker);
    if (params.instruct) formData.append('instruct', params.instruct);
    if (params.language) formData.append('language', params.language);

    return this.client._voiceChatStream('/v1/voice', formData);
  }
}

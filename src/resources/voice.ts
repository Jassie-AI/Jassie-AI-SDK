import type { ClientInterface, VoiceTTSParams, VoiceSTTParams, VoiceChatParams, VoiceSTTResponse } from '../types.js';
import type { VoiceChatStream } from '../streaming/voice-chat-stream.js';

export class Voice {
  private client: ClientInterface;

  constructor(client: ClientInterface) {
    this.client = client;
  }

  /** Generate speech audio from text (TTS). Returns an ArrayBuffer of audio data. */
  async tts(params: VoiceTTSParams): Promise<ArrayBuffer> {
    const formData = new FormData();
    formData.append('model', params.model);
    formData.append('text', params.text);
    if (params.instruct) formData.append('instruct', params.instruct);
    if (params.seed != null) formData.append('seed', String(params.seed));

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
   * a VoiceChatStream that yields events: searching, text_chunk, audio_start,
   * audio_chunk, audio_end, audio (fallback), done, error.
   */
  chat(params: VoiceChatParams): VoiceChatStream {
    const formData = new FormData();
    const audioBlob = params.audio instanceof Blob ? params.audio : new Blob([params.audio]);
    formData.append('audio', audioBlob, 'recording.webm');
    if (params.messages) {
      formData.append('messages', JSON.stringify(params.messages));
    }
    if (params.instruct) formData.append('instruct', params.instruct);
    if (params.seed != null) formData.append('seed', String(params.seed));

    return this.client._voiceChatStream('/v1/voice', formData);
  }
}

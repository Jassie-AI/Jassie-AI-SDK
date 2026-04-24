// ── SDK Options ──────────────────────────────────────────────────────────────

export type Platform = 'node' | 'web' | 'react-native';

export interface JassieAIOptions {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  platform?: Platform;
}

// ── Messages ─────────────────────────────────────────────────────────────────

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  image?: string | string[];
  video?: string | string[];
}

// ── Models ───────────────────────────────────────────────────────────────────

export type TextModel = 'jassie-pulse' | 'jassie-bolt';
export type CodeModel = 'jassie-code';
export type ImageModel = 'jassie-pixel' | 'jassie-pixel-x';
export type VideoModel = 'jassie-vibe' | 'jassie-motion' | 'jassie-cinema-4k';
export type MusicModel = 'jassie-beat';
export type VoiceModel = 'jassie-voice';

// ── Usage ────────────────────────────────────────────────────────────────────

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ── Streaming Chunk ──────────────────────────────────────────────────────────

export interface JassieChunk {
  type: 'queued' | 'text' | 'error';
  content: string;
  done: boolean;
  index?: number;
  chunks?: number;
  position?: number;
  request_id?: string;
  duration_seconds?: number;
  usage?: Usage;
}

// ── Request Params ───────────────────────────────────────────────────────────

export interface TextGenerateParams {
  model: TextModel;
  messages: Message[];
  stream?: false;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always';
}

export interface TextStreamParams {
  model: TextModel;
  messages: Message[];
  stream?: true;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always';
}

export interface CodeGenerateParams {
  model: CodeModel;
  messages: Message[];
  stream?: false;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always';
}

export interface CodeStreamParams {
  model: CodeModel;
  messages: Message[];
  stream?: true;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always';
}

export interface ImageGenerateParams {
  model: ImageModel;
  prompt: string;
  reference?: string;
  first_image?: string;
  last_image?: string;
  seed?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  width?: number;
  height?: number;
  negative_prompt?: string;
}

export interface VideoGenerateParams {
  model: VideoModel;
  prompt: string;
  duration: number;
  image?: string;
  seed?: number;
  camera_motion?: string;
  negative_prompt?: string;
}

export interface MusicGenerateParams {
  model: MusicModel;
  tags: string;
  lyrics?: string;
  seed?: number;
  duration: number;
}

export interface VoiceTTSParams {
  model: VoiceModel;
  text: string;
  voiceId?: string;
  sampleVoice?: Blob | File;
  output_format?: 'mp3' | 'wav' | 'pcm' | 'opus';
}

export interface VoiceSTTParams {
  model: VoiceModel;
  file: Blob | File;
  language?: string;
}

// ── Response Types ───────────────────────────────────────────────────────────

export interface TextResponse {
  content: string;
  request_id?: string;
  chunks?: number;
  duration_seconds?: number;
  index?: number;
  usage?: Usage;
}

export interface ImageResponse {
  images: string[];
  created: number;
  usage: number;
}

export interface VideoTaskResponse {
  model: string;
  taskId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  videoUrl: string | null;
  expiresOn: string | null;
}

export interface MusicTaskResponse {
  model: string;
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  musicUrl: string | null;
  expiresOn: string | null;
}

export interface VoiceSTTResponse {
  text: string;
}

// ── Polling Options ──────────────────────────────────────────────────────────

export interface PollOptions {
  interval?: number;
  timeout?: number;
  onPoll?: (response: any) => void;
}

// ── Internal Transport Types ─────────────────────────────────────────────────

export interface StreamTransportOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal;
}

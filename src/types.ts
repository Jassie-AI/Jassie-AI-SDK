// ── Client Interface (shared by all resource classes) ────────────────────────

export interface ClientInterface {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
  _requestMultipart<T>(path: string, formData: FormData): Promise<T>;
  _requestMultipartRaw(path: string, formData: FormData): Promise<Response>;
  _stream(method: string, path: string, body: any): import('./streaming/stream.js').JassieStream;
  _imageStream(path: string, body: any): import('./streaming/image-stream.js').ImageStream;
}

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
export type VideoModel = 'jassie-vibe' | 'jassie-motion' | 'jassie-cinema';
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
  type: 'queued' | 'text' | 'thinking' | 'web' | 'web_search' | 'error';
  content: string;
  done: boolean;
  index?: number;
  chunks?: number;
  position?: number;
  request_id?: string;
  duration_seconds?: number;
  query?: string;
  usage?: Usage;
}

// ── Request Params ───────────────────────────────────────────────────────────

export interface TextGenerateParams {
  model: TextModel;
  messages: Message[];
  stream?: false;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always' | null;
}

export interface TextStreamParams {
  model: TextModel;
  messages: Message[];
  stream?: true;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always' | null;
}

export interface CodeGenerateParams {
  model: CodeModel;
  messages: Message[];
  stream?: false;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always' | null;
}

export interface CodeStreamParams {
  model: CodeModel;
  messages: Message[];
  stream?: true;
  maxTokens?: number;
  temperature?: number;
  web?: 'auto' | 'always' | null;
}

export interface ImageGenerateParams {
  model: ImageModel;
  prompt: string;
  image?: string | string[];
  aspectRatio?: string;
  n?: number;
}

export interface VideoReference {
  type: 'image' | 'video' | 'audio';
  url: string;
}

export interface VideoGenerateParams {
  model: VideoModel;
  prompt: string;
  duration?: number;
  references?: VideoReference[];
  /** @deprecated Use `references` instead. Kept for jassie-vibe / jassie-motion. */
  reference?: string | string[];
  firstFrame?: string;
  lastFrame?: string;
  watermark?: boolean;
  aspectRatio?: string;
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
}

// ── Response Types ───────────────────────────────────────────────────────────

export interface TextResponse {
  content: string;
  web_search?: {
    query: string;
  };
}

export interface ImageTaskResponse {
  type?: 'status' | 'completed' | 'failed';
  model: string;
  taskId: string;
  status: 'pending' | 'preview_ready' | 'succeeded' | 'failed';
  imageUrl: string | null;
  expiresOn: string | null;
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

// ── Image Streaming Events ───────────────────────────────────────────────────

export interface ImageStreamStatus {
  type: 'status';
  model: string;
  taskId: string;
  status: string;
}

export interface ImageStreamPreview {
  type: 'preview';
  model: string;
  taskId: string;
  imageUrl: string;
}

export interface ImageStreamCompleted {
  type: 'completed';
  model: string;
  taskId: string;
  status: string;
  imageUrl: string | null;
  expiresOn: string | null;
}

export interface ImageStreamFailed {
  type: 'failed';
  model: string;
  taskId: string;
  status: string;
  imageUrl: null;
  expiresOn: null;
  error: string;
}

export type ImageStreamEvent =
  | ImageStreamStatus
  | ImageStreamPreview
  | ImageStreamCompleted
  | ImageStreamFailed;

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

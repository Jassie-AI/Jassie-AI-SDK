// ── Client Interface (shared by all resource classes) ────────────────────────

export interface ClientInterface {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
  _requestRaw(method: string, path: string): Promise<Response>;
  _requestMultipart<T>(path: string, formData: FormData): Promise<T>;
  _requestMultipartRaw(path: string, formData: FormData): Promise<Response>;
  _stream(method: string, path: string, body: any): import('./streaming/stream.js').JassieStream;
  _imageStream(path: string, body: any): import('./streaming/image-stream.js').ImageStream;
  _voiceChatStream(path: string, formData: FormData): import('./streaming/voice-chat-stream.js').VoiceChatStream;
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
  showcase?: boolean;
}

export interface Reference {
  type: 'image' | 'video' | 'audio';
  url: string;
}

export interface VideoGenerateParams {
  model: VideoModel;
  prompt: string;
  duration?: number;
  references?: Reference[];
  firstFrame?: string;
  lastFrame?: string;
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
  /** Instructions for speech style (e.g. tone, emotion, pacing). */
  instruct?: string;
}

export interface VoiceSTTParams {
  model: VoiceModel;
  file: Blob | File;
}

export interface VoiceChatParams {
  audio: Blob | File;
  messages?: { role: string; content: string }[];
  speaker?: string;
  instruct?: string;
}

// ── Voice Chat Streaming Events ─────────────────────────────────────────────

export interface VoiceChatSearching {
  type: 'searching';
}

export interface VoiceChatTextChunk {
  type: 'text_chunk';
  text_chunk: string;
}

export interface VoiceChatAudio {
  type: 'audio';
  audio: string;
  sentence: string;
}

export interface VoiceChatDone {
  type: 'done';
  text: string;
  user_text: string;
}

export interface VoiceChatError {
  type: 'error';
  error: string;
}

export type VoiceChatEvent =
  | VoiceChatSearching
  | VoiceChatTextChunk
  | VoiceChatAudio
  | VoiceChatDone
  | VoiceChatError;

// ── Response Types ───────────────────────────────────────────────────────────

export interface TextResponse {
  type: 'text' | 'error';
  content: string;
  index?: number;
  request_id?: string;
  chunks?: number;
  duration_seconds?: number;
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

// ── Voice Presets ───────────────────────────────────────────────────────────

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  isDefault: boolean;
  previewUrl: string;
}

export interface VoiceListResponse {
  voices: VoicePreset[];
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
  showcase?: boolean;
}

// ── Internal Transport Types ─────────────────────────────────────────────────

export interface StreamTransportOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal;
}

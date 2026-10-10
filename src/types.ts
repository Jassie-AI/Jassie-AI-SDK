// ── Client Interface (shared by all resource classes) ────────────────────────

export interface ClientInterface {
  _request<T>(method: string, path: string, body?: any): Promise<T>;
  _requestRaw(method: string, path: string, body?: any): Promise<Response>;
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
  images?: string[];
  video?: string | string[];
}

// ── Models ───────────────────────────────────────────────────────────────────

/**
 * @deprecated `jassie-pulse` was folded into `jassie-bolt`; the API still
 * accepts it and answers with Bolt. Use `'jassie-bolt'`. Removed in 2.0.
 */
export type DeprecatedTextModel = 'jassie-pulse';
export type TextModel = 'jassie-bolt' | DeprecatedTextModel;
export type CodeModel = 'jassie-code';
export type ImageModel = 'jassie-pixel' | 'jassie-pixel-x' | 'jassie-pixel-lite';
export type VideoModel = 'jassie-vibe' | 'jassie-motion' | 'jassie-cinema';
export type MusicModel = 'jassie-beat';
// ── Usage ────────────────────────────────────────────────────────────────────

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ── Streaming Chunk ──────────────────────────────────────────────────────────

export interface JassieChunk {
  type: 'queued' | 'text' | 'thinking' | 'web' | 'web_search' | 'error' | 'start' | 'done' | 'queue_position';
  content?: string;
  done?: boolean;
  data?: string;
  fallback?: boolean;
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
  reasoning?: 'deep' | 'balanced' | 'quick' | 'none';
}

export interface TextStreamParams {
  model: TextModel;
  messages: Message[];
  stream?: true;
  maxTokens?: number;
  temperature?: number;
  reasoning?: 'deep' | 'balanced' | 'quick' | 'none';
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content?: string;
  images?: string[];
  video?: string[];
}

export interface ConversationStreamParams {
  messages: ConversationMessage[];
  stream?: true;
  max_tokens?: number;
  maxTokens?: number;
  temperature?: number;
  reasoning?: 'deep' | 'balanced' | 'quick' | 'none';
}

export interface CodeGenerateParams {
  model: CodeModel;
  messages: Message[];
  stream?: false;
  maxTokens?: number;
  temperature?: number;
  reasoning?: 'deep' | 'balanced' | 'quick' | 'none';
}

export interface CodeStreamParams {
  model: CodeModel;
  messages: Message[];
  stream?: true;
  maxTokens?: number;
  temperature?: number;
  reasoning?: 'deep' | 'balanced' | 'quick' | 'none';
}

export interface ImageGenerateParams {
  model: ImageModel;
  prompt: string;
  image?: string | string[];
  aspectRatio?: string;
  width?: number;
  height?: number;
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

// ── Planner ─────────────────────────────────────────────────────────────────

export type PlanComplexity = 'simple' | 'standard' | 'complex';

export type PlanDomain =
  | 'research'
  | 'code'
  | 'content'
  | 'infrastructure'
  | 'design'
  | 'testing'
  | 'general';

export type StepStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'skipped';

export type ExecutionStrategy = 'sequential' | 'parallel' | 'best_effort';

export interface PlanTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface PlanParams {
  query: string;
  context?: Message[];
  tools?: PlanTool[];
  system_prompt?: string;
  project_context?: string;
}

export interface HierarchicalPlanParams extends PlanParams {
  version?: number;
  complexity_hint?: PlanComplexity;
  max_phases?: number;
  max_steps_per_phase?: number;
  decompose?: boolean;
}

export interface PlanStep {
  id: number;
  tool: string;
  description: string;
  params: Record<string, unknown>;
  depends_on: number[];
  domain?: PlanDomain;
  status?: StepStatus;
  substeps?: PlanStep[];
  phase_id?: string;
  retry_count?: number;
  error?: string;
  result_summary?: string;
}

export interface PlanPhase {
  id: string;
  title: string;
  description: string;
  domain?: PlanDomain;
  execution_strategy: ExecutionStrategy;
  steps: PlanStep[];
  status?: StepStatus;
  depends_on_phases?: string[];
}

export interface ArchitectureDecision {
  decision: string;
  rationale: string;
}

export interface PlanResponse {
  type: 'chat' | 'task' | 'clarify';
  steps?: PlanStep[];
  questions?: string[];
  message?: string;
}

export interface HierarchicalPlanResponse extends PlanResponse {
  complexity?: PlanComplexity;
  title?: string;
  summary?: string;
  phases?: PlanPhase[];
  architecture_decisions?: ArchitectureDecision[];
}

export interface DecomposeParams {
  step: PlanStep;
  tools: PlanTool[];
  context?: string;
}

export interface DecomposeResponse {
  substeps: PlanStep[];
}

// ── Response Types ───────────────────────────────────────────────────────────

export interface TextResponse {
  type: 'text' | 'error';
  content: string;
  index?: number;
  request_id?: string;
  chunks?: number;
  duration_seconds?: number;
}

export interface ImageTaskResponse {
  type?: 'status' | 'completed' | 'failed';
  model: string;
  taskId: string;
  status: 'pending' | 'preview_ready' | 'succeeded' | 'failed' | 'cancelled';
  imageUrl: string | null;
  expiresOn: string | null;
}

export interface VideoTaskResponse {
  model: string;
  taskId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  videoUrl: string | null;
  expiresOn: string | null;
}

export interface MusicTaskResponse {
  model: string;
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  musicUrl: string | null;
  expiresOn: string | null;
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

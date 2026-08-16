import { JassieAI } from './client.js';

export { JassieAI } from './client.js';
export default JassieAI;

// Types
export type {
  JassieAIOptions,
  Platform,
  Message,
  TextModel,
  CodeModel,
  ImageModel,
  VideoModel,
  MusicModel,
  Usage,
  JassieChunk,
  ConversationMessage,
  ConversationStreamParams,
  TextGenerateParams,
  TextStreamParams,
  CodeGenerateParams,
  CodeStreamParams,
  ImageGenerateParams,
  Reference,
  VideoGenerateParams,
  MusicGenerateParams,
  PlanTool,
  PlanParams,
  PlanStep,
  PlanResponse,
  TextResponse,
  ImageTaskResponse,
  VideoTaskResponse,
  MusicTaskResponse,
  PollOptions,
  ImageStreamStatus,
  ImageStreamPreview,
  ImageStreamCompleted,
  ImageStreamFailed,
  ImageStreamEvent,
} from './types.js';

// Errors
export {
  JassieError,
  JassieAPIError,
  JassieAuthenticationError,
  JassieRateLimitError,
  JassieTimeoutError,
  JassieConnectionError,
} from './errors.js';

// TTS
export type { Voice, VoicesResponse, TTSSynthesizeParams } from './resources/tts.js';

// Streaming
export { JassieStream } from './streaming/stream.js';
export { ImageStream } from './streaming/image-stream.js';

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
  Speaker,
  ConversationParams,
  TextGenerateParams,
  TextStreamParams,
  CodeGenerateParams,
  CodeStreamParams,
  ImageGenerateParams,
  Reference,
  VideoGenerateParams,
  MusicGenerateParams,
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

// Streaming
export { JassieStream } from './streaming/stream.js';
export { ImageStream } from './streaming/image-stream.js';

// Resources
export { Conversation } from './resources/conversation.js';

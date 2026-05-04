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
  VoiceModel,
  Usage,
  JassieChunk,
  TextGenerateParams,
  TextStreamParams,
  CodeGenerateParams,
  CodeStreamParams,
  ImageGenerateParams,
  Reference,
  VideoGenerateParams,
  MusicGenerateParams,
  VoiceTTSParams,
  VoiceSTTParams,
  VoiceChatParams,
  TextResponse,
  ImageTaskResponse,
  VideoTaskResponse,
  MusicTaskResponse,
  VoiceSTTResponse,
  VoicePreset,
  VoiceListResponse,
  PollOptions,
  ImageStreamStatus,
  ImageStreamPreview,
  ImageStreamCompleted,
  ImageStreamFailed,
  ImageStreamEvent,
  VoiceChatSearching,
  VoiceChatTextChunk,
  VoiceChatAudio,
  VoiceChatDone,
  VoiceChatError,
  VoiceChatEvent,
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
export { VoiceChatStream } from './streaming/voice-chat-stream.js';

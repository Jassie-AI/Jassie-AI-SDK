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
  VideoGenerateParams,
  MusicGenerateParams,
  VoiceTTSParams,
  VoiceSTTParams,
  TextResponse,
  ImageResponse,
  VideoTaskResponse,
  MusicTaskResponse,
  VoiceSTTResponse,
  PollOptions,
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

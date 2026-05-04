import type { JassieAIOptions, Platform, StreamTransportOptions, VoiceChatEvent } from './types.js';
import {
  JassieAPIError,
  JassieAuthenticationError,
  JassieConnectionError,
  JassieRateLimitError,
  JassieTimeoutError,
} from './errors.js';
import { JassieStream } from './streaming/stream.js';
import { ImageStream } from './streaming/image-stream.js';
import { VoiceChatStream } from './streaming/voice-chat-stream.js';
import { detectPlatform } from './streaming/platform.js';
import { startFetchTransport } from './streaming/transport-fetch.js';
import { startXHRTransport } from './streaming/transport-xhr.js';
import { Text } from './resources/text.js';
import { Code } from './resources/code.js';
import { Image } from './resources/image.js';
import { Video } from './resources/video.js';
import { Music } from './resources/music.js';
import { Voice } from './resources/voice.js';

const DEFAULT_BASE_URL = 'https://api.jassie.ai';
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_MAX_RETRIES = 2;

export class JassieAI {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private platform: Platform;

  readonly text: Text;
  readonly code: Code;
  readonly image: Image;
  readonly video: Video;
  readonly music: Music;
  readonly voice: Voice;

  constructor(options: JassieAIOptions) {
    if (!options.apiKey) {
      throw new JassieAuthenticationError('apiKey is required');
    }
    this.apiKey = options.apiKey;
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.platform = options.platform ?? detectPlatform();

    this.text = new Text(this);
    this.code = new Code(this);
    this.image = new Image(this);
    this.video = new Video(this);
    this.music = new Music(this);
    this.voice = new Voice(this);
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /** JSON request with retry logic */
  async _request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const headers = this.buildHeaders();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.backoff(attempt, lastError);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          let errorBody: any;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = { error: response.statusText };
          }

          const err = JassieAPIError.fromResponse(response.status, errorBody);

          // Don't retry 4xx (except 429)
          if (response.status !== 429 && response.status < 500) {
            throw err;
          }
          lastError = err;
          continue;
        }

        return (await response.json()) as T;
      } catch (err: any) {
        clearTimeout(timer);

        // Already a Jassie error that shouldn't be retried
        if (err instanceof JassieAPIError && err.status < 500 && err.status !== 429) {
          throw err;
        }

        if (err?.name === 'AbortError') {
          lastError = new JassieTimeoutError();
          continue;
        }

        if (err instanceof JassieAPIError || err instanceof JassieRateLimitError) {
          lastError = err;
          continue;
        }

        lastError = new JassieConnectionError(err?.message ?? 'Request failed');
        continue;
      }
    }

    throw lastError ?? new JassieConnectionError('Request failed');
  }

  /** Raw request with retry logic — returns the raw Response (for binary data like audio). */
  async _requestRaw(method: string, path: string): Promise<Response> {
    const url = `${this.baseURL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.backoff(attempt, lastError);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          let errorBody: any;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = { error: response.statusText };
          }

          const err = JassieAPIError.fromResponse(response.status, errorBody);

          if (response.status !== 429 && response.status < 500) {
            throw err;
          }
          lastError = err;
          continue;
        }

        return response;
      } catch (err: any) {
        clearTimeout(timer);

        if (err instanceof JassieAPIError && err.status < 500 && err.status !== 429) {
          throw err;
        }

        if (err?.name === 'AbortError') {
          lastError = new JassieTimeoutError();
          continue;
        }

        if (err instanceof JassieAPIError || err instanceof JassieRateLimitError) {
          lastError = err;
          continue;
        }

        lastError = new JassieConnectionError(err?.message ?? 'Request failed');
        continue;
      }
    }

    throw lastError ?? new JassieConnectionError('Request failed');
  }

  /** Multipart form-data request with retry logic — returns parsed JSON */
  async _requestMultipart<T>(path: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.backoff(attempt, lastError);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          let errorBody: any;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = { error: response.statusText };
          }

          const err = JassieAPIError.fromResponse(response.status, errorBody);

          // Don't retry 4xx (except 429)
          if (response.status !== 429 && response.status < 500) {
            throw err;
          }
          lastError = err;
          continue;
        }

        return (await response.json()) as T;
      } catch (err: any) {
        clearTimeout(timer);

        // Already a Jassie error that shouldn't be retried
        if (err instanceof JassieAPIError && err.status < 500 && err.status !== 429) {
          throw err;
        }

        if (err?.name === 'AbortError') {
          lastError = new JassieTimeoutError();
          continue;
        }

        if (err instanceof JassieAPIError || err instanceof JassieRateLimitError) {
          lastError = err;
          continue;
        }

        lastError = new JassieConnectionError(err?.message ?? 'Request failed');
        continue;
      }
    }

    throw lastError ?? new JassieConnectionError('Request failed');
  }

  /** Multipart form-data request with retry logic — returns raw Response (for binary data) */
  async _requestMultipartRaw(path: string, formData: FormData): Promise<Response> {
    const url = `${this.baseURL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.backoff(attempt, lastError);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          let errorBody: any;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = { error: response.statusText };
          }

          const err = JassieAPIError.fromResponse(response.status, errorBody);

          // Don't retry 4xx (except 429)
          if (response.status !== 429 && response.status < 500) {
            throw err;
          }
          lastError = err;
          continue;
        }

        return response;
      } catch (err: any) {
        clearTimeout(timer);

        // Already a Jassie error that shouldn't be retried
        if (err instanceof JassieAPIError && err.status < 500 && err.status !== 429) {
          throw err;
        }

        if (err?.name === 'AbortError') {
          lastError = new JassieTimeoutError();
          continue;
        }

        if (err instanceof JassieAPIError || err instanceof JassieRateLimitError) {
          lastError = err;
          continue;
        }

        lastError = new JassieConnectionError(err?.message ?? 'Request failed');
        continue;
      }
    }

    throw lastError ?? new JassieConnectionError('Request failed');
  }

  /** Start a streaming request, returns JassieStream async iterable */
  _stream(method: string, path: string, body: any): JassieStream {
    const stream = new JassieStream();
    const transportOptions: StreamTransportOptions = {
      url: `${this.baseURL}${path}`,
      method,
      headers: {
        ...this.buildHeaders(),
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
      body: JSON.stringify(body),
      signal: stream.signal,
    };

    if (this.platform === 'react-native') {
      startXHRTransport(transportOptions, stream);
    } else {
      startFetchTransport(transportOptions, stream);
    }

    return stream;
  }

  /** Start a streaming image request, returns ImageStream async iterable */
  _imageStream(path: string, body: any): ImageStream {
    const stream = new ImageStream();
    const url = `${this.baseURL}${path}`;
    const isGet = body === null || body === undefined;
    const headers: Record<string, string> = {
      ...this.buildHeaders(),
      'Cache-Control': 'no-cache',
    };
    if (isGet) delete headers['Content-Type'];

    (async () => {
      let response: Response;
      try {
        response = await fetch(url, {
          method: isGet ? 'GET' : 'POST',
          headers,
          body: isGet ? undefined : JSON.stringify(body),
          signal: stream.signal,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          stream._end();
        } else {
          stream._error(new JassieConnectionError(err?.message));
        }
        return;
      }

      if (!response.ok) {
        let errorBody: any;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { error: response.statusText };
        }
        stream._error(JassieAPIError.fromResponse(response.status, errorBody));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        stream._error(new JassieConnectionError('Response body is not readable'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const parseLine = (raw: string) => {
        let trimmed = raw.trim();
        if (!trimmed) return;
        // SSE format: strip "data: " prefix
        if (trimmed.startsWith('data: ')) trimmed = trimmed.slice(6);
        if (!trimmed || trimmed === '[DONE]') return;
        try {
          stream._push(JSON.parse(trimmed));
        } catch {}
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop()!;

          for (const line of lines) {
            parseLine(line);
          }
        }

        // Flush remaining
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            parseLine(line);
          }
        }

        stream._end();
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          stream._end();
        } else {
          stream._error(
            err instanceof Error ? err : new JassieConnectionError(String(err)),
          );
        }
      }
    })();

    return stream;
  }

  /** Start a multipart SSE stream for voice chat, returns VoiceChatStream async iterable */
  _voiceChatStream(path: string, formData: FormData): VoiceChatStream {
    const stream = new VoiceChatStream();
    const url = `${this.baseURL}${path}`;

    (async () => {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          body: formData,
          signal: stream.signal,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          stream._end();
        } else {
          stream._error(new JassieConnectionError(err?.message));
        }
        return;
      }

      if (!response.ok) {
        let errorBody: any;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { error: response.statusText };
        }
        stream._error(JassieAPIError.fromResponse(response.status, errorBody));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        stream._error(new JassieConnectionError('Response body is not readable'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const parseLine = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;
        let data = trimmed;
        if (data.startsWith('data: ')) data = data.slice(6);
        if (!data || data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          let event: VoiceChatEvent | null = null;
          if (parsed.done) {
            event = { type: 'done', text: parsed.text, user_text: parsed.user_text };
          } else if (parsed.searching) {
            event = { type: 'searching' };
          } else if (parsed.text_chunk !== undefined) {
            event = { type: 'text_chunk', text_chunk: parsed.text_chunk };
          } else if (parsed.audio) {
            event = { type: 'audio', audio: parsed.audio, sentence: parsed.sentence };
          } else if (parsed.error) {
            event = { type: 'error', error: parsed.error };
          }
          if (event) stream._push(event);
        } catch {}
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop()!;

          for (const line of lines) {
            parseLine(line);
          }
        }

        // Flush remaining
        if (buffer.trim()) {
          for (const line of buffer.split('\n')) {
            parseLine(line);
          }
        }

        stream._end();
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          stream._end();
        } else {
          stream._error(
            err instanceof Error ? err : new JassieConnectionError(String(err)),
          );
        }
      }
    })();

    return stream;
  }

  private async backoff(attempt: number, lastError: Error | null): Promise<void> {
    let delay: number;

    if (lastError instanceof JassieRateLimitError && lastError.retryAfter) {
      delay = lastError.retryAfter * 1000;
    } else {
      // Exponential backoff: 500ms, 1000ms, 2000ms...
      delay = Math.min(500 * Math.pow(2, attempt - 1), 8000);
      // Add jitter
      delay += Math.random() * 500;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

import type { JassieAIOptions, Platform, StreamTransportOptions } from './types.js';
import {
  JassieAPIError,
  JassieAuthenticationError,
  JassieConnectionError,
  JassieRateLimitError,
  JassieTimeoutError,
} from './errors.js';
import { JassieStream } from './streaming/stream.js';
import { detectPlatform } from './streaming/platform.js';
import { startFetchTransport } from './streaming/transport-fetch.js';
import { startXHRTransport } from './streaming/transport-xhr.js';
import { Text } from './resources/text.js';
import { Code } from './resources/code.js';
import { Image } from './resources/image.js';
import { Video } from './resources/video.js';
import { Music } from './resources/music.js';

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

  /** Start a streaming request, returns JassieStream async iterable */
  _stream(method: string, path: string, body: any): JassieStream {
    const stream = new JassieStream();
    const transportOptions: StreamTransportOptions = {
      url: `${this.baseURL}${path}`,
      method,
      headers: this.buildHeaders(),
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

import type { StreamTransportOptions } from '../types.js';
import { JassieAPIError, JassieConnectionError } from '../errors.js';
import { SSEParser } from './sse-parser.js';
import { JassieStream } from './stream.js';

export function startFetchTransport(
  options: StreamTransportOptions,
  stream: JassieStream,
): void {
  const { url, method, headers, body, signal } = options;

  (async () => {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        signal,
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
    const parser = new SSEParser();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const chunks = parser.feed(text);
        for (const chunk of chunks) {
          stream._push(chunk);
        }
      }
      // Flush remaining buffer
      const remaining = parser.flush();
      for (const chunk of remaining) {
        stream._push(chunk);
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
}

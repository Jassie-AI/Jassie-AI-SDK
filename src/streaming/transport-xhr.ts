import type { StreamTransportOptions } from '../types.js';
import { JassieAPIError, JassieConnectionError, JassieTimeoutError } from '../errors.js';
import { SSEParser } from './sse-parser.js';
import { JassieStream } from './stream.js';

export function startXHRTransport(
  options: StreamTransportOptions,
  stream: JassieStream,
): void {
  const { url, method, headers, body, signal } = options;
  const xhr = new XMLHttpRequest();
  const parser = new SSEParser();
  let lastIndex = 0;
  let poll: ReturnType<typeof setInterval> | null = null;

  xhr.open(method, url, true);
  for (const [key, value] of Object.entries(headers)) {
    xhr.setRequestHeader(key, value);
  }

  // Wire abort signal
  if (signal) {
    if (signal.aborted) {
      stream._end();
      return;
    }
    signal.addEventListener('abort', () => {
      xhr.abort();
    });
  }

  /**
   * Read any new data appended to xhr.responseText since lastIndex,
   * feed it through the SSE parser, and push parsed chunks to the stream.
   * Safe to call multiple times — lastIndex deduplicates.
   */
  const processIncrementalData = (): void => {
    try {
      const fullText = xhr.responseText;
      if (!fullText || fullText.length <= lastIndex) return;

      const delta = fullText.slice(lastIndex);
      lastIndex = fullText.length;

      const chunks = parser.feed(delta);
      for (const chunk of chunks) {
        stream._push(chunk);
      }
    } catch {
      // responseText may throw if accessed in wrong readyState on some platforms
    }
  };

  const stopPolling = (): void => {
    if (poll !== null) {
      clearInterval(poll);
      poll = null;
    }
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState >= 3) {
      processIncrementalData();
    }
  };

  xhr.onprogress = processIncrementalData;

  xhr.onload = () => {
    stopPolling();
    processIncrementalData();

    const remaining = parser.flush();
    for (const chunk of remaining) {
      stream._push(chunk);
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      stream._end();
    } else {
      let errorBody: any;
      try {
        errorBody = JSON.parse(xhr.responseText);
      } catch {
        errorBody = { error: xhr.statusText };
      }
      stream._error(JassieAPIError.fromResponse(xhr.status, errorBody));
    }
  };

  xhr.onerror = () => {
    stopPolling();
    stream._error(new JassieConnectionError('XHR network error'));
  };

  xhr.ontimeout = () => {
    stopPolling();
    stream._error(new JassieTimeoutError());
  };

  xhr.onabort = () => {
    stopPolling();
    stream._end();
  };

  xhr.send(body);

  // Polling fallback — React Native's XHR polyfill may not fire
  // onprogress/onreadystatechange incrementally for SSE responses.
  // Poll responseText every 100ms to pick up new data regardless.
  poll = setInterval(() => {
    if (xhr.readyState >= 3) {
      processIncrementalData();
    }
  }, 100);
}

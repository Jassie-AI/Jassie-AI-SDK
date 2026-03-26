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

  xhr.open(method, url, true);
  xhr.responseType = 'text';
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

  xhr.onprogress = () => {
    const fullText = xhr.responseText;
    if (fullText.length <= lastIndex) return;
    const delta = fullText.slice(lastIndex);
    lastIndex = fullText.length;

    const chunks = parser.feed(delta);
    for (const chunk of chunks) {
      stream._push(chunk);
    }
  };

  xhr.onload = () => {
    // Process any remaining data
    const fullText = xhr.responseText;
    if (fullText.length > lastIndex) {
      const delta = fullText.slice(lastIndex);
      const chunks = parser.feed(delta);
      for (const chunk of chunks) {
        stream._push(chunk);
      }
    }
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
    stream._error(new JassieConnectionError('XHR network error'));
  };

  xhr.ontimeout = () => {
    stream._error(new JassieTimeoutError());
  };

  xhr.onabort = () => {
    stream._end();
  };

  xhr.send(body);
}

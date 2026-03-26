import type { JassieChunk } from '../types.js';

export class SSEParser {
  private buffer = '';

  feed(text: string): JassieChunk[] {
    this.buffer += text;
    const chunks: JassieChunk[] = [];

    // Split on double-newline (SSE event boundary)
    const parts = this.buffer.split('\n\n');
    // Last part may be incomplete — keep it in the buffer
    this.buffer = parts.pop()!;

    for (const part of parts) {
      const chunk = this.parseEvent(part);
      if (chunk) chunks.push(chunk);
    }

    return chunks;
  }

  flush(): JassieChunk[] {
    if (!this.buffer.trim()) return [];
    const chunk = this.parseEvent(this.buffer);
    this.buffer = '';
    return chunk ? [chunk] : [];
  }

  private parseEvent(raw: string): JassieChunk | null {
    for (const line of raw.split('\n')) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') return null;
        try {
          return JSON.parse(data) as JassieChunk;
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

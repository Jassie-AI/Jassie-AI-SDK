# Jassie AI SDK

[![npm version](https://img.shields.io/npm/v/jassie-ai.svg)](https://www.npmjs.com/package/jassie-ai)
[![npm downloads](https://img.shields.io/npm/dm/jassie-ai.svg)](https://www.npmjs.com/package/jassie-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official TypeScript SDK for the [Jassie AI](https://jassie.ai) API — built by [Airbin](https://airbin.app).

Generate text, code, images, videos, music, and speech — all from one SDK. Works with Node.js, React, Next.js, Vue, Angular, Svelte, React Native, Deno, Bun, and every JS/TS runtime.

- Zero runtime dependencies
- Full TypeScript support with strict types
- Real-time streaming via Server-Sent Events (SSE)
- Automatic retries with exponential backoff

---

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Text Generation](#text-generation)
- [Code Generation](#code-generation)
- [Image Generation](#image-generation)
- [Video Generation](#video-generation)
- [Music Generation](#music-generation)
- [Voice (TTS & STT)](#voice-tts--stt)
- [Streaming](#streaming)
- [Error Handling](#error-handling)
- [React Native](#react-native)
- [About](#about)

---

## Installation

```bash
npm install jassie-ai
```

---

## Setup

```typescript
import JassieAI from 'jassie-ai';

const client = new JassieAI({ apiKey: 'your-api-key' });
```

---

## Text Generation

| Model | Description |
|---|---|
| `jassie-pulse` | Lightning-fast text intelligence with million-token context |
| `jassie-bolt` | Flagship multimodal model — text, images, and video input |

```typescript
// Non-streaming
const response = await client.text.generate({
  model: 'jassie-pulse',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain how DNS works.' },
  ],
  web: 'auto',
});

console.log(response.content);
console.log(response.web_search?.query); // search query, if web search was used

// Streaming
const stream = client.text.generate({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Write a poem about the ocean.' }],
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.type === 'text') process.stdout.write(chunk.content);
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-pulse' \| 'jassie-bolt'` | **Yes** | — | Model to use |
| `messages` | `Message[]` | **Yes** | — | Array of conversation messages |
| `stream` | `boolean` | No | `false` | Enable real-time streaming |
| `maxTokens` | `number` | No | `5000` | Maximum tokens in the response |
| `temperature` | `number` | No | `0.7` | Randomness (0 = deterministic, 2 = creative) |
| `web` | `'auto' \| 'always' \| null` | No | `null` | Web search mode |

**Message format:** `{ role: 'system' | 'user' | 'assistant', content: string, image?: string | string[], video?: string | string[] }`

### Response (non-streaming)

| Field | Type | Description |
|---|---|---|
| `content` | `string` | The generated text |
| `web_search` | `{ query: string }` | Present when a web search was performed |

---

## Code Generation

| Model | Description |
|---|---|
| `jassie-code` | Writes, refactors, and debugs across dozens of languages |

```typescript
const response = await client.code.generate({
  model: 'jassie-code',
  messages: [{ role: 'user', content: 'Write a function to reverse a linked list in Python.' }],
});

console.log(response.content);
```

Same parameters and response format as [Text Generation](#parameters).

---

## Image Generation

| Model | Description |
|---|---|
| `jassie-pixel` | Photorealistic 2K image generation |
| `jassie-pixel-x` | 4K ultra-high-resolution image generation |

Two modes: **v1 (synchronous)** blocks until done, **v2 (asynchronous)** returns a `taskId` immediately.

```typescript
// v1 — Synchronous (blocks until image is ready)
const result = await client.image.generate({
  model: 'jassie-pixel',
  prompt: 'A sunset over mountains, digital art style',
});
console.log(result.imageUrl);

// v2 — Asynchronous (returns immediately)
const task = await client.image.generateAsync({
  model: 'jassie-pixel-x',
  prompt: 'A futuristic cityscape at night',
  aspectRatio: '16:9',
});

// Check status (single check)
const status = await client.image.status(task.taskId);

// Or poll until done
const final = await client.image.status(task.taskId, {
  interval: 3000,
  timeout: 120000,
  onPoll: (res) => console.log(res.status),
});

// Or stream live updates (SSE)
const stream = client.image.statusStream(task.taskId);
for await (const event of stream) {
  if (event.type === 'preview') console.log('Preview:', event.imageUrl);
  if (event.type === 'completed') console.log('Done:', event.imageUrl);
  if (event.type === 'failed') console.error('Failed:', event.error);
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-pixel' \| 'jassie-pixel-x'` | **Yes** | — | Model (`pixel` = 2K, `pixel-x` = 4K) |
| `prompt` | `string` | **Yes** | — | Image description |
| `image` | `string \| string[]` | No | — | Input image URL(s) for editing or composition (up to 14) |
| `aspectRatio` | `string` | No | `'1:1'` | `'1:1'`, `'4:3'`, `'3:4'`, `'16:9'`, `'9:16'`, `'3:2'`, `'2:3'`, `'21:9'` |
| `n` | `number` | No | `1` | Number of images to generate |

### Response

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'preview_ready' \| 'succeeded' \| 'failed'` | Current status |
| `imageUrl` | `string \| null` | URL to generated image (when `succeeded`) |
| `expiresOn` | `string \| null` | When the image URL expires |

### Stream Events

| Type | Fields | Description |
|---|---|---|
| `status` | `model`, `taskId`, `status` | Status changed (`pending` / `preview_ready`) |
| `preview` | `model`, `taskId`, `imageUrl` | Base64 preview available |
| `completed` | `model`, `taskId`, `imageUrl`, `expiresOn` | Final hosted URL ready |
| `failed` | `model`, `taskId`, `error` | Generation failed |

---

## Video Generation

| Model | Description |
|---|---|
| `jassie-vibe` | 720p HD video generation |
| `jassie-motion` | 1080p Full-HD video generation |
| `jassie-cinema` | 4K cinematic long-form generation *(coming soon)* |

Video generation is **asynchronous** — `generate()` returns a `taskId` immediately.

```typescript
const task = await client.video.generate({
  model: 'jassie-vibe',
  prompt: 'A calm ocean wave crashing on a sandy beach',
  duration: 5,
  aspectRatio: '16:9',
});

const result = await client.video.status(task.taskId);
if (result.status === 'succeeded') console.log(result.videoUrl);
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-vibe' \| 'jassie-motion' \| 'jassie-cinema'` | **Yes** | — | Model (`vibe` = 720p, `motion` = 1080p) |
| `prompt` | `string` | **Yes** | — | Video description |
| `duration` | `number` | No | `5` | Duration in seconds |
| `reference` | `string \| string[]` | No | — | Reference image(s) for style guidance. Mutually exclusive with `firstFrame`/`lastFrame`. |
| `firstFrame` | `string` | No | — | Starting frame image URL |
| `lastFrame` | `string` | No | — | Ending frame image URL |
| `aspectRatio` | `string` | No | `'16:9'` | `'16:9'`, `'4:3'`, `'1:1'`, `'3:4'`, `'9:16'`, `'21:9'`, `'adaptive'` |
| `watermark` | `boolean` | No | `false` | Add watermark |

### Response

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'running' \| 'succeeded' \| 'failed'` | Current status |
| `videoUrl` | `string \| null` | URL to generated video (when `succeeded`) |
| `expiresOn` | `string \| null` | When the video URL expires |

### Polling Options

Pass to `status()` to auto-poll until terminal state:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `interval` | `number` | `5000` | Milliseconds between checks |
| `timeout` | `number` | `600000` | Max wait time in ms |
| `onPoll` | `(response) => void` | — | Callback on each poll |

> Polling options work the same for `image.status()`, `video.status()`, and `music.status()`.

---

## Music Generation

| Model | Description |
|---|---|
| `jassie-beat` | AI music generation — vocal or instrumental |

Music generation is **asynchronous** — same pattern as video.

```typescript
const task = await client.music.generate({
  model: 'jassie-beat',
  tags: 'pop, upbeat, female vocals',
  lyrics: 'Calm and peaceful, floating through the night\nStars above are shining bright',
  duration: 30,
  seed: 42,
});

const result = await client.music.status(task.taskId);
if (result.status === 'completed') console.log(result.musicUrl);
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-beat'` | **Yes** | — | Model to use |
| `tags` | `string` | **Yes** | — | Comma-separated genre/style tags (e.g. `'lo-fi, chill, piano'`) |
| `duration` | `number` | **Yes** | — | Duration in seconds (5–240) |
| `lyrics` | `string` | No | — | Song lyrics. Omit for instrumental. |
| `seed` | `number` | No | Random | Seed for reproducible results |

### Response

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'processing' \| 'completed' \| 'failed'` | Current status |
| `musicUrl` | `string \| null` | URL to generated audio (when `completed`) |
| `expiresOn` | `string \| null` | When the audio URL expires |

---

## Voice (TTS & STT)

| Model | Description |
|---|---|
| `jassie-voice` | TTS (Voxtral) and STT (Whisper). Supports zero-shot voice cloning. |

### Text to Speech

Returns `Promise<ArrayBuffer>` — raw audio bytes.

```typescript
const audio = await client.voice.tts({
  model: 'jassie-voice',
  text: 'Hello, how are you?',
  voiceId: 'brian',              // optional: preset voice
  // sampleVoice: audioBlob,    // optional: clone from sample (2-30s, max 5MB)
  output_format: 'mp3',         // optional: 'mp3' | 'wav' | 'pcm' | 'opus'
});

// Save to file (Node.js)
import fs from 'fs';
fs.writeFileSync('hello.mp3', Buffer.from(audio));
```

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-voice'` | **Yes** | — | Model to use |
| `text` | `string` | **Yes** | — | Text to speak (max 5000 chars) |
| `voiceId` | `string` | No | — | Pre-saved voice ID or preset name |
| `sampleVoice` | `Blob \| File` | No | — | Audio sample for zero-shot cloning. Overrides `voiceId`. |
| `output_format` | `'mp3' \| 'wav' \| 'pcm' \| 'opus'` | No | `'mp3'` | Audio output format |

### Speech to Text

Returns `Promise<string>` — transcribed text. Language is auto-detected.

```typescript
const text = await client.voice.stt({
  model: 'jassie-voice',
  file: audioBlob,   // webm, mp3, wav, ogg, etc. (max 25MB)
});
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `model` | `'jassie-voice'` | **Yes** | Model to use |
| `file` | `Blob \| File` | **Yes** | Audio file to transcribe |

---

## Streaming

Text and code generation support real-time streaming via SSE.

```typescript
const stream = client.text.generate({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});

// Option 1: for-await
for await (const chunk of stream) {
  if (chunk.type === 'text') process.stdout.write(chunk.content);
}

// Option 2: callback
await stream.eachText((text) => process.stdout.write(text));

// Option 3: collect all at once
const fullText = await stream.finalText();

// Abort anytime
stream.abort();
```

### Chunk Types

| Type | Description |
|---|---|
| `text` | Generated content |
| `thinking` | Model reasoning (chain-of-thought) |
| `web` | Web search progress (has `query` field) |
| `web_search` | Web search metadata |
| `queued` | Request queued |
| `error` | Error occurred |

### Stream Methods

| Method | Returns | Description |
|---|---|---|
| `eachText(cb)` | `Promise<void>` | Calls `cb(text)` for each text chunk |
| `finalText()` | `Promise<string>` | Collects all text into a single string |
| `abort()` | `void` | Cancels the stream |

### Image Stream Methods

| Method | Returns | Description |
|---|---|---|
| `eachEvent(cb)` | `Promise<void>` | Calls `cb(event)` for each event |
| `finalResult()` | `Promise<ImageStreamEvent \| null>` | Returns the `completed` event |
| `abort()` | `void` | Cancels the stream |

---

## Error Handling

All errors extend `JassieError`. The SDK auto-retries on `5xx`, `429`, network errors, and timeouts with exponential backoff.

```typescript
import JassieAI, {
  JassieAuthenticationError, // 401
  JassieRateLimitError,      // 429 — has retryAfter field
  JassieAPIError,            // 4xx / 5xx
  JassieTimeoutError,        // timeout exceeded
  JassieConnectionError,     // network failure
} from 'jassie-ai';

try {
  const response = await client.text.generate({ ... });
} catch (error) {
  if (error instanceof JassieRateLimitError) {
    console.error('Retry after:', error.retryAfter, 'seconds');
  } else if (error instanceof JassieAPIError) {
    console.error(`API error ${error.status}: ${error.message}`);
  }
}
```

---

## React Native

The SDK auto-detects React Native and uses `XMLHttpRequest` for streaming. Hermes does not support `for await...of` — use `eachText()` instead:

```typescript
import JassieAI from 'jassie-ai';
const client = new JassieAI({ apiKey: 'your-api-key' });

// Text streaming
const stream = client.text.generate({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hello from React Native!' }],
  stream: true,
});

await stream.eachText((text) => {
  setResponse((prev) => prev + text);
});

// Image streaming
const task = await client.image.generateAsync({
  model: 'jassie-pixel',
  prompt: 'A sunset over mountains',
});

const imgStream = client.image.statusStream(task.taskId);
await imgStream.eachEvent((event) => {
  if (event.type === 'preview') setPreview(event.imageUrl);
  if (event.type === 'completed') setFinalUrl(event.imageUrl);
});
```

### Aborting

```typescript
const streamRef = useRef<{ abort: () => void } | null>(null);

const send = async (prompt: string) => {
  const stream = client.text.generate({
    model: 'jassie-pulse',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });
  streamRef.current = stream;
  await stream.eachText((text) => setResponse((prev) => prev + text));
  streamRef.current = null;
};

const stop = () => streamRef.current?.abort();
```

---

## About

Jassie AI is developed and maintained by [Airbin](https://airbin.app).

- **Harmandeep Mand** — [hmand@airbin.app](mailto:hmand@airbin.app)
- **Muhammad Hanzla** — [itshanzla@airbin.app](mailto:itshanzla@airbin.app)

Website: [airbin.app](https://airbin.app) | API Docs: [jassie.ai](https://jassie.ai)

---

## License

MIT

# Jassie AI SDK

[![npm version](https://img.shields.io/npm/v/jassie-ai.svg)](https://www.npmjs.com/package/jassie-ai)
[![npm downloads](https://img.shields.io/npm/dm/jassie-ai.svg)](https://www.npmjs.com/package/jassie-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official TypeScript SDK for the [Jassie AI](https://jassie.ai) API — built by [Airbin](https://airbin.app).

Generate text, code, images, videos, and music — all from one SDK. Works with Node.js, React, Next.js, Vue, Angular, Svelte, React Native, Deno, Bun, and every JS/TS runtime.

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
- [Web Search](#web-search)
- [Task Planning](#task-planning)
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

### Client Options

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `apiKey` | `string` | **Yes** | — | Your Jassie AI API key |
| `baseURL` | `string` | No | `'https://api.jassie.ai'` | Custom API base URL |
| `timeout` | `number` | No | `60000` | Request timeout in milliseconds |
| `maxRetries` | `number` | No | `2` | Max automatic retries on 5xx/429/network errors |
| `platform` | `'node' \| 'web' \| 'react-native'` | No | Auto-detected | Force a specific platform transport |

### Available Resources

| Resource | Accessor | Description |
|---|---|---|
| Text | `client.text` | Text generation and multimodal conversations |
| Code | `client.code` | Code generation and refactoring |
| Image | `client.image` | Image generation with sync/async modes |
| Video | `client.video` | Video generation with multimodal references |
| Music | `client.music` | AI music and vocal generation |
| Plan | `client.plan` | Agentic task planning with dependency graphs |

---

## Text Generation

| Model | Description |
|---|---|
| `jassie-pulse` | Lightning-fast text intelligence with million-token context |
| `jassie-bolt` | Flagship multimodal model — text, image, and video input with extended thinking |

### `client.text.generate(params)`

Returns a `Promise<TextResponse>` when `stream` is `false` (default), or a `JassieStream` when `stream` is `true`.

```typescript
// Non-streaming
const response = await client.text.generate({
  model: 'jassie-pulse',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain how DNS works.' },
  ],
});

console.log(response.content);

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
| `reasoning` | `'strong' \| 'medium' \| 'low' \| 'off'` | No | — | Controls extended thinking depth. Supported by both Pulse and Bolt. Higher values produce more thorough reasoning at the cost of latency. |

#### Message Type

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  image?: string | string[];   // Image URL(s) — Bolt only
  video?: string | string[];   // Video URL(s) — Bolt only
}
```

> **Note:** The `image` and `video` fields are only supported by `jassie-bolt`. Pulse is a text-only model. Both models support `reasoning`.

### Response — `TextResponse`

| Field | Type | Description |
|---|---|---|
| `type` | `'text' \| 'error'` | Response type |
| `content` | `string` | The generated text |
| `index` | `number` | Output index (starting at 0) |
| `request_id` | `string` | Unique identifier for the request |
| `chunks` | `number` | Total number of tokens generated |
| `duration_seconds` | `number` | Time in seconds the model took to generate the response |

### Stream Chunks — `JassieChunk`

When streaming, the async iterator yields `JassieChunk` objects:

| Type | Key Fields | Description |
|---|---|---|
| `start` | — | Stream has begun |
| `queued` | `position` | Request is queued; `position` is queue position |
| `text` | `content` | Partial text token |
| `thinking` | `content` | Model reasoning/thinking token (when `reasoning` is set) |
| `web_search` | `query` | Web search being performed (jassie-web only) |
| `done` | `content`, `usage`, `chunks`, `duration_seconds`, `request_id` | Stream complete with final metadata |
| `error` | `content` | Error message |

```typescript
interface JassieChunk {
  type: 'queued' | 'text' | 'thinking' | 'web' | 'web_search' | 'error' | 'start' | 'done' | 'queue_position';
  content?: string;
  done?: boolean;
  index?: number;
  chunks?: number;
  position?: number;     // Queue position
  request_id?: string;
  duration_seconds?: number;
  query?: string;        // Web search query
  usage?: Usage;
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
```

### Multimodal Input (Bolt only)

`jassie-bolt` can analyze images and videos passed in messages.

```typescript
// Single image
const response = await client.text.generate({
  model: 'jassie-bolt',
  messages: [
    {
      role: 'user',
      content: 'Describe this image.',
      image: 'https://example.com/photo.jpg',
    },
  ],
});

// Multiple images
const response = await client.text.generate({
  model: 'jassie-bolt',
  messages: [
    {
      role: 'user',
      content: 'Compare these two images.',
      image: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    },
  ],
});

// Video
const response = await client.text.generate({
  model: 'jassie-bolt',
  messages: [
    {
      role: 'user',
      content: 'What is happening in this video?',
      video: 'https://example.com/clip.mp4',
    },
  ],
});
```

### Reasoning (Pulse & Bolt)

Enable extended thinking to get more thorough responses. Both `jassie-pulse` and `jassie-bolt` support reasoning. Reasoning tokens are streamed as `thinking` chunks before the final answer.

```typescript
// Pulse with reasoning
const stream = client.text.generate({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Solve this step by step: 23 * 47 + 89' }],
  reasoning: 'medium',
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.type === 'thinking') process.stderr.write(chunk.content); // reasoning trace
  if (chunk.type === 'text') process.stdout.write(chunk.content);     // final answer
}

// Bolt with reasoning + image input
const stream = client.text.generate({
  model: 'jassie-bolt',
  messages: [
    {
      role: 'user',
      content: 'Analyze this diagram and explain the architecture.',
      image: 'https://example.com/diagram.png',
    },
  ],
  reasoning: 'strong',
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.type === 'thinking') process.stderr.write(chunk.content);
  if (chunk.type === 'text') process.stdout.write(chunk.content);
}
```

| Level | Description |
|---|---|
| `'strong'` | Maximum depth — the model thinks through problems thoroughly with multi-step chain-of-thought. Best for complex math, logic puzzles, code debugging, and tasks requiring deep analysis. Highest latency. |
| `'medium'` | Balanced reasoning — the model considers multiple angles without exhaustive exploration. Good for general problem-solving, explanations, and moderate complexity tasks. |
| `'low'` | Lightweight reasoning — the model performs a quick internal check before responding. Suitable for simple questions that benefit from a brief sanity check. Lowest latency overhead. |
| `'off'` | No reasoning — the model responds directly without any thinking step. Fastest responses. |

### Conversation (Multimodal Streaming)

`client.text.conversation()` is a streaming-only method for multi-turn conversations with images and video. It always returns a `JassieStream`.

```typescript
const stream = client.text.conversation({
  messages: [
    { role: 'user', content: 'What is in this image?', images: ['https://example.com/photo.jpg'] },
  ],
  maxTokens: 2000,
  reasoning: 'medium',
});

for await (const chunk of stream) {
  if (chunk.type === 'text') process.stdout.write(chunk.content);
}
```

#### Conversation Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `messages` | `ConversationMessage[]` | **Yes** | — | Conversation messages with optional `images` and `video` arrays |
| `maxTokens` | `number` | No | `5000` | Maximum tokens in the response |
| `temperature` | `number` | No | `0.7` | Randomness |
| `reasoning` | `'strong' \| 'medium' \| 'low' \| 'off'` | No | — | Extended thinking depth |

#### ConversationMessage Type

```typescript
interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content?: string;
  images?: string[];   // Array of image URLs
  video?: string[];    // Array of video URLs
}
```

---

## Code Generation

| Model | Description |
|---|---|
| `jassie-code` | Writes, refactors, and debugs across dozens of languages |

### `client.code.generate(params)`

Returns a `Promise<TextResponse>` when `stream` is `false` (default), or a `JassieStream` when `stream` is `true`.

```typescript
const response = await client.code.generate({
  model: 'jassie-code',
  messages: [{ role: 'user', content: 'Write a function to reverse a linked list in Python.' }],
});

console.log(response.content);
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-code'` | **Yes** | — | Model to use |
| `messages` | `Message[]` | **Yes** | — | Array of conversation messages |
| `stream` | `boolean` | No | `false` | Enable real-time streaming |
| `maxTokens` | `number` | No | `5000` | Maximum tokens in the response |
| `temperature` | `number` | No | `0.7` | Randomness (0 = deterministic, 2 = creative) |
| `reasoning` | `'strong' \| 'medium' \| 'low' \| 'off'` | No | — | Controls extended thinking depth |

### Response

Same as [Text Generation Response](#response--textresponse) — returns `TextResponse`.

### Streaming

Same stream chunk types as [Text Generation](#stream-chunks--jassiechunk).

```typescript
const stream = client.code.generate({
  model: 'jassie-code',
  messages: [{ role: 'user', content: 'Write a REST API in Express.js' }],
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.type === 'text') process.stdout.write(chunk.content);
}
```

---

## Image Generation

| Model | Description |
|---|---|
| `jassie-pixel-lite` | Self-hosted 2K image generation (no reference image support) |
| `jassie-pixel` | Photorealistic 2K image generation with reference image support |
| `jassie-pixel-x` | 4K ultra-high-resolution image generation |

`jassie-pixel-lite` uses the `/v1/generate-image` endpoint and does **not** support reference images (`image` parameter). Use `jassie-pixel` or `jassie-pixel-x` for image-to-image editing.

Two modes: **v1 (synchronous)** blocks until done, **v2 (asynchronous)** returns a `taskId` immediately.

### `client.image.generate(params)` — Synchronous

Blocks until the image is ready. Returns `Promise<ImageTaskResponse>`.

```typescript
const result = await client.image.generate({
  model: 'jassie-pixel',
  prompt: 'A sunset over mountains, digital art style',
});

console.log(result.imageUrl);
```

### `client.image.generateAsync(params)` — Asynchronous

Returns immediately with a `taskId`. Use `status()` or `statusStream()` to track progress.

```typescript
const task = await client.image.generateAsync({
  model: 'jassie-pixel-x',
  prompt: 'A futuristic cityscape at night',
  aspectRatio: '16:9',
});

console.log(task.taskId); // Use this to check status
```

### `client.image.status(taskId, options?)` — Poll Status

Single check or auto-poll until terminal state.

```typescript
// Single status check
const status = await client.image.status(task.taskId);

// Auto-poll until done
const final = await client.image.status(task.taskId, {
  interval: 3000,
  timeout: 120000,
  onPoll: (res) => console.log(res.status),
});
```

### `client.image.statusStream(taskId)` — Stream Status (SSE)

Returns an `ImageStream` that yields live progress events.

```typescript
const stream = client.image.statusStream(task.taskId);

for await (const event of stream) {
  if (event.type === 'preview') console.log('Preview:', event.imageUrl);
  if (event.type === 'completed') console.log('Done:', event.imageUrl);
  if (event.type === 'failed') console.error('Failed:', event.error);
}
```

### `client.image.cancel(taskId)` — Cancel Generation

Cancels a pending or in-progress image generation task.

```typescript
const result = await client.image.cancel(task.taskId);
console.log(result.status); // 'cancelled'
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-pixel-lite' \| 'jassie-pixel' \| 'jassie-pixel-x'` | **Yes** | — | Model (`pixel-lite` = 2K self-hosted, `pixel` = 2K, `pixel-x` = 4K) |
| `prompt` | `string` | **Yes** | — | Image description |
| `image` | `string \| string[]` | No | — | Input image URL(s) for editing or composition (up to 14). Not supported by `pixel-lite`. |
| `aspectRatio` | `string` | No | `'1:1'` | `'1:1'`, `'4:3'`, `'3:4'`, `'16:9'`, `'9:16'`, `'3:2'`, `'2:3'`, `'21:9'` |
| `width` | `number` | No | — | Output width in pixels (must be divisible by 8). Requires `height`. Overrides `aspectRatio`. |
| `height` | `number` | No | — | Output height in pixels (must be divisible by 8). Requires `width`. Overrides `aspectRatio`. |

### Response — `ImageTaskResponse`

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'preview_ready' \| 'succeeded' \| 'failed' \| 'cancelled'` | Current status |
| `imageUrl` | `string \| null` | URL to generated image (populated when `succeeded`) |
| `expiresOn` | `string \| null` | ISO timestamp when the image URL expires |

### Polling Options

Pass to `status()` to auto-poll until terminal state:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `interval` | `number` | `5000` | Milliseconds between checks |
| `timeout` | `number` | `600000` | Max wait time in ms (throws `JassieTimeoutError` if exceeded) |
| `onPoll` | `(response: ImageTaskResponse) => void` | — | Callback on each poll |

> Polling options work the same for `image.status()`, `video.status()`, and `music.status()`.

### Stream Events — `ImageStreamEvent`

| Type | Fields | Description |
|---|---|---|
| `status` | `model`, `taskId`, `status` | Status changed (`pending` / `preview_ready`) |
| `preview` | `model`, `taskId`, `imageUrl` | Base64 preview available |
| `completed` | `model`, `taskId`, `imageUrl`, `expiresOn` | Final hosted URL ready |
| `failed` | `model`, `taskId`, `error` | Generation failed |

```typescript
type ImageStreamEvent =
  | { type: 'status'; model: string; taskId: string; status: string }
  | { type: 'preview'; model: string; taskId: string; imageUrl: string }
  | { type: 'completed'; model: string; taskId: string; status: string; imageUrl: string | null; expiresOn: string | null }
  | { type: 'failed'; model: string; taskId: string; status: string; imageUrl: null; expiresOn: null; error: string };
```

---

## Video Generation

| Model | Description |
|---|---|
| `jassie-vibe` | 720p HD video generation |
| `jassie-motion` | 1080p Full-HD video generation |
| `jassie-cinema` | 1080p cinematic video generation with multimodal references |

Video generation is **asynchronous** — `generate()` returns a `taskId` immediately.

### `client.video.generate(params)`

Starts video generation. Returns `Promise<VideoTaskResponse>` with a `taskId`.

### `client.video.status(taskId, options?)`

Check task status. Pass polling options to auto-poll until done. Returns `Promise<VideoTaskResponse>`.

### `client.video.cancel(taskId)`

Cancel a pending or in-progress video generation task. Returns `Promise<VideoTaskResponse>`.

### Vibe & Motion

```typescript
const task = await client.video.generate({
  model: 'jassie-vibe',
  prompt: 'A calm ocean wave crashing on a sandy beach',
  duration: 5,
  aspectRatio: '16:9',
});

// Auto-poll until complete
const result = await client.video.status(task.taskId, {
  interval: 5000,
  timeout: 600000,
  onPoll: (res) => console.log(res.status),
});

if (result.status === 'succeeded') console.log(result.videoUrl);
```

#### Vibe & Motion Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-vibe' \| 'jassie-motion'` | **Yes** | — | Model (`vibe` = 720p, `motion` = 1080p) |
| `prompt` | `string` | **Yes** | — | Video description |
| `duration` | `number` | No | `5` | Duration in seconds |
| `references` | `Reference[]` | No | — | Reference(s) for style guidance. Mutually exclusive with `firstFrame`/`lastFrame`. |
| `firstFrame` | `string` | No | — | Starting frame image URL |
| `lastFrame` | `string` | No | — | Ending frame image URL |
| `aspectRatio` | `string` | No | `'16:9'` | `'16:9'`, `'4:3'`, `'1:1'`, `'3:4'`, `'9:16'`, `'21:9'`, `'adaptive'` |

### Cinema

`jassie-cinema` supports multimodal references — pass images, videos, and audio clips to guide generation. Up to 9 images, 3 videos, and 3 audio clips per request.

```typescript
// Text-to-video
const task = await client.video.generate({
  model: 'jassie-cinema',
  prompt: 'A cinematic drone shot over a mountain range at golden hour',
  duration: 10,
  aspectRatio: '21:9',
});

// With multimodal references
const task = await client.video.generate({
  model: 'jassie-cinema',
  prompt: 'First-person POV product ad. Opening frame is Image 1, use Video 1 for camera framing, Audio 1 as background music.',
  duration: 11,
  aspectRatio: '16:9',
  references: [
    { type: 'image', url: 'https://example.com/product-shot.jpg' },
    { type: 'image', url: 'https://example.com/brand-logo.jpg' },
    { type: 'video', url: 'https://example.com/camera-reference.mp4' },
    { type: 'audio', url: 'https://example.com/background-music.mp3' },
  ],
});

const result = await client.video.status(task.taskId);
if (result.status === 'succeeded') console.log(result.videoUrl);
```

#### Cinema Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-cinema'` | **Yes** | — | Cinema model (1080p) |
| `prompt` | `string` | **Yes** | — | Video description |
| `duration` | `number` | No | `5` | Duration in seconds (up to 15) |
| `references` | `Reference[]` | No | — | Multimodal references (see below) |
| `aspectRatio` | `string` | No | `'16:9'` | `'21:9'`, `'16:9'`, `'4:3'`, `'1:1'`, `'3:4'`, `'9:16'` |

#### Reference Type

```typescript
interface Reference {
  type: 'image' | 'video' | 'audio';
  url: string;
}
```

### Response — `VideoTaskResponse`

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'running' \| 'succeeded' \| 'failed' \| 'cancelled'` | Current status |
| `videoUrl` | `string \| null` | URL to generated video (populated when `succeeded`) |
| `expiresOn` | `string \| null` | ISO timestamp when the video URL expires |

### Cancelling

```typescript
const result = await client.video.cancel(task.taskId);
console.log(result.status); // 'cancelled'
```

---

## Music Generation

| Model | Description |
|---|---|
| `jassie-beat` | AI music generation — vocal or instrumental |

Music generation is **asynchronous** — same pattern as video.

### `client.music.generate(params)`

Starts music generation. Returns `Promise<MusicTaskResponse>` with a `taskId`.

### `client.music.status(taskId, options?)`

Check task status. Pass polling options to auto-poll until done. Returns `Promise<MusicTaskResponse>`.

### `client.music.cancel(taskId)`

Cancel a pending or in-progress music generation task. Returns `Promise<MusicTaskResponse>`.

```typescript
const task = await client.music.generate({
  model: 'jassie-beat',
  tags: 'pop, upbeat, female vocals',
  lyrics: 'Calm and peaceful, floating through the night\nStars above are shining bright',
  duration: 30,
  seed: 42,
});

// Auto-poll until complete
const result = await client.music.status(task.taskId, {
  interval: 5000,
  onPoll: (res) => console.log(res.status),
});

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

### Response — `MusicTaskResponse`

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'processing' \| 'completed' \| 'failed' \| 'cancelled'` | Current status |
| `musicUrl` | `string \| null` | URL to generated audio (populated when `completed`) |
| `expiresOn` | `string \| null` | ISO timestamp when the audio URL expires |

### Cancelling

```typescript
const result = await client.music.cancel(task.taskId);
console.log(result.status); // 'cancelled'
```

---

## Web Search

| Model | Description |
|---|---|
| `jassie-web` | Live web search with citation-backed, structured answers |

Use `client.text.generate()` with `model: 'jassie-web'` to get web-grounded responses with source citations.

```typescript
const response = await client.text.generate({
  model: 'jassie-web',
  messages: [{ role: 'user', content: 'What are the latest developments in quantum computing?' }],
});

console.log(response.content); // Answer with inline citations
console.log(response.sources); // Array of { title, url, snippet }
```

### Parameters

Same as [Text Generation Parameters](#parameters) — uses `model: 'jassie-web'`.

### Response

| Field | Type | Description |
|---|---|---|
| `type` | `'text' \| 'error'` | Response type |
| `content` | `string` | Generated answer with inline source citations |
| `sources` | `Source[]` | Array of `{ title, url, snippet }` from web search results |
| `request_id` | `string` | Unique identifier for the request |
| `chunks` | `number` | Total tokens generated |
| `duration_seconds` | `number` | Generation time in seconds |

### Streaming Web Search

When streaming, `web_search` chunks indicate searches being performed before the answer:

```typescript
const stream = client.text.generate({
  model: 'jassie-web',
  messages: [{ role: 'user', content: 'Latest AI news today' }],
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.type === 'web_search') console.log('Searching:', chunk.query);
  if (chunk.type === 'text') process.stdout.write(chunk.content);
}
```

---

## Task Planning

| Model | Description |
|---|---|
| `jassie-planner` | Agentic task planner — returns structured DAG of tool-call steps |

### `client.plan.generate(params)`

Analyzes a user query and returns a structured execution plan with dependency tracking. Returns `Promise<PlanResponse>`.

```typescript
const plan = await client.plan.generate({
  query: 'Write a bedtime story about dragons and create an illustration for it',
});

if (plan.type === 'task') {
  for (const step of plan.steps) {
    console.log(`Step ${step.id}: [${step.tool}] ${step.description}`);
    console.log(`  Params:`, step.params);
    console.log(`  Depends on: ${step.depends_on.join(', ') || 'none'}`);
  }
} else if (plan.type === 'clarify') {
  console.log('Need more info:', plan.questions);
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | **Yes** | — | The user query to plan for |
| `context` | `Message[]` | No | — | Last 2–3 conversation messages for disambiguation |
| `tools` | `PlanTool[]` | No | — | Custom tool definitions on top of the 5 built-in tools |
| `system_prompt` | `string` | No | — | Platform context appended to the planner prompt |

#### PlanTool Type

```typescript
interface PlanTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}
```

### Response — `PlanResponse`

| Field | Type | Description |
|---|---|---|
| `type` | `'chat' \| 'task' \| 'clarify'` | Intent classification |
| `steps` | `PlanStep[]` | Ordered execution steps (when `type` is `'chat'` or `'task'`) |
| `questions` | `string[]` | Clarifying questions (when `type` is `'clarify'`) |

#### PlanStep Type

```typescript
interface PlanStep {
  id: number;
  tool: string;           // 'chat', 'web_search', 'image_generate', 'video_generate', 'music_generate', or custom
  description: string;
  params: Record<string, unknown>;  // Tool-specific parameters
  depends_on: number[];   // Step IDs that must complete first
}
```

#### Plan Types

| `type` | Meaning | Available Fields |
|---|---|---|
| `'chat'` | Simple conversational query — no external tools needed | `steps` (single chat step) |
| `'task'` | Multi-step task requiring tool orchestration | `steps` (multiple steps with dependencies) |
| `'clarify'` | Ambiguous query — needs more information | `questions` |

---

## Streaming

The SDK provides two stream classes for real-time data: `JassieStream` (text/code) and `ImageStream` (image status).

### `JassieStream`

Returned by `text.generate({ stream: true })`, `code.generate({ stream: true })`, and `text.conversation()`.

```typescript
const stream = client.text.generate({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
});
```

#### `for await...of` — Iterate Chunks

```typescript
for await (const chunk of stream) {
  if (chunk.type === 'text') process.stdout.write(chunk.content);
  if (chunk.type === 'done') console.log('\nDone!');
}
```

#### `stream.eachText(callback)` — Text-Only Callback

Calls `callback` for each text chunk. Returns a `Promise<void>` that resolves when the stream ends. Recommended for React Native (Hermes does not support `for await...of`).

```typescript
await stream.eachText((text) => {
  process.stdout.write(text);
});
```

#### `stream.finalText()` — Collect All Text

Buffers the entire stream and returns the complete text as a single `Promise<string>`.

```typescript
const fullText = await stream.finalText();
console.log(fullText);
```

#### `stream.abort()` — Cancel Stream

Aborts the underlying request and stops the stream.

```typescript
stream.abort();
```

### `ImageStream`

Returned by `image.statusStream()`.

```typescript
const stream = client.image.statusStream(taskId);
```

#### `for await...of` — Iterate Events

```typescript
for await (const event of stream) {
  console.log(event.type, event);
}
```

#### `stream.eachEvent(callback)` — Event Callback

Calls `callback` for each event. Returns a `Promise<void>` that resolves when the stream ends.

```typescript
await stream.eachEvent((event) => {
  if (event.type === 'preview') setPreview(event.imageUrl);
  if (event.type === 'completed') setFinal(event.imageUrl);
});
```

#### `stream.finalResult()` — Get Final Event

Buffers events and returns the last `completed` event (or `null`). Returns `Promise<ImageStreamEvent | null>`.

```typescript
const result = await stream.finalResult();
if (result?.type === 'completed') console.log(result.imageUrl);
```

#### `stream.abort()` — Cancel Stream

```typescript
stream.abort();
```

---

## Error Handling

All errors extend `JassieError`. The SDK auto-retries on `5xx`, `429`, network errors, and timeouts with exponential backoff (up to `maxRetries` attempts).

```typescript
import JassieAI, {
  JassieError,              // Base error class
  JassieAuthenticationError, // 401 — invalid or missing API key
  JassieRateLimitError,      // 429 — rate limit exceeded (has retryAfter)
  JassieAPIError,            // 4xx / 5xx — general API error (has status)
  JassieTimeoutError,        // Request or polling timeout exceeded
  JassieConnectionError,     // Network failure (DNS, connection refused, etc.)
} from 'jassie-ai';

try {
  const response = await client.text.generate({ ... });
} catch (error) {
  if (error instanceof JassieRateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds.`);
  } else if (error instanceof JassieAuthenticationError) {
    console.error('Invalid API key.');
  } else if (error instanceof JassieTimeoutError) {
    console.error('Request timed out.');
  } else if (error instanceof JassieConnectionError) {
    console.error('Network error:', error.message);
  } else if (error instanceof JassieAPIError) {
    console.error(`API error ${error.status}: ${error.message}`);
  }
}
```

### Error Classes

| Class | HTTP Status | Key Fields | Description |
|---|---|---|---|
| `JassieError` | — | `message` | Base class for all SDK errors |
| `JassieAPIError` | 4xx / 5xx | `status`, `message` | General API error with HTTP status code |
| `JassieAuthenticationError` | 401 | `status`, `message` | Invalid or missing API key |
| `JassieRateLimitError` | 429 | `status`, `message`, `retryAfter` | Rate limit exceeded. `retryAfter` is seconds to wait (from `Retry-After` header). |
| `JassieTimeoutError` | — | `message` | Request exceeded `timeout` or polling exceeded `timeout` |
| `JassieConnectionError` | — | `message` | Network-level failure (DNS, refused, reset, etc.) |

---

## React Native

The SDK auto-detects React Native and uses `XMLHttpRequest` for streaming. Hermes does not support `for await...of` — use `eachText()` / `eachEvent()` instead:

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

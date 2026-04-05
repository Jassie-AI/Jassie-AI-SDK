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
- [Quick Reference](#quick-reference)
- [Text Generation](#text-generation)
- [Code Generation](#code-generation)
- [Image Generation](#image-generation)
- [Video Generation](#video-generation)
- [Music Generation](#music-generation)
- [Streaming](#streaming)
- [Error Handling](#error-handling)
- [Platform Support](#platform-support)
- [TypeScript Types](#typescript-types)
- [Rate Limits](#rate-limits)
- [About](#about)
- [License](#license)

---

## Installation

```bash
npm install jassie-ai
```

```bash
yarn add jassie-ai
```

```bash
pnpm add jassie-ai
```

---

## Setup

Get your API key from [jassie.ai](https://jassie.ai), then:

```typescript
import JassieAI from 'jassie-ai';

const client = new JassieAI({ apiKey: 'your-api-key' });
```

### Client Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | `string` | **Yes** | — | Your Jassie AI API key |
| `baseURL` | `string` | No | `'https://api.jassie.ai'` | API base URL (for proxies or custom endpoints) |
| `timeout` | `number` | No | `60000` | Request timeout in milliseconds |
| `maxRetries` | `number` | No | `2` | Number of retry attempts for failed requests |
| `platform` | `'node' \| 'web' \| 'react-native'` | No | Auto-detected | Force a specific platform adapter |

```typescript
// Full configuration example
const client = new JassieAI({
  apiKey: 'your-api-key',      // Required
  timeout: 30000,              // Optional: 30 second timeout
  maxRetries: 3,               // Optional: retry up to 3 times
});
```

---

## Quick Reference

A quick overview of required and optional parameters for each generation type.

> **Legend:** ✅ = Required | ⚪ = Optional

### Text & Code Generation

```typescript
client.text.create({
  model: 'jassie-pulse',        // ✅ Required: 'jassie-pulse' | 'jassie-bolt'
  messages: [...],              // ✅ Required: Array of messages
  stream: true,                 // ⚪ Optional: Enable streaming (default: false)
  maxTokens: 2000,              // ⚪ Optional: Max tokens to generate
  temperature: 0.7,             // ⚪ Optional: Randomness (0-2)
  web: 'auto',                  // ⚪ Optional: Web search ('auto' | 'always')
});

client.code.create({
  model: 'jassie-code',         // ✅ Required
  messages: [...],              // ✅ Required
  // Same optional params as text
});
```

### Image Generation

```typescript
client.images.generate({
  model: 'jassie-pixel',        // ✅ Required: 'jassie-pixel' | 'jassie-pixel-x'
  prompt: 'A sunset...',        // ✅ Required: Image description
  reference: 'https://...',     // ⚪ Optional: Reference image URL
  first_image: 'https://...',   // ⚪ Optional: Start image for interpolation
  last_image: 'https://...',    // ⚪ Optional: End image for interpolation
  width: 1024,                  // ⚪ Optional: Width in pixels (divisible by 8)
  height: 1024,                 // ⚪ Optional: Height in pixels (divisible by 8)
  guidance_scale: 7.5,          // ⚪ Optional: Prompt adherence (default: 7.5)
  num_inference_steps: 50,      // ⚪ Optional: Quality steps (default: 50)
  negative_prompt: 'blurry',    // ⚪ Optional: What to avoid
  seed: 42,                     // ⚪ Optional: Reproducibility seed
});
```

### Video Generation

```typescript
client.video.generateAndWait({
  model: 'jassie-vibe',         // ✅ Required: 'jassie-vibe' | 'jassie-motion'
  prompt: 'Ocean waves...',     // ✅ Required: Video description
  duration: 5,                  // ✅ Required: Duration in seconds (5 or 10)
  image: 'https://...',         // ⚪ Optional: Reference image
  seed: 42,                     // ⚪ Optional: Reproducibility seed
  camera_motion: 'pan_left',    // ⚪ Optional: Camera movement
  negative_prompt: 'blurry',    // ⚪ Optional: What to avoid
});
```

### Music Generation

```typescript
client.music.generateAndWait({
  model: 'jassie-beat',         // ✅ Required
  tags: 'lo-fi, chill, piano',  // ✅ Required: Genre/style tags
  duration: 30,                 // ✅ Required: Duration in seconds (5-240)
  lyrics: 'Your lyrics...',     // ⚪ Optional: Song lyrics
  seed: 42,                     // ⚪ Optional: Reproducibility seed
});
```

---

## Text Generation

Generate text responses using conversational messages.

**Available models:**

| Model | Type | Description |
|---|---|---|
| `jassie-pulse` | Text → Text | Lightning-fast text intelligence with million-token context. Excels at multi-turn conversations, structured JSON output, and multilingual support — at the lowest cost per token in the lineup. **Rate Limits:** 5M TPM, 600 RPM |
| `jassie-bolt` | Multi-Modal → Text | Flagship multimodal model that processes text, images, and video together. Delivers breakthrough accuracy on reasoning, vision, and agentic tasks with function calling support. **Rate Limits:** 100K TPM, 60 RPM |

### Basic Usage

```typescript
const response = await client.text.create({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Explain how DNS works.' }],
});

console.log(response.content);
```

### With System Message

Use a system message to control the model's behavior:

```typescript
const response = await client.text.create({
  model: 'jassie-pulse',
  messages: [
    { role: 'system', content: 'You are a senior backend engineer. Be concise.' },
    { role: 'user', content: 'How should I structure a REST API?' },
  ],
});
```

### Streaming

Set `stream: true` to get the response in real-time as it's being generated:

```typescript
const stream = client.text.create({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Write a short poem about the ocean.' }],
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.content);
  }
}
```

Or collect the full text at once:

```typescript
const stream = client.text.create({
  model: 'jassie-bolt',
  messages: [{ role: 'user', content: 'Say hello.' }],
  stream: true,
});

const fullText = await stream.finalText();
console.log(fullText);
```

### Web Search

Let the model search the web for up-to-date information:

```typescript
const response = await client.text.create({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'What are the top tech news stories today?' }],
  web: 'auto', // 'auto' = search when needed, 'always' = always search
});
```

### Vision (Image Input)

Send an image along with your message:

```typescript
const response = await client.text.create({
  model: 'jassie-bolt',
  messages: [
    {
      role: 'user',
      content: 'What do you see in this image?',
      image: 'https://example.com/photo.jpg',
    },
  ],
});
```

Send multiple images:

```typescript
const response = await client.text.create({
  model: 'jassie-bolt',
  messages: [
    {
      role: 'user',
      content: 'Compare these two images.',
      image: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
      ],
    },
  ],
});
```

### Text Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-pulse' \| 'jassie-bolt'` | **Yes** | — | Model to use |
| `messages` | `Message[]` | **Yes** | — | Array of conversation messages |
| `stream` | `boolean` | No | `false` | Set `true` for real-time streaming |
| `maxTokens` | `number` | No | `5000` | Maximum tokens in the response |
| `temperature` | `number` | No | `0.7` | Controls randomness (0 = deterministic, 2 = very creative) |
| `web` | `'auto' \| 'always'` | No | — | `'auto'` = search when needed, `'always'` = always search |

### Message Format

| Field | Type | Required | Description |
|---|---|---|---|
| `role` | `'system' \| 'user' \| 'assistant'` | **Yes** | Who is speaking |
| `content` | `string` | **Yes** | The message text |
| `image` | `string \| string[]` | No | Image URL(s) for vision (use with `jassie-bolt`) |
| `video` | `string \| string[]` | No | Video URL(s) for vision (use with `jassie-bolt`) |

### Text Response

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Response type |
| `content` | `string` | The generated text |
| `request_id` | `string` | Unique request identifier |
| `chunks` | `number` | Total number of chunks |
| `duration_seconds` | `number` | Time taken to generate the response |
| `index` | `number` | Response index |
| `usage` | `Usage` | Token usage stats (`prompt_tokens`, `completion_tokens`, `total_tokens`) |

---

## Code Generation

Generate code using a model optimized for programming tasks.

**Available models:**

| Model | Type | Description |
|---|---|---|
| `jassie-code` | Text → Code | Your senior engineer on call. Writes, refactors, and debugs across dozens of languages with deep codebase awareness. Supports multi-language code generation, context-aware refactoring, unit test generation, and deterministic output control. **Rate Limits:** 5M TPM, 600 RPM |

### Basic Usage

```typescript
const response = await client.code.create({
  model: 'jassie-code',
  messages: [
    { role: 'user', content: 'Write a function to reverse a linked list in Python.' },
  ],
});

console.log(response.content);
```

### Streaming

```typescript
const stream = client.code.create({
  model: 'jassie-code',
  messages: [
    { role: 'user', content: 'Build a REST API with Express and TypeScript.' },
  ],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### Code Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-code'` | **Yes** | — | Model to use |
| `messages` | `Message[]` | **Yes** | — | Array of conversation messages |
| `stream` | `boolean` | No | `false` | Set `true` for real-time streaming |
| `maxTokens` | `number` | No | `5000` | Maximum tokens in the response |
| `temperature` | `number` | No | `0.7` | Controls randomness (lower = more precise code) |
| `web` | `'auto' \| 'always'` | No | — | `'auto'` = search when needed, `'always'` = always search |

> The response format is the same as [Text Response](#text-response).

---

## Image Generation

Generate images from text prompts.

**Available models:**

| Model | Type | Description |
|---|---|---|
| `jassie-pixel` | Multi-Modal → Image | Photorealistic 2K image generation. Supports reference images, first/last frame conditioning, and fine-grained style control. |
| `jassie-pixel-x` | Multi-Modal → Image | 4K ultra-high-resolution image generation. Same powerful conditioning options as Pixel, at twice the resolution — print-ready and production-ready. |

### Basic Generation

```typescript
const response = await client.images.generate({
  model: 'jassie-pixel',
  prompt: 'A sunset over mountains, digital art style',
});

console.log(response.images[0]); // Image URL
```

### With Advanced Options

```typescript
const response = await client.images.generate({
  model: 'jassie-pixel-x',
  prompt: 'A futuristic cityscape at night with neon lights',
  width: 768,
  height: 512,
  guidance_scale: 7.5,
  num_inference_steps: 30,
  negative_prompt: 'blurry, low quality, distorted',
  seed: 42,
});
```

### With Reference Image

Use an existing image as a style or content reference:

```typescript
const response = await client.images.generate({
  model: 'jassie-pixel',
  prompt: 'This scene painted in watercolor style',
  reference: 'https://example.com/reference-photo.jpg',
});
```

### Image Interpolation

Blend between two images:

```typescript
const response = await client.images.generate({
  model: 'jassie-pixel',
  prompt: 'A smooth transition between these two scenes',
  first_image: 'https://example.com/start.jpg',
  last_image: 'https://example.com/end.jpg',
});
```

### Image Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-pixel' \| 'jassie-pixel-x'` | **Yes** | — | Model to use (`pixel` = 2K, `pixel-x` = 4K) |
| `prompt` | `string` | **Yes** | — | Text description of the image to generate |
| `reference` | `string` | No | — | URL of a reference image for style/content guidance |
| `first_image` | `string` | No | — | URL of the starting image for interpolation |
| `last_image` | `string` | No | — | URL of the ending image for interpolation |
| `width` | `number` | No | Model default | Image width in pixels (must be divisible by 8) |
| `height` | `number` | No | Model default | Image height in pixels (must be divisible by 8) |
| `guidance_scale` | `number` | No | `7.5` | Prompt adherence (1-20, higher = more literal) |
| `num_inference_steps` | `number` | No | `50` | Quality steps (higher = more detail, slower) |
| `negative_prompt` | `string` | No | — | What to avoid in the generated image |
| `seed` | `number` | No | Random | Seed for reproducible results |

### Image Response

| Field | Type | Description |
|---|---|---|
| `images` | `string[]` | Array of generated image URLs |
| `created` | `string` | Timestamp of creation |
| `usage` | `number` | Usage metric |

---

## Video Generation

Generate videos from text prompts. Video generation is **asynchronous** — you start a task and then poll for the result.

**Available models:**

| Model | Type | Description |
|---|---|---|
| `jassie-vibe` | Multi-Modal → Video + Audio | 720p HD video generation. Turn a text prompt or a single image into smooth, temporally consistent clips — perfect for prototyping, social content, and rapid creative exploration. |
| `jassie-motion` | Multi-Modal → Video + Audio | 1080p Full-HD premium video generation. Higher resolution, smoother motion, and cinematic fidelity — when your content needs to look like it had a production crew behind it. |
| `jassie-cinema-4k` | Multi-Modal → Video + Audio | 4K cinematic long-form video generation. Narrative-aware scene composition with multi-scene continuity, intelligent camera work, and emotional pacing. *Coming soon.* |

### Generate and Wait (Recommended)

The simplest approach — starts generation and automatically polls until complete:

```typescript
const result = await client.video.generateAndWait(
  {
    model: 'jassie-vibe',
    prompt: 'A calm ocean wave crashing on a sandy beach',
    duration: 5,
  },
);

if (result.status === 'succeeded') {
  console.log(result.videoUrl); // Direct URL to the video file
}
```

### Generate and Wait with Progress

Track progress while waiting:

```typescript
const result = await client.video.generateAndWait(
  {
    model: 'jassie-vibe',
    prompt: 'A butterfly landing on a flower in slow motion',
    duration: 5,
  },
  {
    interval: 5000,   // Check every 5 seconds
    timeout: 300000,  // Give up after 5 minutes
    onPoll: (res) => {
      console.log(`Status: ${res.status}`);
    },
  },
);
```

### Manual Control

If you need full control over the process:

```typescript
// Step 1: Start the task
const task = await client.video.generate({
  model: 'jassie-motion',
  prompt: 'Ocean waves at sunset',
  duration: 10,
});

console.log('Task ID:', task.taskId); // Save this to check later

// Step 2: Check status at any time
const status = await client.video.status(task.taskId);
console.log(status.status); // 'pending' | 'processing' | 'succeeded' | 'failed'

// Step 3: Poll until done
const result = await client.video.poll(task.taskId, {
  interval: 5000,
  timeout: 300000,
  onPoll: (res) => console.log('Status:', res.status),
});

console.log(result.videoUrl);
```

### Video Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-vibe' \| 'jassie-motion' \| 'jassie-cinema-4k'` | **Yes** | — | Model to use (`vibe` = 720p, `motion` = 1080p) |
| `prompt` | `string` | **Yes** | — | Text description of the video to generate |
| `duration` | `number` | **Yes** | — | Video duration in seconds (`5` or `10`) |
| `image` | `string` | No | — | Reference image URL for image-to-video |
| `seed` | `number` | No | Random | Seed for reproducible results |
| `camera_motion` | `string` | No | — | Camera movement hint (see options below) |
| `negative_prompt` | `string` | No | — | What to avoid in the generated video |

**Camera Motion Options:**
`'zoom_in'` | `'zoom_out'` | `'pan_left'` | `'pan_right'` | `'tilt_up'` | `'tilt_down'` | `'orbit'` | `'dolly_in'` | `'dolly_out'` | `'static'`

### Poll Options

Used with `poll()` and `generateAndWait()` — all parameters are optional:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `interval` | `number` | No | `5000` | Milliseconds between status checks |
| `timeout` | `number` | No | `600000` | Maximum wait time in milliseconds (10 min) |
| `onPoll` | `(response) => void` | No | — | Callback fired on each poll with the latest status |

### Video Response

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'processing' \| 'succeeded' \| 'failed'` | Current task status |
| `videoUrl` | `string \| null` | URL to the generated video (available when `succeeded`) |
| `expiresOn` | `string \| null` | When the video URL expires |

---

## Music Generation

Generate original music tracks with lyrics and style tags. Music generation is **asynchronous**, just like video.

**Available models:**

| Model | Type | Description |
|---|---|---|
| `jassie-beat` | Text → Music | AI-powered music generation from tags and lyrics. Produces full multi-instrument tracks with genre/mood control, lyric-to-melody alignment, tempo/structure control, and stem-level output support. |

### Generate and Wait (Recommended)

**With lyrics (vocal track):**

```typescript
const result = await client.music.generateAndWait({
  model: 'jassie-beat',
  tags: 'pop, upbeat, female vocals',
  lyrics: 'Calm and peaceful, floating through the night\nStars above are shining bright',
  duration: 30,
});

if (result.status === 'completed') {
  console.log(result.musicUrl); // Direct URL to the audio file
}
```

**Without lyrics (instrumental):**

```typescript
const result = await client.music.generateAndWait({
  model: 'jassie-beat',
  tags: 'lo-fi, chill, ambient, piano, instrumental',
  duration: 60,
});
```

### Generate and Wait with Progress

```typescript
const result = await client.music.generateAndWait(
  {
    model: 'jassie-beat',
    tags: 'electronic, upbeat, dance',
    duration: 30,
  },
  {
    interval: 5000,
    timeout: 300000,
    onPoll: (res) => {
      console.log(`Status: ${res.status}`);
    },
  },
);
```

### Manual Control

```typescript
// Step 1: Start the task
const task = await client.music.generate({
  model: 'jassie-beat',
  tags: 'electronic, upbeat, dance',
  lyrics: 'Feel the rhythm, feel the beat\nMoving to the sound beneath our feet',
  duration: 60,
});

console.log('Task ID:', task.taskId);

// Step 2: Check status
const status = await client.music.status(task.taskId);
console.log(status.status); // 'pending' | 'processing' | 'completed' | 'failed'

// Step 3: Poll until done
const result = await client.music.poll(task.taskId);
console.log(result.musicUrl);
```

### Music Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `model` | `'jassie-beat'` | **Yes** | — | Model to use |
| `tags` | `string` | **Yes** | — | Comma-separated genre/style tags (e.g. `'lo-fi, chill, piano'`) |
| `duration` | `number` | **Yes** | — | Track duration in seconds (min: 5, max: 240) |
| `lyrics` | `string` | No | — | Song lyrics (use `\n` for line breaks). Omit for instrumental. |
| `seed` | `number` | No | Random | Seed for reproducible results |

**Example Tags:**
- **Genre:** `pop`, `rock`, `electronic`, `jazz`, `classical`, `hip-hop`, `r&b`, `country`, `folk`
- **Mood:** `chill`, `upbeat`, `melancholic`, `energetic`, `peaceful`, `dramatic`
- **Instruments:** `piano`, `guitar`, `synth`, `drums`, `strings`, `brass`
- **Tempo:** `slow`, `medium`, `fast`, `120bpm`
- **Vocals:** `male vocals`, `female vocals`, `choir`, `instrumental`

> **Note:** Poll options are the same as [Video Poll Options](#poll-options).

### Music Response

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Model used |
| `taskId` | `string` | Unique task identifier |
| `status` | `'pending' \| 'processing' \| 'completed' \| 'failed'` | Current task status |
| `musicUrl` | `string \| null` | URL to the generated audio file (available when `completed`) |
| `expiresOn` | `string \| null` | When the audio URL expires |

---

## Streaming

Text and code generation support real-time streaming via Server-Sent Events (SSE). Streams implement `AsyncIterable`, so you can use `for await...of`.

### Chunk Types

Each chunk has a `type` field:

| Type | Description |
|---|---|
| `text` | Generated content — the main output |
| `queued` | Request is queued and waiting to be processed |
| `error` | An error occurred during generation |

### Reading a Stream

```typescript
const stream = client.text.create({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});

for await (const chunk of stream) {
  switch (chunk.type) {
    case 'text':
      process.stdout.write(chunk.content);
      break;
    case 'queued':
      console.log('Request queued...');
      break;
    case 'error':
      console.error('Stream error:', chunk.content);
      break;
  }
}
```

### Collecting Full Text

Skip the loop and get the final result directly:

```typescript
const text = await client.text.create({
  model: 'jassie-bolt',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
}).finalText();
```

### Aborting a Stream

Cancel a stream mid-generation:

```typescript
const stream = client.text.create({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Write a long essay...' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);

  if (someCondition) {
    stream.abort(); // Stops the stream immediately
    break;
  }
}
```

### Chunk Fields

| Field | Type | Description |
|---|---|---|
| `type` | `'text' \| 'queued' \| 'error'` | Chunk type |
| `content` | `string` | The chunk's text content |
| `done` | `boolean` | Whether this is the final chunk |
| `index` | `number` | Chunk index (optional) |
| `chunks` | `number` | Total chunks (optional) |
| `position` | `number` | Position in sequence (optional) |
| `request_id` | `string` | Request identifier (optional) |
| `duration_seconds` | `number` | Generation duration (optional) |
| `usage` | `Usage` | Token usage stats (optional, usually on final chunk) |

---

## Error Handling

The SDK provides specific error classes for every failure type. All errors extend `JassieError`.

```typescript
import JassieAI, {
  JassieError,
  JassieAPIError,
  JassieAuthenticationError,
  JassieRateLimitError,
  JassieTimeoutError,
  JassieConnectionError,
} from 'jassie-ai';

const client = new JassieAI({ apiKey: 'your-api-key' });

try {
  const response = await client.text.create({
    model: 'jassie-pulse',
    messages: [{ role: 'user', content: 'Hello' }],
  });
} catch (error) {
  if (error instanceof JassieAuthenticationError) {
    // 401 — Invalid or missing API key
    console.error('Bad API key. Check your credentials.');

  } else if (error instanceof JassieRateLimitError) {
    // 429 — Too many requests
    console.error('Rate limited. Retry after:', error.retryAfter, 'seconds');

  } else if (error instanceof JassieTimeoutError) {
    // Request took too long
    console.error('Request timed out. Try increasing the timeout option.');

  } else if (error instanceof JassieConnectionError) {
    // Network issue — no internet, DNS failure, etc.
    console.error('Network error:', error.message);

  } else if (error instanceof JassieAPIError) {
    // Any other API error (4xx / 5xx)
    console.error(`API error ${error.status}: ${error.message}`);
  }
}
```

### Error Classes

| Error Class | HTTP Status | When It Happens |
|---|---|---|
| `JassieAuthenticationError` | `401` | Invalid or missing API key |
| `JassieRateLimitError` | `429` | Too many requests. Has `retryAfter` (seconds) field |
| `JassieAPIError` | `4xx / 5xx` | General API error. Has `status` and `message` fields |
| `JassieTimeoutError` | — | Request exceeded the configured `timeout` |
| `JassieConnectionError` | — | Network failure, DNS error, or unreachable server |

### Automatic Retries

The SDK automatically retries failed requests with exponential backoff and jitter. No extra code needed.

**Retries on:**
- `5xx` server errors
- `429` rate limit errors (respects `Retry-After` header)
- Network and connection errors
- Request timeouts

**Does NOT retry on:**
- `4xx` client errors (bad request, not found, etc.) — except `429`

Retry behavior: `500ms → 1s → 2s → 4s → 8s` (max), plus random jitter up to 500ms.

Configure retries:

```typescript
const client = new JassieAI({
  apiKey: 'your-api-key',
  maxRetries: 3,    // Retry up to 3 times (default: 2)
  timeout: 30000,   // 30 second timeout (default: 60s)
});
```

---

## Platform Support

This SDK works everywhere JavaScript runs. The platform is auto-detected — no configuration needed.

| Category | Supported |
|---|---|
| **Runtimes** | Node.js (>= 16), Deno, Bun |
| **Web Frameworks** | React, Next.js, Vue, Nuxt, Angular, Svelte, SvelteKit, Remix, Astro, Solid |
| **Bundlers** | Vite, webpack, Rollup, esbuild, Turbopack, Parcel |
| **Mobile** | React Native, Expo |
| **Desktop** | Electron |
| **TypeScript** | All `moduleResolution` modes (`node`, `node16`, `nodenext`, `bundler`) |

### React Native

Streaming works out of the box in React Native using `XMLHttpRequest` under the hood:

```typescript
import JassieAI from 'jassie-ai';

const client = new JassieAI({ apiKey: 'your-api-key' });

const stream = client.text.create({
  model: 'jassie-bolt',
  messages: [{ role: 'user', content: 'Hello from React Native!' }],
  stream: true,
});

let text = '';
for await (const chunk of stream) {
  if (chunk.type === 'text') {
    text += chunk.content;
    setText(text); // Update React state
  }
}
```

---

## TypeScript Types

All types are exported for full type safety:

```typescript
import type {
  // Client
  JassieAIOptions,
  Platform,
  Message,

  // Models
  TextModel,
  CodeModel,
  ImageModel,
  VideoModel,
  MusicModel,

  // Request params
  TextGenerateParams,
  TextStreamParams,
  CodeGenerateParams,
  CodeStreamParams,
  ImageGenerateParams,
  VideoGenerateParams,
  MusicGenerateParams,

  // Responses
  TextResponse,
  ImageResponse,
  VideoTaskResponse,
  MusicTaskResponse,

  // Streaming
  JassieChunk,
  PollOptions,
  Usage,
} from 'jassie-ai';
```

---

## Rate Limits

| Model | Tokens Per Minute (TPM) | Requests Per Minute (RPM) |
|-------|-------------------------|---------------------------|
| `jassie-pulse` | 5,000,000 | 600 |
| `jassie-bolt` | 100,000 | 60 |
| `jassie-code` | 5,000,000 | 600 |
| `jassie-pixel` | — | 60 |
| `jassie-pixel-x` | — | 60 |
| `jassie-vibe` | — | 30 |
| `jassie-motion` | — | 30 |
| `jassie-beat` | — | 30 |

> Rate limits may vary based on your plan. Check your dashboard at [jassie.ai](https://jassie.ai) for your current limits.

---

## About

Jassie AI is developed and maintained by [Airbin](https://airbin.app).

### Developers

- **Harmandeep Mand** — [harmandeepmand@airbin.app](mailto:harmandeepmand@airbin.app)
- **Muhammad Hanzla** — [itshanzla@airbin.app](mailto:itshanzla@airbin.app)

### Support

- Website: [airbin.app](https://airbin.app)
- API Documentation: [jassie.ai](https://jassie.ai)
- Issues: [GitHub Issues](https://github.com/AirbinApp/jassie-ai-sdk/issues)

---

## License

MIT

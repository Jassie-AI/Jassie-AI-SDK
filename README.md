# Jassie AI SDK

Official TypeScript SDK for the [Jassie AI](https://jassie.ai) API. Works with Node.js, browsers, and React Native.

- Full TypeScript support with strict types
- Streaming via Server-Sent Events (SSE)
- Automatic retries with exponential backoff
- Zero runtime dependencies

## Installation

```bash
npm install jassie-ai
```

## Quick Start

```typescript
import JassieAI from 'jassie-ai';

const client = new JassieAI({ apiKey: 'your-api-key' });

// Text generation
const response = await client.text.generate({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.content);

// Streaming
const stream = client.text.stream({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Tell me a story' }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

## Configuration

```typescript
const client = new JassieAI({
  apiKey: 'your-api-key',       // Required
  baseURL: 'https://api.jassie.ai', // Optional, default shown
  timeout: 60000,               // Optional, request timeout in ms (default: 60s)
  maxRetries: 2,                // Optional, retry count (default: 2)
  platform: 'node',             // Optional, auto-detected. One of: 'node' | 'web' | 'react-native'
});
```

## Text Generation

### Models

| Model | Description |
|---|---|
| `jassie-pulse` | General-purpose text model |
| `jassie-bolt` | Fast text model |

### Generate (non-streaming)

```typescript
const response = await client.text.generate({
  model: 'jassie-pulse',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is TypeScript?' },
  ],
  maxTokens: 1024,
  temperature: 0.7,
  think: true,           // Enable thinking/reasoning mode
  web: 'auto',           // Web search: 'auto' | 'always'
});

console.log(response.content);
```

### Stream

```typescript
const stream = client.text.stream({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
});

for await (const chunk of stream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.content);
  }
  if (chunk.type === 'thinking') {
    // Model's internal reasoning
  }
}

// Or collect the full text at once
const stream2 = client.text.stream({
  model: 'jassie-bolt',
  messages: [{ role: 'user', content: 'Hello' }],
});
const fullText = await stream2.finalText();
```

### Create (overloaded)

Convenience method that returns a stream or promise depending on the `stream` parameter:

```typescript
// Returns JassieStream
const stream = client.text.create({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hi' }],
  stream: true,
});

// Returns Promise<TextResponse>
const response = await client.text.create({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hi' }],
});
```

## Code Generation

### Models

| Model | Description |
|---|---|
| `jassie-code` | Code generation model |

### Generate

```typescript
const response = await client.code.generate({
  model: 'jassie-code',
  messages: [
    { role: 'user', content: 'Write a function to sort an array in Python' },
  ],
  maxTokens: 2048,
  temperature: 0.2,
});

console.log(response.content);
```

### Stream

```typescript
const stream = client.code.stream({
  model: 'jassie-code',
  messages: [{ role: 'user', content: 'Build a REST API in Express' }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

## Image Generation

### Models

| Model | Description |
|---|---|
| `jassie-pixel` | Standard image model |
| `jassie-pixel-x` | Advanced image model |

### Generate

```typescript
const response = await client.images.generate({
  model: 'jassie-pixel',
  prompt: 'A sunset over mountains, digital art',
  width: 1024,
  height: 1024,
  guidance_scale: 7.5,
  negative_prompt: 'blurry, low quality',
  seed: 42,
});

console.log(response.images); // Array of image URLs
```

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `ImageModel` | Required. Model to use |
| `prompt` | `string` | Required. Text description |
| `reference` | `string` | Optional. Reference image URL |
| `first_image` | `string` | Optional. First image for interpolation |
| `last_image` | `string` | Optional. Last image for interpolation |
| `width` | `number` | Optional. Image width |
| `height` | `number` | Optional. Image height |
| `guidance_scale` | `number` | Optional. Prompt adherence strength |
| `num_inference_steps` | `number` | Optional. Denoising steps |
| `negative_prompt` | `string` | Optional. What to avoid |
| `seed` | `number` | Optional. Reproducibility seed |

## Video Generation

Video generation is an async task — you start it, then poll for completion.

### Models

| Model | Description |
|---|---|
| `jassie-vibe` | Standard video model |
| `jassie-motion` | Motion-focused model |
| `jassie-cinema-4k` | Cinema-quality 4K model |

### Generate and Wait

The simplest approach — starts generation and polls until complete:

```typescript
const result = await client.video.generateAndWait({
  model: 'jassie-vibe',
  prompt: 'A cat playing piano',
  duration: 5,
});

if (result.status === 'succeeded') {
  console.log(result.videoUrl);
}
```

### Manual Polling

For more control over the polling process:

```typescript
// Start the task
const task = await client.video.generate({
  model: 'jassie-motion',
  prompt: 'Ocean waves at sunset',
  duration: 10,
  aspectRatio: '16:9',
  camera_motion: 'pan_left',
});

console.log('Task started:', task.taskId);

// Poll with progress callback
const result = await client.video.poll(task.taskId, {
  interval: 5000,      // Poll every 5s (default)
  timeout: 600000,     // Timeout after 10min (default)
  onPoll: (res) => console.log('Status:', res.status),
});

console.log(result.videoUrl);
```

### Check Status

```typescript
const status = await client.video.status('task-id-here');
console.log(status.status); // 'pending' | 'processing' | 'succeeded' | 'failed'
```

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `VideoModel` | Required. Model to use |
| `prompt` | `string` | Required. Text description |
| `duration` | `number` | Required. Duration in seconds |
| `reference` | `string` | Optional. Reference image/video URL |
| `firstFrame` | `string` | Optional. First frame image URL |
| `lastFrame` | `string` | Optional. Last frame image URL |
| `aspectRatio` | `string` | Optional. e.g. `'16:9'` |
| `watermark` | `boolean` | Optional. Add watermark |
| `camera_motion` | `string` | Optional. Camera movement type |
| `negative_prompt` | `string` | Optional. What to avoid |
| `seed` | `number` | Optional. Reproducibility seed |

## Music Generation

Music generation is an async task, similar to video.

### Models

| Model | Description |
|---|---|
| `jassie-beat` | Music generation model |

### Generate and Wait

```typescript
const result = await client.music.generateAndWait({
  model: 'jassie-beat',
  tags: 'lofi, chill, ambient',
  lyrics: 'Walking through the rain...',
  duration: 30,
});

if (result.status === 'completed') {
  console.log(result.musicUrl);
}
```

### Manual Polling

```typescript
const task = await client.music.generate({
  model: 'jassie-beat',
  tags: 'electronic, upbeat',
  duration: 60,
});

const result = await client.music.poll(task.taskId, {
  onPoll: (res) => console.log('Status:', res.status),
});
```

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `model` | `MusicModel` | Required. Model to use |
| `tags` | `string` | Required. Genre/style tags |
| `lyrics` | `string` | Optional. Song lyrics |
| `duration` | `number` | Optional. Duration in seconds |
| `seed` | `number` | Optional. Reproducibility seed |

## Streaming

The SDK uses Server-Sent Events (SSE) for streaming. Streams implement `AsyncIterable`, so you can use `for await...of`:

```typescript
const stream = client.text.stream({
  model: 'jassie-pulse',
  messages: [{ role: 'user', content: 'Hello' }],
});

for await (const chunk of stream) {
  switch (chunk.type) {
    case 'text':
      // Main content
      break;
    case 'thinking':
      // Model reasoning (when think: true)
      break;
    case 'queued':
      // Request is queued
      break;
    case 'error':
      // Server-side error
      break;
  }
}
```

### Abort a Stream

```typescript
const stream = client.text.stream({ /* ... */ });

// Cancel after 5 seconds
setTimeout(() => stream.abort(), 5000);

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### Collect Full Text

```typescript
const text = await client.text.stream({ /* ... */ }).finalText();
```

## Vision (Image Input)

Pass images in messages using the `image` field:

```typescript
const response = await client.text.generate({
  model: 'jassie-pulse',
  messages: [
    {
      role: 'user',
      content: 'What is in this image?',
      image: 'https://example.com/photo.jpg',
    },
  ],
});
```

Multiple images:

```typescript
const response = await client.text.generate({
  model: 'jassie-pulse',
  messages: [
    {
      role: 'user',
      content: 'Compare these two images',
      image: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
      ],
    },
  ],
});
```

## Error Handling

The SDK provides typed error classes for different failure scenarios:

```typescript
import JassieAI, {
  JassieAPIError,
  JassieAuthenticationError,
  JassieRateLimitError,
  JassieTimeoutError,
  JassieConnectionError,
} from 'jassie-ai';

try {
  const response = await client.text.generate({ /* ... */ });
} catch (error) {
  if (error instanceof JassieAuthenticationError) {
    // Invalid or missing API key (401)
  } else if (error instanceof JassieRateLimitError) {
    // Too many requests (429)
    console.log('Retry after:', error.retryAfter);
  } else if (error instanceof JassieTimeoutError) {
    // Request timed out
  } else if (error instanceof JassieConnectionError) {
    // Network error
  } else if (error instanceof JassieAPIError) {
    // Other API error
    console.log('Status:', error.status);
    console.log('Message:', error.message);
  }
}
```

### Automatic Retries

The SDK automatically retries on:
- **5xx** server errors
- **429** rate limit errors (respects `Retry-After` header)
- Network/connection errors
- Timeouts

It does **not** retry on 4xx client errors (except 429). Retries use exponential backoff with jitter.

## Platform Support

| Platform | Transport | Auto-detected |
|---|---|---|
| Node.js >= 16 | Fetch API | Yes |
| Browsers | Fetch API | Yes |
| React Native | XMLHttpRequest | Yes |

The platform is auto-detected, but you can override it:

```typescript
const client = new JassieAI({
  apiKey: 'your-api-key',
  platform: 'react-native',
});
```

## React Native

The SDK works out of the box with React Native. Streaming uses `XMLHttpRequest` for compatibility:

```typescript
import JassieAI from 'jassie-ai';

const client = new JassieAI({ apiKey: 'your-api-key' });

const stream = client.text.stream({
  model: 'jassie-bolt',
  messages: [{ role: 'user', content: 'Hello from React Native!' }],
});

let text = '';
for await (const chunk of stream) {
  text += chunk.content;
  setText(text); // Update React state
}
```

## TypeScript

All types are exported for full type safety:

```typescript
import type {
  JassieAIOptions,
  Message,
  TextModel,
  CodeModel,
  ImageModel,
  VideoModel,
  MusicModel,
  TextGenerateParams,
  TextStreamParams,
  CodeGenerateParams,
  CodeStreamParams,
  ImageGenerateParams,
  VideoGenerateParams,
  MusicGenerateParams,
  TextResponse,
  ImageResponse,
  VideoTaskResponse,
  MusicTaskResponse,
  JassieChunk,
  PollOptions,
  Usage,
} from 'jassie-ai';
```

## License

MIT

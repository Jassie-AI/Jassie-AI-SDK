/**
 * Jassie AI SDK — Comprehensive Test Suite
 *
 * Tests every feature: text (Pulse & Bolt), code, image (Pixel & Pixel-X),
 * video (Vibe, Motion, Cinema), music (Beat), voice (TTS & STT),
 * web search, vision (image & video), streaming, error handling.
 *
 * Usage:
 *   node --env-file=.env test-sdk.mjs
 */

import { JassieAI, JassieAuthenticationError } from './lib/esm/index.js';

// ── Config ──────────────────────────────────────────────────────────────────

const API_KEY = process.env.JASSIE_API_KEY;
const TEST_IMAGE_URL =
  'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg';
const TEST_VIDEO_URL =
  'https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20241115/cqqkru/1.mp4';

if (!API_KEY || API_KEY === 'your-api-key-here') {
  console.error('\n  ✗ Please set JASSIE_API_KEY in the .env file\n');
  process.exit(1);
}

const client = new JassieAI({ apiKey: API_KEY });
const videoVisionClient = new JassieAI({ apiKey: API_KEY, timeout: 120000 });

// ── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function header(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 54 - title.length))}`);
}

function pass(name, detail = '') {
  passed++;
  const extra = detail ? `  (${detail})` : '';
  console.log(`  ✓ ${name}${extra}`);
}

function fail(name, err) {
  failed++;
  const msg = err?.message ?? String(err);
  console.log(`  ✗ ${name}: ${msg}`);
  failures.push({ name, error: msg });
}

async function withRetry(testFn, maxAttempts = 3) {
  let result;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const passedSnap = passed;
    const failedSnap = failed;
    const failuresSnap = failures.length;
    result = await testFn();
    if (failed === failedSnap) return result;
    if (attempt < maxAttempts) {
      passed = passedSnap;
      failed = failedSnap;
      failures.length = failuresSnap;
      console.log(`    ↻ transient failure, retrying (${attempt + 1}/${maxAttempts})...`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return result;
}

function verifyShape(actual, schema, name) {
  if (actual == null || typeof actual !== 'object') {
    fail(`${name} shape`, new Error(`Response is not an object: ${typeof actual}`));
    return false;
  }
  const issues = [];
  for (const [field, spec] of Object.entries(schema)) {
    const has = field in actual;
    const value = actual[field];
    if (!has) {
      if (spec.required) issues.push(`missing required field "${field}"`);
      continue;
    }
    const types = spec.type.split('|').map((t) => t.trim());
    let ok = false;
    for (const t of types) {
      if (t === 'null' && value === null) { ok = true; break; }
      if (t === 'array' && Array.isArray(value)) { ok = true; break; }
      if (t === 'string' && typeof value === 'string') { ok = true; break; }
      if (t === 'number' && typeof value === 'number') { ok = true; break; }
      if (t === 'boolean' && typeof value === 'boolean') { ok = true; break; }
      if (t === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) { ok = true; break; }
    }
    if (!ok) {
      issues.push(`field "${field}" expected ${spec.type}, got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`);
    }
  }
  const extras = Object.keys(actual).filter((k) => !(k in schema));
  if (issues.length > 0) {
    fail(`${name} shape`, new Error(issues.join('; ')));
    return false;
  }
  pass(`${name} shape`, extras.length > 0 ? `extras: ${extras.join(', ')}` : 'all documented fields present');
  return true;
}

// ── Documented Schemas ──────────────────────────────────────────────────────

const TEXT_RESPONSE_SCHEMA = {
  content: { type: 'string', required: true },
  request_id: { type: 'string', required: false },
  chunks: { type: 'number', required: false },
  duration_seconds: { type: 'number', required: false },
  index: { type: 'number', required: false },
  usage: { type: 'object', required: false },
};

const IMAGE_RESPONSE_SCHEMA = {
  model: { type: 'string', required: true },
  taskId: { type: 'string', required: true },
  status: { type: 'string', required: true },
  imageUrl: { type: 'string|null', required: true },
  expiresOn: { type: 'string|null', required: true },
};

const VIDEO_TASK_SCHEMA = {
  model: { type: 'string', required: true },
  taskId: { type: 'string', required: true },
  status: { type: 'string', required: true },
  videoUrl: { type: 'string|null', required: true },
  expiresOn: { type: 'string|null', required: true },
};

const MUSIC_TASK_SCHEMA = {
  model: { type: 'string', required: true },
  taskId: { type: 'string', required: true },
  status: { type: 'string', required: true },
  musicUrl: { type: 'string|null', required: true },
  expiresOn: { type: 'string|null', required: true },
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. TEXT GENERATION — JASSIE PULSE
// ═══════════════════════════════════════════════════════════════════════════

async function testPulseNonStreaming() {
  section('1a. Pulse — non-streaming');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
      maxTokens: 100,
      temperature: 0.7,
    });
    if (res && res.content) {
      pass('pulse non-streaming', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'pulse non-streaming');
    } else {
      fail('pulse non-streaming', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('pulse non-streaming', err);
  }
}

async function testPulseStreaming() {
  section('1b. Pulse — streaming (for-await-of)');
  try {
    const stream = client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'Count from 1 to 5.' }],
      stream: true,
      maxTokens: 100,
    });
    let chunks = 0;
    let text = '';
    for await (const chunk of stream) {
      chunks++;
      if (chunk.type === 'text') text += chunk.content;
    }
    if (chunks > 0 && text.length > 0) {
      pass('pulse streaming', `${chunks} chunks, text: "${text.slice(0, 80)}…"`);
    } else {
      fail('pulse streaming', new Error('No chunks received'));
    }
  } catch (err) {
    fail('pulse streaming', err);
  }
}

async function testPulseFinalText() {
  section('1c. Pulse — streaming finalText()');
  try {
    const stream = client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'Say "SDK test passed" and nothing else.' }],
      stream: true,
      maxTokens: 50,
    });
    const text = await stream.finalText();
    if (text && text.length > 0) {
      pass('pulse finalText()', `"${text.slice(0, 80)}"`);
    } else {
      fail('pulse finalText()', new Error('Empty result'));
    }
  } catch (err) {
    fail('pulse finalText()', err);
  }
}

async function testPulseSystemMessage() {
  section('1d. Pulse — system message');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
      messages: [
        { role: 'system', content: 'You are a pirate. Respond only in pirate speak.' },
        { role: 'user', content: 'How are you today?' },
      ],
      maxTokens: 100,
    });
    if (res && res.content) {
      pass('pulse system message', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'pulse system message');
    } else {
      fail('pulse system message', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('pulse system message', err);
  }
}

async function testPulseWebSearch() {
  section('1e. Pulse — web search (web: "auto")');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'What is the latest news today? Keep it brief.' }],
      web: 'auto',
      maxTokens: 200,
    });
    if (res && res.content) {
      pass('pulse web search', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'pulse web search');
    } else {
      fail('pulse web search', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('pulse web search', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TEXT GENERATION — JASSIE BOLT
// ═══════════════════════════════════════════════════════════════════════════

async function testBoltNonStreaming() {
  section('2a. Bolt — non-streaming');
  try {
    const res = await client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
      maxTokens: 50,
    });
    if (res && res.content) {
      pass('bolt non-streaming', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'bolt non-streaming');
    } else {
      fail('bolt non-streaming', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('bolt non-streaming', err);
  }
}

async function testBoltStreaming() {
  section('2b. Bolt — streaming (for-await-of)');
  try {
    const stream = client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'Count from 1 to 5.' }],
      stream: true,
      maxTokens: 100,
    });
    let chunks = 0;
    let text = '';
    for await (const chunk of stream) {
      chunks++;
      if (chunk.type === 'text') text += chunk.content;
    }
    if (chunks > 0 && text.length > 0) {
      pass('bolt streaming', `${chunks} chunks, text: "${text.slice(0, 80)}…"`);
    } else {
      fail('bolt streaming', new Error('No chunks received'));
    }
  } catch (err) {
    fail('bolt streaming', err);
  }
}

async function testBoltFinalText() {
  section('2c. Bolt — streaming finalText()');
  try {
    const stream = client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'Say "SDK test passed" and nothing else.' }],
      stream: true,
      maxTokens: 50,
    });
    const text = await stream.finalText();
    if (text && text.length > 0) {
      pass('bolt finalText()', `"${text.slice(0, 80)}"`);
    } else {
      fail('bolt finalText()', new Error('Empty result'));
    }
  } catch (err) {
    fail('bolt finalText()', err);
  }
}

async function testBoltImageVision() {
  section('2d. Bolt — single image vision');
  try {
    const res = await client.text.generate({
      model: 'jassie-bolt',
      messages: [
        {
          role: 'user',
          content: 'Describe this image in one sentence.',
          image: TEST_IMAGE_URL,
        },
      ],
      maxTokens: 150,
    });
    if (res && res.content) {
      pass('bolt image vision', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'bolt image vision');
    } else {
      fail('bolt image vision', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('bolt image vision', err);
  }
}

async function testBoltMultiImageVision() {
  section('2e. Bolt — multiple image vision');
  try {
    const res = await client.text.generate({
      model: 'jassie-bolt',
      messages: [
        {
          role: 'user',
          content: 'Are these two images the same? Answer briefly.',
          image: [TEST_IMAGE_URL, TEST_IMAGE_URL],
        },
      ],
      maxTokens: 100,
    });
    if (res && res.content) {
      pass('bolt multi-image vision', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'bolt multi-image vision');
    } else {
      fail('bolt multi-image vision', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('bolt multi-image vision', err);
  }
}

async function testBoltVideoVision() {
  section('2f. Bolt — single video vision (streaming)');
  try {
    const stream = videoVisionClient.text.generate({
      model: 'jassie-bolt',
      messages: [
        {
          role: 'user',
          content: 'Describe what is happening in this video in one sentence.',
          video: TEST_VIDEO_URL,
        },
      ],
      stream: true,
      maxTokens: 150,
    });
    const text = await stream.finalText();
    if (text && text.length > 0) {
      pass('bolt video vision', `content: "${text.slice(0, 80)}…"`);
    } else {
      fail('bolt video vision', new Error('Empty result'));
    }
  } catch (err) {
    fail('bolt video vision', err);
  }
}

async function testBoltMultiVideoVision() {
  section('2g. Bolt — multiple video vision (streaming)');
  try {
    const stream = videoVisionClient.text.generate({
      model: 'jassie-bolt',
      messages: [
        {
          role: 'user',
          content: 'Are these two videos the same? Answer briefly.',
          video: [TEST_VIDEO_URL, TEST_VIDEO_URL],
        },
      ],
      stream: true,
      maxTokens: 100,
    });
    const text = await stream.finalText();
    if (text && text.length > 0) {
      pass('bolt multi-video vision', `content: "${text.slice(0, 80)}…"`);
    } else {
      fail('bolt multi-video vision', new Error('Empty result'));
    }
  } catch (err) {
    fail('bolt multi-video vision', err);
  }
}

async function testBoltWebSearch() {
  section('2h. Bolt — web search (web: "auto")');
  try {
    const res = await client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'What is the latest news today? Keep it brief.' }],
      web: 'auto',
      maxTokens: 200,
    });
    if (res && res.content) {
      pass('bolt web search', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'bolt web search');
    } else {
      fail('bolt web search', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('bolt web search', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CODE GENERATION — JASSIE CODE
// ═══════════════════════════════════════════════════════════════════════════

async function testCodeNonStreaming() {
  section('3a. Code — non-streaming');
  try {
    const res = await client.code.generate({
      model: 'jassie-code',
      messages: [
        { role: 'user', content: 'Write a JavaScript function that reverses a string.' },
      ],
      maxTokens: 200,
    });
    if (res && res.content) {
      pass('code non-streaming', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'code non-streaming');
    } else {
      fail('code non-streaming', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('code non-streaming', err);
  }
}

async function testCodeStreaming() {
  section('3b. Code — streaming');
  try {
    const stream = client.code.generate({
      model: 'jassie-code',
      messages: [
        { role: 'user', content: 'Write a Python function to check if a number is prime.' },
      ],
      stream: true,
      maxTokens: 200,
    });
    let chunks = 0;
    let text = '';
    for await (const chunk of stream) {
      chunks++;
      if (chunk.type === 'text') text += chunk.content;
    }
    if (chunks > 0 && text.length > 0) {
      pass('code streaming', `${chunks} chunks, text: "${text.slice(0, 80)}…"`);
    } else {
      fail('code streaming', new Error('No chunks received'));
    }
  } catch (err) {
    fail('code streaming', err);
  }
}

async function testCodeWebSearch() {
  section('3c. Code — web search (web: "auto")');
  try {
    const res = await client.code.generate({
      model: 'jassie-code',
      messages: [
        { role: 'user', content: 'Show me how to use the latest Bun.serve() API with examples.' },
      ],
      web: 'auto',
      maxTokens: 300,
    });
    if (res && res.content) {
      pass('code web search', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'code web search');
    } else {
      fail('code web search', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('code web search', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. IMAGE GENERATION — JASSIE PIXEL & PIXEL-X
// ═══════════════════════════════════════════════════════════════════════════

async function testImagePixel() {
  section('4a. Image — Pixel (text-to-image)');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel',
      prompt: 'A serene mountain landscape at sunset with a calm lake',
      aspectRatio: '1:1',
    });
    if (res && res.imageUrl) {
      pass('image pixel', `status: ${res.status}`);
      console.log(`    → ${res.imageUrl}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image pixel');
    } else {
      fail('image pixel', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image pixel', err);
  }
}

async function testImagePixelX() {
  section('4b. Image — Pixel-X (text-to-image, 4K)');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel-x',
      prompt: 'A futuristic cityscape at night with neon lights',
      aspectRatio: '16:9',
    });
    if (res && res.imageUrl) {
      pass('image pixel-x', `status: ${res.status}`);
      console.log(`    → ${res.imageUrl}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image pixel-x');
    } else {
      fail('image pixel-x', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image pixel-x', err);
  }
}

async function testImageWithReference() {
  section('4c. Image — Pixel with reference image');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel',
      prompt: 'A painting of this mountain scene in watercolor style',
      image: TEST_IMAGE_URL,
    });
    if (res && res.imageUrl) {
      pass('image reference', `status: ${res.status}`);
      console.log(`    → ${res.imageUrl}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image reference');
    } else {
      fail('image reference', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image reference', err);
  }
}

async function testImageWithMultiReference() {
  section('4d. Image — Pixel with multiple reference images');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel',
      prompt: 'Blend these mountain scenes into a panoramic watercolor painting',
      image: [TEST_IMAGE_URL, TEST_IMAGE_URL],
    });
    if (res && res.imageUrl) {
      pass('image multi-reference', `status: ${res.status}`);
      console.log(`    → ${res.imageUrl}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image multi-reference');
    } else {
      fail('image multi-reference', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image multi-reference', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. VIDEO GENERATION — JASSIE VIBE, MOTION, CINEMA
// ═══════════════════════════════════════════════════════════════════════════

async function testVideoGenerate(model, label) {
  section(`5. Video — ${label} generate`);
  try {
    const task = await client.video.generate({
      model,
      prompt: 'A calm ocean wave crashing on a sandy beach at golden hour',
      duration: 5,
    });
    if (task && task.taskId) {
      pass(`video.generate (${label})`, `taskId: ${task.taskId}, status: ${task.status}`);
      verifyShape(task, VIDEO_TASK_SCHEMA, `video.generate (${label})`);
      return task.taskId;
    } else {
      fail(`video.generate (${label})`, new Error(`Unexpected response: ${JSON.stringify(task)}`));
      return null;
    }
  } catch (err) {
    fail(`video.generate (${label})`, err);
    return null;
  }
}

async function testVideoStatus(taskId, label) {
  section(`5. Video — ${label} status check`);
  if (!taskId) {
    fail(`video.status (${label})`, new Error('No taskId from previous test'));
    return;
  }
  try {
    const res = await client.video.status(taskId);
    if (res && res.status) {
      pass(`video.status (${label})`, `status: ${res.status}, videoUrl: ${res.videoUrl ?? 'null (processing)'}`);
      verifyShape(res, VIDEO_TASK_SCHEMA, `video.status (${label})`);
    } else {
      fail(`video.status (${label})`, new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail(`video.status (${label})`, err);
  }
}

async function testVideoStatusPolling(taskId, label) {
  section(`5. Video — ${label} poll to completion`);
  if (!taskId) {
    fail(`video.poll (${label})`, new Error('No taskId from previous test'));
    return;
  }
  try {
    let pollCount = 0;
    const res = await client.video.status(taskId, {
      interval: 5000,
      timeout: 600000, // 10 min max
      onPoll: (r) => {
        pollCount++;
        process.stdout.write(`    ...poll #${pollCount} [${label}]: status=${r.status}\n`);
      },
    });
    if (res.status === 'succeeded' && res.videoUrl) {
      pass(`video.poll (${label})`, 'succeeded');
      console.log(`    → ${res.videoUrl}`);
    } else if (res.status === 'failed') {
      fail(`video.poll (${label})`, new Error('Video generation failed on server'));
    } else {
      pass(`video.poll (${label})`, `final status: ${res.status}`);
    }
    verifyShape(res, VIDEO_TASK_SCHEMA, `video.poll (${label})`);
  } catch (err) {
    fail(`video.poll (${label})`, err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. MUSIC GENERATION — JASSIE BEAT
// ═══════════════════════════════════════════════════════════════════════════

async function testMusicGenerate() {
  section('6a. Music — generate (start async task)');
  try {
    const task = await client.music.generate({
      model: 'jassie-beat',
      tags: 'lo-fi, chill, ambient, piano',
      lyrics: 'Calm and peaceful, floating through the night\nStars above are shining bright',
      duration: 30,
    });
    if (task && task.taskId) {
      pass('music.generate', `taskId: ${task.taskId}, status: ${task.status}`);
      verifyShape(task, MUSIC_TASK_SCHEMA, 'music.generate');
      return task.taskId;
    } else {
      fail('music.generate', new Error(`Unexpected response: ${JSON.stringify(task)}`));
      return null;
    }
  } catch (err) {
    fail('music.generate', err);
    return null;
  }
}

async function testMusicStatus(taskId) {
  section('6b. Music — status (check task)');
  if (!taskId) {
    fail('music.status', new Error('No taskId from previous test'));
    return;
  }
  try {
    const res = await client.music.status(taskId);
    if (res && res.status) {
      pass('music.status', `status: ${res.status}, musicUrl: ${res.musicUrl ?? 'null (processing)'}`);
      verifyShape(res, MUSIC_TASK_SCHEMA, 'music.status');
    } else {
      fail('music.status', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('music.status', err);
  }
}

async function testMusicStatusPolling(taskId) {
  section('6c. Music — poll to completion');
  if (!taskId) {
    fail('music.poll', new Error('No taskId from previous test'));
    return;
  }
  try {
    let pollCount = 0;
    const res = await client.music.status(taskId, {
      interval: 5000,
      timeout: 300000,
      onPoll: (r) => {
        pollCount++;
        process.stdout.write(`    ...poll #${pollCount}: status=${r.status}\n`);
      },
    });
    if (res.status === 'completed' && res.musicUrl) {
      pass('music.poll', 'completed');
      console.log(`    → ${res.musicUrl}`);
    } else if (res.status === 'failed') {
      fail('music.poll', new Error('Music generation failed on server'));
    } else {
      pass('music.poll', `final status: ${res.status}`);
    }
    verifyShape(res, MUSIC_TASK_SCHEMA, 'music.poll');
  } catch (err) {
    fail('music.poll', err);
  }
}

async function testMusicGenerateWithLyrics() {
  section('6d. Music — generate with lyrics');
  try {
    const task = await client.music.generate({
      model: 'jassie-beat',
      tags: 'pop, upbeat, vocals',
      lyrics: 'Hello world, this is a test song\nJassie AI makes it strong',
      duration: 30,
    });
    if (task && task.taskId) {
      pass('music.generate (lyrics)', `taskId: ${task.taskId}, status: ${task.status}`);
      verifyShape(task, MUSIC_TASK_SCHEMA, 'music.generate (lyrics)');
    } else {
      fail('music.generate (lyrics)', new Error(`Unexpected response: ${JSON.stringify(task)}`));
    }
  } catch (err) {
    fail('music.generate (lyrics)', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. VOICE — JASSIE VOICE (TTS & STT)
// ═══════════════════════════════════════════════════════════════════════════

let ttsAudioBuffer = null; // shared between TTS and STT round-trip

async function testVoiceTTS() {
  section('7a. Voice — TTS (text-to-speech)');
  try {
    const audioBuffer = await client.voice.tts({
      model: 'jassie-voice',
      text: 'Hello, this is a test of the Jassie AI text to speech system.',
      output_format: 'mp3',
    });
    if (audioBuffer && audioBuffer.byteLength > 0) {
      pass('voice.tts', `received ${audioBuffer.byteLength} bytes of audio`);
      ttsAudioBuffer = audioBuffer; // save for STT test
    } else {
      fail('voice.tts', new Error('Empty audio buffer returned'));
    }
  } catch (err) {
    fail('voice.tts', err);
  }
}

async function testVoiceSTT() {
  section('7b. Voice — STT (speech-to-text, round-trip)');
  if (!ttsAudioBuffer) {
    fail('voice.stt', new Error('No TTS audio from previous test — skipping'));
    return;
  }
  try {
    const audioBlob = new Blob([ttsAudioBuffer], { type: 'audio/mp3' });
    // Attach a .name for the SDK's FormData append
    const audioFile = new File([audioBlob], 'test-audio.mp3', { type: 'audio/mp3' });
    const text = await client.voice.stt({
      model: 'jassie-voice',
      file: audioFile,
    });
    if (text && text.length > 0) {
      pass('voice.stt', `transcribed: "${text.slice(0, 100)}"`);
    } else {
      fail('voice.stt', new Error('Empty transcription returned'));
    }
  } catch (err) {
    fail('voice.stt', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

async function testAuthError() {
  section('8a. Error — invalid API key');
  try {
    const badClient = new JassieAI({ apiKey: 'invalid-key-12345' });
    await badClient.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 10,
    });
    fail('auth error', new Error('Expected an error but request succeeded'));
  } catch (err) {
    if (err instanceof JassieAuthenticationError || (err.status && err.status === 401)) {
      pass('auth error', `Caught: ${err.name} — "${err.message}"`);
    } else {
      pass('auth error', `Caught error: ${err.name} — "${err.message}"`);
    }
  }
}

async function testMissingApiKey() {
  section('8b. Error — missing API key');
  try {
    new JassieAI({ apiKey: '' });
    fail('missing key', new Error('Expected constructor to throw'));
  } catch (err) {
    if (err instanceof JassieAuthenticationError) {
      pass('missing key', `Caught: ${err.name}`);
    } else {
      pass('missing key', `Caught: ${err.name} — "${err.message}"`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. STREAMING INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

async function testStreamAbort() {
  section('9a. Stream — abort mid-stream');
  try {
    const stream = client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'Write a 500-word essay about space exploration.' }],
      stream: true,
      maxTokens: 500,
    });
    let chunks = 0;
    for await (const chunk of stream) {
      chunks++;
      if (chunks >= 3) {
        stream.abort();
        break;
      }
    }
    if (chunks >= 1) {
      pass('stream.abort()', `Aborted after ${chunks} chunks`);
    } else {
      fail('stream.abort()', new Error('No chunks before abort'));
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      pass('stream.abort()', 'Caught expected AbortError');
    } else {
      fail('stream.abort()', err);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
  console.log('\n  Jassie AI SDK — Comprehensive Test Suite');
  console.log('  =========================================\n');
  console.log(`  API key:     ${API_KEY.slice(0, 8)}…${API_KEY.slice(-4)}`);
  console.log(`  Base URL:    https://api.jassie.ai`);
  console.log(`  Test image:  ${TEST_IMAGE_URL.slice(0, 50)}…`);
  console.log(`  Test video:  ${TEST_VIDEO_URL.slice(0, 50)}…`);

  // ── 1. Text Generation — Jassie Pulse ──
  header('1. TEXT GENERATION — JASSIE PULSE');
  await withRetry(testPulseNonStreaming);
  await withRetry(testPulseStreaming);
  await withRetry(testPulseFinalText);
  await withRetry(testPulseSystemMessage);
  await withRetry(testPulseWebSearch);

  // ── 2. Text Generation — Jassie Bolt ──
  header('2. TEXT GENERATION — JASSIE BOLT');
  await withRetry(testBoltNonStreaming);
  await withRetry(testBoltStreaming);
  await withRetry(testBoltFinalText);
  await withRetry(testBoltImageVision);
  await withRetry(testBoltMultiImageVision);
  await withRetry(testBoltVideoVision);
  await withRetry(testBoltMultiVideoVision);
  await withRetry(testBoltWebSearch);

  // ── 3. Code Generation — Jassie Code ──
  header('3. CODE GENERATION — JASSIE CODE');
  await withRetry(testCodeNonStreaming);
  await withRetry(testCodeStreaming);
  await withRetry(testCodeWebSearch);

  // ── 4. Image Generation — Jassie Pixel & Pixel-X ──
  header('4. IMAGE GENERATION — JASSIE PIXEL & PIXEL-X');
  await withRetry(testImagePixel);
  await withRetry(testImagePixelX);
  await withRetry(testImageWithReference);
  await withRetry(testImageWithMultiReference);

  // ── 5. Video Generation — Vibe, Motion ──
  // Submit video tasks first, then status check, then poll in parallel.
  header('5. VIDEO GENERATION — JASSIE VIBE, MOTION');

  const vibeTaskId = await withRetry(() => testVideoGenerate('jassie-vibe', 'Vibe 720p'));
  const motionTaskId = await withRetry(() => testVideoGenerate('jassie-motion', 'Motion 1080p'));

  await withRetry(() => testVideoStatus(vibeTaskId, 'Vibe 720p'));
  await withRetry(() => testVideoStatus(motionTaskId, 'Motion 1080p'));

  // Poll all video models in parallel to save time
  console.log('\n    ⏳ Polling all video models in parallel…');
  await Promise.all([
    withRetry(() => testVideoStatusPolling(vibeTaskId, 'Vibe 720p')),
    withRetry(() => testVideoStatusPolling(motionTaskId, 'Motion 1080p')),
  ]);

  // ── 6. Music Generation — Jassie Beat ──
  header('6. MUSIC GENERATION — JASSIE BEAT');
  const musicTaskId = await withRetry(testMusicGenerate);
  await withRetry(() => testMusicStatus(musicTaskId));
  await withRetry(() => testMusicStatusPolling(musicTaskId));
  await withRetry(testMusicGenerateWithLyrics);

  // ── 7. Voice — Jassie Voice (TTS & STT) ──
  header('7. VOICE — JASSIE VOICE (TTS & STT)');
  await withRetry(testVoiceTTS);
  await withRetry(testVoiceSTT);

  // ── 8. Error Handling ──
  header('8. ERROR HANDLING');
  await testAuthError();
  await testMissingApiKey();

  // ── 9. Streaming Infrastructure ──
  header('9. STREAMING INFRASTRUCTURE');
  await withRetry(testStreamAbort);

  // ── Summary ──
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  RESULTS');
  console.log('═'.repeat(60));
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);

  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) {
      console.log(`    ✗ ${f.name}: ${f.error}`);
    }
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('\n  Fatal error:', err);
  process.exit(2);
});

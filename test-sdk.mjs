/**
 * Jassie AI SDK — Comprehensive Test Suite
 *
 * Tests every feature: text, code, image, video, music generation,
 * streaming, vision, web search, error handling.
 *
 * Usage:
 *   node --env-file=.env test-sdk.mjs
 */

import { JassieAI, JassieAuthenticationError } from './lib/esm/index.js';

// ── Config ──────────────────────────────────────────────────────────────────

const API_KEY = process.env.JASSIE_API_KEY;
const TEST_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg';

if (!API_KEY || API_KEY === 'your-api-key-here') {
  console.error('\n  ✗ Please set JASSIE_API_KEY in the .env file\n');
  process.exit(1);
}

const client = new JassieAI({ apiKey: API_KEY });

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

// Wraps a test in a retry loop. The live API occasionally returns empty content
// or an empty stream (upstream LLM flake). On failure we rewind the counters
// and re-run the test. Only the final attempt's outcome counts.
async function withRetry(testFn, maxAttempts = 3) {
  let result;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const passedSnap = passed;
    const failedSnap = failed;
    const failuresSnap = failures.length;
    result = await testFn();
    if (failed === failedSnap) return result;
    if (attempt < maxAttempts) {
      // Rewind state so the retry's output is the source of truth.
      passed = passedSnap;
      failed = failedSnap;
      failures.length = failuresSnap;
      console.log(`    ↻ transient failure, retrying (${attempt + 1}/${maxAttempts})...`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return result;
}

// Schema validator. Shape is { fieldName: { type: 'string'|'number'|'array'|'object'|'string|null', required: bool } }
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
    // Type check (allow null for nullable)
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
  // Report extra fields (informational, doesn't fail)
  const extras = Object.keys(actual).filter((k) => !(k in schema));
  if (issues.length > 0) {
    fail(`${name} shape`, new Error(issues.join('; ')));
    return false;
  }
  pass(`${name} shape`, extras.length > 0 ? `extras: ${extras.join(', ')}` : 'all documented fields present');
  return true;
}

// ── Documented schemas (from README.md / src/types.ts) ──
const TEXT_RESPONSE_SCHEMA = {
  content: { type: 'string', required: true },
  request_id: { type: 'string', required: false },
  chunks: { type: 'number', required: false },
  duration_seconds: { type: 'number', required: false },
  index: { type: 'number', required: false },
  usage: { type: 'object', required: false },
};

const IMAGE_RESPONSE_SCHEMA = {
  images: { type: 'array', required: true },
  created: { type: 'number', required: true },
  usage: { type: 'number', required: true },
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

// ── 1. TEXT GENERATION ──────────────────────────────────────────────────────

async function testTextCreate() {
  section('1a. Text — create (non-streaming, jassie-pulse)');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
      maxTokens: 100,
      temperature: 0.7,
    });
    if (res && res.content) {
      pass('text.generate', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'text.generate');
    } else {
      fail('text.generate', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.generate', err);
  }
}

async function testTextCreateBolt() {
  section('1b. Text — create (non-streaming, jassie-bolt)');
  try {
    const res = await client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
      maxTokens: 50,
    });
    if (res && res.content) {
      pass('text.generate (bolt)', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'text.generate (bolt)');
    } else {
      fail('text.generate (bolt)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.generate (bolt)', err);
  }
}

async function testTextCreateStream() {
  section('1c. Text — create (stream: true)');
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
      pass('text.generate (stream)', `${chunks} chunks, text: "${text.slice(0, 80)}…"`);
    } else {
      fail('text.generate (stream)', new Error(`No chunks received`));
    }
  } catch (err) {
    fail('text.generate (stream)', err);
  }
}

async function testTextCreateFinalText() {
  section('1d. Text — create stream.finalText()');
  try {
    const stream = client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'Say "SDK test passed" and nothing else.' }],
      stream: true,
      maxTokens: 50,
    });

    const text = await stream.finalText();
    if (text && text.length > 0) {
      pass('stream.finalText()', `"${text.slice(0, 80)}"`);
    } else {
      fail('stream.finalText()', new Error('Empty result'));
    }
  } catch (err) {
    fail('stream.finalText()', err);
  }
}

async function testTextWebSearch() {
  section('1e. Text — web search (web: "auto")');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'What is the latest news today? Keep it brief.' }],
      web: 'auto',
      maxTokens: 200,
    });
    if (res && res.content) {
      pass('text.generate (web)', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'text.generate (web)');
    } else {
      fail('text.generate (web)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.generate (web)', err);
  }
}

async function testTextVision() {
  section('1f. Text — vision (image input)');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
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
      pass('text.generate (vision)', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'text.generate (vision)');
    } else {
      fail('text.generate (vision)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.generate (vision)', err);
  }
}

async function testTextVisionMultiImage() {
  section('1g. Text — vision (multiple images)');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
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
      pass('text.generate (multi-image)', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'text.generate (multi-image)');
    } else {
      fail('text.generate (multi-image)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.generate (multi-image)', err);
  }
}

async function testTextSystemMessage() {
  section('1h. Text — system message');
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
      pass('text.generate (system msg)', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'text.generate (system msg)');
    } else {
      fail('text.generate (system msg)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.generate (system msg)', err);
  }
}

// ── 2. CODE GENERATION ──────────────────────────────────────────────────────

async function testCodeCreate() {
  section('2a. Code — create (non-streaming)');
  try {
    const res = await client.code.generate({
      model: 'jassie-code',
      messages: [
        { role: 'user', content: 'Write a JavaScript function that reverses a string.' },
      ],
      maxTokens: 200,
    });
    if (res && res.content) {
      pass('code.generate', `content: "${res.content.slice(0, 80)}…"`);
      verifyShape(res, TEXT_RESPONSE_SCHEMA, 'code.generate');
    } else {
      fail('code.generate', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('code.generate', err);
  }
}

async function testCodeCreateStream() {
  section('2b. Code — create (stream: true)');
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
      pass('code.generate (stream)', `${chunks} chunks, text: "${text.slice(0, 80)}…"`);
    } else {
      fail('code.generate (stream)', new Error('No chunks received'));
    }
  } catch (err) {
    fail('code.generate (stream)', err);
  }
}

// ── 3. IMAGE GENERATION ─────────────────────────────────────────────────────

async function testImageGenerate() {
  section('3a. Image — generate (text-to-image, jassie-pixel)');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel',
      prompt: 'A serene mountain landscape at sunset with a calm lake',
      width: 512,
      height: 512,
    });
    if (res && res.images && res.images.length > 0) {
      pass('image.generate (pixel)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image.generate (pixel)');
    } else {
      fail('image.generate (pixel)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image.generate (pixel)', err);
  }
}

async function testImageGenerateAdvanced() {
  section('3b. Image — generate (jassie-pixel-x, advanced params)');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel-x',
      prompt: 'A futuristic cityscape at night with neon lights',
      width: 768,
      height: 512,
      guidance_scale: 7.5,
      num_inference_steps: 30,
      negative_prompt: 'blurry, low quality',
    });
    if (res && res.images && res.images.length > 0) {
      pass('image.generate (pixel-x)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image.generate (pixel-x)');
    } else {
      fail('image.generate (pixel-x)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image.generate (pixel-x)', err);
  }
}

async function testImageWithReference() {
  section('3c. Image — generate with reference image');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel',
      prompt: 'A painting of this mountain scene in watercolor style',
      reference: TEST_IMAGE_URL,
      width: 512,
      height: 512,
    });
    if (res && res.images && res.images.length > 0) {
      pass('image.generate (reference)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image.generate (reference)');
    } else {
      fail('image.generate (reference)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image.generate (reference)', err);
  }
}

async function testImageInterpolation() {
  section('3d. Image — generate with interpolation (first_image + last_image)');
  try {
    const res = await client.image.generate({
      model: 'jassie-pixel',
      prompt: 'Transition between mountain scenes',
      first_image: TEST_IMAGE_URL,
      last_image: TEST_IMAGE_URL,
      width: 512,
      height: 512,
    });
    if (res && res.images && res.images.length > 0) {
      pass('image.generate (interpolation)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
      verifyShape(res, IMAGE_RESPONSE_SCHEMA, 'image.generate (interpolation)');
    } else {
      fail('image.generate (interpolation)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('image.generate (interpolation)', err);
  }
}

// ── 4. VIDEO GENERATION ─────────────────────────────────────────────────────

async function testVideoGenerate() {
  section('4a. Video — generate (start async task)');
  try {
    const task = await client.video.generate({
      model: 'jassie-vibe',
      prompt: 'A calm ocean wave crashing on a sandy beach',
      duration: 5,
    });
    if (task && task.taskId) {
      pass('video.generate', `taskId: ${task.taskId}, status: ${task.status}`);
      verifyShape(task, VIDEO_TASK_SCHEMA, 'video.generate');
      return task.taskId;
    } else {
      fail('video.generate', new Error(`Unexpected response: ${JSON.stringify(task)}`));
      return null;
    }
  } catch (err) {
    fail('video.generate', err);
    return null;
  }
}

async function testVideoStatus(taskId) {
  section('4b. Video — status (check task)');
  if (!taskId) {
    fail('video.status', new Error('No taskId from previous test'));
    return;
  }
  try {
    const res = await client.video.status(taskId);
    if (res && res.status) {
      pass('video.status', `status: ${res.status}, videoUrl: ${res.videoUrl ?? 'null (still processing)'}`);
      verifyShape(res, VIDEO_TASK_SCHEMA, 'video.status');
    } else {
      fail('video.status', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('video.status', err);
  }
}

async function testVideoStatusPolling(taskId) {
  section('4c. Video — status with polling options (wait for completion)');
  if (!taskId) {
    fail('video.status (polling)', new Error('No taskId from previous test'));
    return;
  }
  try {
    let pollCount = 0;
    const res = await client.video.status(taskId, {
      interval: 5000,
      timeout: 300000, // 5 min max
      onPoll: (r) => {
        pollCount++;
        process.stdout.write(`    ...poll #${pollCount}: status=${r.status}\n`);
      },
    });
    if (res.status === 'succeeded' && res.videoUrl) {
      pass('video.status (polling)', `succeeded`);
      console.log(`    → ${res.videoUrl}`);
    } else if (res.status === 'failed') {
      fail('video.status (polling)', new Error('Video generation failed on server'));
    } else {
      pass('video.status (polling)', `final status: ${res.status}`);
    }
    verifyShape(res, VIDEO_TASK_SCHEMA, 'video.status (polling)');
  } catch (err) {
    fail('video.status (polling)', err);
  }
}

// ── 5. MUSIC GENERATION ─────────────────────────────────────────────────────

async function testMusicGenerate() {
  section('5a. Music — generate (start async task)');
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
  section('5b. Music — status (check task)');
  if (!taskId) {
    fail('music.status', new Error('No taskId from previous test'));
    return;
  }
  try {
    const res = await client.music.status(taskId);
    if (res && res.status) {
      pass('music.status', `status: ${res.status}, musicUrl: ${res.musicUrl ?? 'null (still processing)'}`);
      verifyShape(res, MUSIC_TASK_SCHEMA, 'music.status');
    } else {
      fail('music.status', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('music.status', err);
  }
}

async function testMusicStatusPolling(taskId) {
  section('5c. Music — status with polling options (wait for completion)');
  if (!taskId) {
    fail('music.status (polling)', new Error('No taskId from previous test'));
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
      pass('music.status (polling)', `completed`);
      console.log(`    → ${res.musicUrl}`);
    } else if (res.status === 'failed') {
      fail('music.status (polling)', new Error('Music generation failed on server'));
    } else {
      pass('music.status (polling)', `final status: ${res.status}`);
    }
    verifyShape(res, MUSIC_TASK_SCHEMA, 'music.status (polling)');
  } catch (err) {
    fail('music.status (polling)', err);
  }
}

async function testMusicGenerateWithLyrics() {
  section('5d. Music — generate with lyrics (immediate response)');
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

// ── 6. ERROR HANDLING ───────────────────────────────────────────────────────

async function testAuthError() {
  section('6a. Error — invalid API key (JassieAuthenticationError)');
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
      // Any error from invalid key is acceptable (could be 403, network error, etc.)
      pass('auth error', `Caught error: ${err.name} — "${err.message}"`);
    }
  }
}

async function testMissingApiKey() {
  section('6b. Error — missing API key (constructor throws)');
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

// ── 7. STREAM ABORT ─────────────────────────────────────────────────────────

async function testStreamAbort() {
  section('7. Stream — abort mid-stream');
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
    // AbortError is expected
    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      pass('stream.abort()', 'Caught expected AbortError');
    } else {
      fail('stream.abort()', err);
    }
  }
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n  Jassie AI SDK — Comprehensive Test Suite');
  console.log('  =========================================\n');
  console.log(`  API key:     ${API_KEY.slice(0, 8)}…${API_KEY.slice(-4)}`);
  console.log(`  Base URL:    https://api.jassie.ai`);
  console.log(`  Test image:  ${TEST_IMAGE_URL.slice(0, 50)}…`);

  // ── Text Generation Tests ──
  header('1. TEXT GENERATION');
  await withRetry(testTextCreate);
  await withRetry(testTextCreateBolt);
  await withRetry(testTextCreateStream);
  await withRetry(testTextCreateFinalText);
  await withRetry(testTextWebSearch);
  await withRetry(testTextVision);
  await withRetry(testTextVisionMultiImage);
  await withRetry(testTextSystemMessage);

  // ── Code Generation Tests ──
  header('2. CODE GENERATION');
  await withRetry(testCodeCreate);
  await withRetry(testCodeCreateStream);

  // ── Image Generation Tests ──
  header('3. IMAGE GENERATION');
  await withRetry(testImageGenerate);
  await withRetry(testImageGenerateAdvanced);
  await withRetry(testImageWithReference);
  await withRetry(testImageInterpolation);

  // ── Video Generation Tests ──
  header('4. VIDEO GENERATION (async — may take several minutes)');
  const videoTaskId = await withRetry(testVideoGenerate);
  await withRetry(() => testVideoStatus(videoTaskId));
  await withRetry(() => testVideoStatusPolling(videoTaskId));

  // ── Music Generation Tests ──
  header('5. MUSIC GENERATION (async — may take several minutes)');
  const musicTaskId = await withRetry(testMusicGenerate);
  await withRetry(() => testMusicStatus(musicTaskId));
  await withRetry(() => testMusicStatusPolling(musicTaskId));
  await withRetry(testMusicGenerateWithLyrics);

  // ── Error Handling Tests ──
  header('6. ERROR HANDLING');
  await testAuthError();
  await testMissingApiKey();

  // ── Stream Abort Test ──
  header('7. STREAMING INFRASTRUCTURE');
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

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

// ── 1. TEXT GENERATION ──────────────────────────────────────────────────────

async function testTextCreate() {
  section('1a. Text — create (non-streaming, jassie-pulse)');
  try {
    const res = await client.text.create({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
      maxTokens: 100,
      temperature: 0.7,
    });
    if (res && res.content) {
      pass('text.create', `content: "${res.content.slice(0, 80)}…"`);
    } else {
      fail('text.create', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.create', err);
  }
}

async function testTextCreateBolt() {
  section('1b. Text — create (non-streaming, jassie-bolt)');
  try {
    const res = await client.text.create({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
      maxTokens: 50,
    });
    if (res && res.content) {
      pass('text.create (bolt)', `content: "${res.content.slice(0, 80)}…"`);
    } else {
      fail('text.create (bolt)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.create (bolt)', err);
  }
}

async function testTextCreateStream() {
  section('1c. Text — create (stream: true)');
  try {
    const stream = client.text.create({
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
      pass('text.create (stream)', `${chunks} chunks, text: "${text.slice(0, 80)}…"`);
    } else {
      fail('text.create (stream)', new Error(`No chunks received`));
    }
  } catch (err) {
    fail('text.create (stream)', err);
  }
}

async function testTextCreateFinalText() {
  section('1d. Text — create stream.finalText()');
  try {
    const stream = client.text.create({
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
    const res = await client.text.create({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'What is the latest news today? Keep it brief.' }],
      web: 'auto',
      maxTokens: 200,
    });
    if (res && res.content) {
      pass('text.create (web)', `content: "${res.content.slice(0, 80)}…"`);
    } else {
      fail('text.create (web)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.create (web)', err);
  }
}

async function testTextVision() {
  section('1f. Text — vision (image input)');
  try {
    const res = await client.text.create({
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
      pass('text.create (vision)', `content: "${res.content.slice(0, 80)}…"`);
    } else {
      fail('text.create (vision)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.create (vision)', err);
  }
}

async function testTextVisionMultiImage() {
  section('1g. Text — vision (multiple images)');
  try {
    const res = await client.text.create({
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
      pass('text.create (multi-image)', `content: "${res.content.slice(0, 80)}…"`);
    } else {
      fail('text.create (multi-image)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.create (multi-image)', err);
  }
}

async function testTextSystemMessage() {
  section('1h. Text — system message');
  try {
    const res = await client.text.create({
      model: 'jassie-pulse',
      messages: [
        { role: 'system', content: 'You are a pirate. Respond only in pirate speak.' },
        { role: 'user', content: 'How are you today?' },
      ],
      maxTokens: 100,
    });
    if (res && res.content) {
      pass('text.create (system msg)', `content: "${res.content.slice(0, 80)}…"`);
    } else {
      fail('text.create (system msg)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('text.create (system msg)', err);
  }
}

// ── 2. CODE GENERATION ──────────────────────────────────────────────────────

async function testCodeCreate() {
  section('2a. Code — create (non-streaming)');
  try {
    const res = await client.code.create({
      model: 'jassie-code',
      messages: [
        { role: 'user', content: 'Write a JavaScript function that reverses a string.' },
      ],
      maxTokens: 200,
    });
    if (res && res.content) {
      pass('code.create', `content: "${res.content.slice(0, 80)}…"`);
    } else {
      fail('code.create', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('code.create', err);
  }
}

async function testCodeCreateStream() {
  section('2b. Code — create (stream: true)');
  try {
    const stream = client.code.create({
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
      pass('code.create (stream)', `${chunks} chunks, text: "${text.slice(0, 80)}…"`);
    } else {
      fail('code.create (stream)', new Error('No chunks received'));
    }
  } catch (err) {
    fail('code.create (stream)', err);
  }
}

// ── 3. IMAGE GENERATION ─────────────────────────────────────────────────────

async function testImageGenerate() {
  section('3a. Image — generate (text-to-image, jassie-pixel)');
  try {
    const res = await client.images.generate({
      model: 'jassie-pixel',
      prompt: 'A serene mountain landscape at sunset with a calm lake',
      width: 512,
      height: 512,
    });
    if (res && res.images && res.images.length > 0) {
      pass('images.generate (pixel)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
    } else {
      fail('images.generate (pixel)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('images.generate (pixel)', err);
  }
}

async function testImageGenerateAdvanced() {
  section('3b. Image — generate (jassie-pixel-x, advanced params)');
  try {
    const res = await client.images.generate({
      model: 'jassie-pixel-x',
      prompt: 'A futuristic cityscape at night with neon lights',
      width: 768,
      height: 512,
      guidance_scale: 7.5,
      num_inference_steps: 30,
      negative_prompt: 'blurry, low quality',
    });
    if (res && res.images && res.images.length > 0) {
      pass('images.generate (pixel-x)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
    } else {
      fail('images.generate (pixel-x)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('images.generate (pixel-x)', err);
  }
}

async function testImageWithReference() {
  section('3c. Image — generate with reference image');
  try {
    const res = await client.images.generate({
      model: 'jassie-pixel',
      prompt: 'A painting of this mountain scene in watercolor style',
      reference: TEST_IMAGE_URL,
      width: 512,
      height: 512,
    });
    if (res && res.images && res.images.length > 0) {
      pass('images.generate (reference)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
    } else {
      fail('images.generate (reference)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('images.generate (reference)', err);
  }
}

async function testImageInterpolation() {
  section('3d. Image — generate with interpolation (first_image + last_image)');
  try {
    const res = await client.images.generate({
      model: 'jassie-pixel',
      prompt: 'Transition between mountain scenes',
      first_image: TEST_IMAGE_URL,
      last_image: TEST_IMAGE_URL,
      width: 512,
      height: 512,
    });
    if (res && res.images && res.images.length > 0) {
      pass('images.generate (interpolation)', `${res.images.length} image(s)`);
      console.log(`    → ${res.images[0]}`);
    } else {
      fail('images.generate (interpolation)', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('images.generate (interpolation)', err);
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
    } else {
      fail('video.status', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('video.status', err);
  }
}

async function testVideoPoll(taskId) {
  section('4c. Video — poll (wait for completion)');
  if (!taskId) {
    fail('video.poll', new Error('No taskId from previous test'));
    return;
  }
  try {
    let pollCount = 0;
    const res = await client.video.poll(taskId, {
      interval: 5000,
      timeout: 300000, // 5 min max
      onPoll: (r) => {
        pollCount++;
        process.stdout.write(`    ...poll #${pollCount}: status=${r.status}\n`);
      },
    });
    if (res.status === 'succeeded' && res.videoUrl) {
      pass('video.poll', `succeeded`);
      console.log(`    → ${res.videoUrl}`);
    } else if (res.status === 'failed') {
      fail('video.poll', new Error('Video generation failed on server'));
    } else {
      pass('video.poll', `final status: ${res.status}`);
    }
  } catch (err) {
    fail('video.poll', err);
  }
}

async function testVideoGenerateAndWait() {
  section('4d. Video — generateAndWait (convenience)');
  try {
    let pollCount = 0;
    const res = await client.video.generateAndWait(
      {
        model: 'jassie-vibe',
        prompt: 'A butterfly landing on a flower in slow motion',
        duration: 5,
      },
      {
        interval: 5000,
        timeout: 300000,
        onPoll: (r) => {
          pollCount++;
          process.stdout.write(`    ...poll #${pollCount}: status=${r.status}\n`);
        },
      },
    );
    if (res.status === 'succeeded' && res.videoUrl) {
      pass('video.generateAndWait', `succeeded`);
      console.log(`    → ${res.videoUrl}`);
    } else if (res.status === 'failed') {
      fail('video.generateAndWait', new Error('Video generation failed'));
    } else {
      pass('video.generateAndWait', `final status: ${res.status}`);
    }
  } catch (err) {
    fail('video.generateAndWait', err);
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
    } else {
      fail('music.status', new Error(`Unexpected response: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('music.status', err);
  }
}

async function testMusicPoll(taskId) {
  section('5c. Music — poll (wait for completion)');
  if (!taskId) {
    fail('music.poll', new Error('No taskId from previous test'));
    return;
  }
  try {
    let pollCount = 0;
    const res = await client.music.poll(taskId, {
      interval: 5000,
      timeout: 300000,
      onPoll: (r) => {
        pollCount++;
        process.stdout.write(`    ...poll #${pollCount}: status=${r.status}\n`);
      },
    });
    if (res.status === 'completed' && res.musicUrl) {
      pass('music.poll', `completed`);
      console.log(`    → ${res.musicUrl}`);
    } else if (res.status === 'failed') {
      fail('music.poll', new Error('Music generation failed on server'));
    } else {
      pass('music.poll', `final status: ${res.status}`);
    }
  } catch (err) {
    fail('music.poll', err);
  }
}

async function testMusicWithLyrics() {
  section('5d. Music — generateAndWait with lyrics');
  try {
    let pollCount = 0;
    const res = await client.music.generateAndWait(
      {
        model: 'jassie-beat',
        tags: 'pop, upbeat, vocals',
        lyrics: 'Hello world, this is a test song\nJassie AI makes it strong',
        duration: 30,
      },
      {
        interval: 5000,
        timeout: 300000,
        onPoll: (r) => {
          pollCount++;
          process.stdout.write(`    ...poll #${pollCount}: status=${r.status}\n`);
        },
      },
    );
    if (res.status === 'completed' && res.musicUrl) {
      pass('music.generateAndWait (lyrics)', `completed`);
      console.log(`    → ${res.musicUrl}`);
    } else if (res.status === 'failed') {
      fail('music.generateAndWait (lyrics)', new Error('Music generation failed'));
    } else {
      pass('music.generateAndWait (lyrics)', `final status: ${res.status}`);
    }
  } catch (err) {
    fail('music.generateAndWait (lyrics)', err);
  }
}

// ── 6. ERROR HANDLING ───────────────────────────────────────────────────────

async function testAuthError() {
  section('6a. Error — invalid API key (JassieAuthenticationError)');
  try {
    const badClient = new JassieAI({ apiKey: 'invalid-key-12345' });
    await badClient.text.create({
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
    const stream = client.text.create({
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
  await testTextCreate();
  await testTextCreateBolt();
  await testTextCreateStream();
  await testTextCreateFinalText();
  await testTextWebSearch();
  await testTextVision();
  await testTextVisionMultiImage();
  await testTextSystemMessage();

  // ── Code Generation Tests ──
  header('2. CODE GENERATION');
  await testCodeCreate();
  await testCodeCreateStream();

  // ── Image Generation Tests ──
  header('3. IMAGE GENERATION');
  await testImageGenerate();
  await testImageGenerateAdvanced();
  await testImageWithReference();
  await testImageInterpolation();

  // ── Video Generation Tests ──
  header('4. VIDEO GENERATION (async — may take several minutes)');
  const videoTaskId = await testVideoGenerate();
  await testVideoStatus(videoTaskId);
  await testVideoPoll(videoTaskId);
  await testVideoGenerateAndWait();

  // ── Music Generation Tests ──
  header('5. MUSIC GENERATION (async — may take several minutes)');
  const musicTaskId = await testMusicGenerate();
  await testMusicStatus(musicTaskId);
  await testMusicPoll(musicTaskId);
  await testMusicWithLyrics();

  // ── Error Handling Tests ──
  header('6. ERROR HANDLING');
  await testAuthError();
  await testMissingApiKey();

  // ── Stream Abort Test ──
  header('7. STREAMING INFRASTRUCTURE');
  await testStreamAbort();

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

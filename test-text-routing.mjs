/**
 * Jassie AI SDK — Text Routing Tests
 *
 * Focused tests to verify that jassie-bolt routes all media requests
 * through the JassieAI server first, and that jassie-pulse still goes
 * directly to Qwen for media.
 *
 * Scenarios tested:
 *   1. jassie-bolt + plain text       → ai.jassie.ai/v1/generate-text
 *   2. jassie-bolt + single image     → ai.jassie.ai/v1/conversation
 *   3. jassie-bolt + multiple images  → ai.jassie.ai/v1/conversation
 *   4. jassie-bolt + single video     → ai.jassie.ai/v1/conversation
 *   5. jassie-bolt + multiple videos  → ai.jassie.ai/v1/conversation
 *   6. jassie-bolt + audio modality   → ai.jassie.ai/v1/conversation
 *   7. jassie-bolt + image + audio    → ai.jassie.ai/v1/conversation
 *   8. jassie-bolt + audio input      → ai.jassie.ai/v1/conversation
 *   9. jassie-pulse + image           → qwen directly (unchanged)
 *  10. jassie-pulse + plain text      → qwen directly (unchanged)
 *
 * Usage:
 *   node --env-file=.env test-text-routing.mjs
 */

import { JassieAI } from './lib/esm/index.js';

const API_KEY = process.env.JASSIE_API_KEY;
const TEST_IMAGE_URL =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=640';
const TEST_VIDEO_URL =
  'https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20241115/cqqkru/1.mp4';
const TEST_AUDIO_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

if (!API_KEY || API_KEY === 'your-api-key-here') {
  console.error('\n  ✗ Please set JASSIE_API_KEY in the .env file\n');
  process.exit(1);
}

const client = new JassieAI({ apiKey: API_KEY });
const longClient = new JassieAI({ apiKey: API_KEY, timeout: 120000 });

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

// ═══════════════════════════════════════════════════════════════════════════
// TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function testBoltPlainText() {
  section('1. Bolt — plain text (non-streaming)');
  try {
    const res = await client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'What is 2 + 2? Answer briefly.' }],
      maxTokens: 50,
    });
    if (res && res.content) {
      pass('bolt plain text', `content: "${res.content.slice(0, 80)}"`);
    } else {
      fail('bolt plain text', new Error(`Unexpected: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('bolt plain text', err);
  }
}

async function testBoltPlainTextStreaming() {
  section('2. Bolt — plain text (streaming)');
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
      pass('bolt plain text streaming', `${chunks} chunks, text: "${text.slice(0, 80)}"`);
    } else {
      fail('bolt plain text streaming', new Error('No chunks received'));
    }
  } catch (err) {
    fail('bolt plain text streaming', err);
  }
}

async function testBoltSingleImage() {
  section('3. Bolt — single image vision (non-streaming)');
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
      pass('bolt single image', `content: "${res.content.slice(0, 80)}"`);
    } else {
      fail('bolt single image', new Error(`Unexpected: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('bolt single image', err);
  }
}

async function testBoltMultipleImages() {
  section('4. Bolt — multiple image vision (non-streaming)');
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
      pass('bolt multi-image', `content: "${res.content.slice(0, 80)}"`);
    } else {
      fail('bolt multi-image', new Error(`Unexpected: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('bolt multi-image', err);
  }
}

async function testBoltSingleVideo() {
  section('5. Bolt — single video vision (streaming)');
  try {
    const stream = longClient.text.generate({
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
      pass('bolt single video', `content: "${text.slice(0, 80)}"`);
    } else {
      fail('bolt single video', new Error('Empty result'));
    }
  } catch (err) {
    fail('bolt single video', err);
  }
}

async function testBoltMultipleVideos() {
  section('6. Bolt — multiple video vision (streaming)');
  try {
    const stream = longClient.text.generate({
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
      pass('bolt multi-video', `content: "${text.slice(0, 80)}"`);
    } else {
      fail('bolt multi-video', new Error('Empty result'));
    }
  } catch (err) {
    fail('bolt multi-video', err);
  }
}

async function testBoltAudioModality() {
  section('7. Bolt — audio modality output (speaker: ethan)');
  try {
    const stream = client.text.generate({
      model: 'jassie-bolt',
      messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
      modalities: ['audio'],
      speaker: 'ethan',
      stream: true,
      maxTokens: 100,
    });
    let audioChunks = 0;
    let textChunks = 0;
    let gotDone = false;
    for await (const chunk of stream) {
      if (chunk.type === 'audio' && chunk.data) audioChunks++;
      if (chunk.type === 'text') textChunks++;
      if (chunk.type === 'done') gotDone = true;
    }
    if (audioChunks > 0 && gotDone) {
      pass('bolt audio modality', `${audioChunks} audio, ${textChunks} text chunks`);
    } else {
      fail('bolt audio modality', new Error(`audio=${audioChunks}, done=${gotDone}`));
    }
  } catch (err) {
    fail('bolt audio modality', err);
  }
}

async function testBoltImageWithAudio() {
  section('8. Bolt — image input + audio output');
  try {
    const stream = client.text.generate({
      model: 'jassie-bolt',
      messages: [
        {
          role: 'user',
          content: 'Describe this image in one sentence.',
          image: TEST_IMAGE_URL,
        },
      ],
      modalities: ['text', 'audio'],
      speaker: 'ethan',
      stream: true,
      maxTokens: 150,
    });
    let audioChunks = 0;
    let text = '';
    let gotDone = false;
    for await (const chunk of stream) {
      if (chunk.type === 'audio' && chunk.data) audioChunks++;
      if (chunk.type === 'text') text += chunk.content;
      if (chunk.type === 'done') gotDone = true;
    }
    if (audioChunks > 0 && text.length > 0 && gotDone) {
      pass('bolt image + audio', `${audioChunks} audio chunks, text: "${text.slice(0, 60)}"`);
    } else {
      fail('bolt image + audio', new Error(`audio=${audioChunks}, text.len=${text.length}, done=${gotDone}`));
    }
  } catch (err) {
    fail('bolt image + audio', err);
  }
}

async function testBoltAudioInput() {
  section('9. Bolt — audio input + audio output');
  try {
    const stream = client.text.generate({
      model: 'jassie-bolt',
      messages: [
        {
          role: 'user',
          content: 'What do you hear? Describe briefly.',
          audio: TEST_AUDIO_URL,
        },
      ],
      modalities: ['text', 'audio'],
      speaker: 'chelsie',
      stream: true,
      maxTokens: 150,
    });
    let audioChunks = 0;
    let text = '';
    let gotDone = false;
    for await (const chunk of stream) {
      if (chunk.type === 'audio' && chunk.data) audioChunks++;
      if (chunk.type === 'text') text += chunk.content;
      if (chunk.type === 'done') gotDone = true;
    }
    if (audioChunks > 0 && text.length > 0 && gotDone) {
      pass('bolt audio input', `${audioChunks} audio chunks, text: "${text.slice(0, 60)}"`);
    } else {
      fail('bolt audio input', new Error(`audio=${audioChunks}, text.len=${text.length}, done=${gotDone}`));
    }
  } catch (err) {
    fail('bolt audio input', err);
  }
}

async function testPulseSingleImage() {
  section('10. Pulse — single image (non-streaming, should go to Qwen directly)');
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
      pass('pulse single image', `content: "${res.content.slice(0, 80)}"`);
    } else {
      fail('pulse single image', new Error(`Unexpected: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('pulse single image', err);
  }
}

async function testPulsePlainText() {
  section('11. Pulse — plain text (non-streaming)');
  try {
    const res = await client.text.generate({
      model: 'jassie-pulse',
      messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
      maxTokens: 100,
    });
    if (res && res.content) {
      pass('pulse plain text', `content: "${res.content.slice(0, 80)}"`);
    } else {
      fail('pulse plain text', new Error(`Unexpected: ${JSON.stringify(res)}`));
    }
  } catch (err) {
    fail('pulse plain text', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function run() {
  console.log('\n  Jassie AI SDK — Text Routing Verification Tests');
  console.log('  ================================================\n');
  console.log(`  API key:     ${API_KEY.slice(0, 8)}…${API_KEY.slice(-4)}`);
  console.log(`  Base URL:    https://api.jassie.ai`);
  console.log(`  Test image:  ${TEST_IMAGE_URL.slice(0, 50)}…`);
  console.log(`  Test video:  ${TEST_VIDEO_URL.slice(0, 50)}…`);
  console.log(`  Test audio:  ${TEST_AUDIO_URL.slice(0, 50)}…`);

  header('JASSIE-BOLT PLAIN TEXT');
  await withRetry(testBoltPlainText);
  await withRetry(testBoltPlainTextStreaming);

  header('JASSIE-BOLT IMAGE VISION (should route through JassieAI server)');
  await withRetry(testBoltSingleImage);
  await withRetry(testBoltMultipleImages);

  header('JASSIE-BOLT VIDEO VISION (should route through JassieAI server)');
  await withRetry(testBoltSingleVideo);
  await withRetry(testBoltMultipleVideos);

  header('JASSIE-BOLT AUDIO (should route through JassieAI server)');
  await withRetry(testBoltAudioModality);
  await withRetry(testBoltImageWithAudio);
  await withRetry(testBoltAudioInput);

  header('JASSIE-PULSE (should go to Qwen directly — unchanged)');
  await withRetry(testPulseSingleImage);
  await withRetry(testPulsePlainText);

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

/**
 * Linx / Xrobot TTS bridge.
 *
 * The public Xrobot REST API does not expose a text-to-speech endpoint, but its
 * device websocket does: a `listen.detect` message with `text_response` asks the
 * bound agent to speak exactly that text. A bound device is reused for every
 * seat, while `agent_params.voice` switches the voice per line. We request raw
 * 16 kHz PCM and wrap it in a WAV container for a plain browser Audio element.
 */
import { voiceForSeat } from './voice-profiles.mjs';

const DEFAULT_WS_URL = 'wss://xrobo-io.qiniuapi.com/v1/ws/';
const SAMPLE_RATE = 16_000;
const MAX_TEXT = 260;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT = 22_000;

const deviceQueue = { current: Promise.resolve() };
const audioCache = new Map();
const MAX_CACHE = 64;

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

function deviceMac() {
  return env('XROBO_TTS_DEVICE_MAC') || '02:00:00:00:00:02';
}

function withDeviceQueue(work) {
  const next = deviceQueue.current.catch(() => undefined).then(work);
  deviceQueue.current = next;
  return next;
}

function pcmToWav(pcm, sampleRate = SAMPLE_RATE) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function speakOverSocket({ text, voice }) {
  return new Promise((resolve, reject) => {
    let ws;
    try {
      ws = new WebSocket((env('XROBO_TTS_WS_URL') || DEFAULT_WS_URL), {
        headers: {
          Authorization: `Bearer ${env('XROBO_API_KEY')}`,
          'Device-Id': deviceMac(),
          'Client-Id': crypto.randomUUID(),
          'Protocol-Version': '1',
        },
      });
    } catch (error) {
      reject(Object.assign(new Error('websocket unavailable'), { status: 503, cause: error }));
      return;
    }

    ws.binaryType = 'arraybuffer';
    const chunks = [];
    let bytes = 0;
    let sampleRate = SAMPLE_RATE;
    let settled = false;
    let sent = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // socket may already be closed
      }
      if (error) {
        reject(error);
        return;
      }
      if (!chunks.length) {
        reject(Object.assign(new Error('TTS returned no audio'), { status: 502 }));
        return;
      }
      resolve({ pcm: Buffer.concat(chunks), sampleRate });
    };

    const timer = setTimeout(() => {
      finish(Object.assign(new Error('TTS timed out'), { status: 504 }));
    }, REQUEST_TIMEOUT);

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        type: 'hello',
        version: 1,
        transport: 'websocket',
        audio_params: {
          format: 'pcm',
          sample_rate: SAMPLE_RATE,
          channels: 1,
          frame_duration: 60,
          play_buffer_duration: 1000,
        },
      }));
    });

    ws.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === 'stt' && message.error_code) {
          finish(Object.assign(new Error('TTS device is not bound to an agent'), { status: 503 }));
          return;
        }
        if (message.type === 'hello') {
          sampleRate = Number(message.audio_params?.sample_rate) || SAMPLE_RATE;
          const format = String(message.audio_params?.format ?? 'pcm').toLowerCase();
          if (format !== 'pcm') {
            finish(Object.assign(new Error(`unsupported TTS format: ${format}`), { status: 502 }));
            return;
          }
          if (!sent) {
            sent = true;
            ws.send(JSON.stringify({
              type: 'listen',
              state: 'detect',
              text: '暮林夜话',
              text_response: text,
              agent_params: {
                voice: {
                  id: voice.id,
                  speed: voice.speed,
                  pitch: voice.pitch,
                  volume: 100,
                },
              },
            }));
          }
          return;
        }
        if (message.type === 'tts' && message.state === 'sentence_start' && /请去绑定智能体/.test(String(message.text ?? ''))) {
          finish(Object.assign(new Error('TTS device is not bound to an agent'), { status: 503 }));
          return;
        }
        if (message.type === 'tts' && message.state === 'stop') {
          finish();
          return;
        }
        if (message.type === 'error') {
          finish(Object.assign(new Error(String(message.message ?? 'TTS failed')), { status: 502 }));
        }
        return;
      }

      const chunk = Buffer.from(event.data);
      bytes += chunk.length;
      if (bytes > MAX_AUDIO_BYTES) {
        finish(Object.assign(new Error('TTS audio too large'), { status: 502 }));
        return;
      }
      chunks.push(chunk);
    });

    ws.addEventListener('error', () => {
      finish(Object.assign(new Error('TTS socket error'), { status: 502 }));
    });

    ws.addEventListener('close', () => {
      if (!settled) finish();
    });

  });
}

export function ttsReady() {
  return Boolean(env('XROBO_API_KEY'));
}

export async function synthesizeSpeech(seat, inputText) {
  if (!ttsReady()) {
    throw Object.assign(new Error('TTS is not configured'), { status: 503 });
  }
  const numberSeat = Number(seat);
  if (!Number.isInteger(numberSeat) || numberSeat < 1 || numberSeat > 9) {
    throw Object.assign(new Error('invalid TTS seat'), { status: 400 });
  }
  const text = cleanText(inputText);
  if (!text) throw Object.assign(new Error('empty TTS text'), { status: 400 });

  const voice = voiceForSeat(numberSeat);
  if (!voice) {
    throw Object.assign(new Error('no voice profile for this seat'), { status: 503 });
  }

  const cacheKey = `${numberSeat}:${voice.id}:${text}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;

  const result = await withDeviceQueue(async () => speakOverSocket({ text, voice }));

  const wav = pcmToWav(result.pcm, result.sampleRate);
  const payload = { audio: wav, provider: 'xrobot', voice: voice.name };
  audioCache.set(cacheKey, payload);
  while (audioCache.size > MAX_CACHE) {
    const oldest = audioCache.keys().next().value;
    if (!oldest) break;
    audioCache.delete(oldest);
  }
  return payload;
}

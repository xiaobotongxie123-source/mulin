import { reactive } from 'vue';
import { apiUrl } from '@/game/apiBase';

export type VoiceProvider = 'unknown' | 'xrobot' | 'browser';

export interface BrowserVoiceProfile {
  pitch: number;
  rate: number;
  gender: 'male' | 'female';
}

/**
 * Browser fallback profiles. The Linx bridge uses per-seat voice IDs; these
 * keep the nine characters distinct if the bridge is offline or the user opens
 * the built app without `npm run serve`.
 */
export const VOICE_PROFILES: Record<number, BrowserVoiceProfile> = {
  1: { pitch: 0.82, rate: 0.94, gender: 'male' },
  2: { pitch: 1.1, rate: 0.93, gender: 'female' },
  3: { pitch: 0.78, rate: 0.92, gender: 'male' },
  4: { pitch: 0.9, rate: 0.9, gender: 'male' },
  5: { pitch: 0.72, rate: 0.88, gender: 'male' },
  6: { pitch: 1.04, rate: 0.96, gender: 'female' },
  7: { pitch: 0.95, rate: 1.02, gender: 'male' },
  8: { pitch: 1.14, rate: 1.03, gender: 'female' },
  9: { pitch: 0.84, rate: 0.9, gender: 'male' },
};

const STORAGE_KEY = 'mulin-night:voice';

function readEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

export const voiceNarration = reactive({
  enabled: readEnabled(),
  provider: 'unknown' as VoiceProvider,
  speakingSeat: null as number | null,
  lastError: '',
});

export function setVoiceEnabled(value: boolean): void {
  voiceNarration.enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Ignore private-mode storage failures.
  }
}

/**
 * Fallback timeout for a spoken line. The normal path waits for the actual
 * audio `ended` event; this is only the safety cap when playback fails to
 * report completion.
 */
export function speechPauseMs(text: string): number {
  const chars = Array.from(text.replace(/\s/g, '')).length;
  return Math.min(24_000, Math.max(7_000, 6_500 + chars * 195));
}

export function normalizedSpeechText(text: string): string {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/^["“”'‘’]+|["“”'‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

export function hasSpeakableText(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

/** Mobile browsers are inconsistent about async audio and pre-synthesis. */
export function isMobileRuntime(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

export interface PreparedNarration {
  blob: Blob;
  durationMs: number;
}

const preparedNarrations = new Map<string, PreparedNarration>();
const pendingNarrations = new Map<string, Promise<PreparedNarration | null>>();
const pendingControllers = new Set<AbortController>();
const failedNarrations = new Set<string>();
const MAX_PREPARED = 16;

function narrationKey(seat: number, text: string): string {
  return `${seat}:${normalizedSpeechText(text)}`;
}

function rememberFailure(key: string): void {
  failedNarrations.add(key);
  while (failedNarrations.size > 64) {
    const oldest = failedNarrations.values().next().value;
    if (oldest === undefined) break;
    failedNarrations.delete(oldest);
  }
}

async function wavDurationMs(blob: Blob): Promise<number> {
  try {
    const bytes = new Uint8Array(await blob.slice(0, 4096).arrayBuffer());
    if (bytes.length < 44 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF') return 0;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 12;
    let sampleRate = 16000;
    let channels = 1;
    let bits = 16;
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      if (id === 'fmt ' && offset + 20 <= bytes.length) {
        channels = view.getUint16(offset + 10, true) || 1;
        sampleRate = view.getUint32(offset + 12, true) || 16000;
        bits = view.getUint16(offset + 22, true) || 16;
      }
      if (id === 'data') {
        const bytesPerFrame = channels * Math.max(1, Math.floor(bits / 8));
        return Math.round((size / (sampleRate * bytesPerFrame)) * 1000);
      }
      offset += 8 + size + (size % 2);
    }
  } catch {
    // Duration is only used to size a safety timeout.
  }
  return 0;
}

/**
 * Synthesize a line before it is written to the log. The controller only
 * reveals the text after this resolves, so the first painted frame of the line
 * and the first audio frame happen together.
 */
export async function prepareNarration(seat: number, text: string): Promise<PreparedNarration | null> {
  if (!voiceNarration.enabled || !hasSpeakableText(text)) return null;
  const normalized = normalizedSpeechText(text);
  if (!normalized) return null;
  const key = narrationKey(seat, normalized);
  const cached = preparedNarrations.get(key);
  if (cached) return cached;
  if (failedNarrations.has(key)) return null;
  const pending = pendingNarrations.get(key);
  if (pending) return pending;

  const request = (async () => {
    const controller = new AbortController();
    pendingControllers.add(controller);
    const timer = window.setTimeout(() => controller.abort(), 18_000);
    try {
      const response = await fetch(apiUrl('/api/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
        body: JSON.stringify({ seat, text: normalized }),
        signal: controller.signal,
      });
      if (!response.ok) {
        rememberFailure(key);
        return null;
      }
      const blob = await response.blob();
      if (!blob.size) {
        rememberFailure(key);
        return null;
      }
      const prepared = { blob, durationMs: await wavDurationMs(blob) };
      preparedNarrations.set(key, prepared);
      while (preparedNarrations.size > MAX_PREPARED) {
        const oldest = preparedNarrations.keys().next().value;
        if (oldest === undefined) break;
        preparedNarrations.delete(oldest);
      }
      return prepared;
    } catch {
      rememberFailure(key);
      return null;
    } finally {
      window.clearTimeout(timer);
      pendingControllers.delete(controller);
      pendingNarrations.delete(key);
    }
  })();
  pendingNarrations.set(key, request);
  return request;
}

/** Cache-only take, used by the narrator in the same tick as the log paint. */
export function takePreparedNarration(seat: number, text: string): PreparedNarration | null {
  const key = narrationKey(seat, text);
  const prepared = preparedNarrations.get(key) ?? null;
  if (prepared) preparedNarrations.delete(key);
  return prepared;
}

export function shouldSkipRemote(seat: number, text: string): boolean {
  return failedNarrations.has(narrationKey(seat, text));
}

export function clearPreparedNarrations(): void {
  preparedNarrations.clear();
  failedNarrations.clear();
}

export function abortPreparations(): void {
  for (const controller of pendingControllers) controller.abort();
  pendingControllers.clear();
}

const narrationWaiters = new Map<number, { resolve: () => void; timer: number }>();
const completedNarrations = new Set<number>();
const startWaiters = new Map<number, { resolve: () => void; timer: number }>();
const startedNarrations = new Set<number>();

export function waitForNarrationStarted(logId: number, timeoutMs = 8_000): Promise<void> {
  if (startedNarrations.has(logId)) {
    startedNarrations.delete(logId);
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      startWaiters.delete(logId);
      resolve();
    }, Math.max(500, timeoutMs));
    startWaiters.set(logId, { resolve, timer });
  });
}

export function markNarrationStarted(logId: number): void {
  const waiter = startWaiters.get(logId);
  if (waiter) {
    window.clearTimeout(waiter.timer);
    startWaiters.delete(logId);
    waiter.resolve();
    return;
  }
  startedNarrations.add(logId);
  while (startedNarrations.size > 32) {
    const oldest = startedNarrations.values().next().value;
    if (oldest === undefined) break;
    startedNarrations.delete(oldest);
  }
}

export function waitForNarrationDone(logId: number, timeoutMs: number): Promise<void> {
  if (completedNarrations.has(logId)) {
    completedNarrations.delete(logId);
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      narrationWaiters.delete(logId);
      resolve();
    }, Math.max(1200, timeoutMs));
    narrationWaiters.set(logId, { resolve, timer });
  });
}

export function markNarrationDone(logId: number): void {
  const waiter = narrationWaiters.get(logId);
  if (waiter) {
    window.clearTimeout(waiter.timer);
    narrationWaiters.delete(logId);
    waiter.resolve();
    return;
  }
  completedNarrations.add(logId);
  while (completedNarrations.size > 32) {
    const oldest = completedNarrations.values().next().value;
    if (oldest === undefined) break;
    completedNarrations.delete(oldest);
  }
}

export function resolveAllNarrations(): void {
  for (const [logId, waiter] of narrationWaiters) {
    window.clearTimeout(waiter.timer);
    waiter.resolve();
    narrationWaiters.delete(logId);
  }
  for (const [logId, waiter] of startWaiters) {
    window.clearTimeout(waiter.timer);
    waiter.resolve();
    startWaiters.delete(logId);
  }
  completedNarrations.clear();
  startedNarrations.clear();
}

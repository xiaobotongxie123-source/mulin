import { reactive } from 'vue';

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
 * The controller uses this to give a spoken line enough time to be heard
 * before moving to the next speaker. It is deliberately a little generous:
 * Linx TTS includes a short network warm-up before audio starts.
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

import { onBeforeUnmount, watch } from 'vue';
import { useGameStore } from '@/stores/game';
import {
  normalizedSpeechText,
  setVoiceEnabled,
  speechPauseMs,
  voiceNarration,
  VOICE_PROFILES,
} from '@/game/voice';

interface NarrationItem {
  logId: number;
  seat: number;
  text: string;
}

type GameStore = ReturnType<typeof useGameStore>;

const FEMALE_VOICES = ['Xiaoxiao', 'Ting-Ting', 'Mei-Jia', 'Huihui', 'Sin-Ji', 'Yaoyao'];
const MALE_VOICES = ['Yunxi', 'Yunjian', 'Kangkang', 'Li-mu', 'Yu-shu', 'Liang'];

function chooseBrowserVoice(seat: number): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const profile = VOICE_PROFILES[seat] ?? VOICE_PROFILES[1];
  const names = profile.gender === 'female' ? FEMALE_VOICES : MALE_VOICES;
  const chinese = voices.filter((voice) => /^zh/i.test(voice.lang));
  const pool = chinese.length ? chinese : voices;
  for (const name of names) {
    const found = pool.find((voice) => voice.name.toLowerCase().includes(name.toLowerCase()));
    if (found) return found;
  }
  return pool[0] ?? null;
}

function playBrowserSpeech(item: NarrationItem, token: () => number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('browser speech synthesis unavailable'));
      return;
    }
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(item.text);
    const profile = VOICE_PROFILES[item.seat] ?? VOICE_PROFILES[1];
    const startToken = token();
    utterance.voice = chooseBrowserVoice(item.seat);
    utterance.lang = 'zh-CN';
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;
    utterance.volume = 1;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    utterance.onend = () => finish();
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') finish();
      else finish(new Error(`browser speech ${event.error}`));
    };
    const timer = window.setTimeout(() => finish(), speechPauseMs(item.text) + 4_000);
    synth.cancel();
    synth.speak(utterance);
    if (token() !== startToken) finish();
  });
}

function playWav(blob: Blob, item: NarrationItem, token: () => number): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const startToken = token();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      URL.revokeObjectURL(url);
      if (token() !== startToken) {
        resolve();
        return;
      }
      if (error) reject(error);
      else resolve();
    };
    audio.preload = 'auto';
    audio.volume = 1;
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error('audio playback failed'));
    const timer = window.setTimeout(() => finish(), speechPauseMs(item.text) + 6_000);
    void audio.play().catch((error) => finish(error instanceof Error ? error : new Error('audio play blocked')));
    activeAudio = audio;
    if (token() !== startToken) {
      audio.pause();
      finish();
    }
  });
}

let activeAudio: HTMLAudioElement | null = null;
let activeController: AbortController | null = null;
let stopToken = 0;

export function useVoiceNarrator(store: GameStore) {
  let lastLogId = store.logs.at(-1)?.id ?? 0;
  let queue: NarrationItem[] = [];
  let busy = false;
  let disposed = false;

  const token = () => stopToken;

  function stopPlayback(): void {
    stopToken += 1;
    queue = [];
    activeController?.abort();
    activeController = null;
    activeAudio?.pause();
    activeAudio = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    voiceNarration.speakingSeat = null;
  }

  async function playRemote(item: NarrationItem): Promise<void> {
    const controller = new AbortController();
    activeController = controller;
    const timer = window.setTimeout(() => controller.abort(), 22_000);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
        body: JSON.stringify({ seat: item.seat, text: item.text }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(String(data.message ?? data.error ?? `tts ${response.status}`));
      }
      const blob = await response.blob();
      if (!blob.size || disposed) throw new Error('empty tts audio');
      voiceNarration.provider = 'xrobot';
      voiceNarration.lastError = '';
      await playWav(blob, item, token);
    } finally {
      window.clearTimeout(timer);
      if (activeController === controller) activeController = null;
    }
  }

  async function playItem(item: NarrationItem): Promise<void> {
    if (!voiceNarration.enabled || disposed) return;
    const startToken = token();
    try {
      await playRemote(item);
      if (startToken !== token()) return;
    } catch (error) {
      if (disposed || !voiceNarration.enabled || startToken !== token()) return;
      voiceNarration.lastError = error instanceof Error ? error.message : 'Linx TTS unavailable';
      voiceNarration.provider = 'browser';
      await playBrowserSpeech(item, token);
    }
  }

  async function drain(): Promise<void> {
    if (busy || disposed || !voiceNarration.enabled) return;
    const item = queue.shift();
    if (!item) return;
    busy = true;
    voiceNarration.speakingSeat = item.seat;
    try {
      await playItem(item);
    } catch (error) {
      voiceNarration.lastError = error instanceof Error ? error.message : 'speech failed';
    } finally {
      busy = false;
      if (voiceNarration.speakingSeat === item.seat) voiceNarration.speakingSeat = null;
      if (queue.length) void drain();
    }
  }

  function enqueue(item: NarrationItem): void {
    if (!voiceNarration.enabled || !item.text || /^[…。，、！？\s]+$/.test(item.text)) return;
    if (queue.some((queued) => queued.logId === item.logId)) return;
    queue.push(item);
    void drain();
  }

  const unwatch = watch(
    () => store.logs.at(-1)?.id ?? 0,
    () => {
      const logs = store.logs;
      const latest = logs.at(-1)?.id ?? 0;
      if (latest < lastLogId) {
        lastLogId = latest;
        stopPlayback();
        return;
      }
      const fresh = logs.filter((entry) => entry.id > lastLogId);
      lastLogId = latest;
      if (!voiceNarration.enabled) return;
      for (const entry of fresh) {
        if (entry.kind !== 'speech' || !entry.seat) continue;
        const text = normalizedSpeechText(entry.text);
        if (text) enqueue({ logId: entry.id, seat: entry.seat, text });
      }
    },
  );

  function toggleVoice(): void {
    const next = !voiceNarration.enabled;
    setVoiceEnabled(next);
    if (!next) stopPlayback();
    else voiceNarration.lastError = '';
  }

  onBeforeUnmount(() => {
    disposed = true;
    unwatch();
    stopPlayback();
  });

  return {
    voice: voiceNarration,
    toggleVoice,
  };
}

import { onBeforeUnmount, watch } from 'vue';
import { useGameStore } from '@/stores/game';
import {
  abortPreparations,
  clearPreparedNarrations,
  markNarrationDone,
  markNarrationStarted,
  normalizedSpeechText,
  resolveAllNarrations,
  setVoiceEnabled,
  shouldSkipRemote,
  takePreparedNarration,
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

function playBrowserSpeech(item: NarrationItem, token: () => number, onStarted: () => void): Promise<void> {
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
    let started = false;
    let timer = 0;
    let startPoll = 0;
    const markStarted = () => {
      if (started || settled) return;
      started = true;
      window.clearInterval(startPoll);
      startPoll = 0;
      onStarted();
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(startPoll);
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      if (activePlaybackStop === stop) activePlaybackStop = null;
      if (token() !== startToken) {
        resolve();
        return;
      }
      if (error) reject(error);
      else resolve();
    };
    const stop = () => {
      synth.cancel();
      finish();
    };
    activePlaybackStop = stop;
    utterance.onstart = markStarted;
    utterance.onend = () => {
      markStarted();
      finish();
    };
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') finish();
      else finish(new Error(`browser speech ${event.error}`));
    };
    // The timeout is only a last-resort guard for engines that never emit
    // `end`; normal completion always waits for the real utterance to finish.
    const chars = Array.from(item.text).length;
    timer = window.setTimeout(() => {
      synth.cancel();
      finish();
    }, Math.min(180_000, Math.max(30_000, 1_500 + chars * 650)));
    synth.cancel();
    synth.speak(utterance);
    // Some engines do not emit onstart; only reveal once the engine reports
    // that it is actually speaking, never on a blind timer.
    startPoll = window.setInterval(() => {
      if (synth.speaking) markStarted();
    }, 50);
    if (token() !== startToken) stop();
  });
}

function playWav(blob: Blob, item: NarrationItem, token: () => number, onStarted: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const startToken = token();
    let settled = false;
    let started = false;
    let timer = 0;
    const markStarted = () => {
      if (started || settled) return;
      started = true;
      onStarted();
    };
    const finish = (error?: Error, stopAudio = false) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      if (stopAudio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // The element may already be detached.
        }
      }
      URL.revokeObjectURL(url);
      if (activePlaybackStop === stop) activePlaybackStop = null;
      if (token() !== startToken) {
        resolve();
        return;
      }
      if (error) reject(error);
      else resolve();
    };
    const stop = () => finish(undefined, true);
    const armSafetyTimer = () => {
      window.clearTimeout(timer);
      const seconds = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 90;
      // Wait for the real `ended` event; this only cuts a stuck element.
      timer = window.setTimeout(() => finish(undefined, true), Math.max(20_000, seconds * 1000 + 8_000));
    };
    activePlaybackStop = stop;
    audio.preload = 'auto';
    audio.volume = 1;
    audio.onloadedmetadata = armSafetyTimer;
    audio.onplaying = markStarted;
    audio.onended = () => {
      markStarted();
      finish();
    };
    audio.onerror = () => finish(new Error('audio playback failed'), true);
    timer = window.setTimeout(armSafetyTimer, 90_000);
    void audio.play().then(markStarted).catch((error) => finish(error instanceof Error ? error : new Error('audio play blocked'), true));
    activeAudio = audio;
    if (token() !== startToken) stop();
  });
}

let activeAudio: HTMLAudioElement | null = null;
let activePlaybackStop: (() => void) | null = null;
let activeController: AbortController | null = null;
let stopToken = 0;

export function useVoiceNarrator(store: GameStore) {
  let lastLogId = store.logs.at(-1)?.id ?? 0;
  let queue: NarrationItem[] = [];
  let busy = false;
  let disposed = false;
  let activeLogId: number | null = null;

  const token = () => stopToken;

  function stopPlayback(): void {
    stopToken += 1;
    queue = [];
    abortPreparations();
    clearPreparedNarrations();
    activeController?.abort();
    activeController = null;
    activePlaybackStop?.();
    activePlaybackStop = null;
    activeAudio?.pause();
    activeAudio = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (activeLogId !== null) markNarrationDone(activeLogId);
    activeLogId = null;
    voiceNarration.speakingSeat = null;
    store.revealAllLogs();
    resolveAllNarrations();
  }

  async function playRemote(item: NarrationItem, onStarted: () => void): Promise<void> {
    const prepared = takePreparedNarration(item.seat, item.text);
    if (prepared) {
      voiceNarration.provider = 'xrobot';
      voiceNarration.lastError = '';
      await playWav(prepared.blob, item, token, onStarted);
      return;
    }
    if (shouldSkipRemote(item.seat, item.text)) {
      throw new Error('TTS prefetch failed');
    }

    const controller = new AbortController();
    activeController = controller;
    // Linx usually answers within a few seconds. If it is queued or the device
    // is busy, switch to the local voice instead of freezing the table.
    const timer = window.setTimeout(() => controller.abort(), 7_000);
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
      await playWav(blob, item, token, onStarted);
    } finally {
      window.clearTimeout(timer);
      if (activeController === controller) activeController = null;
    }
  }

  async function playItem(item: NarrationItem): Promise<void> {
    if (!voiceNarration.enabled || disposed) return;
    const startToken = token();
    // Wait one paint so the line is on screen in the same frame the audio
    // starts; the controller only writes the log after synthesis is ready.
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
      else window.setTimeout(resolve, 0);
    });
    if (disposed || !voiceNarration.enabled || startToken !== token()) return;
    const announceStarted = (logId: number) => {
      store.revealLog(logId);
      markNarrationStarted(logId);
    };
    try {
      await playRemote(item, () => announceStarted(item.logId));
      if (startToken !== token()) return;
    } catch (error) {
      if (disposed || !voiceNarration.enabled || startToken !== token()) return;
      voiceNarration.lastError = error instanceof Error ? error.message : 'Linx TTS unavailable';
      voiceNarration.provider = 'browser';
      await playBrowserSpeech(item, token, () => announceStarted(item.logId));
    }
  }

  async function drain(): Promise<void> {
    if (busy || disposed || !voiceNarration.enabled) return;
    const item = queue.shift();
    if (!item) return;
    busy = true;
    voiceNarration.speakingSeat = item.seat;
    activeLogId = item.logId;
    try {
      await playItem(item);
    } catch (error) {
      voiceNarration.lastError = error instanceof Error ? error.message : 'speech failed';
    } finally {
      store.revealLog(item.logId);
      markNarrationDone(item.logId);
      if (activeLogId === item.logId) activeLogId = null;
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

  const stopWhenHidden = () => {
    if (document.hidden) stopPlayback();
  };
  const stopOnPageHide = () => stopPlayback();
  document.addEventListener('visibilitychange', stopWhenHidden);
  window.addEventListener('pagehide', stopOnPageHide);

  onBeforeUnmount(() => {
    disposed = true;
    unwatch();
    document.removeEventListener('visibilitychange', stopWhenHidden);
    window.removeEventListener('pagehide', stopOnPageHide);
    stopPlayback();
  });

  return {
    voice: voiceNarration,
    toggleVoice,
  };
}

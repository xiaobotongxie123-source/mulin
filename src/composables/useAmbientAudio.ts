import { ref } from 'vue';

export type Cue = 'night' | 'dawn' | 'vote' | 'death' | 'win' | 'chime';

const enabled = ref(false);

let context: AudioContext | null = null;
let master: GainNode | null = null;
let windGain: GainNode | null = null;
let fireGain: GainNode | null = null;
let padGain: GainNode | null = null;
let started = false;
let chirpTimer = 0;
let owlTimer = 0;
let suspendTimer = 0;

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    // Brown-ish noise reads as wind rather than static.
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

function noiseSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function buildAmbience(ctx: AudioContext): void {
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const buffer = makeNoiseBuffer(ctx);

  // Wind through the pines.
  const wind = noiseSource(ctx, buffer);
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 420;
  windFilter.Q.value = 0.7;
  windGain = ctx.createGain();
  windGain.gain.value = 0.16;
  wind.connect(windFilter).connect(windGain).connect(master);
  wind.start();

  // Occasional branches / fire.
  const fire = noiseSource(ctx, buffer);
  const fireFilter = ctx.createBiquadFilter();
  fireFilter.type = 'bandpass';
  fireFilter.frequency.value = 780;
  fireFilter.Q.value = 1.2;
  fireGain = ctx.createGain();
  fireGain.gain.value = 0.02;
  fire.connect(fireFilter).connect(fireGain).connect(master);
  fire.start();

  // A very low drone, felt more than heard.
  padGain = ctx.createGain();
  padGain.gain.value = 0.028;
  padGain.connect(master);
  for (const frequency of [55, 82.5]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = frequency === 55 ? 0.7 : 0.35;
    osc.connect(gain).connect(padGain);
    osc.start();
  }

  // Wind swell.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.07;
  lfo.connect(lfoGain).connect(windGain.gain);
  lfo.start();

  master.gain.linearRampToValueAtTime(0.62, ctx.currentTime + 2.2);
  startCreatures(ctx);
}

function chirp(ctx: AudioContext): void {
  if (!master) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(4200, now);
  osc.frequency.setValueAtTime(3800, now + 0.09);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.014, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + 0.18);
  const second = ctx.createOscillator();
  const secondGain = ctx.createGain();
  second.type = 'sine';
  second.frequency.setValueAtTime(4000, now + 0.22);
  second.frequency.setValueAtTime(3600, now + 0.3);
  secondGain.gain.setValueAtTime(0, now + 0.22);
  secondGain.gain.linearRampToValueAtTime(0.011, now + 0.232);
  secondGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  second.connect(secondGain).connect(master);
  second.start(now + 0.22);
  second.stop(now + 0.4);
}

function startCreatures(ctx: AudioContext): void {
  const scheduleChirp = (): void => {
    if (!enabled.value) return;
    if (Math.random() > 0.35) chirp(ctx);
    chirpTimer = window.setTimeout(scheduleChirp, 2600 + Math.random() * 4200);
  };
  chirpTimer = window.setTimeout(scheduleChirp, 3200);

  const hoot = (): void => {
    if (!enabled.value || !master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.linearRampToValueAtTime(290, now + 0.55);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 1.4);
    owlTimer = window.setTimeout(hoot, 26000 + Math.random() * 24000);
  };
  owlTimer = window.setTimeout(hoot, 17000);
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
): void {
  if (!master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playCue(cue: Cue): void {
  if (!enabled.value || !context || !master) return;
  const ctx = context;
  const now = ctx.currentTime;
  switch (cue) {
    case 'night':
      tone(ctx, 196, now, 2.6, 0.1);
      tone(ctx, 98, now, 3.4, 0.08);
      tone(ctx, 392, now + 0.1, 2.2, 0.04);
      break;
    case 'dawn':
      tone(ctx, 392, now, 2.4, 0.07);
      tone(ctx, 523.25, now + 0.08, 2.8, 0.05);
      tone(ctx, 659.25, now + 0.16, 3.2, 0.04);
      break;
    case 'vote':
      tone(ctx, 158, now, 0.5, 0.1, 'triangle');
      tone(ctx, 118, now + 0.14, 0.7, 0.06, 'triangle');
      break;
    case 'death':
      tone(ctx, 110, now, 3.2, 0.09);
      tone(ctx, 82.4, now + 0.2, 3.6, 0.07);
      break;
    case 'win':
      tone(ctx, 261.6, now, 3.2, 0.06);
      tone(ctx, 392, now + 0.2, 3.4, 0.05);
      tone(ctx, 523.25, now + 0.4, 3.6, 0.045);
      break;
    default:
      tone(ctx, 880, now, 1.1, 0.045);
      tone(ctx, 1318.5, now + 0.06, 1.0, 0.025);
  }
}

export async function toggleAmbience(): Promise<void> {
  if (!context) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      context = new Ctx();
    } catch (error) {
      console.warn('[mulin-night] ambient audio unavailable', error);
      return;
    }
  }

  if (enabled.value) {
    enabled.value = false;
    window.clearTimeout(chirpTimer);
    window.clearTimeout(owlTimer);
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.linearRampToValueAtTime(0, context.currentTime + 0.8);
    }
    window.clearTimeout(suspendTimer);
    suspendTimer = window.setTimeout(() => {
      if (!enabled.value) void context?.suspend();
    }, 1200);
    return;
  }

  window.clearTimeout(suspendTimer);
  await context.resume();
  if (!started) {
    buildAmbience(context);
    started = true;
  } else if (master) {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.linearRampToValueAtTime(0.62, context.currentTime + 1.2);
    startCreatures(context);
  }
  enabled.value = true;
}

export function useAmbientAudio() {
  return {
    enabled,
    toggle: toggleAmbience,
    playCue,
  };
}

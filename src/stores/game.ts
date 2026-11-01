import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { HUMAN_CHARACTER, BOT_CHARACTERS } from '@/data/characters';
import { ROLE_META } from '@/data/roles';
import { createPlayers } from '@/game/engine';
import { mulberry32, randomSeed } from '@/game/random';
import type {
  Claim,
  HumanAction,
  LogEntry,
  LogKind,
  NightStep,
  Phase,
  Prompt,
  SeerCheck,
  WinResult,
} from '@/game/types';

export interface BannerState {
  id: number;
  title: string;
  sub: string;
  tone: 'night' | 'dawn' | 'vote' | 'death' | 'neutral';
}

export interface ToastState {
  id: number;
  title: string;
  text: string;
  tone: 'gold' | 'blood' | 'moss';
}

export const useGameStore = defineStore('game', () => {
  const players = ref(createPlayers(HUMAN_CHARACTER, BOT_CHARACTERS, mulberry32(1)));
  const seed = ref(randomSeed());
  const phase = ref<Phase>('idle');
  const nightStep = ref<NightStep | null>(null);
  const round = ref(0);
  const day = ref(0);
  const humanSeat = ref(1);
  const logs = ref<LogEntry[]>([]);
  const prompt = ref<Prompt | null>(null);
  const selectedSeat = ref<number | null>(null);
  const banner = ref<BannerState | null>(null);
  const toast = ref<ToastState | null>(null);
  const winner = ref<WinResult | null>(null);
  const seerChecks = ref<SeerCheck[]>([]);
  const claims = ref<Claim[]>([]);
  const witch = ref({ antidote: true, poison: true });
  const guardLast = ref<number | null>(null);
  const nightDeaths = ref<number[]>([]);
  const lastNightDeaths = ref<number[]>([]);
  const votes = ref<Record<number, number>>({});
  const voteCounts = ref<Record<number, number>>({});
  const exiled = ref<number | null>(null);
  const speakerSeat = ref<number | null>(null);
  const speaking = ref(false);
  const autopilot = ref(false);
  const speed = ref(1);
  const startedAt = ref(0);
  const waiting = ref(true);
  const stats = ref({ nights: 0, executions: 0, checks: 0 });
  const roleRevealed = ref(false);

  let logId = 0;
  let bannerId = 0;
  let toastId = 0;
  let resolveAsk: ((action: HumanAction) => void) | null = null;

  const human = computed(() => players.value.find((player) => player.isHuman) ?? players.value[0]);
  const humanRole = computed(() => human.value.role);
  const humanMeta = computed(() => ROLE_META[humanRole.value]);
  const humanAlive = computed(() => human.value.alive);
  const alivePlayers = computed(() => players.value.filter((player) => player.alive));
  const aliveCount = computed(() => alivePlayers.value.length);
  const wolfCount = computed(() => players.value.filter((player) => player.role === 'werewolf' && player.alive).length);
  const teammates = computed(() =>
    players.value.filter((player) => player.role === 'werewolf' && player.seat !== humanSeat.value),
  );
  const isHumanWolf = computed(() => humanMeta.value.faction === 'wolf');
  const canAnswer = computed(() => prompt.value !== null && !autopilot.value);
  const isNight = computed(() => phase.value === 'night');
  const totalPlayers = computed(() => players.value.length);

  const winTitle = computed(() => {
    if (!winner.value) return '';
    return winner.value.faction === 'good' ? '破晓' : '长夜';
  });

  function resetState() {
    nightStep.value = null;
    round.value = 0;
    day.value = 0;
    logs.value = [];
    prompt.value = null;
    selectedSeat.value = null;
    banner.value = null;
    toast.value = null;
    winner.value = null;
    seerChecks.value = [];
    claims.value = [];
    witch.value = { antidote: true, poison: true };
    guardLast.value = null;
    nightDeaths.value = [];
    lastNightDeaths.value = [];
    votes.value = {};
    voteCounts.value = {};
    exiled.value = null;
    speakerSeat.value = null;
    speaking.value = false;
    speed.value = 1;
    startedAt.value = 0;
    waiting.value = true;
    stats.value = { nights: 0, executions: 0, checks: 0 };
    roleRevealed.value = false;
    logId = 0;
  }

  function newGame(customSeed?: number) {
    resolveAsk?.({ aborted: true });
    resolveAsk = null;
    resetState();
    seed.value = customSeed ?? randomSeed();
    const rng = mulberry32(seed.value);
    players.value = createPlayers(HUMAN_CHARACTER, BOT_CHARACTERS, rng);
    humanSeat.value = human.value.seat;
    phase.value = 'reveal';
    addLog('system', '九位旅人围坐在暮林山舍。炉火熄了，门闩落下的声音很轻。');
    addLog('private', `你的身份是「${humanMeta.value.name}」。${humanMeta.value.ability}`);
  }

  function startGame() {
    phase.value = 'night';
    nightStep.value = null;
    startedAt.value = performance.now();
    day.value = 0;
    addLog('system', '第一夜开始了。所有人闭上眼睛。');
  }

  function addLog(kind: LogKind, text: string, seat?: number): number {
    logId += 1;
    logs.value.push({
      id: logId,
      round: round.value,
      phase: phase.value,
      kind,
      text,
      seat,
    });
    if (logs.value.length > 220) logs.value.splice(0, logs.value.length - 220);
    return logId;
  }

  function showBanner(title: string, sub: string, tone: BannerState['tone'], duration = 1900) {
    bannerId += 1;
    const id = bannerId;
    banner.value = { id, title, sub, tone };
    window.setTimeout(() => {
      if (banner.value?.id === id) banner.value = null;
    }, duration);
  }

  function pushToast(title: string, text: string, tone: ToastState['tone'] = 'gold', duration = 4200) {
    toastId += 1;
    const id = toastId;
    toast.value = { id, title, text, tone };
    window.setTimeout(() => {
      if (toast.value?.id === id) toast.value = null;
    }, duration);
  }

  function ask(next: Prompt): Promise<HumanAction> {
    return new Promise((resolve) => {
      prompt.value = next;
      selectedSeat.value = null;
      resolveAsk = resolve;
    });
  }

  function answer(action: HumanAction) {
    const resolve = resolveAsk;
    resolveAsk = null;
    prompt.value = null;
    selectedSeat.value = null;
    resolve?.(action);
  }

  function cancelPrompt() {
    if (resolveAsk) {
      const resolve = resolveAsk;
      resolveAsk = null;
      prompt.value = null;
      resolve({ aborted: true });
    }
  }

  function selectSeat(seat: number | null) {
    selectedSeat.value = seat;
  }

  function setAutopilot(enabled: boolean) {
    autopilot.value = enabled;
    if (enabled && prompt.value) answer({ auto: true } as HumanAction & { auto: boolean });
  }

  function setSpeed(next: number) {
    speed.value = next;
  }

  function markDead(seat: number, cause: 'wolf' | 'poison' | 'vote', atRound: number) {
    const player = players.value.find((item) => item.seat === seat);
    if (!player || !player.alive) return;
    player.alive = false;
    player.deathCause = cause;
    player.deathRound = atRound;
  }

  function addClaim(claim: Claim) {
    if (claims.value.some((item) => item.seat === claim.seat)) return;
    claims.value.push(claim);
  }

  function setWinner(result: WinResult) {
    winner.value = result;
    phase.value = 'result';
    prompt.value = null;
    speakerSeat.value = null;
    speaking.value = false;
  }

  function reset() {
    cancelPrompt();
    resetState();
    phase.value = 'idle';
    players.value = createPlayers(HUMAN_CHARACTER, BOT_CHARACTERS, mulberry32(randomSeed()));
  }

  const roleCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const player of players.value) {
      counts[player.role] = (counts[player.role] ?? 0) + 1;
    }
    return counts;
  });

  return {
    // state
    players,
    seed,
    phase,
    nightStep,
    round,
    day,
    humanSeat,
    logs,
    prompt,
    selectedSeat,
    banner,
    toast,
    winner,
    seerChecks,
    claims,
    witch,
    guardLast,
    nightDeaths,
    lastNightDeaths,
    votes,
    voteCounts,
    exiled,
    speakerSeat,
    speaking,
    autopilot,
    speed,
    startedAt,
    waiting,
    stats,
    roleRevealed,
    // computed
    human,
    humanRole,
    humanMeta,
    humanAlive,
    alivePlayers,
    aliveCount,
    wolfCount,
    teammates,
    isHumanWolf,
    canAnswer,
    isNight,
    totalPlayers,
    winTitle,
    roleCounts,
    // actions
    newGame,
    startGame,
    addLog,
    showBanner,
    pushToast,
    ask,
    answer,
    cancelPrompt,
    selectSeat,
    setAutopilot,
    setSpeed,
    markDead,
    addClaim,
    setWinner,
    reset,
    resetState,
  };
});

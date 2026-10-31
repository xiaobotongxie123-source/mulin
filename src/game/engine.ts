import type { Character } from '@/data/characters';
import { ROLE_POOL, ROLE_META } from '@/data/roles';
import type { DeathCause, Faction, NightOutcome, Player, Role, WinResult } from './types';
import type { Rng } from './random';
import { shuffle } from './random';

/**
 * Deal the nine roles. The human always takes seat 1, but the role is random.
 * The remaining eight travellers are shuffled into seats 2..9.
 */
export function createPlayers(human: Character, bots: Character[], rng: Rng): Player[] {
  const roles = shuffle(ROLE_POOL, rng);
  // The nine travellers are fixed to their seats; only the roles are shuffled.
  const cast = [human, ...bots].slice(0, 9);

  return cast.map((character, index) => {
    const role = roles[index];
    return {
      seat: index + 1,
      character,
      role,
      faction: ROLE_META[role].faction,
      alive: true,
      isHuman: index === 0,
      guardLast: null,
    };
  });
}

export function alivePlayers(players: Player[]): Player[] {
  return players.filter((player) => player.alive);
}

export function aliveSeats(players: Player[]): number[] {
  return alivePlayers(players)
    .map((player) => player.seat)
    .sort((a, b) => a - b);
}

export function findPlayer(players: Player[], seat: number): Player | undefined {
  return players.find((player) => player.seat === seat);
}

export function wolfSeats(players: Player[]): number[] {
  return players.filter((player) => player.role === 'werewolf').map((player) => player.seat);
}

export function checkWinner(players: Player[]): WinResult | null {
  const alive = alivePlayers(players);
  const wolves = alive.filter((player) => player.faction === 'wolf');
  const villagers = alive.filter((player) => player.role === 'villager');
  const gods = alive.filter((player) => player.role === 'seer' || player.role === 'witch' || player.role === 'guard');

  if (wolves.length === 0) {
    return { faction: 'good', reason: '最后一只狼倒在了林间。天亮了，山舍的灯还亮着。' };
  }
  if (villagers.length === 0) {
    return { faction: 'wolf', reason: '村民全部出局，狼人完成了屠边。暮色合拢，再没有归人。' };
  }
  if (gods.length === 0) {
    return { faction: 'wolf', reason: '神职全部出局，狼人完成了屠边。林间的火，熄了。' };
  }
  return null;
}

export interface VoteTally {
  target: number | null;
  counts: Record<number, number>;
  tie: boolean;
  top: number[];
}

export function tallyVotes(votes: Record<number, number>): VoteTally {
  const counts: Record<number, number> = {};
  for (const target of Object.values(votes)) {
    if (!target || target < 1) continue;
    counts[target] = (counts[target] ?? 0) + 1;
  }
  const entries = Object.entries(counts).map(([seat, count]) => ({ seat: Number(seat), count }));
  if (entries.length === 0) {
    return { target: null, counts, tie: false, top: [] };
  }
  const max = Math.max(...entries.map((entry) => entry.count));
  const top = entries.filter((entry) => entry.count === max).map((entry) => entry.seat);
  return {
    target: top.length === 1 ? top[0] : null,
    counts,
    tie: top.length > 1,
    top,
  };
}

export interface NightInput {
  wolfTarget: number | null;
  guardTarget: number | null;
  witchSave: boolean;
  poisonTarget: number | null;
}

/**
 * Resolve the night. Guard + antidote on the same target still dies
 * ("同守同救"), poison ignores protection.
 */
export function resolveNight(input: NightInput): NightOutcome {
  const causes: Record<number, DeathCause> = {};
  const guarded = input.wolfTarget !== null && input.guardTarget === input.wolfTarget;
  const saved = input.witchSave;

  if (input.wolfTarget !== null) {
    const survives = (guarded || saved) && !(guarded && saved);
    if (!survives) causes[input.wolfTarget] = 'wolf';
  }

  if (input.poisonTarget !== null) {
    causes[input.poisonTarget] = 'poison';
  }

  const deathSeats = Object.keys(causes).map(Number);

  return {
    deaths: deathSeats.sort((a, b) => a - b),
    causes,
    wolfTarget: input.wolfTarget,
    guarded,
    witchSaved: saved,
    poisoned: input.poisonTarget,
  };
}

export function factionOf(players: Player[], seat: number): Faction | null {
  return findPlayer(players, seat)?.faction ?? null;
}

export function roleOf(players: Player[], seat: number): Role | null {
  return findPlayer(players, seat)?.role ?? null;
}

export function seatLabel(seat: number): string {
  return `${String(seat).padStart(2, '0')} 号`;
}

export function publicDeathText(deaths: number[]): string {
  if (deaths.length === 0) return '昨夜是个平安夜。没有人倒下。';
  const names = deaths.map((seat) => `${seat} 号`).join('、');
  return `昨夜，${names} 没有再醒来。`;
}

/** Pick the next alive speaker order, beginning after `fromSeat` (clockwise). */
export function speakerOrder(players: Player[], fromSeat: number): number[] {
  const sorted = aliveSeats(players);
  if (sorted.length === 0) return [];
  const found = sorted.findIndex((seat) => seat > fromSeat);
  const start = found === -1 ? 0 : found;
  return [...sorted.slice(start), ...sorted.slice(0, start)];
}

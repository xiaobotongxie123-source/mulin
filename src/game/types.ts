import type { Character } from '@/data/characters';

export type Role = 'werewolf' | 'villager' | 'seer' | 'witch' | 'guard';
export type Faction = 'wolf' | 'good';
export type Phase = 'idle' | 'reveal' | 'night' | 'dawn' | 'discussion' | 'vote' | 'result';
export type NightStep = 'guard' | 'wolf' | 'witch' | 'seer' | 'resolve';
export type DeathCause = 'wolf' | 'poison' | 'vote';
export type LogKind = 'system' | 'public' | 'private' | 'speech' | 'vote' | 'death' | 'night';
export type PromptKind = 'guard' | 'wolf' | 'witch' | 'seer' | 'speech' | 'vote' | 'lastWords';

export interface Player {
  seat: number;
  character: Character;
  role: Role;
  faction: Faction;
  alive: boolean;
  isHuman: boolean;
  deathCause?: DeathCause;
  deathRound?: number;
  guardLast?: number | null;
}

export interface SeerCheck {
  seat: number;
  faction: Faction;
  round: number;
}

export interface Claim {
  seat: number;
  target: number;
  kind: 'wolf' | 'good';
  round: number;
}

export interface LogEntry {
  id: number;
  round: number;
  phase: Phase;
  kind: LogKind;
  text: string;
  seat?: number;
  /** Speech entries stay hidden until their audio actually starts. */
  revealed?: boolean;
}

export interface WitchPromptMeta {
  victim: number | null;
  canSave: boolean;
  canPoison: boolean;
}

export interface Prompt {
  kind: PromptKind;
  seat: number;
  deadline: number | null;
  meta?: WitchPromptMeta;
}

export interface WinResult {
  faction: Faction;
  reason: string;
}

export interface NightOutcome {
  deaths: number[];
  causes: Record<number, DeathCause>;
  wolfTarget: number | null;
  guarded: boolean;
  witchSaved: boolean;
  poisoned: number | null;
}

export interface GameSnapshot {
  round: number;
  day: number;
  phase: Phase;
  nightStep: NightStep | null;
  alive: number;
  wolves: number;
}

export interface HumanAction {
  target?: number | null;
  text?: string;
  save?: boolean;
  poison?: number | null;
  pass?: boolean;
  abstain?: boolean;
  auto?: boolean;
  aborted?: boolean;
}

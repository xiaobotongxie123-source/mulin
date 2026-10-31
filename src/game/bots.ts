import type { Claim, Player, SeerCheck } from './types';
import type { Rng } from './random';
import { chance, pick, shuffle } from './random';

export interface BotContext {
  players: Player[];
  round: number;
  claims: Claim[];
  witch: { antidote: boolean; poison: boolean };
  guardLast: number | null;
  seerChecks: SeerCheck[];
  claimedSeats: number[];
  rng: Rng;
}

export interface BotSpeech {
  text: string;
  suspect: number | null;
  claim?: Claim;
}

const TONE_LINES: Record<Player['character']['tone'], string[]> = {
  calm: [
    '{s} 号，你的话里有一处对不上。',
    '我按顺序听了一遍。最让我不安的，是 {s} 号。',
    '林子里没有风，{s} 号的呼吸却太急了。',
  ],
  warm: [
    '我不想冤枉人，但 {s} 号今天的发言，我信不过。',
    '先别急着投票。{s} 号，你能把昨晚的事再说一遍吗？',
    '我愿意相信大家，可 {s} 号的视角太轻了。',
  ],
  blunt: [
    '我不绕弯。{s} 号有问题。',
    '先说结论：出 {s} 号。',
    '别演了。{s} 号，你从昨晚开始就在躲。',
  ],
  sly: [
    '故事讲到一半就停的人，通常藏着后半段。{s} 号，你说呢？',
    '有意思。{s} 号每句话都像真的，拼在一起却不像。',
    '我讲个故事：有个人一直在数别人的票。那个人是 {s} 号。',
  ],
  nervous: [
    '我、我不太会说话……但 {s} 号刚才，真的有点奇怪。',
    '可能是我多想……{s} 号的发言，前后反了。',
    '我不确定，可如果一定要选，我选 {s} 号。',
  ],
};

const WOLF_LINES = [
  '{s} 号的发言太干净了，干净得像事先想好的。',
  '我一直在听 {s} 号。他说的每句话，都在把火往别人身上引。',
  '先出 {s} 号吧。再拖下去，天亮不了。',
  '我怀疑 {s} 号。昨晚他太安静，今天又太主动。',
];

const CLAIM_LINES = [
  '我是预言家。昨晚我验了 {t} 号，是查杀。今天请他出局。',
  '不绕了。我是预言家，{t} 号是狼。信我，就跟我投票。',
  '{t} 号是查杀。我是预言家，这句话我只说一次。',
];

const SUPPORT_LINES = [
  '我信 {c} 号的预言家身份。今天出 {t} 号。',
  '{c} 号如果是狼，没必要冒这个险。我跟票，出 {t} 号。',
  '先不盘别的。预言家给了查杀，今天就走 {t} 号。',
];

const LAST_WORDS = [
  '我没什么可说的了。剩下的路，你们自己走。',
  '记住我今晚说的话。别让火灭在你们手里。',
  '灯留给你们。我先走了。',
  '如果还能重来，我还是会投那一票。',
];

function goodTargets(ctx: BotContext, exclude: number[] = []): Player[] {
  return ctx.players.filter(
    (player) => player.alive && player.faction === 'good' && !exclude.includes(player.seat),
  );
}

function aliveOthers(ctx: BotContext, seat: number): Player[] {
  return ctx.players.filter((player) => player.alive && player.seat !== seat);
}

function weightedSeat(players: Player[], rng: Rng): number | null {
  if (players.length === 0) return null;
  return pick(players, rng).seat;
}

export function botWolfTarget(ctx: BotContext): number | null {
  const candidates = goodTargets(ctx);
  if (candidates.length === 0) return null;
  const claim = ctx.claims.find((item) => item.kind === 'wolf' && ctx.players.find((p) => p.seat === item.seat)?.alive);
  const claimant = claim ? candidates.find((player) => player.seat === claim.seat) : undefined;
  if (claimant && chance(0.55, ctx.rng)) return claimant.seat;
  // Slight preference for the human and for quiet seats.
  const human = candidates.find((player) => player.isHuman);
  if (human && chance(0.18, ctx.rng)) return human.seat;
  return weightedSeat(candidates, ctx.rng);
}

export function botGuardTarget(ctx: BotContext, selfSeat: number): number | null {
  const candidates = aliveOthers(ctx, selfSeat).filter((player) => player.seat !== ctx.guardLast);
  const canSelf = selfSeat !== ctx.guardLast;
  const claim = ctx.claims.find((item) => item.kind === 'wolf' && ctx.players.find((p) => p.seat === item.seat)?.alive);
  if (claim) {
    const claimant = ctx.players.find((player) => player.seat === claim.seat && player.alive);
    if (claimant && claimant.seat !== ctx.guardLast && chance(0.5, ctx.rng)) return claimant.seat;
  }
  if (canSelf && chance(0.22, ctx.rng)) return selfSeat;
  if (candidates.length === 0) return canSelf ? selfSeat : null;
  return weightedSeat(candidates, ctx.rng);
}

export function botSeerTarget(ctx: BotContext, selfSeat: number, checked: number[]): number | null {
  const candidates = aliveOthers(ctx, selfSeat).filter((player) => !checked.includes(player.seat));
  return weightedSeat(candidates.length > 0 ? candidates : aliveOthers(ctx, selfSeat), ctx.rng);
}

export interface WitchDecision {
  save: boolean;
  poison: number | null;
}

export function botWitchDecision(ctx: BotContext, selfSeat: number, victim: number | null): WitchDecision {
  let save = false;
  if (victim !== null && ctx.witch.antidote) {
    if (victim === selfSeat) {
      save = chance(0.9, ctx.rng);
    } else {
      const claim = ctx.claims.find((item) => item.seat === victim);
      save = chance(claim ? 0.72 : ctx.round === 1 ? 0.5 : 0.32, ctx.rng);
    }
  }

  if (!save && ctx.witch.poison && ctx.round >= 2 && chance(0.22, ctx.rng)) {
    const candidates = aliveOthers(ctx, selfSeat).filter((player) => player.seat !== victim);
    const claim = ctx.claims.find((item) => item.kind === 'wolf' && ctx.players.find((p) => p.seat === item.seat)?.alive);
    const accused = claim ? candidates.find((player) => player.seat === claim.target) : undefined;
    if (accused && chance(0.55, ctx.rng)) return { save: false, poison: accused.seat };
    const target = weightedSeat(candidates, ctx.rng);
    return { save: false, poison: target };
  }

  return { save, poison: null };
}

export function botSuspect(ctx: BotContext, seat: number): number | null {
  const self = ctx.players.find((player) => player.seat === seat);
  if (!self) return null;
  const alive = ctx.players.filter((player) => player.alive && player.seat !== seat);
  if (alive.length === 0) return null;

  if (self.faction === 'wolf') {
    const good = alive.filter((player) => player.faction === 'good');
    const claim = ctx.claims.find((item) => item.seat !== seat && ctx.players.find((p) => p.seat === item.seat)?.alive);
    const claimant = claim ? good.find((player) => player.seat === claim.seat) : undefined;
    if (claimant && chance(0.35, ctx.rng)) return claimant.seat;
    return weightedSeat(good, ctx.rng);
  }

  const claim = ctx.claims.find(
    (item) =>
      item.kind === 'wolf' &&
      item.seat !== seat &&
      ctx.players.find((player) => player.seat === item.seat)?.alive &&
      ctx.players.find((player) => player.seat === item.target)?.alive,
  );
  if (claim) {
    if (claim.target === seat) return claim.seat;
    return claim.target;
  }
  return weightedSeat(alive, ctx.rng);
}

export function botSpeech(ctx: BotContext, seat: number): BotSpeech {
  const self = ctx.players.find((player) => player.seat === seat);
  if (!self) return { text: '……', suspect: null };
  const suspect = botSuspect(ctx, seat);

  // A seer bot may reveal a wolf check, at most once.
  if (
    self.role === 'seer' &&
    !ctx.claimedSeats.includes(seat) &&
    ctx.round >= 2
  ) {
    const wolfCheck = [...ctx.seerChecks].reverse().find((check) => check.faction === 'wolf');
    const wolfPlayer = wolfCheck ? ctx.players.find((player) => player.seat === wolfCheck.seat && player.alive) : undefined;
    if (wolfCheck && wolfPlayer) {
      const claim: Claim = { seat, target: wolfCheck.seat, kind: 'wolf', round: ctx.round };
      return {
        text: pick(CLAIM_LINES, ctx.rng).replace('{t}', String(wolfCheck.seat)),
        suspect: wolfCheck.seat,
        claim,
      };
    }
  }

  const publicClaim = ctx.claims.find(
    (item) =>
      item.kind === 'wolf' &&
      item.seat !== seat &&
      ctx.players.find((player) => player.seat === item.seat)?.alive &&
      ctx.players.find((player) => player.seat === item.target)?.alive,
  );

  if (self.faction === 'good' && publicClaim && publicClaim.target !== seat && chance(0.7, ctx.rng)) {
    return {
      text: pick(SUPPORT_LINES, ctx.rng)
        .replace('{c}', String(publicClaim.seat))
        .replace('{t}', String(publicClaim.target)),
      suspect: publicClaim.target,
    };
  }

  const lines = self.faction === 'wolf' ? WOLF_LINES : TONE_LINES[self.character.tone] ?? TONE_LINES.calm;
  const target = suspect ?? seat;
  return { text: pick(lines, ctx.rng).replace('{s}', String(target)), suspect };
}

export function botVote(ctx: BotContext, seat: number, suspect: number | null): number | null {
  const self = ctx.players.find((player) => player.seat === seat);
  if (!self) return null;
  const alive = ctx.players.filter((player) => player.alive && player.seat !== seat);
  if (alive.length === 0) return null;

  if (self.faction === 'wolf') {
    const good = alive.filter((player) => player.faction === 'good');
    const claim = ctx.claims.find(
      (item) =>
        item.seat !== seat &&
        ctx.players.find((p) => p.seat === item.seat)?.alive &&
        ctx.players.find((p) => p.seat === item.seat)?.faction === 'good',
    );
    if (claim && chance(0.55, ctx.rng)) return claim.seat;
    if (suspect && good.some((player) => player.seat === suspect) && chance(0.7, ctx.rng)) return suspect;
    return weightedSeat(good, ctx.rng);
  }

  const claim = ctx.claims.find(
    (item) =>
      item.kind === 'wolf' &&
      item.seat !== seat &&
      ctx.players.find((player) => player.seat === item.seat)?.alive &&
      ctx.players.find((player) => player.seat === item.target)?.alive,
  );
  if (claim) {
    if (claim.target === seat) return claim.seat;
    if (chance(0.72, ctx.rng)) return claim.target;
  }
  if (suspect && alive.some((player) => player.seat === suspect) && chance(0.72, ctx.rng)) return suspect;
  return weightedSeat(alive, ctx.rng);
}

export function botLastWords(): string {
  return LAST_WORDS[Math.floor(Math.random() * LAST_WORDS.length)];
}

export function chooseFirstSpeaker(players: Player[], rng: Rng): number {
  const alive = players.filter((player) => player.alive).map((player) => player.seat);
  return alive.length > 0 ? pick(alive, rng) : 1;
}

export function shuffledAlive(players: Player[], rng: Rng): number[] {
  return shuffle(
    players.filter((player) => player.alive).map((player) => player.seat),
    rng,
  );
}

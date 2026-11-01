import { useGameStore } from '@/stores/game';
import { ROLE_META } from '@/data/roles';
import {
  checkWinner,
  publicDeathText,
  resolveNight,
  speakerOrder,
  tallyVotes,
} from '@/game/engine';
import {
  botGuardTarget,
  botLastWords,
  botSeerTarget,
  botSpeech,
  botSuspect,
  botVote,
  botWitchDecision,
  botWolfTarget,
  type BotContext,
  type BotSpeech,
} from '@/game/bots';
import { mulberry32, type Rng } from '@/game/random';
import {
  checkAgentRuntime,
  requestAgentSpeech,
  type AgentSpeechContext,
} from '@/game/agentClient';
import type { Claim, HumanAction, Prompt, SeerCheck } from '@/game/types';
import { speechPauseMs, voiceNarration } from '@/game/voice';

class AbortError extends Error {
  constructor() {
    super('game aborted');
    this.name = 'AbortError';
  }
}

const CN_NUMBERS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function cnNumber(value: number): string {
  if (value <= 10) return CN_NUMBERS[value] ?? String(value);
  return String(value);
}

function parseHumanClaim(text: string, seat: number, round: number): Claim | null {
  if (!/预言家|查验|验了|验过/.test(text)) return null;
  const patterns = [
    /(\d)\s*号[^。！？\n]{0,14}?(查杀|是狼|狼人)/,
    /(查杀|是狼|狼人)[^。！？\n]{0,8}?(\d)\s*号/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const target = Number(match[1].length === 1 && /\d/.test(match[1]) ? match[1] : match[2]);
    if (target >= 1 && target <= 9) {
      return { seat, target, kind: 'wolf', round };
    }
  }
  return null;
}

export class GameController {
  private store: ReturnType<typeof useGameStore>;
  private rng: Rng;
  private aborted = false;
  private pending = new Set<{ id: number; reject: (error: Error) => void }>();
  private seerChecks = new Map<number, SeerCheck[]>();
  private claimedSeats: number[] = [];

  constructor(store: ReturnType<typeof useGameStore>) {
    this.store = store;
    this.rng = mulberry32((store.seed ^ 0x9e3779b9) >>> 0);
  }

  async run(): Promise<void> {
    const store = this.store;
    if (store.phase === 'result') return;
    if (store.phase === 'reveal') store.startGame();
    try {
      while (!this.aborted && !store.winner) {
        store.round += 1;
        store.stats.nights = store.round;
        await this.night();
        await this.dawn();
        if (this.finishIfNeeded()) return;
        await this.discussion();
        await this.vote();
        if (this.finishIfNeeded()) return;
      }
    } catch (error) {
      if (!(error instanceof AbortError)) {
        console.error('[mulin-night] game loop stopped', error);
      }
    } finally {
      store.waiting = true;
    }
  }

  abort(): void {
    this.aborted = true;
    for (const entry of this.pending) {
      window.clearTimeout(entry.id);
      entry.reject(new AbortError());
    }
    this.pending.clear();
    this.store.cancelPrompt();
  }

  /**
   * Give the narrator time to finish the line that was just added to the log.
   * The real wall-clock duration is kept even when the player picks 2x/3x, so
   * the voices do not overlap into an unintelligible crowd.
   */
  private async holdAfterSpeech(text: string): Promise<void> {
    if (!voiceNarration.enabled || !/[\p{L}\p{N}]/u.test(text)) {
      await this.wait(420);
      return;
    }
    await this.wait(speechPauseMs(text) * this.store.speed);
  }

  private wait(ms: number): Promise<void> {
    if (this.aborted) return Promise.reject(new AbortError());
    return new Promise<void>((resolve, reject) => {
      const entry = { id: 0, reject };
      entry.id = window.setTimeout(() => {
        this.pending.delete(entry);
        resolve();
      }, Math.max(40, ms / this.store.speed));
      this.pending.add(entry);
    });
  }

  private delay(min: number, max: number): Promise<void> {
    return this.wait(min + this.rng() * Math.max(0, max - min));
  }

  private beat(title: string, sub: string, tone: 'night' | 'dawn' | 'vote' | 'death' | 'neutral', ms = 1900): Promise<void> {
    this.store.showBanner(title, sub, tone, ms);
    return this.wait(ms);
  }

  private ctx(seerSeat?: number): BotContext {
    const store = this.store;
    return {
      players: store.players,
      round: store.round,
      claims: store.claims,
      witch: store.witch,
      guardLast: store.guardLast,
      seerChecks: seerSeat ? this.seerChecks.get(seerSeat) ?? [] : [],
      claimedSeats: this.claimedSeats,
      rng: this.rng,
    };
  }

  private agentContext(seat: number): AgentSpeechContext | null {
    const store = this.store;
    const player = store.players.find((item) => item.seat === seat);
    if (!player) return null;
    const checks = player.role === 'seer' ? this.seerChecks.get(seat) ?? [] : [];
    const wolves =
      player.faction === 'wolf'
        ? store.players.filter((item) => item.role === 'werewolf' && item.seat !== seat)
        : [];
    const recentPublic = store.logs
      .filter((log) => log.kind !== 'private' && ['speech', 'public', 'death', 'vote', 'night'].includes(log.kind))
      .slice(-12)
      .map((log) => ({ seat: log.seat, kind: log.kind, text: log.text.slice(0, 220) }));
    return {
      seat,
      name: player.character.name,
      role: player.role,
      faction: player.faction,
      tone: player.character.tone,
      round: store.round,
      day: store.day,
      aliveSeats: store.players.filter((item) => item.alive).map((item) => item.seat),
      deadSeats: store.players.filter((item) => !item.alive).map((item) => item.seat),
      lastNightDeaths: store.lastNightDeaths,
      lastExiled: store.exiled,
      teammates: wolves.map((item) => item.seat),
      claims: store.claims,
      seerChecks: checks,
      witch: player.role === 'witch' ? store.witch : { antidote: false, poison: false },
      guardLast: player.role === 'guard' ? store.guardLast : null,
      players: store.players.map((item) => ({
        seat: item.seat,
        name: item.character.name,
        alive: item.alive,
        isHuman: item.isHuman,
      })),
      recentPublic,
    };
  }

  private agentSpeech(seat: number): Promise<BotSpeech> {
    const player = this.store.players.find((item) => item.seat === seat);
    if (!player) return Promise.resolve({ text: '……', suspect: null });
    const local = botSpeech(this.ctx(player.role === 'seer' ? seat : undefined), seat);
    // Claims are part of the rules engine. Keep those deterministic so a
    // generated line cannot invent a seer result or contradict the table.
    if (local.claim) return Promise.resolve(local);
    const context = this.agentContext(seat);
    if (!context) return Promise.resolve(local);
    return requestAgentSpeech(seat, context).then((text) => ({
      ...local,
      text: text ?? local.text,
    }));
  }

  private canHumanAct(playerSeat: number): boolean {
    const player = this.store.players.find((item) => item.seat === playerSeat);
    return Boolean(player?.isHuman && player.alive && !this.store.autopilot);
  }

  private async ask(prompt: Prompt): Promise<HumanAction> {
    this.store.waiting = false;
    const action = await this.store.ask(prompt);
    this.store.waiting = true;
    if (action.aborted || this.aborted) throw new AbortError();
    return action;
  }

  private aliveSeat(seat: number | null | undefined): boolean {
    if (!seat) return false;
    return Boolean(this.store.players.find((player) => player.seat === seat && player.alive));
  }

  private isWolfSeat(seat: number): boolean {
    return Boolean(this.store.players.find((player) => player.seat === seat && player.role === 'werewolf'));
  }

  private async night(): Promise<void> {
    const store = this.store;
    store.phase = 'night';
    store.nightStep = 'guard';
    store.lastNightDeaths = [];
    store.nightDeaths = [];
    store.votes = {};
    store.voteCounts = {};
    store.exiled = null;
    store.speakerSeat = null;
    store.speaking = false;
    store.addLog('night', `第 ${cnNumber(store.round)} 夜。`);
    await this.beat('天黑请闭眼', `第 ${cnNumber(store.round)} 夜 · 万物噤声`, 'night');

    // ---- guard ---------------------------------------------------------
    const guard = store.players.find((player) => player.role === 'guard' && player.alive);
    let guardTarget: number | null = null;
    if (guard) {
      store.nightStep = 'guard';
      if (this.canHumanAct(guard.seat)) {
        const action = await this.ask({ kind: 'guard', seat: guard.seat, deadline: null });
        if (action.auto || !this.aliveSeat(action.target) || action.target === store.guardLast) {
          guardTarget = botGuardTarget(this.ctx(), guard.seat);
        } else {
          guardTarget = action.target ?? null;
        }
      } else {
        await this.delay(650, 1100);
        guardTarget = botGuardTarget(this.ctx(), guard.seat);
      }
      store.guardLast = guardTarget;
      if (guard.isHuman && guardTarget) {
        store.addLog('private', `你守护了 ${guardTarget} 号。`);
      }
      await this.wait(380);
    }

    // ---- wolves --------------------------------------------------------
    store.nightStep = 'wolf';
    const wolves = store.players.filter((player) => player.role === 'werewolf' && player.alive);
    const humanWolf = wolves.find((player) => player.isHuman);
    let wolfTarget: number | null = null;
    if (wolves.length > 0) {
      await this.delay(500, 900);
      if (humanWolf && this.canHumanAct(humanWolf.seat)) {
        const action = await this.ask({ kind: 'wolf', seat: humanWolf.seat, deadline: null });
        if (
          action.auto ||
          !this.aliveSeat(action.target) ||
          this.isWolfSeat(action.target as number)
        ) {
          wolfTarget = botWolfTarget(this.ctx());
        } else {
          wolfTarget = action.target ?? null;
        }
      } else {
        wolfTarget = botWolfTarget(this.ctx());
      }
      if (humanWolf && wolfTarget) {
        const pack = wolves.map((player) => `${player.seat} 号`).join('、');
        store.addLog('private', `狼群（${pack}）选择了 ${wolfTarget} 号。`);
      }
      await this.wait(500);
    }

    // ---- witch ---------------------------------------------------------
    store.nightStep = 'witch';
    const witchPlayer = store.players.find((player) => player.role === 'witch' && player.alive);
    let witchSave = false;
    let poisonTarget: number | null = null;
    if (witchPlayer) {
      await this.delay(450, 850);
      let save = false;
      let poison: number | null = null;
      if (this.canHumanAct(witchPlayer.seat)) {
        const action = await this.ask({
          kind: 'witch',
          seat: witchPlayer.seat,
          deadline: null,
          meta: {
            victim: wolfTarget,
            canSave: store.witch.antidote && wolfTarget !== null,
            canPoison: store.witch.poison,
          },
        });
        if (action.auto) {
          const decision = botWitchDecision(this.ctx(), witchPlayer.seat, wolfTarget);
          save = decision.save;
          poison = decision.poison;
        } else if (action.save && store.witch.antidote && wolfTarget !== null) {
          save = true;
        } else if (action.poison && store.witch.poison && this.aliveSeat(action.poison)) {
          poison = action.poison;
        }
      } else {
        const decision = botWitchDecision(this.ctx(), witchPlayer.seat, wolfTarget);
        save = decision.save;
        poison = decision.poison;
      }
      if (save) {
        store.witch.antidote = false;
        witchSave = true;
        if (witchPlayer.isHuman) store.addLog('private', `你用解药救下了 ${wolfTarget} 号。`);
      } else if (poison) {
        store.witch.poison = false;
        poisonTarget = poison;
        if (witchPlayer.isHuman) store.addLog('private', `你对 ${poison} 号使用了毒药。`);
      } else if (witchPlayer.isHuman) {
        store.addLog('private', '你收起了药瓶，没有使用。');
      }
      await this.wait(420);
    }

    // ---- seer ----------------------------------------------------------
    store.nightStep = 'seer';
    const seer = store.players.find((player) => player.role === 'seer' && player.alive);
    if (seer) {
      await this.delay(450, 800);
      const checked = (this.seerChecks.get(seer.seat) ?? []).map((check) => check.seat);
      let target: number | null = null;
      if (this.canHumanAct(seer.seat)) {
        const action = await this.ask({ kind: 'seer', seat: seer.seat, deadline: null });
        if (action.auto || !this.aliveSeat(action.target) || action.target === seer.seat) {
          target = botSeerTarget(this.ctx(seer.seat), seer.seat, checked);
        } else {
          target = action.target ?? null;
        }
      } else {
        target = botSeerTarget(this.ctx(seer.seat), seer.seat, checked);
      }
      if (target) {
        const targetPlayer = store.players.find((player) => player.seat === target);
        if (targetPlayer) {
          const check: SeerCheck = { seat: target, faction: targetPlayer.faction, round: store.round };
          const list = this.seerChecks.get(seer.seat) ?? [];
          list.push(check);
          this.seerChecks.set(seer.seat, list);
          store.stats.checks += 1;
          if (seer.isHuman) {
            store.seerChecks.push(check);
            const factionName = check.faction === 'wolf' ? '狼人' : '好人';
            store.addLog('private', `你查验了 ${target} 号：${factionName}。`);
            store.pushToast(
              `查验 · ${String(target).padStart(2, '0')} 号`,
              factionName === '狼人' ? '他的影子里，有狼的形状。' : '至少今夜，他是干净的。',
              check.faction === 'wolf' ? 'blood' : 'moss',
            );
          }
        }
      }
      await this.wait(450);
    }

    // ---- resolve -------------------------------------------------------
    store.nightStep = 'resolve';
    await this.wait(650);
    const outcome = resolveNight({
      wolfTarget,
      guardTarget,
      witchSave,
      poisonTarget,
    });
    for (const seat of outcome.deaths) {
      store.markDead(seat, outcome.causes[seat] ?? 'wolf', store.round);
    }
    store.nightDeaths = outcome.deaths;
    store.lastNightDeaths = outcome.deaths;
    store.nightStep = null;
  }

  private async dawn(): Promise<void> {
    const store = this.store;
    store.phase = 'dawn';
    store.day = store.round;
    store.addLog('public', publicDeathText(store.nightDeaths));
    const sub =
      store.nightDeaths.length === 0
        ? '平安夜 · 炉火还温着'
        : `${store.nightDeaths.map((seat) => `${seat} 号`).join('、')} 没有再醒来`;
    await this.beat('天亮了', sub, 'dawn');
    await this.lastWords(store.nightDeaths);
  }

  private async discussion(): Promise<void> {
    const store = this.store;
    if (store.winner) return;
    store.phase = 'discussion';
    store.nightStep = null;
    const from =
      store.nightDeaths.length > 0
        ? store.nightDeaths[store.nightDeaths.length - 1]
        : ((store.round - 1) % store.totalPlayers) + 1;
    const order = speakerOrder(store.players, from);
    store.addLog('system', `第 ${cnNumber(store.day)} 天 · 依次发言。`);

    const botSeats = order.filter((seat) => {
      const player = store.players.find((item) => item.seat === seat);
      return Boolean(player?.alive && !player.isHuman);
    });
    const agentReady = botSeats.length > 0 && (await checkAgentRuntime());
    const agentLines = new Map<number, Promise<BotSpeech>>();
    if (agentReady) {
      for (const seat of botSeats) agentLines.set(seat, this.agentSpeech(seat));
    }

    for (const seat of order) {
      if (this.aborted) return;
      const player = store.players.find((item) => item.seat === seat);
      if (!player || !player.alive) continue;
      store.speakerSeat = seat;
      store.speaking = true;
      if (this.canHumanAct(seat)) {
        const action = await this.ask({
          kind: 'speech',
          seat,
          deadline: Date.now() + 45_000,
        });
        if (action.auto) {
          const speech = botSpeech(this.ctx(player.role === 'seer' ? player.seat : undefined), seat);
          this.applySpeech(seat, speech.text, speech.claim);
          await this.holdAfterSpeech(speech.text);
        } else {
          const text = (action.text ?? '').trim() || '过。';
          const claim = parseHumanClaim(text, seat, store.round);
          this.applySpeech(seat, text, claim ?? undefined);
          await this.holdAfterSpeech(text);
        }
      } else {
        await this.delay(900, 1500);
        const speech = agentLines.has(seat)
          ? await agentLines.get(seat)
          : botSpeech(this.ctx(player.role === 'seer' ? player.seat : undefined), seat);
        const line = speech?.text ?? '……';
        this.applySpeech(seat, line, speech?.claim);
        await this.holdAfterSpeech(line);
      }
    }
    store.speakerSeat = null;
    store.speaking = false;
  }

  private applySpeech(seat: number, text: string, claim?: Claim): void {
    const store = this.store;
    store.addLog('speech', text, seat);
    if (claim) {
      store.addClaim(claim);
      if (!this.claimedSeats.includes(seat)) this.claimedSeats.push(seat);
      store.addLog('public', `${seat} 号自称预言家，指认 ${claim.target} 号是狼人。`);
    }
  }

  private async vote(): Promise<void> {
    const store = this.store;
    if (store.winner) return;
    store.phase = 'vote';
    store.votes = {};
    store.voteCounts = {};
    store.exiled = null;
    store.speakerSeat = null;
    store.speaking = false;
    await this.beat('放逐投票', `第 ${cnNumber(store.day)} 天 · 把票投给你最怀疑的人`, 'vote', 1600);

    const human = store.human;
    const humanVotes = this.canHumanAct(human.seat);
    if (humanVotes) {
      const action = await this.ask({ kind: 'vote', seat: human.seat, deadline: Date.now() + 60_000 });
      if (action.auto) {
        const target = botVote(this.ctx(), human.seat, botSuspect(this.ctx(), human.seat));
        if (target) store.votes[human.seat] = target;
      } else if (action.abstain) {
        store.votes[human.seat] = 0;
        store.addLog('vote', `${human.seat} 号弃票。`, human.seat);
      } else if (this.aliveSeat(action.target) && action.target !== human.seat) {
        store.votes[human.seat] = action.target as number;
      } else {
        store.votes[human.seat] = 0;
      }
    }

    const voters = store.players.filter((player) => player.alive && !player.isHuman);
    for (const voter of voters) {
      await this.delay(220, 520);
      const suspect = botSuspect(this.ctx(), voter.seat);
      const target = botVote(this.ctx(), voter.seat, suspect);
      if (target) {
        store.votes[voter.seat] = target;
        store.addLog('vote', `${voter.seat} 号投出了自己的一票。`, voter.seat);
      }
    }

    const tally = tallyVotes(store.votes);
    store.voteCounts = tally.counts;
    const summary =
      Object.entries(tally.counts)
        .sort((a, b) => b[1] - a[1])
        .map(([seat, count]) => `${seat} 号 ${count} 票`)
        .join(' · ') || '无人得票';
    store.addLog('vote', `投票结果：${summary}`);

    if (tally.tie) {
      store.addLog('public', '平票。没有人被放逐。');
      await this.beat('平票', '票数相同 · 今夜无人被放逐', 'neutral', 1900);
      return;
    }
    if (!tally.target) {
      store.addLog('public', '无人被放逐。');
      await this.beat('无人出局', '所有人都在沉默里活了下来', 'neutral', 1600);
      return;
    }

    const exiled = tally.target;
    store.exiled = exiled;
    store.stats.executions += 1;
    store.markDead(exiled, 'vote', store.round);
    store.addLog('death', `${exiled} 号被放逐。`, exiled);
    await this.beat(`${String(exiled).padStart(2, '0')} 号 被放逐`, '票数最多 · 山舍里少了一个人', 'death', 2100);
    await this.lastWords([exiled]);
  }

  private async lastWords(seats: number[]): Promise<void> {
    const store = this.store;
    for (const seat of seats) {
      if (this.aborted) return;
      const player = store.players.find((item) => item.seat === seat);
      if (!player) continue;
      if (player.isHuman && !store.autopilot) {
        const action = await this.ask({
          kind: 'lastWords',
          seat,
          deadline: Date.now() + 30_000,
        });
        const text = (action.text ?? '').trim();
        if (text) store.addLog('speech', text, seat);
        await this.holdAfterSpeech(text || '……');
      } else {
        await this.wait(900);
        const line = botLastWords();
        store.addLog('speech', line, seat);
        await this.holdAfterSpeech(line);
      }
    }
  }

  private finishIfNeeded(): boolean {
    const store = this.store;
    if (store.winner) return true;
    const result = checkWinner(store.players);
    if (!result) return false;
    store.addLog('system', result.reason);
    store.stats.nights = store.round;
    store.setWinner(result);
    const good = result.faction === 'good';
    store.showBanner(good ? '破晓' : '长夜', good ? '好人阵营胜利' : '狼人阵营胜利', good ? 'dawn' : 'death', 3600);
    return true;
  }
}

export function roleLine(seat: number): string {
  const store = useGameStore();
  const player = store.players.find((item) => item.seat === seat);
  return player ? `${seat} 号 ${ROLE_META[player.role].name}` : `${seat} 号`;
}

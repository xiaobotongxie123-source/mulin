<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import type { HumanAction, Player } from '@/game/types';
import RoleIcon from '@/components/ui/RoleIcon.vue';
import TravelerPortrait from '@/components/ui/TravelerPortrait.vue';

const store = useGameStore();
const router = useRouter();

const prompt = computed(() => store.prompt);
const kind = computed(() => prompt.value?.kind ?? null);
const human = computed(() => store.human);
const humanRole = computed(() => store.humanRole);
const meta = computed(() => store.humanMeta);
const alive = computed(() => store.humanAlive);
const selected = computed(() => store.selectedSeat);
const winner = computed(() => store.winner);

const draft = ref('');
const poisonMode = ref(false);
const now = ref(Date.now());
let tick = 0;
let answeredKey = '';

const promptKey = computed(() =>
  prompt.value ? `${prompt.value.kind}:${prompt.value.seat}:${prompt.value.deadline ?? 0}` : '',
);

const secondsLeft = computed(() => {
  const deadline = prompt.value?.deadline;
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - now.value) / 1000));
});

const teammates = computed(() =>
  store.teammates
    .filter((player) => player.alive)
    .map((player) => `${String(player.seat).padStart(2, '0')} ${player.character.name}`)
    .join(' · '),
);

const isSpeechLike = computed(() => kind.value === 'speech' || kind.value === 'lastWords');
const isWitchChoices = computed(() => kind.value === 'witch' && !poisonMode.value);

const showTargets = computed(() => {
  if (kind.value === 'guard' || kind.value === 'wolf' || kind.value === 'seer' || kind.value === 'vote') return true;
  return kind.value === 'witch' && poisonMode.value;
});

const showSkip = computed(() => kind.value !== 'seer' && !isWitchChoices.value);

function reasonFor(player: Player): string {
  if (!prompt.value) return '';
  if (!player.alive) return '出局';
  switch (kind.value) {
    case 'guard':
      return store.guardLast === player.seat ? '连守' : '';
    case 'wolf':
      return player.role === 'werewolf' ? '同伴' : '';
    case 'seer':
      return player.isHuman ? '自己' : '';
    case 'vote':
      return player.isHuman ? '自己' : '';
    case 'witch':
      return player.isHuman ? '自己' : '';
    default:
      return '';
  }
}

const targets = computed(() =>
  [...store.players]
    .sort((a, b) => a.seat - b.seat)
    .map((player) => {
      const reason = reasonFor(player);
      return { player, reason, disabled: Boolean(reason) };
    }),
);

const selectedValid = computed(() => {
  if (selected.value === null) return false;
  const target = targets.value.find((item) => item.player.seat === selected.value);
  return Boolean(target && !target.disabled);
});

const canConfirm = computed(() => {
  if (isSpeechLike.value) return kind.value === 'lastWords' ? true : draft.value.trim().length > 0;
  if (isWitchChoices.value) return false;
  return selectedValid.value;
});

const eyebrow = computed(() => {
  switch (kind.value) {
    case 'guard':
      return 'YOUR MOVE · 守卫';
    case 'wolf':
      return 'YOUR MOVE · 狼人';
    case 'seer':
      return 'YOUR MOVE · 预言家';
    case 'witch':
      return poisonMode.value ? 'YOUR MOVE · 毒药' : 'YOUR MOVE · 女巫';
    case 'speech':
      return 'YOUR TURN · 发言';
    case 'vote':
      return 'YOUR VOTE · 放逐';
    case 'lastWords':
      return 'LAST WORDS · 遗言';
    default:
      return 'THE TABLE';
  }
});

const title = computed(() => {
  switch (kind.value) {
    case 'guard':
      return '今夜，守住哪扇门？';
    case 'wolf':
      return '狼群的低语';
    case 'seer':
      return '看清一个人';
    case 'witch':
      return poisonMode.value ? '毒药给谁？' : '药瓶在你手里';
    case 'speech':
      return `${String(human.value.seat).padStart(2, '0')} 号 · 轮到你`;
    case 'vote':
      return '把票投给谁？';
    case 'lastWords':
      return '留一句话';
    default:
      return '';
  }
});

const subtitle = computed(() => {
  switch (kind.value) {
    case 'guard':
      return store.guardLast
        ? `上一夜你守了 ${String(store.guardLast).padStart(2, '0')} 号，今夜不能重复。可以守自己。`
        : '可以守护自己。同守同救，目标仍然会死亡。';
    case 'wolf':
      return teammates.value ? `同伴：${teammates.value}。避开狼群，选择今夜的猎物。` : '选择今夜的猎物。';
    case 'seer':
      return store.seerChecks.length
        ? `最近查验：${store.seerChecks
            .slice(-2)
            .map((check) => `${String(check.seat).padStart(2, '0')} 号·${check.faction === 'wolf' ? '狼' : '好'}`)
            .join(' · ')}`
        : '查验结果仅你可见。信息越早被信任，破晓越近。';
    case 'witch': {
      if (poisonMode.value) return '毒药只有一瓶。选择一个人，他不会再醒来。';
      const victim = prompt.value?.meta?.victim;
      return victim
        ? `今夜 ${String(victim).padStart(2, '0')} 号倒下了。解药与毒药，今夜只能选一种。`
        : '今夜无人遇袭。你可以使用毒药，或收起药瓶。';
    }
    case 'speech':
      return '顺序发言。你的话会被所有人听见，也会被所有人记住。';
    case 'vote':
      return '票数最多者被放逐；平票则无人出局。弃票也是一种选择。';
    case 'lastWords':
      return '你已出局，但还可以留下最后一句话。';
    default:
      return '';
  }
});

const confirmLabel = computed(() => {
  switch (kind.value) {
    case 'guard':
      return '确认守护';
    case 'wolf':
      return '确认袭击';
    case 'seer':
      return '查验此人';
    case 'vote':
      return '投出这一票';
    case 'witch':
      return '使用毒药';
    case 'speech':
      return '说完了';
    case 'lastWords':
      return '留下这句话';
    default:
      return '确认';
  }
});

const skipLabel = computed(() => {
  switch (kind.value) {
    case 'guard':
      return '今夜空守';
    case 'wolf':
      return '放弃袭击';
    case 'vote':
      return '弃票';
    case 'witch':
      return poisonMode.value ? '返回' : '收起药瓶';
    case 'speech':
      return '过';
    case 'lastWords':
      return '不留了';
    default:
      return '跳过';
  }
});

const quickLines = computed(() => {
  const others = store.players.filter((player) => player.alive && player.seat !== human.value.seat);
  const suspect = others[Math.floor(others.length / 2)] ?? others[0];
  const lines = ['我是好人，先听预言家。'];
  if (store.humanRole === 'seer' && store.seerChecks.length) {
    const check = store.seerChecks[store.seerChecks.length - 1];
    lines.push(
      check.faction === 'wolf'
        ? `我是预言家，昨晚查验 ${String(check.seat).padStart(2, '0')} 号，查杀。`
        : `我是预言家，昨晚查验 ${String(check.seat).padStart(2, '0')} 号，是好人。`,
    );
  } else if (suspect) {
    lines.push(`我怀疑 ${String(suspect.seat).padStart(2, '0')} 号，发言太干净了。`);
  }
  lines.push('我先弃票，不想误伤。');
  return lines;
});

const waitingText = computed(() => {
  if (winner.value) return '终局已定';
  if (!alive.value) return '你已出局 · 正在旁观';
  if (store.autopilot) return '托管中 · AI 正在替你行动';
  switch (store.phase) {
    case 'night':
      switch (store.nightStep) {
        case 'guard':
          return '守卫正在巡视';
        case 'wolf':
          return '狼人正在低语';
        case 'witch':
          return '女巫正在取药';
        case 'seer':
          return '预言家正在凝视';
        case 'resolve':
          return '夜色正在收拢';
        default:
          return '夜晚正在降临';
      }
    case 'dawn':
      return '天正在亮';
    case 'discussion':
      return '旅人们正在发言';
    case 'vote':
      return '正在计票';
    case 'result':
      return '终局已定';
    default:
      return '炉火正在燃烧';
  }
});

const phaseTag = computed(() => {
  if (store.phase === 'night') return `NIGHT ${String(store.round).padStart(2, '0')} · 夜间行动`;
  if (store.phase === 'dawn') return `DAY ${String(store.day).padStart(2, '0')} · 天亮`;
  if (store.phase === 'discussion') return `DAY ${String(store.day).padStart(2, '0')} · 发言`;
  if (store.phase === 'vote') return `DAY ${String(store.day).padStart(2, '0')} · 放逐`;
  if (store.phase === 'result') return 'THE END · 终局';
  return 'THE TABLE';
});

function choose(seat: number, disabled: boolean) {
  if (disabled) return;
  store.selectSeat(selected.value === seat ? null : seat);
}

function submit(action: HumanAction) {
  if (!store.prompt) return;
  answeredKey = promptKey.value;
  store.answer(action);
}

function confirm() {
  if (!canConfirm.value) return;
  if (isSpeechLike.value) {
    submit({ text: draft.value.trim() });
    return;
  }
  if (selected.value === null) return;
  if (kind.value === 'witch' && poisonMode.value) {
    submit({ poison: selected.value });
    return;
  }
  submit({ target: selected.value });
}

function skip() {
  if (!prompt.value) return;
  if (kind.value === 'witch') {
    if (poisonMode.value) {
      poisonMode.value = false;
      store.selectSeat(null);
      return;
    }
    submit({ pass: true });
    return;
  }
  if (kind.value === 'vote') {
    submit({ abstain: true });
    return;
  }
  if (kind.value === 'speech' || kind.value === 'lastWords') {
    submit({ text: draft.value.trim() });
    return;
  }
  submit({ target: null });
}

function saveWithAntidote() {
  if (!prompt.value?.meta?.canSave) return;
  submit({ save: true });
}

function enterPoison() {
  if (!prompt.value?.meta?.canPoison) return;
  poisonMode.value = true;
  store.selectSeat(null);
}

function handToAi() {
  submit({ auto: true });
}

function toggleAutopilot() {
  store.setAutopilot(!store.autopilot);
}

function append(line: string) {
  const next = draft.value ? `${draft.value}${draft.value.endsWith('。') ? '' : ' '}${line}` : line;
  draft.value = next.slice(0, 160);
}

function viewResult() {
  router.push('/result');
}

function checkDeadline() {
  now.value = Date.now();
  const current = prompt.value;
  if (!current?.deadline) return;
  if (now.value < current.deadline) return;
  if (answeredKey === promptKey.value) return;
  submit({ auto: true });
}

watch(
  () => prompt.value,
  () => {
    poisonMode.value = false;
    draft.value = '';
    answeredKey = '';
  },
);

onMounted(() => {
  tick = window.setInterval(checkDeadline, 500);
});

onBeforeUnmount(() => window.clearInterval(tick));
</script>

<template>
  <section class="action-dock" :class="{ 'has-prompt': Boolean(prompt), 'is-idle': !prompt }" aria-live="polite">
    <template v-if="prompt">
      <header class="dock-head">
        <span class="dock-icon" :style="{ color: meta.color }"><RoleIcon :role="humanRole" :size="28" /></span>
        <div class="dock-heading">
          <p class="eyebrow">{{ eyebrow }}</p>
          <h2 class="serif">{{ title }}</h2>
        </div>
        <span v-if="secondsLeft !== null" class="dock-timer" :class="{ urgent: secondsLeft <= 10 }">
          <b>{{ secondsLeft }}</b><span>s</span>
        </span>
      </header>

      <p class="dock-sub">{{ subtitle }}</p>

      <div v-if="showTargets" class="target-grid">
        <button
          v-for="target in targets"
          :key="target.player.seat"
          class="target"
          :class="{ 'is-selected': selected === target.player.seat, 'is-disabled': target.disabled }"
          type="button"
          :disabled="target.disabled"
          @click="choose(target.player.seat, target.disabled)"
        >
          <TravelerPortrait :character="target.player.character" :size="22" :dimmed="!target.player.alive" />
          <span class="target-seat">{{ String(target.player.seat).padStart(2, '0') }}</span>
          <span class="target-name">{{ target.player.character.name }}</span>
          <span v-if="target.reason" class="target-reason">{{ target.reason }}</span>
        </button>
      </div>

      <div v-if="isSpeechLike" class="speech-box">
        <textarea
          v-model="draft"
          maxlength="160"
          :placeholder="kind === 'lastWords' ? '留下一句话。空白也可以。' : '说说你的判断，或者只是听听别人怎么说。'"
          @keydown.meta.enter.prevent="confirm"
          @keydown.ctrl.enter.prevent="confirm"
        ></textarea>
        <div class="speech-meta">
          <span>{{ draft.length }} / 160</span>
          <span>⌘ + Enter 发送</span>
        </div>
        <div v-if="kind === 'speech'" class="quick-row">
          <button v-for="line in quickLines" :key="line" class="quick" type="button" @click="append(line)">{{ line }}</button>
        </div>
      </div>

      <div v-if="isWitchChoices" class="witch-choices">
        <button
          class="witch-option"
          type="button"
          :disabled="!prompt?.meta?.canSave || !prompt?.meta?.victim"
          @click="saveWithAntidote"
        >
          <span class="witch-glyph">解</span>
          <span>
            <b>{{ prompt?.meta?.victim ? `救下 ${String(prompt.meta.victim).padStart(2, '0')} 号` : '解药' }}</b>
            <small>{{ prompt?.meta?.canSave ? '使用唯一的解药' : '解药已用完' }}</small>
          </span>
        </button>
        <button class="witch-option" type="button" :disabled="!prompt?.meta?.canPoison" @click="enterPoison">
          <span class="witch-glyph poison">毒</span>
          <span>
            <b>使用毒药</b>
            <small>{{ prompt?.meta?.canPoison ? '选择一个人，他不会再醒来' : '毒药已用完' }}</small>
          </span>
        </button>
        <button class="witch-option ghost" type="button" @click="skip">
          <span class="witch-glyph">收</span>
          <span>
            <b>收起药瓶</b>
            <small>今夜什么也不做</small>
          </span>
        </button>
        <button class="witch-option ghost" type="button" @click="handToAi">
          <span class="witch-glyph">AI</span>
          <span>
            <b>交给 AI</b>
            <small>让直觉替你选一次</small>
          </span>
        </button>
      </div>

      <footer v-if="!isWitchChoices" class="dock-foot">
        <button v-if="showSkip" class="dock-ghost" type="button" @click="skip">{{ skipLabel }}</button>
        <button class="btn btn--cta dock-confirm" type="button" :disabled="!canConfirm" @click="confirm">
          <span class="dot"></span>
          <span>{{ confirmLabel }}</span>
          <span class="arrow">→</span>
        </button>
        <button class="dock-ai text-link" type="button" @click="handToAi">交给 AI</button>
      </footer>
    </template>

    <template v-else>
      <div class="idle-row">
        <span class="idle-orb" :class="{ day: store.phase !== 'night' }" aria-hidden="true">
          <svg v-if="store.phase === 'night'" viewBox="0 0 24 24"><path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z" /></svg>
          <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></svg>
        </span>
        <div class="idle-copy">
          <p class="eyebrow">{{ phaseTag }}</p>
          <p class="idle-title">
            {{ waitingText }}<span v-if="!winner && alive" class="idle-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          </p>
        </div>
        <div class="idle-actions">
          <button v-if="winner" class="btn btn--cta idle-result" type="button" @click="viewResult">
            <span>查看终局</span><span class="arrow">→</span>
          </button>
          <template v-else>
            <button class="idle-chip" type="button" :class="{ 'is-on': store.autopilot }" @click="toggleAutopilot">
              {{ store.autopilot ? '托管中' : '托管' }}
            </button>
            <span v-if="!alive" class="idle-note">旁观</span>
          </template>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.action-dock {
  position: fixed;
  left: 50%;
  bottom: clamp(18px, 2.4vw, 28px);
  z-index: 24;
  width: min(680px, calc(100vw - 730px));
  min-width: 516px;
  transform: translateX(-50%);
  padding: 16px 18px 13px;
  border: 1px solid rgba(224, 210, 180, 0.16);
  background: linear-gradient(155deg, rgba(15, 22, 16, 0.94), rgba(7, 11, 8, 0.96));
  backdrop-filter: blur(22px) saturate(1.12);
  -webkit-backdrop-filter: blur(22px) saturate(1.12);
  box-shadow: 0 26px 60px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
}

.action-dock::before {
  content: "";
  position: absolute;
  top: -1px;
  left: 18px;
  right: 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(226, 195, 136, 0.55), transparent);
}

.action-dock.is-idle {
  padding-top: 13px;
  padding-bottom: 13px;
}

.dock-head {
  display: flex;
  align-items: center;
  gap: 11px;
}

.dock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border: 1px solid rgba(224, 210, 180, 0.14);
  background: rgba(8, 13, 10, 0.5);
}

.dock-heading {
  min-width: 0;
  flex: 1;
}

.dock-heading h2 {
  margin-top: 5px;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: 0.12em;
  color: rgba(243, 235, 220, 0.94);
  line-height: 1.2;
}

.dock-timer {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 4px 8px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  color: rgba(231, 201, 145, 0.8);
  font-variant-numeric: tabular-nums;
}

.dock-timer b {
  font-family: var(--serif);
  font-size: 16px;
  font-weight: 400;
}

.dock-timer span {
  font-size: 7px;
  letter-spacing: 0.1em;
}

.dock-timer.urgent {
  border-color: rgba(169, 85, 77, 0.45);
  color: #d99a90;
  animation: timer-pulse 1.2s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.dock-sub {
  margin-top: 9px;
  color: rgba(232, 223, 205, 0.48);
  font-size: 9px;
  line-height: 1.8;
  letter-spacing: 0.04em;
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 5px;
  margin-top: 12px;
}

.target {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 2px 4px;
  border: 1px solid rgba(224, 210, 180, 0.1);
  background: rgba(7, 11, 8, 0.5);
  color: rgba(236, 227, 209, 0.62);
  transition:
    border-color 0.3s var(--ease-out),
    background 0.3s var(--ease-out),
    transform 0.3s var(--ease-out);
}

.target:hover:not(:disabled) {
  border-color: rgba(226, 195, 140, 0.4);
  background: rgba(31, 38, 27, 0.55);
  transform: translateY(-1px);
}

.target.is-selected {
  border-color: rgba(238, 204, 145, 0.9);
  background: rgba(52, 43, 25, 0.68);
  box-shadow: 0 0 0 1px rgba(238, 204, 145, 0.18);
}

.target.is-selected .target-name {
  color: #f3dfb8;
}

.target:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.target-seat {
  font-size: 6px;
  letter-spacing: 0.12em;
  color: rgba(222, 199, 158, 0.55);
}

.target-name {
  font-family: var(--serif);
  font-size: 9px;
  letter-spacing: 0.02em;
  line-height: 1.1;
  white-space: nowrap;
}

.target-reason {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 9, 7, 0.62);
  color: rgba(226, 210, 182, 0.7);
  font-size: 6.5px;
  letter-spacing: 0.04em;
}

.speech-box {
  margin-top: 12px;
}

.speech-box textarea {
  width: 100%;
  height: 76px;
  resize: none;
  padding: 10px 12px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  background: rgba(5, 9, 6, 0.6);
  color: rgba(241, 233, 217, 0.88);
  font-family: var(--sans);
  font-size: 10.5px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  outline: none;
  transition: border-color 0.3s var(--ease-out);
}

.speech-box textarea:focus {
  border-color: rgba(226, 195, 140, 0.5);
}

.speech-box textarea::placeholder {
  color: rgba(230, 220, 200, 0.26);
}

.speech-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  color: rgba(230, 220, 200, 0.24);
  font-size: 6.5px;
  letter-spacing: 0.08em;
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.quick {
  padding: 4px 7px;
  border: 1px solid rgba(224, 210, 180, 0.1);
  background: rgba(15, 21, 15, 0.4);
  color: rgba(231, 219, 197, 0.5);
  font-size: 7.5px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-align: left;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.quick:hover {
  color: rgba(241, 225, 196, 0.8);
  border-color: rgba(226, 195, 140, 0.28);
}

.witch-choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 12px;
}

.witch-option {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 52px;
  padding: 8px 10px;
  border: 1px solid rgba(155, 127, 168, 0.24);
  background: rgba(24, 18, 28, 0.4);
  text-align: left;
  transition: border-color 0.35s ease, background 0.35s ease;
}

.witch-option:hover:not(:disabled) {
  border-color: rgba(185, 158, 197, 0.5);
  background: rgba(37, 27, 42, 0.5);
}

.witch-option:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.witch-option.ghost {
  border-color: rgba(224, 210, 180, 0.1);
  background: rgba(8, 12, 9, 0.4);
}

.witch-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border: 1px solid rgba(155, 127, 168, 0.35);
  border-radius: 50%;
  font-family: var(--serif);
  font-size: 11px;
  color: rgba(190, 164, 202, 0.85);
}

.witch-glyph.poison {
  border-color: rgba(169, 85, 77, 0.4);
  color: rgba(208, 143, 133, 0.9);
}

.witch-option.ghost .witch-glyph {
  border-color: rgba(224, 210, 180, 0.16);
  color: rgba(230, 219, 198, 0.5);
}

.witch-option b {
  display: block;
  color: rgba(240, 231, 214, 0.85);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.witch-option small {
  display: block;
  margin-top: 3px;
  color: rgba(232, 222, 203, 0.38);
  font-size: 7px;
  line-height: 1.5;
  letter-spacing: 0.02em;
}

.dock-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.dock-ghost {
  height: 40px;
  padding: 0 13px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  background: transparent;
  color: rgba(230, 220, 200, 0.48);
  font-size: 8px;
  letter-spacing: 0.12em;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.dock-ghost:hover {
  color: rgba(242, 231, 211, 0.8);
  border-color: rgba(226, 195, 140, 0.3);
}

.dock-confirm {
  flex: 1;
  height: 40px;
}

.dock-confirm:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.dock-ai {
  flex: 0 0 auto;
  font-size: 8px;
  color: rgba(230, 220, 200, 0.36);
}

.idle-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.idle-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: 1px solid rgba(137, 163, 183, 0.2);
  border-radius: 50%;
  color: rgba(170, 194, 210, 0.7);
  background: rgba(12, 19, 22, 0.5);
}

.idle-orb.day {
  border-color: rgba(226, 195, 140, 0.28);
  color: rgba(234, 199, 137, 0.85);
  background: rgba(40, 32, 20, 0.4);
}

.idle-orb svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.idle-copy {
  min-width: 0;
  flex: 1;
}

.idle-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  color: rgba(240, 231, 214, 0.82);
  font-family: var(--serif);
  font-size: 13px;
  letter-spacing: 0.1em;
}

.idle-dots {
  display: inline-flex;
  gap: 2px;
}

.idle-dots i {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgba(231, 201, 145, 0.7);
  animation: dot 1.4s ease-in-out infinite;
}

.idle-dots i:nth-child(2) {
  animation-delay: 0.2s;
}
.idle-dots i:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dot {
  0%,
  100% {
    opacity: 0.2;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.idle-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.idle-chip {
  height: 31px;
  padding: 0 10px;
  border: 1px solid rgba(224, 210, 180, 0.13);
  background: rgba(10, 15, 11, 0.4);
  color: rgba(232, 222, 203, 0.45);
  font-size: 7.5px;
  letter-spacing: 0.1em;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.idle-chip.is-on {
  border-color: rgba(226, 195, 140, 0.4);
  color: rgba(235, 207, 151, 0.9);
}

.idle-result {
  height: 36px;
  padding: 0 16px;
}

.idle-note {
  color: rgba(230, 220, 200, 0.3);
  font-size: 8px;
  letter-spacing: 0.12em;
}


@media (min-width: 1280px) {
  .action-dock {
    left: auto;
    right: 18px;
    bottom: 22px;
    transform: none;
    width: 330px;
    min-width: 0;
    max-height: calc(100vh - 116px);
    overflow-y: auto;
    padding: 15px 15px 12px;
  }

  .action-dock.is-idle {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: min(600px, calc(100vw - 720px));
    min-width: 400px;
    max-height: none;
    overflow: visible;
  }

  .target-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .target {
    min-height: 47px;
  }

  .witch-choices {
    grid-template-columns: 1fr;
  }

  .speech-box textarea {
    height: 96px;
  }

  .dock-foot {
    flex-wrap: wrap;
  }

  .dock-confirm {
    order: -1;
    flex: 1 0 100%;
  }

  .dock-ai {
    margin-left: auto;
  }

  .dock-heading h2 {
    font-size: 18px;
  }
}

@media (max-width: 1279px) {
  .action-dock {
    left: 16px;
    right: 16px;
    width: auto;
    min-width: 0;
    transform: none;
  }

  .target-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 1020px) {
  .action-dock {
    width: calc(100vw - 32px);
    min-width: 0;
    left: 16px;
    transform: none;
    bottom: 16px;
  }
}

@media (max-width: 760px) {
  .action-dock {
    left: 10px;
    right: 10px;
    width: auto;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    padding: 13px 13px 11px;
    max-height: 56vh;
    overflow-y: auto;
  }
  .dock-heading h2 {
    font-size: 17px;
  }
  .dock-sub {
    font-size: 8.5px;
  }
  .target-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .target {
    min-height: 48px;
  }
  .witch-choices {
    grid-template-columns: 1fr;
  }
  .witch-option {
    min-height: 48px;
  }
  .quick-row {
    display: none;
  }
  .dock-foot {
    flex-wrap: wrap;
  }
  .dock-confirm {
    order: -1;
    flex: 1 0 100%;
  }
  .dock-ai {
    margin-left: auto;
  }
  .speech-box textarea {
    height: 64px;
  }
  .idle-title {
    font-size: 12px;
  }
}
</style>

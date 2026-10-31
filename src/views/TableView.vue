<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { GameController } from '@/game/controller';
import { pointFor } from '@/three/projection';
import { useAmbientAudio } from '@/composables/useAmbientAudio';
import SeatChip from '@/components/table/SeatChip.vue';
import GameLog from '@/components/table/GameLog.vue';
import RoleCard from '@/components/table/RoleCard.vue';
import ActionDock from '@/components/table/ActionDock.vue';
import PhaseBanner from '@/components/table/PhaseBanner.vue';
import ToastCard from '@/components/table/ToastCard.vue';
import RuleSheet from '@/components/ui/RuleSheet.vue';
import BrandMark from '@/components/ui/BrandMark.vue';
import RoleIcon from '@/components/ui/RoleIcon.vue';
import TravelerPortrait from '@/components/ui/TravelerPortrait.vue';
import AgentStatus from '@/components/ui/AgentStatus.vue';
import { checkAgentRuntime } from '@/game/agentClient';

const router = useRouter();
const store = useGameStore();
const { enabled, toggle, playCue } = useAmbientAudio();

let controller: GameController | null = null;
let resultTimer = 0;
let leaving = false;

const exitOpen = ref(false);
const rulesOpen = ref(false);
const logRef = ref<InstanceType<typeof GameLog> | null>(null);

const bots = computed(() => store.players.filter((player) => !player.isHuman).sort((a, b) => a.seat - b.seat));
const aliveCount = computed(() => store.aliveCount);

const phaseLabel = computed(() => {
  switch (store.phase) {
    case 'night':
      return `第 ${store.round} 夜 · 万物噤声`;
    case 'dawn':
      return `第 ${store.day} 天 · 天亮了`;
    case 'discussion':
      return `第 ${store.day} 天 · 依次发言`;
    case 'vote':
      return `第 ${store.day} 天 · 放逐投票`;
    case 'result':
      return '终局';
    default:
      return '暮林山舍';
  }
});

const seatName = (seat: number): string => {
  const player = store.players.find((item) => item.seat === seat);
  return player ? `${String(seat).padStart(2, '0')} ${player.character.name}` : `${seat} 号`;
};

const currentSpeech = computed(() => {
  if (!store.speakerSeat || !store.speaking) return null;
  const entry = [...store.logs].reverse().find((log) => log.kind === 'speech' && log.seat === store.speakerSeat);
  if (!entry) return null;
  const player = store.players.find((item) => item.seat === store.speakerSeat);
  return { text: entry.text, player, seat: store.speakerSeat };
});

function point(seat: number) {
  return pointFor(seat) ?? { x: -999, y: -999, visible: false };
}

function visibleSeat(seat: number): boolean {
  const p = pointFor(seat);
  if (!p || !p.visible) return false;
  return p.x > 20 && p.x < window.innerWidth - 20 && p.y > 66 && p.y < window.innerHeight - 8;
}

function toggleAutopilot() {
  store.setAutopilot(!store.autopilot);
}

function setSpeed(value: number) {
  store.setSpeed(value);
}

function toggleLog() {
  logRef.value?.toggle();
}

function goResult() {
  router.push('/result');
}

function requestExit() {
  exitOpen.value = true;
}

function cancelExit() {
  exitOpen.value = false;
}

function confirmExit() {
  exitOpen.value = false;
  leaving = true;
  controller?.abort();
  controller = null;
  store.reset();
  router.push('/');
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const typing = target && /input|textarea|select/i.test(target.tagName);
  if (event.key === 'Escape') {
    if (rulesOpen.value) rulesOpen.value = false;
    else if (exitOpen.value) exitOpen.value = false;
    return;
  }
  if (typing) return;
  if (event.key === 'l' || event.key === 'L') toggleLog();
  if (event.key === 'm' || event.key === 'M') void toggle();
}

watch(
  () => store.phase,
  (phase, previous) => {
    if (phase === previous) return;
    if (phase === 'night') playCue('night');
    if (phase === 'dawn') playCue('dawn');
    if (phase === 'vote') playCue('vote');
  },
);

watch(
  () => store.winner,
  (winner) => {
    if (!winner) return;
    playCue(winner.faction === 'good' ? 'win' : 'death');
    window.clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => {
      router.push('/result');
    }, 5200);
  },
);

onMounted(() => {
  void checkAgentRuntime();
  if (store.phase === 'result') {
    router.replace('/result');
    return;
  }
  if (store.phase === 'reveal') {
    router.replace('/reveal');
    return;
  }
  controller = new GameController(store);
  void controller.run();
  window.addEventListener('keydown', onKey);
  playCue('night');
});

onBeforeUnmount(() => {
  window.clearTimeout(resultTimer);
  window.removeEventListener('keydown', onKey);
  controller?.abort();
  controller = null;
  if (!leaving && store.phase !== 'result') {
    store.reset();
  }
});
</script>

<template>
  <section class="view table-view">
    <header class="table-top">
      <div class="table-brand">
        <span class="table-mark"><BrandMark :size="27" /></span>
        <span class="table-brand-copy">
          <span class="table-brand-cn">暮林夜话</span>
          <span class="table-brand-en">MULIN NIGHTFALL</span>
        </span>
        <span class="table-phase-pill">
          <i :class="{ day: store.phase !== 'night' }"></i>
          {{ phaseLabel }}
        </span>
      </div>

      <div class="table-center" aria-hidden="true">
        <span>THE TABLE · NINE SEATS</span>
        <i></i>
        <span>暮林山舍 · 18:42</span>
      </div>

      <div class="table-controls">
        <AgentStatus compact class="table-agent" />
        <span class="alive-pill"><i></i>{{ aliveCount }} 在场</span>
        <button class="ctrl" type="button" :class="{ 'is-on': store.autopilot }" @click="toggleAutopilot">
          <span class="ai-mark">AI</span>
          <span class="ctrl-label">{{ store.autopilot ? '托管中' : '托管' }}</span>
        </button>
        <div class="speed-group" role="group" aria-label="游戏速度">
          <button v-for="value in [1, 2, 3]" :key="value" type="button" :class="{ 'is-on': store.speed === value }" @click="setSpeed(value)">
            {{ value }}×
          </button>
        </div>
        <button class="ctrl icon-ctrl" type="button" :class="{ 'is-on': enabled }" :aria-label="enabled ? '关闭环境声' : '开启环境声'" @click="toggle">
          <svg v-if="enabled" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m17 9 4 6M21 9l-4 6" /></svg>
        </button>
        <button class="ctrl icon-ctrl" type="button" aria-label="夜话记录" @click="toggleLog">
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h13" /></svg>
        </button>
        <button class="ctrl icon-ctrl" type="button" aria-label="查看规则" @click="rulesOpen = true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2" /><path d="M9.7 9.4a2.4 2.4 0 1 1 3.5 2.1c-.8.5-1.2 1-1.2 2M12 16.6h.01" /></svg>
        </button>
        <button class="exit-link" type="button" @click="requestExit">离开</button>
      </div>
    </header>

    <div class="mobile-role" :class="{ dead: !store.humanAlive }">
      <RoleIcon :role="store.humanRole" :size="14" />
      <b>{{ store.humanMeta.name }}</b>
      <span>{{ store.humanAlive ? '在场' : '出局' }}</span>
    </div>

    <Transition name="speech">
      <div v-if="currentSpeech" class="speech-ribbon">
        <TravelerPortrait v-if="currentSpeech.player" :character="currentSpeech.player.character" :size="26" />
        <div class="speech-ribbon-body">
          <p class="speech-ribbon-who">
            <b>{{ seatName(currentSpeech.seat) }}</b>
            <span>正在发言</span>
          </p>
          <p class="speech-ribbon-text">{{ currentSpeech.text }}</p>
        </div>
        <span class="speech-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>
    </Transition>

    <div class="seat-layer" aria-label="牌桌上的旅人">
      <SeatChip
        v-for="player in bots"
        :key="player.seat"
        :player="player"
        :point="point(player.seat)"
        :visible="visibleSeat(player.seat)"
      />
    </div>

    <GameLog ref="logRef" />
    <RoleCard />
    <ActionDock />
    <PhaseBanner />
    <ToastCard />

    <div class="table-signature" aria-hidden="true">
      <span>TABLE 01</span>
      <i></i>
      <span>NINE SEATS · ONE WOLF AT HEART</span>
    </div>

    <RuleSheet v-model:open="rulesOpen" />

    <Transition name="fade">
      <div v-if="exitOpen" class="exit-modal" role="dialog" aria-modal="true" aria-label="离开牌桌">
        <div class="exit-backdrop" @click="cancelExit"></div>
        <div class="exit-card panel">
          <p class="eyebrow">LEAVE THE TABLE</p>
          <h2 class="serif">离开牌桌？</h2>
          <p class="exit-copy">炉火还没有熄。离开之后，这一局的进度会消失，旅人们会留在原地。</p>
          <div class="exit-actions">
            <button class="btn" type="button" @click="cancelExit">继续这局</button>
            <button class="btn btn--cta" type="button" @click="confirmExit"><span class="dot"></span>离开山舍<span class="arrow">→</span></button>
          </div>
        </div>
      </div>
    </Transition>

    <button v-if="store.winner" class="result-jump" type="button" @click="goResult">终局 · 查看结果 <span>→</span></button>
  </section>
</template>

<style scoped>
.table-view {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.table-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 26;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(14px, 2vw, 24px) clamp(18px, 2.8vw, 38px);
  background: linear-gradient(180deg, rgba(4, 8, 5, 0.6) 0%, rgba(4, 8, 5, 0) 100%);
}

.table-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.table-mark {
  width: 27px;
  height: 27px;
  color: var(--gold);
  opacity: 0.85;
}

.table-brand-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.table-brand-cn {
  font-family: var(--serif);
  font-size: 12px;
  letter-spacing: 0.28em;
  color: rgba(242, 234, 218, 0.85);
  white-space: nowrap;
}

.table-brand-en {
  font-size: 6px;
  letter-spacing: 0.26em;
  color: rgba(236, 226, 205, 0.35);
  white-space: nowrap;
}

.table-phase-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  padding: 5px 9px;
  border: 1px solid rgba(224, 210, 180, 0.12);
  color: rgba(232, 222, 203, 0.55);
  font-size: 7.5px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.table-phase-pill i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #8ea9bf;
  box-shadow: 0 0 8px rgba(142, 169, 191, 0.6);
}

.table-phase-pill i.day {
  background: var(--gold-bright);
  box-shadow: 0 0 8px rgba(231, 201, 145, 0.6);
}

.table-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(230, 219, 198, 0.25);
  font-size: 6.5px;
  letter-spacing: 0.2em;
  white-space: nowrap;
}

.table-center i {
  width: 24px;
  height: 1px;
  background: rgba(230, 219, 198, 0.16);
}

.table-agent {
  margin-right: 4px;
}

.table-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
}

.alive-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid rgba(224, 210, 180, 0.11);
  color: rgba(230, 219, 198, 0.55);
  font-size: 7.5px;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.alive-pill i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #a9c1a4;
}

.ctrl {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid rgba(224, 210, 180, 0.11);
  background: rgba(8, 13, 10, 0.3);
  color: rgba(230, 220, 200, 0.5);
  font-size: 7.5px;
  letter-spacing: 0.08em;
  transition: color 0.3s ease, border-color 0.3s ease, background 0.3s ease;
}

.ctrl:hover {
  color: rgba(242, 231, 211, 0.85);
  border-color: rgba(226, 195, 140, 0.3);
}

.ctrl.is-on {
  color: rgba(235, 207, 151, 0.9);
  border-color: rgba(226, 195, 140, 0.38);
  background: rgba(44, 37, 23, 0.4);
}

.ai-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 15px;
  border: 1px solid rgba(226, 195, 140, 0.3);
  font-size: 6px;
  letter-spacing: 0.02em;
  color: rgba(231, 201, 145, 0.8);
}

.icon-ctrl {
  width: 30px;
  padding: 0;
}

.icon-ctrl svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.speed-group {
  display: flex;
  align-items: center;
  height: 30px;
  border: 1px solid rgba(224, 210, 180, 0.11);
  overflow: hidden;
}

.speed-group button {
  height: 100%;
  padding: 0 7px;
  border: 0;
  border-right: 1px solid rgba(224, 210, 180, 0.08);
  background: rgba(8, 13, 10, 0.3);
  color: rgba(230, 220, 200, 0.38);
  font-size: 7px;
  letter-spacing: 0.02em;
}

.speed-group button:last-child {
  border-right: 0;
}

.speed-group button.is-on {
  background: rgba(44, 37, 23, 0.55);
  color: rgba(235, 207, 151, 0.9);
}

.exit-link {
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(224, 210, 180, 0.1);
  background: transparent;
  color: rgba(230, 220, 200, 0.38);
  font-size: 7.5px;
  letter-spacing: 0.12em;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.exit-link:hover {
  color: rgba(216, 154, 144, 0.85);
  border-color: rgba(169, 85, 77, 0.35);
}

.mobile-role {
  display: none;
}

.speech-ribbon {
  position: fixed;
  left: 50%;
  top: clamp(72px, 9vh, 92px);
  z-index: 23;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: min(620px, 62vw);
  padding: 10px 13px;
  border: 1px solid rgba(224, 210, 180, 0.13);
  border-left: 2px solid rgba(226, 195, 140, 0.45);
  background: rgba(9, 14, 11, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transform: translateX(-50%);
  pointer-events: none;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
}

.speech-ribbon-body {
  min-width: 0;
  flex: 1;
}

.speech-ribbon-who {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.speech-ribbon-who b {
  color: rgba(238, 214, 169, 0.85);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.speech-ribbon-who span {
  color: rgba(230, 220, 200, 0.28);
  font-size: 6px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.speech-ribbon-text {
  margin-top: 3px;
  color: rgba(240, 232, 216, 0.78);
  font-family: var(--serif);
  font-size: 10px;
  line-height: 1.7;
  letter-spacing: 0.04em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.speech-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
  padding-top: 2px;
}

.speech-bars i {
  width: 1px;
  height: 4px;
  background: var(--gold-bright);
  animation: ribbon-bar 1s ease-in-out infinite;
}

.speech-bars i:nth-child(2) {
  animation-delay: 0.15s;
}
.speech-bars i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes ribbon-bar {
  0%,
  100% {
    height: 4px;
    opacity: 0.4;
  }
  50% {
    height: 10px;
    opacity: 0.9;
  }
}

.seat-layer {
  position: fixed;
  inset: 0;
  z-index: 8;
  pointer-events: none;
}

.table-signature {
  position: fixed;
  right: clamp(16px, 2.2vw, 30px);
  bottom: clamp(150px, 20vh, 200px);
  display: flex;
  align-items: center;
  gap: 10px;
  writing-mode: vertical-rl;
  color: rgba(230, 219, 198, 0.18);
  font-size: 6px;
  letter-spacing: 0.22em;
  pointer-events: none;
}

.table-signature i {
  width: 1px;
  height: 34px;
  background: linear-gradient(180deg, rgba(230, 219, 198, 0.2), transparent);
}

.exit-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-sheet);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  pointer-events: auto;
}

.exit-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(3, 6, 4, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.exit-card {
  position: relative;
  width: min(420px, 100%);
  padding: 28px;
  background: linear-gradient(155deg, rgba(18, 26, 19, 0.98), rgba(8, 12, 9, 0.99));
}

.exit-card h2 {
  margin-top: 12px;
  font-size: 30px;
  font-weight: 400;
  letter-spacing: 0.14em;
  color: #f1e8d6;
}

.exit-copy {
  margin-top: 14px;
  color: var(--ink-mute);
  font-size: 11px;
  line-height: 2;
  letter-spacing: 0.04em;
}

.exit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.result-jump {
  position: fixed;
  right: 30px;
  bottom: 30px;
  z-index: 35;
  height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(238, 204, 145, 0.45);
  background: rgba(45, 37, 22, 0.75);
  color: rgba(243, 223, 184, 0.92);
  font-size: 9px;
  letter-spacing: 0.14em;
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

.result-jump span {
  margin-left: 7px;
  color: var(--gold-bright);
}

.speech-enter-active,
.speech-leave-active {
  transition: opacity 0.4s var(--ease-out), transform 0.45s var(--ease-out);
}
.speech-enter-from,
.speech-leave-to {
  opacity: 0;
  transform: translate(-50%, -7px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1180px) {
  .table-center {
    display: none;
  }
  .ctrl-label {
    display: none;
  }
}

@media (max-width: 1180px) {
  .table-agent {
    display: none;
  }
}

@media (max-width: 1020px) {
  .table-phase-pill {
    display: none;
  }
  .speed-group {
    display: none;
  }
  .table-controls .icon-ctrl[aria-label="夜话记录"] {
    display: none;
  }
  .table-signature {
    display: none;
  }
}


@media (max-width: 1279px) {
  .mobile-role {
    position: fixed;
    left: 18px;
    top: 58px;
    z-index: 25;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 8px;
    border: 1px solid rgba(226, 195, 140, 0.22);
    background: rgba(9, 14, 11, 0.72);
    color: rgba(231, 201, 145, 0.8);
    font-size: 7px;
    letter-spacing: 0.1em;
    pointer-events: none;
  }
  .mobile-role b {
    font-weight: 500;
    color: rgba(240, 231, 214, 0.8);
  }
  .mobile-role span {
    color: rgba(230, 220, 200, 0.35);
  }
  .mobile-role.dead {
    border-color: rgba(169, 85, 77, 0.35);
    filter: grayscale(0.5);
  }
}

@media (max-width: 760px) {
  .table-top {
    padding: 12px 12px 0;
    gap: 8px;
  }
  .table-mark {
    width: 23px;
    height: 23px;
  }
  .table-brand-cn {
    font-size: 11px;
    letter-spacing: 0.2em;
  }
  .table-brand-en {
    display: none;
  }
  .alive-pill {
    display: none;
  }
  .exit-link {
    padding: 0 7px;
  }
  .ctrl {
    height: 29px;
  }
  .icon-ctrl {
    width: 29px;
  }
  .mobile-role {
    position: fixed;
    left: 12px;
    top: 54px;
    z-index: 25;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 25px;
    padding: 0 8px;
    border: 1px solid rgba(226, 195, 140, 0.24);
    background: rgba(9, 14, 11, 0.75);
    color: rgba(231, 201, 145, 0.8);
    font-size: 7px;
    letter-spacing: 0.1em;
    pointer-events: none;
  }
  .mobile-role b {
    font-weight: 500;
    color: rgba(240, 231, 214, 0.8);
  }
  .mobile-role span {
    color: rgba(230, 220, 200, 0.35);
  }
  .mobile-role.dead {
    border-color: rgba(169, 85, 77, 0.35);
    filter: grayscale(0.5);
  }
  .speech-ribbon {
    top: 86px;
    width: calc(100vw - 24px);
    padding: 8px 10px;
  }
  .speech-ribbon-text {
    font-size: 9px;
  }
  .result-jump {
    right: 12px;
    bottom: 86px;
    height: 36px;
    font-size: 8px;
  }
}
</style>

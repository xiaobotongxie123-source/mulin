<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { ROLE_META } from '@/data/roles';
import { useAmbientAudio } from '@/composables/useAmbientAudio';
import type { Player } from '@/game/types';
import BrandMark from '@/components/ui/BrandMark.vue';
import TravelerPortrait from '@/components/ui/TravelerPortrait.vue';
import RoleIcon from '@/components/ui/RoleIcon.vue';

const router = useRouter();
const store = useGameStore();
const { enabled, toggle } = useAmbientAudio();

const logOpen = ref(false);

const winner = computed(() => store.winner);
const isWolfWin = computed(() => winner.value?.faction === 'wolf');
const humanWon = computed(() => Boolean(winner.value && winner.value.faction === store.humanMeta.faction));
const title = computed(() => (isWolfWin.value ? '长夜' : '破晓'));
const english = computed(() => (isWolfWin.value ? 'THE LONG NIGHT' : 'DAYBREAK'));
const factionLine = computed(() => (isWolfWin.value ? '狼人阵营胜利' : '好人阵营胜利'));

const outcome = computed(() => {
  if (!winner.value) return '';
  if (humanWon.value) {
    return store.humanAlive ? '你活到了最后。山舍记住了你的名字。' : '你没有走到最后，但你的阵营赢了。';
  }
  if (store.humanMeta.faction === 'wolf') return '狼群倒在了天亮之前。你没能把长夜留得更久。';
  return '你没能走出这个夜晚。门外的雾，天亮时才散。';
});

const stats = computed(() => [
  { value: store.stats.nights, label: '夜晚', en: 'NIGHTS' },
  { value: store.stats.executions, label: '放逐', en: 'EXILES' },
  { value: store.stats.checks, label: '查验', en: 'CHECKS' },
  { value: store.aliveCount, label: '存活', en: 'SURVIVORS' },
]);

const roster = computed(() => [...store.players].sort((a, b) => a.seat - b.seat));

const motes = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37 + 9) % 100}%`,
  delay: `-${((index * 1.7) % 13).toFixed(1)}s`,
  duration: `${11 + (index % 5) * 2.4}s`,
  size: `${2 + (index % 3)}px`,
  opacity: 0.18 + (index % 4) * 0.1,
}));

function metaFor(player: Player) {
  return ROLE_META[player.role];
}

function causeLabel(player: Player): string {
  if (player.alive) return '活到了终局';
  switch (player.deathCause) {
    case 'wolf':
      return '夜间遇袭';
    case 'poison':
      return '毒发身亡';
    case 'vote':
      return '被放逐';
    default:
      return '出局';
  }
}

function rematch() {
  store.newGame();
  router.push('/reveal');
}

function goHome() {
  store.reset();
  router.push('/');
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && logOpen.value) logOpen.value = false;
}

onMounted(() => {
  if (!store.winner) {
    router.replace('/lobby');
    return;
  }
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <section v-if="winner" class="view result-view" :class="{ 'is-wolf': isWolfWin }">
    <div class="result-bg" aria-hidden="true"></div>
    <div class="motes" aria-hidden="true">
      <span
        v-for="(mote, index) in motes"
        :key="index"
        class="mote"
        :style="{
          left: mote.left,
          animationDelay: mote.delay,
          animationDuration: mote.duration,
          width: mote.size,
          height: mote.size,
          opacity: mote.opacity,
        }"
      ></span>
    </div>

    <header class="result-top">
      <div class="result-brand">
        <BrandMark :size="26" />
        <span class="result-brand-cn">暮林夜话</span>
        <span class="result-brand-divider"></span>
        <span class="result-brand-tag">终局 · FINALE</span>
      </div>
      <div class="result-top-actions">
        <button class="round-btn" type="button" :aria-label="enabled ? '关闭环境声' : '开启环境声'" @click="toggle">
          <svg v-if="enabled" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m17 9 4 6M21 9l-4 6" /></svg>
        </button>
        <button class="result-home" type="button" @click="goHome">回到山舍</button>
      </div>
    </header>

    <div class="result-shell">
      <div class="result-main">
        <div class="result-copy">
          <p class="result-eyebrow"><span></span> THE NIGHT IS OVER <span></span></p>
          <h1 class="serif">{{ title }}</h1>
          <p class="result-en">{{ english }}</p>
          <div class="result-faction">
            <i></i>
            <span>{{ factionLine }}</span>
            <i></i>
          </div>
          <p class="result-reason">{{ winner.reason }}</p>
          <p class="result-outcome">{{ outcome }}</p>

          <div class="result-stats">
            <div v-for="item in stats" :key="item.en" class="result-stat">
              <b class="serif">{{ String(item.value).padStart(2, '0') }}</b>
              <span>{{ item.label }}</span>
              <small>{{ item.en }}</small>
            </div>
          </div>

          <div class="result-actions">
            <button class="btn btn--cta result-again" type="button" @click="rematch">
              <span class="dot"></span>
              <span>再来一局</span>
              <span class="arrow">→</span>
            </button>
            <button class="btn result-ghost" type="button" @click="goHome">回到山舍</button>
            <button class="result-log-link text-link" type="button" @click="logOpen = true">查看本局记录</button>
          </div>
        </div>

        <aside class="roster">
          <header class="roster-head">
            <div>
              <p class="eyebrow">THE NINE · 身份揭晓</p>
              <h2 class="serif">九位旅人</h2>
            </div>
            <span class="roster-count">{{ store.aliveCount }} / 9 存活</span>
          </header>

          <div class="roster-grid">
            <article
              v-for="player in roster"
              :key="player.seat"
              class="roster-card"
              :class="{ 'is-dead': !player.alive, 'is-wolf': player.role === 'werewolf', 'is-human': player.isHuman }"
              :style="{ '--role': metaFor(player).color }"
            >
              <div class="roster-top">
                <span class="roster-seat">{{ String(player.seat).padStart(2, '0') }}</span>
                <span v-if="player.isHuman" class="roster-you">YOU</span>
                <span class="roster-state" :class="{ dead: !player.alive }">{{ player.alive ? '存活' : '出局' }}</span>
              </div>
              <div class="roster-person">
                <TravelerPortrait :character="player.character" :size="38" :dimmed="!player.alive" />
                <div class="roster-names">
                  <b class="serif">{{ player.character.name }}</b>
                  <span class="roster-role" :style="{ color: metaFor(player).color }">
                    <RoleIcon :role="player.role" :size="12" />
                    {{ metaFor(player).name }}
                  </span>
                </div>
              </div>
              <p class="roster-cause">{{ causeLabel(player) }}</p>
              <span v-if="player.role === 'werewolf'" class="roster-fang" aria-hidden="true">狼</span>
            </article>
          </div>

          <footer class="roster-foot">
            <span class="roster-dot"></span>
            <span>{{ winner.faction === 'good' ? '所有狼人已出局。' : '狼人完成了屠边。' }} 身份已全部公开。</span>
          </footer>
        </aside>
      </div>

      <footer class="result-foot">
        <p class="serif">{{ isWolfWin ? '门没有开。炉火将烧到下一个黄昏。' : '门开了。林间的雾正在退。' }}</p>
        <span>暮林山舍 · MULIN NIGHTFALL · 09 SEATS</span>
      </footer>
    </div>

    <Transition name="fade">
      <div v-if="logOpen" class="log-modal" role="dialog" aria-modal="true" aria-label="本局记录">
        <div class="log-backdrop" @click="logOpen = false"></div>
        <div class="log-sheet">
          <header class="log-sheet-head">
            <div>
              <p class="eyebrow">THE NIGHT LOG · 本局记录</p>
              <h2 class="serif">山舍夜话</h2>
            </div>
            <button class="log-close" type="button" aria-label="关闭记录" @click="logOpen = false">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </header>
          <div class="log-sheet-list">
            <div v-for="entry in store.logs" :key="entry.id" class="log-line" :class="`kind-${entry.kind}`">
              <span class="log-mark">{{ entry.kind === 'night' ? '☾' : entry.kind === 'speech' ? '“' : entry.kind === 'private' ? '⌑' : '·' }}</span>
              <p>{{ entry.text }}</p>
            </div>
          </div>
          <footer class="log-sheet-foot">
            <span>{{ store.logs.length }} 条记录</span>
            <span>{{ store.seed }}</span>
          </footer>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.result-view {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
  color: var(--ink);
  scrollbar-width: thin;
  scrollbar-color: rgba(212, 178, 122, 0.24) transparent;
}

.result-bg {
  position: fixed;
  inset: 0;
  z-index: -2;
  background:
    linear-gradient(90deg, rgba(4, 8, 5, 0.92) 0%, rgba(4, 8, 5, 0.7) 38%, rgba(4, 8, 5, 0.32) 68%, rgba(4, 8, 5, 0.55) 100%),
    radial-gradient(circle at 68% 42%, rgba(231, 201, 145, 0.1), transparent 55%);
  pointer-events: none;
}

.is-wolf .result-bg {
  background:
    linear-gradient(90deg, rgba(6, 6, 5, 0.94) 0%, rgba(6, 6, 5, 0.76) 38%, rgba(6, 6, 5, 0.3) 68%, rgba(6, 6, 5, 0.55) 100%),
    radial-gradient(circle at 68% 42%, rgba(169, 85, 77, 0.14), transparent 55%);
}

.motes {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.mote {
  position: absolute;
  bottom: -10px;
  border-radius: 50%;
  background: var(--gold-bright);
  box-shadow: 0 0 8px rgba(231, 201, 145, 0.7);
  animation: mote-rise linear infinite;
}

.is-wolf .mote {
  background: #c17a70;
  box-shadow: 0 0 8px rgba(169, 85, 77, 0.7);
}

@keyframes mote-rise {
  0% {
    transform: translate3d(0, 0, 0) scale(0.7);
    opacity: 0;
  }
  12% {
    opacity: 0.6;
  }
  70% {
    opacity: 0.45;
  }
  100% {
    transform: translate3d(24px, -105vh, 0) scale(1);
    opacity: 0;
  }
}

.result-top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px clamp(24px, 4vw, 58px);
}

.result-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
}

.result-brand-cn {
  font-family: var(--serif);
  font-size: 12px;
  letter-spacing: 0.26em;
  color: rgba(242, 234, 218, 0.85);
  white-space: nowrap;
}

.result-brand-divider {
  width: 1px;
  height: 11px;
  margin: 0 4px;
  background: rgba(224, 210, 180, 0.2);
}

.result-brand-tag {
  font-size: 6.5px;
  letter-spacing: 0.2em;
  color: rgba(230, 220, 200, 0.35);
  white-space: nowrap;
}

.result-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.round-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  border-radius: 50%;
  background: rgba(8, 12, 9, 0.45);
  color: rgba(232, 222, 203, 0.55);
}

.round-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-linecap: round;
}

.result-home {
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  background: rgba(8, 12, 9, 0.35);
  color: rgba(232, 222, 203, 0.55);
  font-size: 7.5px;
  letter-spacing: 0.14em;
  transition: color 0.3s ease, border-color 0.3s ease;
}

.result-home:hover {
  color: rgba(242, 231, 211, 0.85);
  border-color: rgba(226, 195, 140, 0.3);
}

.result-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 84px);
  max-width: 1440px;
  margin: 0 auto;
  padding: clamp(18px, 3vh, 40px) clamp(24px, 4.6vw, 68px) 0;
}

.result-main {
  display: grid;
  grid-template-columns: minmax(360px, 0.86fr) minmax(520px, 1.14fr);
  gap: clamp(34px, 5vw, 88px);
  align-items: center;
  flex: 1;
}

.result-copy {
  padding-top: 4vh;
  animation: result-rise 1.1s var(--ease-out) both;
}

@keyframes result-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.result-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(225, 205, 166, 0.45);
  font-size: 7px;
  letter-spacing: 0.28em;
}

.result-eyebrow span {
  width: 22px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(225, 205, 166, 0.4));
}

.result-eyebrow span:last-child {
  background: linear-gradient(90deg, rgba(225, 205, 166, 0.4), transparent);
}

.result-copy h1 {
  margin-top: 14px;
  font-size: clamp(74px, 9vw, 132px);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: 0.14em;
  color: #f4ecdb;
  text-shadow: 0 0 60px rgba(231, 201, 145, 0.16), 0 4px 30px rgba(0, 0, 0, 0.5);
}

.is-wolf .result-copy h1 {
  color: #ead9ce;
  text-shadow: 0 0 60px rgba(169, 85, 77, 0.24), 0 4px 30px rgba(0, 0, 0, 0.55);
}

.result-en {
  margin-top: 10px;
  color: rgba(225, 205, 166, 0.45);
  font-family: var(--serif);
  font-size: 10px;
  letter-spacing: 0.46em;
}

.result-faction {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  color: rgba(231, 201, 145, 0.8);
  font-size: 8px;
  letter-spacing: 0.22em;
}

.result-faction i {
  width: 18px;
  height: 1px;
  background: rgba(225, 205, 166, 0.28);
}

.is-wolf .result-faction {
  color: rgba(206, 141, 131, 0.9);
}

.result-reason {
  max-width: 420px;
  margin-top: 18px;
  color: rgba(235, 226, 209, 0.66);
  font-family: var(--serif);
  font-size: 14px;
  line-height: 2;
  letter-spacing: 0.06em;
}

.result-outcome {
  max-width: 420px;
  margin-top: 10px;
  color: rgba(230, 220, 200, 0.42);
  font-size: 9.5px;
  line-height: 1.9;
  letter-spacing: 0.04em;
}

.result-stats {
  display: flex;
  gap: clamp(18px, 2.6vw, 38px);
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid rgba(224, 210, 180, 0.1);
  max-width: 420px;
}

.result-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-stat b {
  font-size: 26px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.04em;
  color: rgba(242, 232, 213, 0.9);
  font-variant-numeric: tabular-nums;
}

.result-stat span {
  margin-top: 5px;
  color: rgba(230, 220, 200, 0.55);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.result-stat small {
  color: rgba(230, 220, 200, 0.22);
  font-size: 5.5px;
  letter-spacing: 0.16em;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
}

.result-again {
  height: 46px;
  padding: 0 20px;
}

.result-ghost {
  height: 46px;
  padding: 0 16px;
  color: rgba(232, 222, 203, 0.6);
  border-color: rgba(224, 210, 180, 0.16);
  background: rgba(8, 12, 9, 0.3);
}

.result-log-link {
  margin-left: 6px;
  font-size: 8px;
  color: rgba(230, 220, 200, 0.4);
}

.roster {
  border: 1px solid rgba(224, 210, 180, 0.12);
  background: rgba(7, 11, 8, 0.52);
  backdrop-filter: blur(18px) saturate(1.05);
  -webkit-backdrop-filter: blur(18px) saturate(1.05);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.3);
  animation: roster-rise 1.15s 0.12s var(--ease-out) both;
}

@keyframes roster-rise {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.roster-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(224, 210, 180, 0.08);
}

.roster-head h2 {
  margin-top: 7px;
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: rgba(242, 234, 218, 0.9);
}

.roster-count {
  margin-top: 2px;
  color: rgba(230, 220, 200, 0.35);
  font-size: 7px;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: rgba(224, 210, 180, 0.06);
  padding: 1px;
}

.roster-card {
  position: relative;
  min-height: 108px;
  padding: 10px 11px 9px;
  background: rgba(8, 13, 10, 0.82);
  overflow: hidden;
  transition: background 0.35s ease;
}

.roster-card.is-wolf {
  background: linear-gradient(155deg, rgba(31, 16, 15, 0.75), rgba(9, 12, 9, 0.88));
}

.roster-card.is-human {
  box-shadow: inset 0 0 0 1px rgba(226, 195, 140, 0.3);
}

.roster-card.is-dead {
  filter: saturate(0.45);
}

.roster-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.roster-seat {
  color: rgba(222, 199, 158, 0.5);
  font-size: 7px;
  letter-spacing: 0.16em;
  font-variant-numeric: tabular-nums;
}

.roster-you {
  padding: 1px 4px;
  border: 1px solid rgba(226, 195, 140, 0.4);
  color: rgba(231, 201, 145, 0.85);
  font-size: 5.5px;
  letter-spacing: 0.1em;
}

.roster-state {
  margin-left: auto;
  color: rgba(169, 193, 164, 0.7);
  font-size: 6px;
  letter-spacing: 0.1em;
}

.roster-state.dead {
  color: rgba(206, 141, 131, 0.65);
}

.roster-person {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
}

.roster-names {
  min-width: 0;
}

.roster-names b {
  display: block;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.1em;
  color: rgba(243, 235, 219, 0.9);
  white-space: nowrap;
}

.roster-role {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 7.5px;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.roster-cause {
  margin-top: 7px;
  color: rgba(230, 220, 200, 0.28);
  font-size: 6.5px;
  letter-spacing: 0.04em;
}

.roster-card.is-wolf .roster-cause {
  color: rgba(206, 141, 131, 0.45);
}

.roster-fang {
  position: absolute;
  right: -9px;
  bottom: -12px;
  font-family: var(--serif);
  font-size: 42px;
  line-height: 1;
  color: rgba(169, 85, 77, 0.1);
  pointer-events: none;
}

.roster-foot {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border-top: 1px solid rgba(224, 210, 180, 0.07);
  color: rgba(230, 220, 200, 0.26);
  font-size: 6.5px;
  letter-spacing: 0.06em;
}

.roster-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(212, 178, 122, 0.42);
}

.result-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 3vh;
  padding: 18px 0 22px;
  border-top: 1px solid rgba(224, 210, 180, 0.08);
}

.result-foot p {
  color: rgba(235, 226, 209, 0.38);
  font-size: 10px;
  letter-spacing: 0.12em;
}

.result-foot span {
  color: rgba(230, 219, 198, 0.18);
  font-size: 6px;
  letter-spacing: 0.2em;
}

.log-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.log-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(3, 6, 4, 0.72);
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
}

.log-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(760px, 94vw);
  max-height: 78vh;
  border: 1px solid rgba(224, 210, 180, 0.16);
  background: linear-gradient(155deg, rgba(17, 24, 18, 0.98), rgba(7, 11, 8, 0.99));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
}

.log-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 22px 15px;
  border-bottom: 1px solid rgba(224, 210, 180, 0.09);
}

.log-sheet-head h2 {
  margin-top: 7px;
  font-size: 24px;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: rgba(242, 234, 218, 0.9);
}

.log-close {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(224, 210, 180, 0.12);
  background: transparent;
  color: rgba(232, 222, 203, 0.5);
}

.log-close svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  stroke-linecap: round;
}

.log-sheet-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 22px 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(212, 178, 122, 0.22) transparent;
}

.log-line {
  display: flex;
  gap: 9px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(224, 210, 180, 0.035);
}

.log-mark {
  flex: 0 0 auto;
  width: 10px;
  color: rgba(212, 178, 122, 0.42);
  font-size: 8px;
  line-height: 1.8;
  text-align: center;
}

.log-line p {
  color: rgba(232, 223, 205, 0.58);
  font-size: 9.5px;
  line-height: 1.85;
  letter-spacing: 0.03em;
}

.log-line.kind-speech p {
  color: rgba(240, 232, 216, 0.78);
}

.log-line.kind-private p {
  color: rgba(232, 211, 174, 0.7);
}

.log-line.kind-death p {
  color: rgba(206, 153, 143, 0.78);
}

.log-sheet-foot {
  display: flex;
  justify-content: space-between;
  padding: 10px 22px;
  border-top: 1px solid rgba(224, 210, 180, 0.07);
  color: rgba(230, 220, 200, 0.22);
  font-size: 6.5px;
  letter-spacing: 0.08em;
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
  .result-main {
    grid-template-columns: minmax(320px, 0.9fr) minmax(450px, 1.1fr);
    gap: 30px;
  }
  .result-copy h1 {
    font-size: clamp(64px, 8vw, 96px);
  }
  .roster-card {
    min-height: 100px;
    padding: 9px;
  }
}

@media (max-width: 980px) {
  .result-view {
    overflow-y: auto;
  }
  .result-shell {
    min-height: auto;
    padding: 88px 20px 0;
  }
  .result-top {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 5;
    padding: 16px 18px;
    background: linear-gradient(180deg, rgba(4, 8, 5, 0.85), transparent);
  }
  .result-main {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .result-copy {
    padding-top: 2vh;
  }
  .result-copy h1 {
    font-size: 72px;
  }
  .result-reason,
  .result-outcome,
  .result-stats {
    max-width: none;
  }
  .result-stats {
    max-width: 520px;
  }
  .result-foot {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-top: 22px;
  }
}

@media (max-width: 620px) {
  .result-brand-en,
  .result-brand-divider,
  .result-brand-tag {
    display: none;
  }
  .result-copy h1 {
    font-size: clamp(52px, 16vw, 72px);
  }
  .result-en {
    font-size: 8px;
    letter-spacing: 0.32em;
  }
  .result-reason {
    font-size: 12px;
  }
  .result-stats {
    gap: 18px;
  }
  .result-stat b {
    font-size: 22px;
  }
  .result-actions {
    gap: 8px;
  }
  .result-again,
  .result-ghost {
    height: 42px;
  }
  .result-log-link {
    flex: 1 0 100%;
    margin-left: 0;
  }
  .roster-head {
    padding: 14px 13px 11px;
  }
  .roster-head h2 {
    font-size: 18px;
  }
  .roster-card {
    min-height: 92px;
    padding: 8px 7px;
  }
  .roster-person {
    gap: 6px;
  }
  .roster-names b {
    font-size: 11px;
  }
  .roster-role {
    font-size: 6.5px;
  }
  .roster-cause {
    font-size: 6px;
  }
  .roster-foot {
    padding: 8px 12px;
  }
  .log-modal {
    padding: 10px;
  }
  .log-sheet {
    max-height: 88vh;
  }
}
</style>

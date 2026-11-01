<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useGameStore } from '@/stores/game';
import type { LogEntry } from '@/game/types';

const store = useGameStore();
const list = ref<HTMLElement | null>(null);
const collapsed = ref(false);

const entries = computed(() => store.logs.filter((entry) => entry.revealed !== false).slice(-120));

function playerName(seat?: number): string {
  if (!seat) return '';
  const player = store.players.find((item) => item.seat === seat);
  return player ? `${String(seat).padStart(2, '0')} ${player.character.name}` : `${seat} 号`;
}

const glyphs: Record<LogEntry['kind'], string> = {
  system: '✦',
  public: '◇',
  private: '⌑',
  speech: '“',
  vote: '▹',
  death: '†',
  night: '☾',
};

async function scrollToEnd() {
  await nextTick();
  if (list.value) list.value.scrollTop = list.value.scrollHeight;
}

function toggle() {
  collapsed.value = !collapsed.value;
  if (!collapsed.value) void scrollToEnd();
}

watch(
  () => store.logs.length,
  () => {
    if (!collapsed.value) void scrollToEnd();
  },
);

onMounted(() => {
  collapsed.value = window.innerWidth < 1360;
  void scrollToEnd();
});

defineExpose({ toggle });
</script>

<template>
  <aside class="game-log" :class="{ 'is-collapsed': collapsed }">
    <button v-if="collapsed" class="log-tab" type="button" aria-label="展开夜话记录" @click="toggle">
      <span class="log-tab-mark">“</span>
      <span>夜话</span>
      <span class="log-tab-count">{{ store.logs.length }}</span>
    </button>

    <div v-else class="log-panel">
      <header class="log-head">
        <div>
          <p class="eyebrow">THE NIGHT LOG</p>
          <h2 class="serif">夜话记录</h2>
        </div>
        <button class="log-close icon-btn" type="button" aria-label="收起记录" @click="toggle">
          <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </header>

      <div ref="list" class="log-list" role="log" aria-live="polite">
        <template v-for="entry in entries" :key="entry.id">
          <div v-if="entry.kind === 'night'" class="log-round">
            <span></span>
            <b>{{ entry.text.replace('。', '') }}</b>
            <span></span>
          </div>
          <article class="log-entry" :class="`kind-${entry.kind}`">
            <span class="log-glyph" aria-hidden="true">{{ glyphs[entry.kind] }}</span>
            <div class="log-body">
              <div v-if="entry.kind === 'speech' && entry.seat" class="log-who">
                <b>{{ playerName(entry.seat) }}</b>
                <span v-if="entry.kind === 'speech'">发言</span>
              </div>
              <div v-else-if="entry.kind === 'private'" class="log-who">
                <b>仅你可见</b>
              </div>
              <p>{{ entry.text }}</p>
            </div>
          </article>
        </template>
        <p v-if="!entries.length" class="log-empty">炉火还没有开口。</p>
      </div>

      <footer class="log-foot">
        <span class="log-dot"></span>
        <span>{{ entries.length }} 条记录 · 本局私密信息仅你可见</span>
      </footer>
    </div>
  </aside>
</template>

<style scoped>
.game-log {
  position: fixed;
  left: clamp(18px, 2.4vw, 34px);
  top: clamp(80px, 10vh, 100px);
  z-index: 22;
  width: 286px;
  pointer-events: auto;
}

.log-panel {
  display: flex;
  flex-direction: column;
  max-height: min(46vh, 430px);
  border: 1px solid rgba(224, 210, 180, 0.12);
  background: linear-gradient(160deg, rgba(12, 18, 13, 0.86), rgba(7, 11, 8, 0.9));
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.log-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 14px 12px;
  border-bottom: 1px solid rgba(224, 210, 180, 0.08);
}

.log-head h2 {
  margin-top: 7px;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: rgba(242, 234, 218, 0.9);
}

.log-close {
  width: 25px;
  height: 25px;
  margin-top: 1px;
  border-color: rgba(224, 210, 180, 0.1);
  color: rgba(236, 226, 207, 0.5);
}

.log-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(212, 178, 122, 0.24) transparent;
}

.log-list::-webkit-scrollbar {
  width: 4px;
}
.log-list::-webkit-scrollbar-thumb {
  background: rgba(212, 178, 122, 0.22);
}

.log-round {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 2px 8px;
}

.log-round span {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(216, 190, 143, 0.18));
}
.log-round span:last-child {
  background: linear-gradient(90deg, rgba(216, 190, 143, 0.18), transparent);
}

.log-round b {
  font-family: var(--serif);
  font-size: 8px;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: rgba(216, 190, 143, 0.5);
  white-space: nowrap;
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(224, 210, 180, 0.04);
}

.log-glyph {
  flex: 0 0 auto;
  width: 11px;
  padding-top: 1px;
  font-size: 8px;
  line-height: 1.7;
  color: rgba(212, 178, 122, 0.45);
  text-align: center;
}

.log-body {
  min-width: 0;
}

.log-body p {
  color: rgba(232, 223, 205, 0.62);
  font-size: 9.5px;
  line-height: 1.85;
  letter-spacing: 0.03em;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-who {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 2px;
}

.log-who b {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: rgba(238, 214, 169, 0.82);
}

.log-who span {
  font-size: 6.5px;
  letter-spacing: 0.14em;
  color: rgba(232, 223, 205, 0.28);
  text-transform: uppercase;
}

.kind-speech .log-body p {
  color: rgba(240, 232, 216, 0.82);
}

.kind-private {
  margin: 5px 0;
  padding: 7px 8px;
  border-left: 2px solid rgba(212, 178, 122, 0.4);
  background: rgba(41, 35, 22, 0.3);
}

.kind-private .log-glyph {
  color: rgba(231, 201, 145, 0.72);
}

.kind-private .log-body p {
  color: rgba(232, 211, 174, 0.72);
}

.kind-private .log-who b {
  color: rgba(231, 201, 145, 0.8);
  font-weight: 400;
  letter-spacing: 0.14em;
}

.kind-death .log-body p {
  color: rgba(206, 153, 143, 0.8);
}

.kind-vote .log-body p {
  color: rgba(216, 202, 175, 0.48);
}

.kind-system .log-body p,
.kind-public .log-body p {
  color: rgba(222, 213, 196, 0.5);
}

.log-empty {
  padding: 18px 6px;
  color: rgba(232, 223, 205, 0.28);
  font-size: 9px;
  letter-spacing: 0.1em;
}

.log-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid rgba(224, 210, 180, 0.07);
  color: rgba(230, 220, 200, 0.26);
  font-size: 6.5px;
  letter-spacing: 0.08em;
}

.log-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(212, 178, 122, 0.4);
}

.log-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  background: rgba(9, 14, 11, 0.8);
  color: rgba(236, 226, 207, 0.65);
  font-size: 8px;
  letter-spacing: 0.16em;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  cursor: pointer;
}

.log-tab-mark {
  font-family: var(--serif);
  font-size: 16px;
  color: var(--gold);
}

.log-tab-count {
  min-width: 15px;
  height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(212, 178, 122, 0.16);
  color: rgba(231, 201, 145, 0.7);
  font-size: 7px;
}

@media (max-width: 960px) {
  .game-log {
    left: 12px;
    top: 74px;
    width: min(300px, calc(100vw - 24px));
  }
  .log-panel {
    max-height: 38vh;
  }
}
</style>

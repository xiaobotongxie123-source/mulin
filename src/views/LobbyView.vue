<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { ROLE_COUNTS, ROLE_META, ROLE_ORDER } from '@/data/roles';
import BrandMark from '@/components/ui/BrandMark.vue';
import RoleIcon from '@/components/ui/RoleIcon.vue';
import TravelerPortrait from '@/components/ui/TravelerPortrait.vue';
import RuleSheet from '@/components/ui/RuleSheet.vue';
import AgentStatus from '@/components/ui/AgentStatus.vue';
import { checkAgentRuntime } from '@/game/agentClient';
import { useAmbientAudio } from '@/composables/useAmbientAudio';

const router = useRouter();
const store = useGameStore();
const { enabled, toggle } = useAmbientAudio();
const rulesOpen = ref(false);

onMounted(() => {
  void checkAgentRuntime();
});

const roster = computed(() => [...store.players].sort((a, b) => a.seat - b.seat));

function begin() {
  store.newGame();
  router.push('/reveal');
}

function back() {
  router.push('/');
}
</script>

<template>
  <section class="view lobby">
    <div class="lobby-scrim" aria-hidden="true"></div>

    <header class="lobby-topbar">
      <div class="brand">
        <span class="brand-mark"><BrandMark :size="30" /></span>
        <span class="brand-type">
          <span class="brand-cn">暮林夜话</span>
          <span class="brand-en">MULIN NIGHTFALL</span>
        </span>
      </div>
      <div class="top-actions">
        <button class="text-link" type="button" @click="back">回到林间</button>
        <button class="icon-btn" type="button" :class="{ 'is-on': enabled }" :aria-label="enabled ? '关闭环境声' : '开启环境声'" @click="toggle">
          <svg v-if="enabled" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m17 9 4 6M21 9l-4 6" /></svg>
        </button>
        <button class="icon-btn" type="button" aria-label="查看规则" @click="rulesOpen = true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.4" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 2.1M12 16.8h.01" /></svg>
        </button>
      </div>
    </header>

    <div class="lobby-wrap">
      <section class="lobby-panel panel">
        <div class="lobby-left">
          <p class="eyebrow">NINE TRAVELERS · 九人局</p>
          <h2 class="serif">今夜的旅人</h2>
          <p class="lobby-lede">
            九个人，九张脸。三只狼藏在其中。<br />
            炉火点燃之后，谁都不能中途离席。
          </p>

          <AgentStatus class="lobby-agent" />

          <div class="role-legend">
            <div v-for="role in ROLE_ORDER" :key="role" class="legend-row">
              <span class="legend-icon"><RoleIcon :role="role" :size="20" /></span>
              <span class="legend-name">{{ ROLE_META[role].name }}</span>
              <span class="legend-count">×{{ ROLE_COUNTS[role] }}</span>
            </div>
          </div>

          <div class="lobby-cta">
            <button class="btn btn--cta" type="button" @click="begin">
              <span class="dot"></span>
              <span>点燃炉火 · 开始</span>
              <span class="arrow">→</span>
            </button>
            <p class="cta-note">身份将在下一页私下发放。本局由 8 位 AI 旅人陪你完成。</p>
          </div>
        </div>

        <div class="lobby-right">
          <div class="roster-head">
            <span class="eyebrow">THE GUEST LIST</span>
            <span class="roster-count">09 / 09</span>
          </div>
          <div class="roster-grid">
            <article
              v-for="player in roster"
              :key="player.seat"
              class="roster-card"
              :class="{ 'is-human': player.isHuman }"
            >
              <span class="roster-seat">{{ String(player.seat).padStart(2, '0') }}</span>
              <TravelerPortrait :character="player.character" :size="46" />
              <div class="roster-type">
                <b class="serif">{{ player.character.name }}</b>
                <span>{{ player.character.title }}</span>
              </div>
              <span class="roster-tag" :class="{ 'is-you': player.isHuman }">{{ player.isHuman ? '你' : '旅人' }}</span>
            </article>
          </div>
          <p class="roster-foot">
            <span>CAST FIXED · ROLES DEALT AT NIGHTFALL</span>
            <button class="text-link" type="button" @click="rulesOpen = true">查看规则</button>
          </p>
        </div>
      </section>
    </div>

    <footer class="lobby-foot">
      <span>MULIN NIGHTFALL · LOCAL SESSION</span>
      <span class="foot-dot"></span>
      <span>3 WOLVES · 3 VILLAGERS · SEER · WITCH · GUARD</span>
    </footer>

    <RuleSheet v-model:open="rulesOpen" />
  </section>
</template>

<style scoped>
.lobby {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96px var(--gutter) 64px;
  pointer-events: none;
}

.lobby-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 60% at 50% 52%, rgba(4, 8, 6, 0.2) 0%, rgba(4, 8, 6, 0.62) 68%, rgba(4, 8, 6, 0.84) 100%);
}

.lobby-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(18px, 2.6vw, 30px) clamp(20px, 3.4vw, 48px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 30px;
  height: 30px;
  color: var(--gold);
}

.brand-type {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-cn {
  font-family: var(--serif);
  font-size: 13px;
  letter-spacing: 0.3em;
  color: rgba(243, 236, 221, 0.92);
}

.brand-en {
  font-size: 7px;
  letter-spacing: 0.28em;
  color: rgba(238, 228, 205, 0.4);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  pointer-events: auto;
}

.top-actions .text-link {
  margin-right: 4px;
}

.top-actions .icon-btn.is-on {
  color: var(--gold-bright);
  border-color: rgba(226, 190, 126, 0.36);
}

.lobby-wrap {
  position: relative;
  z-index: 2;
  width: min(1040px, 94vw);
  pointer-events: auto;
}

.lobby-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
  max-height: calc(100vh - 190px);
  overflow: hidden;
  background: linear-gradient(150deg, rgba(14, 21, 16, 0.9), rgba(8, 12, 9, 0.94));
}

.lobby-left {
  display: flex;
  flex-direction: column;
  padding: clamp(28px, 3.4vw, 44px);
  border-right: 1px solid var(--line-soft);
}

.lobby-left h2 {
  margin-top: 14px;
  font-size: clamp(32px, 3.6vw, 46px);
  font-weight: 400;
  letter-spacing: 0.12em;
  color: #f1e8d5;
}

.lobby-lede {
  margin-top: 16px;
  color: var(--ink-soft);
  font-family: var(--serif);
  font-size: 13px;
  line-height: 2.1;
  letter-spacing: 0.06em;
}

.lobby-agent {
  margin-top: 20px;
}

.role-legend {
  display: grid;
  gap: 2px;
  margin-top: clamp(20px, 3vh, 30px);
  padding-top: 18px;
  border-top: 1px solid var(--line-soft);
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 2px;
  color: var(--gold);
}

.legend-icon {
  width: 24px;
  display: inline-flex;
  justify-content: center;
  opacity: 0.85;
}

.legend-name {
  flex: 1;
  color: rgba(236, 228, 212, 0.78);
  font-size: 10px;
  letter-spacing: 0.18em;
}

.legend-count {
  color: rgba(212, 178, 122, 0.6);
  font-family: var(--serif);
  font-size: 11px;
  letter-spacing: 0.06em;
}

.lobby-cta {
  margin-top: auto;
  padding-top: 24px;
}

.lobby-cta .btn {
  width: 100%;
}

.cta-note {
  margin-top: 12px;
  color: var(--ink-faint);
  font-size: 8px;
  line-height: 1.9;
  letter-spacing: 0.1em;
}

.lobby-right {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: clamp(24px, 2.8vw, 34px);
}

.roster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line-soft);
}

.roster-count {
  font-family: var(--serif);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(212, 178, 122, 0.55);
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
  overflow-y: auto;
  padding-right: 2px;
}

.roster-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px 12px;
  border: 1px solid rgba(224, 210, 180, 0.09);
  background: rgba(8, 13, 10, 0.42);
  transition:
    border-color 0.4s var(--ease-out),
    background 0.4s var(--ease-out),
    transform 0.4s var(--ease-out);
}

.roster-card:hover {
  border-color: rgba(226, 195, 140, 0.28);
  background: rgba(20, 27, 20, 0.5);
  transform: translateY(-2px);
}

.roster-card.is-human {
  border-color: rgba(226, 190, 126, 0.38);
  background: linear-gradient(170deg, rgba(46, 38, 23, 0.4), rgba(12, 17, 12, 0.5));
}

.roster-seat {
  position: absolute;
  top: 8px;
  right: 9px;
  font-family: var(--serif);
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(212, 178, 122, 0.38);
}

.roster-type {
  text-align: center;
}

.roster-type b {
  display: block;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.14em;
  color: rgba(242, 234, 218, 0.9);
}

.roster-type span {
  display: block;
  margin-top: 3px;
  font-size: 7px;
  letter-spacing: 0.16em;
  color: var(--ink-mute);
}

.roster-tag {
  position: absolute;
  left: 8px;
  top: 8px;
  padding: 2px 5px;
  border: 1px solid rgba(224, 210, 180, 0.12);
  font-size: 6.5px;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.roster-tag.is-you {
  border-color: rgba(226, 190, 126, 0.4);
  color: var(--gold-bright);
  background: rgba(60, 48, 27, 0.35);
}

.roster-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--line-soft);
  color: var(--ink-faint);
  font-size: 7px;
  letter-spacing: 0.16em;
}

.lobby-foot {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  color: rgba(230, 219, 196, 0.26);
  font-size: 7px;
  letter-spacing: 0.2em;
}

.foot-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(212, 178, 122, 0.4);
}

@media (max-width: 920px) {
  .lobby {
    padding-top: 84px;
    justify-content: flex-start;
    overflow-y: auto;
  }
  .lobby-wrap {
    width: min(680px, 94vw);
  }
  .lobby-panel {
    grid-template-columns: 1fr;
    max-height: none;
    overflow: visible;
  }
  .lobby-left {
    border-right: 0;
    border-bottom: 1px solid var(--line-soft);
    padding: 26px;
  }
  .lobby-left h2 {
    font-size: 32px;
  }
  .role-legend {
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
  }
  .lobby-cta {
    margin-top: 8px;
    padding-top: 16px;
  }
  .lobby-right {
    padding: 22px 26px 26px;
  }
  .lobby-foot {
    margin-bottom: 24px;
  }
}

@media (max-width: 620px) {
  .lobby {
    padding-left: 16px;
    padding-right: 16px;
  }
  .lobby-topbar {
    padding: 16px;
  }
  .top-actions .text-link {
    display: none;
  }
  .lobby-left,
  .lobby-right {
    padding: 20px;
  }
  .roster-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .roster-card {
    padding: 14px 4px 10px;
  }
  .roster-type b {
    font-size: 12px;
  }
  .roster-tag {
    display: none;
  }
  .lobby-lede {
    font-size: 12px;
  }
  .lobby-foot {
    display: none;
  }
}
</style>

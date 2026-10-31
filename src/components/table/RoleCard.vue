<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { ROLE_META } from '@/data/roles';
import TravelerPortrait from '@/components/ui/TravelerPortrait.vue';
import RoleIcon from '@/components/ui/RoleIcon.vue';

const store = useGameStore();
const human = computed(() => store.human);
const meta = computed(() => store.humanMeta);
const alive = computed(() => store.humanAlive);

const pack = computed(() =>
  store.players
    .filter((player) => player.role === 'werewolf' && !player.isHuman)
    .map((player) => `${String(player.seat).padStart(2, '0')} ${player.character.name}`),
);

const checks = computed(() => store.seerChecks.slice(-3));
</script>

<template>
  <aside class="role-card" :class="{ 'is-dead': !alive }">
    <span class="role-frame" aria-hidden="true"></span>
    <div class="role-main">
      <TravelerPortrait :character="human.character" :size="44" :dimmed="!alive" />
      <div class="role-identity">
        <p class="eyebrow">YOUR SEAT · {{ String(human.seat).padStart(2, '0') }}</p>
        <div class="role-name">
          <b class="serif">{{ human.character.name }}</b>
          <span>{{ human.character.title }}</span>
        </div>
        <div class="role-line" :style="{ color: meta.color }">
          <RoleIcon :role="meta.role" :size="15" />
          <b>{{ meta.name }}</b>
          <span>{{ meta.en }}</span>
          <i class="role-state" :class="{ dead: !alive }">{{ alive ? '在场' : '出局' }}</i>
        </div>
      </div>
    </div>

    <div v-if="store.isHumanWolf" class="role-detail">
      <span class="detail-label">狼群</span>
      <span class="detail-value blood">{{ pack.join(' · ') || '独自一人' }}</span>
    </div>
    <div v-else-if="meta.role === 'seer'" class="role-detail">
      <span class="detail-label">查验</span>
      <span v-if="checks.length" class="check-list">
        <span v-for="check in checks" :key="check.round + ':' + check.seat" class="check-chip" :class="check.faction">
          {{ String(check.seat).padStart(2, '0') }} · {{ check.faction === 'wolf' ? '狼' : '好' }}
        </span>
      </span>
      <span v-else class="detail-value">尚未睁眼</span>
    </div>
    <div v-else-if="meta.role === 'witch'" class="role-detail">
      <span class="detail-label">药瓶</span>
      <span class="potion" :class="{ empty: !store.witch.antidote }">解药</span>
      <span class="potion" :class="{ empty: !store.witch.poison }">毒药</span>
    </div>
    <div v-else-if="meta.role === 'guard'" class="role-detail">
      <span class="detail-label">上一夜</span>
      <span class="detail-value">{{ store.guardLast ? `${String(store.guardLast).padStart(2, '0')} 号` : '尚未守护' }}</span>
    </div>
    <div v-else class="role-detail">
      <span class="detail-label">凭据</span>
      <span class="detail-value">没有技能，只有一双眼睛。</span>
    </div>
  </aside>
</template>

<style scoped>
.role-card {
  position: fixed;
  left: clamp(18px, 2.4vw, 34px);
  bottom: clamp(18px, 2.4vw, 28px);
  z-index: 22;
  width: 316px;
  padding: 12px 14px 10px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  background: linear-gradient(150deg, rgba(13, 19, 14, 0.9), rgba(7, 11, 8, 0.92));
  backdrop-filter: blur(18px) saturate(1.1);
  -webkit-backdrop-filter: blur(18px) saturate(1.1);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.32);
}

.role-frame {
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(224, 210, 180, 0.05);
  pointer-events: none;
}

.role-main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
}

.role-identity {
  min-width: 0;
  flex: 1;
}

.role-name {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 3px;
}

.role-name b {
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.12em;
  color: rgba(243, 235, 219, 0.94);
}

.role-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-mute);
  font-size: 7.5px;
  letter-spacing: 0.1em;
}

.role-line {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
}

.role-line b {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
}

.role-line span {
  font-size: 6.5px;
  letter-spacing: 0.18em;
  opacity: 0.55;
}

.role-state {
  margin-left: auto;
  padding: 2px 5px;
  border: 1px solid rgba(143, 168, 141, 0.32);
  color: rgba(169, 193, 164, 0.8);
  font-size: 6.5px;
  font-style: normal;
  letter-spacing: 0.1em;
}

.role-state.dead {
  border-color: rgba(169, 85, 77, 0.4);
  color: rgba(201, 137, 127, 0.8);
}

.role-detail {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  padding-top: 8px;
  border-top: 1px solid rgba(224, 210, 180, 0.08);
  min-height: 20px;
}

.detail-label {
  flex: 0 0 auto;
  font-size: 6.5px;
  letter-spacing: 0.16em;
  color: rgba(222, 199, 158, 0.38);
  text-transform: uppercase;
}

.detail-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(236, 227, 209, 0.55);
  font-size: 8px;
  letter-spacing: 0.04em;
}

.detail-value.blood {
  color: rgba(206, 141, 131, 0.8);
}

.check-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.check-chip {
  padding: 2px 5px;
  border: 1px solid rgba(224, 210, 180, 0.14);
  font-size: 7px;
  letter-spacing: 0.04em;
  color: rgba(232, 223, 205, 0.7);
}

.check-chip.wolf {
  border-color: rgba(169, 85, 77, 0.42);
  color: rgba(216, 154, 144, 0.9);
}

.check-chip.good {
  border-color: rgba(143, 168, 141, 0.32);
  color: rgba(177, 201, 172, 0.85);
}

.potion {
  padding: 2px 6px;
  border: 1px solid rgba(155, 127, 168, 0.35);
  color: rgba(185, 158, 197, 0.75);
  font-size: 7px;
  letter-spacing: 0.08em;
}

.potion.empty {
  border-color: rgba(224, 210, 180, 0.1);
  color: rgba(230, 220, 200, 0.25);
  text-decoration: line-through;
}

.is-dead .role-main {
  filter: grayscale(0.4);
}

@media (max-width: 1279px) {
  .role-card {
    display: none;
  }
}
</style>

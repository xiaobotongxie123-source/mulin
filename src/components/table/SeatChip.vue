<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@/game/types';
import { useGameStore } from '@/stores/game';
import TravelerPortrait from '@/components/ui/TravelerPortrait.vue';

const props = defineProps<{
  player: Player;
  point: { x: number; y: number };
  visible: boolean;
}>();

const store = useGameStore();

const prompt = computed(() => store.prompt);
const speaking = computed(() => store.speakerSeat === props.player.seat && store.speaking);
const selected = computed(() => store.selectedSeat === props.player.seat);
const dead = computed(() => !props.player.alive);

const targetKind = computed(() => {
  const kind = prompt.value?.kind;
  return kind === 'guard' || kind === 'wolf' || kind === 'seer' || kind === 'vote' ? kind : null;
});

const blockReason = computed(() => {
  if (!prompt.value) return '';
  if (dead.value) return '已经出局';
  switch (targetKind.value) {
    case 'guard':
      return store.guardLast === props.player.seat ? '不能连续两晚守护同一人' : '';
    case 'wolf':
      return props.player.role === 'werewolf' ? '狼群同伴' : '';
    case 'seer':
      return props.player.isHuman ? '不能查验自己' : '';
    case 'vote':
      return props.player.isHuman ? '不能投自己' : '';
    default:
      return '';
  }
});

const selectable = computed(() => Boolean(targetKind.value) && !blockReason.value);

const claim = computed(() => store.claims.find((item) => item.seat === props.player.seat));
const check = computed(() => store.seerChecks.find((item) => item.seat === props.player.seat));
const wolfAlly = computed(() => store.isHumanWolf && props.player.role === 'werewolf');
const votes = computed(() => (store.phase === 'vote' ? store.voteCounts[props.player.seat] ?? 0 : 0));

const badges = computed(() => {
  const list: Array<{ label: string; tone: string }> = [];
  if (check.value) list.push({ label: check.value.faction === 'wolf' ? '狼' : '好', tone: check.value.faction === 'wolf' ? 'blood' : 'moss' });
  if (wolfAlly.value) list.push({ label: '同狼', tone: 'blood' });
  if (claim.value) list.push({ label: '预', tone: 'gold' });
  return list.slice(0, 2);
});

function pick() {
  if (!selectable.value) return;
  store.selectSeat(selected.value ? null : props.player.seat);
}
</script>

<template>
  <button
    v-if="visible"
    class="seat-node"
    :class="{
      'is-selected': selected,
      'is-speaking': speaking,
      'is-dead': dead,
      'is-selectable': selectable,
      'is-blocked': Boolean(prompt) && !selectable,
      'is-wolf-ally': wolfAlly,
    }"
    :style="{ left: `${point.x}px`, top: `${point.y}px`, zIndex: Math.round(point.y) }"
    type="button"
    :aria-label="`${player.seat} 号 ${player.character.name}${dead ? '，已出局' : ''}`"
    :title="blockReason || (selectable ? '选择这名旅人' : player.character.title)"
    @click.stop="pick"
  >
    <span class="node-shell">
      <span class="node-portrait">
        <TravelerPortrait :character="player.character" :size="30" :dimmed="dead" />
        <span v-if="speaking" class="speaking-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      </span>
      <span class="node-copy">
        <span class="node-seat">{{ String(player.seat).padStart(2, '0') }}</span>
        <b class="serif">{{ player.character.name }}</b>
      </span>
      <span v-if="dead" class="node-dead" aria-label="已出局">†</span>
      <span v-else-if="badges.length" class="node-badges">
        <span v-for="badge in badges" :key="badge.label" class="node-badge" :class="`tone-${badge.tone}`">{{ badge.label }}</span>
      </span>
      <span v-if="votes > 0" class="node-votes">{{ votes }}</span>
    </span>
    <span class="node-tip" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.seat-node {
  position: absolute;
  transform: translate(-50%, -125%);
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  pointer-events: none;
  transition: transform 0.35s var(--ease-out), filter 0.35s var(--ease-out);
}

.seat-node.is-selectable {
  pointer-events: auto;
  cursor: pointer;
}

.node-shell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 102px;
  height: 38px;
  padding: 3px 9px 3px 3px;
  border: 1px solid rgba(224, 210, 180, 0.17);
  border-radius: 22px;
  background: rgba(9, 14, 11, 0.68);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px) saturate(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
  transition:
    border-color 0.35s var(--ease-out),
    background 0.35s var(--ease-out),
    box-shadow 0.35s var(--ease-out);
}

.seat-node.is-selectable:hover .node-shell {
  border-color: rgba(232, 203, 151, 0.52);
  background: rgba(24, 31, 23, 0.82);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(212, 178, 122, 0.12);
}

.seat-node.is-selected {
  transform: translate(-50%, -125%) scale(1.06);
}

.seat-node.is-selected .node-shell {
  border-color: rgba(238, 204, 145, 0.9);
  background: rgba(45, 39, 24, 0.88);
  box-shadow: 0 0 0 1px rgba(238, 204, 145, 0.28), 0 0 28px rgba(212, 178, 122, 0.28);
}

.seat-node.is-speaking .node-shell {
  border-color: rgba(235, 212, 168, 0.7);
  animation: speaker-glow 2.4s ease-in-out infinite;
}

@keyframes speaker-glow {
  0%,
  100% {
    box-shadow: 0 0 0 1px rgba(231, 201, 145, 0.1), 0 0 18px rgba(231, 201, 145, 0.12);
  }
  50% {
    box-shadow: 0 0 0 1px rgba(231, 201, 145, 0.32), 0 0 30px rgba(231, 201, 145, 0.26);
  }
}

.seat-node.is-wolf-ally .node-shell {
  border-color: rgba(169, 85, 77, 0.4);
}

.seat-node.is-dead {
  filter: grayscale(0.8) brightness(0.72);
}

.seat-node.is-dead .node-shell {
  border-color: rgba(220, 210, 190, 0.08);
  background: rgba(7, 10, 8, 0.55);
}

.seat-node.is-blocked .node-shell {
  opacity: 0.5;
}

.node-portrait {
  position: relative;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
}

.node-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1;
  text-align: left;
}

.node-seat {
  font-size: 6.5px;
  letter-spacing: 0.16em;
  color: rgba(222, 199, 158, 0.5);
  font-variant-numeric: tabular-nums;
}

.node-copy b {
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.1em;
  color: rgba(242, 234, 218, 0.92);
  white-space: nowrap;
}

.node-badges {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
}

.node-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border: 1px solid rgba(224, 210, 180, 0.18);
  font-size: 7px;
  letter-spacing: 0;
  color: rgba(235, 225, 206, 0.8);
}

.node-badge.tone-gold {
  border-color: rgba(226, 190, 126, 0.42);
  color: var(--gold-bright);
}

.node-badge.tone-blood {
  border-color: rgba(169, 85, 77, 0.5);
  color: #d99a90;
}

.node-badge.tone-moss {
  border-color: rgba(143, 168, 141, 0.42);
  color: #a9c1a4;
}

.node-dead {
  margin-left: auto;
  font-family: var(--serif);
  font-size: 13px;
  color: rgba(220, 208, 186, 0.45);
}

.node-votes {
  position: absolute;
  top: -8px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: #d5b47e;
  color: #1a140c;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.node-tip {
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 1px;
  height: 8px;
  background: linear-gradient(180deg, rgba(226, 205, 168, 0.35), transparent);
  transform: translateX(-50%);
}

.speaking-bars {
  position: absolute;
  right: -4px;
  bottom: -3px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1.5px;
  width: 15px;
  height: 13px;
  padding: 2px 3px;
  border-radius: 7px;
  background: rgba(10, 15, 11, 0.9);
  border: 1px solid rgba(225, 198, 146, 0.4);
}

.speaking-bars i {
  display: block;
  width: 1px;
  height: 3px;
  background: var(--gold-bright);
  animation: speak-bar 0.9s ease-in-out infinite;
}

.speaking-bars i:nth-child(2) {
  animation-delay: 0.15s;
}
.speaking-bars i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes speak-bar {
  0%,
  100% {
    height: 3px;
  }
  50% {
    height: 7px;
  }
}

@media (max-width: 900px) {
  .seat-node {
    transform: translate(-50%, -120%) scale(0.86);
  }
  .seat-node.is-selected {
    transform: translate(-50%, -120%) scale(0.92);
  }
  .node-shell {
    min-width: 88px;
    height: 33px;
    gap: 5px;
    padding-right: 7px;
  }
  .node-portrait {
    width: 26px;
    height: 26px;
  }
  .node-copy b {
    font-size: 9.5px;
  }
  .node-badges {
    display: none;
  }
}
</style>

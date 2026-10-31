<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';

const store = useGameStore();
const banner = computed(() => store.banner);
const label = computed(() => {
  switch (banner.value?.tone) {
    case 'night':
      return 'NIGHTFALL';
    case 'dawn':
      return 'DAYBREAK';
    case 'vote':
      return 'THE VOTE';
    case 'death':
      return 'A LOSS AT THE TABLE';
    default:
      return 'THE TABLE';
  }
});
</script>

<template>
  <Transition name="banner">
    <div v-if="banner" class="phase-banner" :class="`tone-${banner.tone}`" aria-live="polite">
      <div class="banner-rule">
        <span></span>
        <i>✦</i>
        <span></span>
      </div>
      <p class="banner-eyebrow">{{ label }}</p>
      <h2 class="serif">{{ banner.title }}</h2>
      <p class="banner-sub">{{ banner.sub }}</p>
    </div>
  </Transition>
</template>

<style scoped>
.phase-banner {
  position: fixed;
  left: 50%;
  top: 43%;
  z-index: var(--z-banner);
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(680px, 88vw);
  padding: 26px 20px;
  text-align: center;
  pointer-events: none;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.75), 0 1px 3px rgba(0, 0, 0, 0.8);
}

.banner-rule {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 180px;
  margin-bottom: 18px;
}

.banner-rule span {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(222, 191, 133, 0.55));
}

.banner-rule span:last-child {
  background: linear-gradient(90deg, rgba(222, 191, 133, 0.55), transparent);
}

.banner-rule i {
  font-style: normal;
  font-size: 8px;
  color: rgba(226, 192, 131, 0.8);
}

.banner-eyebrow {
  color: rgba(225, 205, 166, 0.56);
  font-size: 8px;
  letter-spacing: 0.34em;
  text-transform: uppercase;
}

.phase-banner h2 {
  margin-top: 13px;
  font-size: clamp(36px, 4.4vw, 58px);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: 0.18em;
  color: #f3ead8;
}

.banner-sub {
  margin-top: 14px;
  color: rgba(234, 224, 204, 0.65);
  font-size: 11px;
  letter-spacing: 0.16em;
}

.tone-night h2 {
  color: #dfe8ef;
  text-shadow: 0 0 38px rgba(120, 162, 188, 0.28), 0 2px 18px rgba(0, 0, 0, 0.8);
}

.tone-dawn h2 {
  color: #f6e3bf;
  text-shadow: 0 0 40px rgba(230, 178, 103, 0.35), 0 2px 18px rgba(0, 0, 0, 0.8);
}

.tone-vote h2 {
  color: #ecd6a7;
}

.tone-death h2 {
  color: #e6c2b5;
  text-shadow: 0 0 42px rgba(169, 85, 77, 0.35), 0 2px 18px rgba(0, 0, 0, 0.85);
}

.tone-neutral h2 {
  color: #e7dfcf;
}

.banner-enter-active {
  transition: opacity 0.6s var(--ease-out), transform 0.7s var(--ease-out);
}
.banner-leave-active {
  transition: opacity 0.5s var(--ease-out), transform 0.5s var(--ease-out);
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translate(-50%, -47%) scale(0.985);
}
</style>

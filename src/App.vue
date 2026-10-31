<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import WorldCanvas from '@/components/scene/WorldCanvas.vue';
import type { WorldMode } from '@/three/ForestWorld';

const route = useRoute();
const displayMode = ref<WorldMode>('home');
const veil = ref(false);
let veilTimer = 0;
let revealTimer = 0;

const routeMode = computed<WorldMode>(() => (route.meta.world as WorldMode) ?? 'home');

function isTableFamily(mode: WorldMode): boolean {
  return mode === 'reveal' || mode === 'table' || mode === 'result';
}

watch(
  routeMode,
  (next) => {
    if (next === displayMode.value) return;
    const familyChange = isTableFamily(next) !== isTableFamily(displayMode.value);
    if (!familyChange) {
      displayMode.value = next;
      return;
    }
    window.clearTimeout(veilTimer);
    window.clearTimeout(revealTimer);
    veil.value = true;
    veilTimer = window.setTimeout(() => {
      displayMode.value = next;
      revealTimer = window.setTimeout(() => {
        veil.value = false;
      }, 220);
    }, 360);
  },
  { immediate: true },
);

const routeKey = computed(() => String(route.name ?? route.path));
</script>

<template>
  <div class="app">
    <WorldCanvas :mode="displayMode" />
    <div class="frame-shade" aria-hidden="true"></div>

    <main class="view-layer">
      <RouterView v-slot="{ Component }">
        <Transition name="view" mode="out-in">
          <component :is="Component" :key="routeKey" />
        </Transition>
      </RouterView>
    </main>

    <Transition name="veil">
      <div v-if="veil" class="scene-veil" aria-hidden="true">
        <span class="scene-veil__line"></span>
        <span class="scene-veil__mark">暮 林 山 舍</span>
        <span class="scene-veil__line"></span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--bg);
}

.frame-shade {
  position: fixed;
  inset: 0;
  z-index: var(--z-shade);
  pointer-events: none;
  background:
    radial-gradient(ellipse 62% 74% at 3% 96%, rgba(3, 7, 5, 0.43) 0%, rgba(3, 7, 5, 0.2) 36%, rgba(3, 7, 5, 0) 72%),
    linear-gradient(180deg, rgba(3, 7, 5, 0.35) 0%, rgba(3, 7, 5, 0) 18%, rgba(3, 7, 5, 0) 68%, rgba(3, 7, 5, 0.46) 100%),
    linear-gradient(90deg, rgba(3, 7, 5, 0.28) 0%, rgba(3, 7, 5, 0) 25%, rgba(3, 7, 5, 0) 76%, rgba(3, 7, 5, 0.18) 100%);
}

.view-layer {
  position: fixed;
  inset: 0;
  z-index: var(--z-ui);
  pointer-events: none;
}

.scene-veil {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 48%, rgba(13, 20, 15, 0.92), rgba(4, 7, 5, 0.99) 70%);
}

.scene-veil__line {
  width: clamp(24px, 6vw, 88px);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 178, 122, 0.55));
}

.scene-veil__line:last-child {
  background: linear-gradient(90deg, rgba(212, 178, 122, 0.55), transparent);
}

.scene-veil__mark {
  font-family: var(--serif);
  font-size: 10px;
  letter-spacing: 0.5em;
  color: rgba(226, 209, 178, 0.6);
  white-space: nowrap;
}

.veil-enter-active,
.veil-leave-active {
  transition: opacity 0.36s var(--ease-out);
}

.veil-enter-from,
.veil-leave-to {
  opacity: 0;
}
</style>

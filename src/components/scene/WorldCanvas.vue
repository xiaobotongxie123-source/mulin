<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ForestWorld, type WorldMode } from '@/three/ForestWorld';
import { useGameStore } from '@/stores/game';

const props = defineProps<{ mode: WorldMode }>();
const emit = defineEmits<{ ready: [] }>();

const store = useGameStore();
const canvas = ref<HTMLCanvasElement | null>(null);
const failed = ref(false);
let world: ForestWorld | null = null;

const aliveKey = computed(() => store.players.map((player) => `${player.seat}${player.alive ? 1 : 0}`).join(''));

function syncAlive() {
  if (!world) return;
  for (const player of store.players) world.setSeatAlive(player.seat, player.alive);
}

function onResetView() {
  world?.resetView();
}

onMounted(() => {
  if (!canvas.value) return;
  try {
    world = new ForestWorld(canvas.value, store.players, () => emit('ready'));
    if (import.meta.env.DEV) {
      (window as unknown as { __mulinWorld?: ForestWorld }).__mulinWorld = world;
      (window as unknown as { __mulinStore?: typeof store }).__mulinStore = store;
    }
    world.setPhase(store.phase, store.winner?.faction ?? null);
    syncAlive();
    if (props.mode !== 'home') world.setMode(props.mode);
    window.addEventListener('mulin:reset-view', onResetView);
  } catch (error) {
    console.error('[mulin-night] failed to start WebGL scene', error);
    failed.value = true;
  }
});

watch(
  () => props.mode,
  (mode) => world?.setMode(mode),
);

watch(
  () => store.phase,
  (phase) => world?.setPhase(phase, store.winner?.faction ?? null),
);

watch(
  () => store.winner,
  (winner) => {
    if (winner) world?.setPhase('result', winner.faction);
  },
);

watch(
  () => store.speakerSeat,
  (seat) => world?.setSpeaker(seat),
);

watch(
  () => store.selectedSeat,
  (seat) => world?.setSelected(seat),
);

watch(aliveKey, syncAlive);

onBeforeUnmount(() => {
  window.removeEventListener('mulin:reset-view', onResetView);
  world?.dispose();
  world = null;
});
</script>

<template>
  <div class="world-canvas">
    <canvas ref="canvas" aria-hidden="true"></canvas>
    <div v-if="failed" class="world-fallback">
      <p class="eyebrow">WEBGL 2 · REQUIRED</p>
      <h1 class="serif">林间的一盏灯</h1>
      <p>这个场景需要 WebGL 2 支持。<br />请在支持硬件加速的现代浏览器中打开，并刷新页面。</p>
    </div>
  </div>
</template>

<style scoped>
.world-canvas {
  position: fixed;
  inset: 0;
  z-index: var(--z-scene);
  background: #070d0a;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}

.world-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 30px;
  text-align: center;
  background: radial-gradient(ellipse at 50% 45%, #17231c, #050806 70%);
}

.world-fallback h1 {
  font-size: 34px;
  letter-spacing: 0.16em;
}

.world-fallback p:last-child {
  color: var(--ink-mute);
  font-size: 12px;
  line-height: 2;
  letter-spacing: 0.05em;
}
</style>

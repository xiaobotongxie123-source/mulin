<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const emit = defineEmits<{ ready: []; finished: [] }>();

const progress = ref(0);
const leaving = ref(false);
let timer = 0;
let finishTimer = 0;

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = prefersReduced ? 900 : 4600;

function exit() {
  if (leaving.value) return;
  leaving.value = true;
  emit('ready');
  finishTimer = window.setTimeout(() => emit('finished'), 1350);
}

onMounted(() => {
  const startedAt = performance.now();
  timer = window.setInterval(() => {
    const elapsed = performance.now() - startedAt;
    const raw = Math.min(1, elapsed / duration);
    // Ease the last stretch so the bar settles rather than snapping.
    const eased = raw < 0.9 ? raw * 0.94 : 0.84 + (raw - 0.86) * 1.1;
    progress.value = Math.min(100, Math.round(Math.min(eased, 1) * 100));
    if (raw >= 1) {
      progress.value = 100;
      window.clearInterval(timer);
      timer = 0;
      exit();
    }
  }, 50);
});

onBeforeUnmount(() => {
  window.clearInterval(timer);
  window.clearTimeout(finishTimer);
});
</script>

<template>
  <section
    class="loader"
    :class="{ 'is-leaving': leaving }"
    aria-label="正在进入暮林山舍"
    aria-live="polite"
  >
    <div class="loader-inner">
      <p class="loader-eyebrow">PRIVATE RETREAT · 47° 12′ N</p>
      <div class="loader-mark" aria-hidden="true">
        <svg viewBox="0 0 50 50" fill="none">
          <circle cx="25" cy="25" r="22.8" stroke="currentColor" stroke-opacity=".34" stroke-width=".75" />
          <path d="M12 27.7 25 12.8l13 14.9" stroke="currentColor" stroke-width=".95" />
          <path d="M17.3 26v10.4h15.4V26" stroke="currentColor" stroke-width=".75" stroke-opacity=".68" />
          <path d="M22 36.4v-6.1h6v6.1" stroke="currentColor" stroke-width=".65" stroke-opacity=".4" />
        </svg>
      </div>
      <h1 class="loader-title">暮 林 山 舍</h1>
      <p class="loader-sub">WALDHÜTTE · A FOREST RETREAT</p>
      <div class="loader-track" aria-hidden="true"><span :style="{ width: `${progress}%` }"></span></div>
      <div class="loader-status">
        <span>{{ progress >= 100 ? '林间的门，开了' : '正在进入林间' }}</span>
        <span class="loader-pct">{{ progress }}%</span>
      </div>
    </div>
    <p class="loader-note">建议开启环境声，以获得完整体验</p>
  </section>
</template>

<style scoped>
.loader {
  position: fixed;
  inset: 0;
  z-index: var(--z-loader);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 43%, rgba(29, 39, 31, 0.96) 0%, rgba(8, 13, 10, 0.985) 56%, #050806 100%);
  transition: opacity 1.1s var(--ease-curtain), visibility 1.1s;
  color: var(--ink);
}

.loader::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  mix-blend-mode: screen;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.96' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E");
}

.loader.is-leaving {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.loader-inner {
  width: min(78vw, 450px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transform: translateY(-2vh);
}

.loader-eyebrow {
  margin-bottom: clamp(22px, 4vh, 38px);
  color: rgba(228, 214, 188, 0.4);
  font-size: 7.5px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.loader-mark {
  width: 58px;
  height: 58px;
  margin-bottom: 26px;
  color: var(--gold);
  opacity: 0.9;
}

.loader-mark svg {
  width: 100%;
  height: 100%;
}

.loader-title {
  margin: 0;
  padding-left: 0.32em;
  color: rgba(241, 233, 216, 0.92);
  font-family: var(--serif);
  font-size: clamp(29px, 3.5vw, 45px);
  font-weight: 400;
  letter-spacing: 0.32em;
  line-height: 1;
}

.loader-sub {
  margin-top: 13px;
  padding-left: 0.46em;
  color: rgba(223, 204, 166, 0.5);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.46em;
}

.loader-track {
  position: relative;
  width: 100%;
  height: 1px;
  margin-top: clamp(46px, 8vh, 76px);
  overflow: hidden;
  background: rgba(226, 211, 181, 0.13);
}

.loader-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, rgba(205, 167, 105, 0.3), var(--gold-bright));
  box-shadow: 0 0 14px rgba(227, 191, 127, 0.35);
  transition: width 0.4s var(--ease-out);
}

.loader-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 13px;
  color: rgba(226, 214, 191, 0.35);
  font-size: 7px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.loader-pct {
  color: rgba(226, 214, 191, 0.58);
  font-variant-numeric: tabular-nums;
}

.loader-note {
  position: absolute;
  bottom: clamp(24px, 5vh, 48px);
  left: 50%;
  transform: translateX(-50%);
  color: rgba(230, 220, 200, 0.28);
  font-size: 7.5px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 680px) {
  .loader-inner {
    width: 76vw;
  }
  .loader-note {
    font-size: 6.5px;
    letter-spacing: 0.16em;
  }
}
</style>

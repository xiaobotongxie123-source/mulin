<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import BrandMark from '@/components/ui/BrandMark.vue';
import RuleSheet from '@/components/ui/RuleSheet.vue';
import { useAmbientAudio } from '@/composables/useAmbientAudio';

const router = useRouter();
const { enabled, toggle } = useAmbientAudio();

const revealed = ref(true);
const rulesOpen = ref(false);
const chromeHidden = ref(false);

function enter() {
  router.push('/lobby');
}

function resetView() {
  window.dispatchEvent(new CustomEvent('mulin:reset-view'));
}

async function toggleSound() {
  await toggle();
}

function onKey(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target && /input|textarea|select/i.test(target.tagName)) return;
  if (event.key === 'h' || event.key === 'H') chromeHidden.value = !chromeHidden.value;
  if (event.key === 'r' || event.key === 'R') resetView();
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <section class="view home" :class="{ 'is-ready': revealed, 'is-chrome-hidden': chromeHidden }">
    <header class="topbar">
      <div class="brand" aria-label="暮林夜话 MULIN NIGHTFALL">
        <span class="brand-mark"><BrandMark :size="38" /></span>
        <span class="brand-type">
          <span class="brand-cn">暮林夜话</span>
          <span class="brand-en">MULIN NIGHTFALL · A WEREWOLF TALE</span>
        </span>
      </div>
      <div class="top-meta">
        <span class="status-dot"></span>
        <span>月升 · 暮色</span>
        <span class="top-divider"></span>
        <span class="wide">九人局 · 09 PLAYERS</span>
        <span class="wide">47°12′ N</span>
        <span class="wide">18:42</span>
      </div>
    </header>

    <main class="hero">
      <p class="hero-kicker"><span class="cn">林间 · 暮色</span> A quiet cabin in the woods</p>
      <h1>
        <span>暮林</span>
        <span class="second">夜话<i class="index">09</i></span>
      </h1>
      <p class="hero-copy">松风穿过檐角，木烟缓缓升起。<br />九个人围炉而坐，等一盏灯熄灭。</p>
      <p class="hero-roles">九人局 · 3 狼人 / 3 村民 / 女巫 · 守卫 · 预言家</p>
      <div class="hero-actions">
        <button class="btn btn--cta" type="button" @click="enter">
          <span class="dot"></span>
          <span>进入山舍</span>
          <span class="arrow">→</span>
        </button>
        <button class="hero-rules text-link" type="button" @click="rulesOpen = true">如何游玩</button>
      </div>
      <div class="hero-foot">
        <span>Wood smoke &amp; quiet light</span>
        <span class="rule"></span>
        <span>47.2016° N</span>
      </div>
    </main>

    <aside class="side-note" aria-hidden="true">
      <span class="accent">SCENE 01</span>
      <span class="line"></span>
      <span>暮色森林 · DUSK</span>
    </aside>

    <footer class="bottom">
      <div class="scene-id">
        <span class="num">01</span>
        <div class="meta">
          <b>暮林 · 山舍</b>
          <span>FIELD RECORDING 18:42 · ALT. 1,240 M</span>
        </div>
      </div>
      <div class="look-hint">
        <span class="mouse" aria-hidden="true"></span>
        <span>拖动环视&nbsp;&nbsp;·&nbsp;&nbsp;滚轮远近</span>
      </div>
      <div class="actions">
        <button
          class="action"
          type="button"
          :class="{ 'is-on': enabled }"
          :aria-pressed="enabled"
          :aria-label="enabled ? '关闭环境声' : '开启环境声'"
          @click="toggleSound"
        >
          <span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="label">环境声</span>
        </button>
        <button class="action icon-only" type="button" aria-label="重置视角" title="重置视角（R）" @click="resetView">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.6 9.2A8 8 0 1 1 4.1 14" /><path d="M4.4 4.6v4.8h4.8" /></svg>
        </button>
        <button class="action icon-only" type="button" aria-label="隐藏界面" title="隐藏界面（H）" @click="chromeHidden = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3.5 12s3.2-5.1 8.5-5.1S20.5 12 20.5 12s-3.2 5.1-8.5 5.1S3.5 12 3.5 12Z" />
            <circle cx="12" cy="12" r="2.2" />
          </svg>
        </button>
      </div>
    </footer>

    <button v-if="chromeHidden" class="show-ui" type="button" aria-label="显示界面" @click="chromeHidden = false">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 12s3.2-5.1 8.5-5.1S20.5 12 20.5 12s-3.2 5.1-8.5 5.1S3.5 12 3.5 12Z" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    </button>

    <RuleSheet v-model:open="rulesOpen" />
  </section>
</template>

<style scoped>
.home {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/* A restrained film grade: warm light around the cabin, cool shadows at the
   edges, and a barely-there grain so the 3D clearing feels photographed. */
.home::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 28% 34% at 61% 56%, rgba(255, 178, 92, 0.11), rgba(255, 178, 92, 0) 70%),
    radial-gradient(ellipse 58% 66% at 53% 51%, rgba(4, 9, 7, 0) 35%, rgba(3, 7, 5, 0.19) 74%, rgba(2, 5, 4, 0.4) 100%),
    linear-gradient(180deg, rgba(2, 5, 4, 0.2) 0%, rgba(2, 5, 4, 0) 22%, rgba(2, 5, 4, 0) 70%, rgba(2, 5, 4, 0.3) 100%);
}

.home::after {
  content: "";
  position: fixed;
  inset: -12%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.032;
  mix-blend-mode: screen;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='.55'/%3E%3C/svg%3E");
  animation: film-grain 8s steps(6) infinite;
}

.home > .topbar,
.home > .hero,
.home > .side-note,
.home > .bottom,
.home > .show-ui {
  z-index: 1;
}

@keyframes film-grain {
  0%, 100% { transform: translate(0, 0); }
  16% { transform: translate(-1.5%, 1%); }
  33% { transform: translate(1%, -1.5%); }
  50% { transform: translate(-0.5%, -1%); }
  66% { transform: translate(1.5%, 1.5%); }
  83% { transform: translate(-1%, 0.5%); }
}

@media (prefers-reduced-motion: reduce) {
  .home::after {
    animation: none;
  }
}

.topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: clamp(22px, 3.1vw, 42px) clamp(22px, 3.7vw, 56px);
  opacity: 0;
  transform: translateY(-9px);
  transition: opacity 1s var(--ease-out) 0.35s, transform 1s var(--ease-out) 0.35s;
}

.is-ready .topbar {
  opacity: 1;
  transform: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--ink);
}

.brand-mark {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  color: var(--gold);
  opacity: 0.92;
}

.brand-type {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.brand-cn {
  font-family: var(--serif);
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.34em;
  color: rgba(243, 236, 221, 0.94);
  white-space: nowrap;
}

.brand-en {
  font-size: 8px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.32em;
  color: rgba(238, 228, 205, 0.45);
  white-space: nowrap;
}

.top-meta {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-top: 6px;
  font-size: 9px;
  letter-spacing: 0.24em;
  color: rgba(238, 230, 211, 0.6);
  text-transform: uppercase;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--gold-bright);
  animation: dot-pulse 3.4s ease-out infinite;
}

.top-divider {
  width: 28px;
  height: 1px;
  background: rgba(222, 206, 175, 0.2);
}

@keyframes dot-pulse {
  0%,
  24% {
    box-shadow: 0 0 0 0 rgba(231, 201, 145, 0.36);
  }
  48% {
    box-shadow: 0 0 0 7px rgba(231, 201, 145, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 201, 145, 0);
  }
}

.hero {
  position: absolute;
  left: clamp(24px, 5.1vw, 82px);
  bottom: clamp(108px, 13.5vh, 168px);
  max-width: min(680px, 56vw);
}

.hero > * {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 1.15s var(--ease-out), transform 1.15s var(--ease-out);
}

.is-ready .hero > * {
  opacity: 1;
  transform: none;
}

.is-ready .hero .hero-kicker {
  transition-delay: 0.5s;
}
.is-ready .hero h1 {
  transition-delay: 0.62s;
}
.is-ready .hero .hero-copy {
  transition-delay: 0.8s;
}
.is-ready .hero .hero-roles {
  transition-delay: 0.92s;
}
.is-ready .hero .hero-actions {
  transition-delay: 1.02s;
}
.is-ready .hero .hero-foot {
  transition-delay: 1.14s;
}

.hero-kicker {
  display: flex;
  align-items: center;
  gap: 13px;
  margin: 0 0 clamp(16px, 2.1vh, 23px);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.28em;
  color: rgba(236, 226, 203, 0.64);
  text-transform: uppercase;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.5);
}

.hero-kicker::before {
  content: "";
  width: 42px;
  height: 1px;
  background: linear-gradient(90deg, rgba(213, 180, 121, 0.1), rgba(213, 180, 121, 0.8));
}

.hero-kicker .cn {
  color: rgba(243, 232, 208, 0.82);
  letter-spacing: 0.24em;
}

h1 {
  display: flex;
  align-items: baseline;
  gap: 0.28em;
  margin: 0;
  color: #f1e9d7;
  font-family: var(--serif);
  font-size: clamp(56px, 6.8vw, 104px);
  font-weight: 400;
  line-height: 0.99;
  letter-spacing: 0.075em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.28), 0 3px 26px rgba(0, 0, 0, 0.42);
}

h1 .second {
  position: relative;
  color: rgba(242, 233, 216, 0.82);
  font-size: 0.64em;
  letter-spacing: 0.12em;
}

h1 .second::after {
  content: "";
  position: absolute;
  left: 0.04em;
  right: -0.04em;
  bottom: -0.18em;
  height: 1px;
  background: linear-gradient(90deg, rgba(218, 184, 124, 0.68), rgba(218, 184, 124, 0.05));
}

h1 .index {
  display: inline-block;
  vertical-align: top;
  margin-left: 0.45em;
  transform: translateY(0.26em);
  font-family: var(--sans);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: rgba(222, 199, 158, 0.58);
}

.hero-copy {
  margin: clamp(20px, 2.7vh, 31px) 0 0;
  padding-left: 2px;
  color: rgba(236, 229, 215, 0.66);
  font-family: var(--serif);
  font-size: clamp(12px, 0.98vw, 15px);
  font-weight: 400;
  line-height: 2.08;
  letter-spacing: 0.09em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55), 0 2px 18px rgba(0, 0, 0, 0.45);
}

.hero-roles {
  margin-top: clamp(16px, 2.2vh, 24px);
  color: rgba(222, 199, 158, 0.62);
  font-size: 8px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: clamp(16px, 2vw, 26px);
  margin-top: clamp(22px, 3vh, 32px);
  pointer-events: auto;
}

.hero-rules {
  color: rgba(236, 226, 203, 0.55);
}

.hero-foot {
  display: flex;
  align-items: center;
  gap: 17px;
  margin-top: clamp(22px, 3.2vh, 35px);
  color: rgba(218, 202, 172, 0.45);
  font-size: 8px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.hero-foot .rule {
  width: 62px;
  height: 1px;
  background: linear-gradient(90deg, rgba(218, 202, 172, 0.26), rgba(218, 202, 172, 0));
}

.side-note {
  position: absolute;
  right: clamp(25px, 3.8vw, 60px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  writing-mode: vertical-rl;
  color: rgba(232, 224, 205, 0.36);
  font-size: 8px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 1.2s ease 1.15s;
}

.is-ready .side-note {
  opacity: 1;
}

.side-note .line {
  display: block;
  width: 1px;
  height: 58px;
  background: linear-gradient(180deg, rgba(221, 203, 168, 0.38), rgba(221, 203, 168, 0));
}

.side-note .accent {
  color: rgba(225, 205, 163, 0.62);
}

.bottom {
  position: absolute;
  left: clamp(22px, 3.7vw, 56px);
  right: clamp(22px, 3.7vw, 56px);
  bottom: clamp(19px, 2.9vh, 34px);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 1s ease 0.95s, transform 1s ease 0.95s;
}

.is-ready .bottom {
  opacity: 1;
  transform: none;
}

.scene-id {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 170px;
}

.scene-id .num {
  color: rgba(236, 224, 200, 0.75);
  font-family: var(--serif);
  font-size: 23px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.scene-id .meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.scene-id .meta b {
  color: rgba(237, 226, 204, 0.56);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.scene-id .meta span {
  color: rgba(237, 226, 204, 0.28);
  font-size: 7.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
}

.look-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 4px;
  color: rgba(231, 220, 198, 0.42);
  font-size: 8px;
  letter-spacing: 0.23em;
  text-transform: uppercase;
}

.look-hint .mouse {
  position: relative;
  width: 13px;
  height: 19px;
  border: 1px solid rgba(226, 211, 182, 0.35);
  border-radius: 8px;
}

.look-hint .mouse::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 50%;
  width: 1px;
  height: 4px;
  background: rgba(233, 211, 168, 0.72);
  transform: translateX(-50%);
  animation: wheel-hint 2.8s ease-in-out infinite;
}

@keyframes wheel-hint {
  0%,
  25% {
    opacity: 0;
    transform: translate(-50%, 0);
  }
  45% {
    opacity: 1;
  }
  75%,
  100% {
    opacity: 0;
    transform: translate(-50%, 4px);
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 39px;
  padding: 0 14px;
  border: 1px solid rgba(224, 210, 182, 0.17);
  border-radius: 20px;
  background: rgba(10, 16, 13, 0.22);
  color: rgba(238, 229, 210, 0.67);
  font-size: 8px;
  letter-spacing: 0.17em;
  text-transform: uppercase;
  backdrop-filter: blur(12px) saturate(1.15);
  -webkit-backdrop-filter: blur(12px) saturate(1.15);
  transition: color 0.35s ease, background 0.35s ease, border-color 0.35s ease, transform 0.35s ease;
}

.action:hover {
  color: rgba(248, 239, 220, 0.92);
  border-color: rgba(230, 203, 155, 0.37);
  background: rgba(26, 32, 24, 0.4);
}

.action.icon-only {
  width: 39px;
  padding: 0;
}

.action svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.action.is-on {
  color: rgba(235, 207, 151, 0.95);
  border-color: rgba(225, 190, 129, 0.38);
  background: rgba(41, 36, 23, 0.32);
}

.sound-bars {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: 14px;
  height: 12px;
}

.sound-bars i {
  display: block;
  width: 1px;
  height: 4px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.6;
  transition: height 0.3s ease, opacity 0.3s ease;
}

.sound-bars i:nth-child(2) {
  height: 8px;
}
.sound-bars i:nth-child(3) {
  height: 6px;
}

.action.is-on .sound-bars i {
  opacity: 1;
  animation: sound-bar 1.2s ease-in-out infinite;
}

.action.is-on .sound-bars i:nth-child(2) {
  animation-delay: 0.18s;
}
.action.is-on .sound-bars i:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes sound-bar {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 11px;
  }
}

.show-ui {
  position: fixed;
  right: clamp(20px, 3.2vw, 46px);
  bottom: clamp(20px, 3vw, 36px);
  z-index: 8;
  width: 43px;
  height: 43px;
  border: 1px solid rgba(226, 211, 182, 0.22);
  border-radius: 50%;
  background: rgba(10, 16, 13, 0.28);
  color: rgba(238, 229, 210, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: auto;
}

.show-ui svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-linecap: round;
}

.is-chrome-hidden .topbar,
.is-chrome-hidden .hero,
.is-chrome-hidden .side-note,
.is-chrome-hidden .bottom {
  opacity: 0;
  pointer-events: none;
  transition-delay: 0s;
}

@media (max-width: 900px) {
  .top-meta .wide {
    display: none;
  }
  .side-note {
    right: 26px;
  }
  .hero {
    max-width: 76vw;
  }
  .look-hint {
    display: none;
  }
}

@media (max-width: 680px) {
  .topbar {
    padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 0;
  }
  .brand {
    gap: 11px;
  }
  .brand-mark {
    width: 32px;
    height: 32px;
  }
  .brand-cn {
    font-size: 13px;
    letter-spacing: 0.27em;
  }
  .brand-en {
    font-size: 7px;
    letter-spacing: 0.26em;
  }
  .top-meta {
    font-size: 8px;
    letter-spacing: 0.18em;
    gap: 8px;
  }
  .top-divider {
    width: 15px;
  }
  .side-note {
    display: none;
  }
  .hero {
    left: 22px;
    right: 22px;
    bottom: 96px;
    max-width: none;
  }
  .hero-kicker {
    font-size: 7.5px;
    letter-spacing: 0.22em;
    gap: 10px;
    margin-bottom: 17px;
  }
  .hero-kicker::before {
    width: 28px;
  }
  h1 {
    font-size: clamp(47px, 13vw, 66px);
    gap: 0.2em;
    letter-spacing: 0.06em;
  }
  h1 .second {
    letter-spacing: 0.08em;
  }
  .hero-copy {
    font-size: 12px;
    line-height: 2;
    letter-spacing: 0.06em;
    margin-top: 18px;
  }
  .hero-roles {
    font-size: 7px;
    letter-spacing: 0.14em;
  }
  .hero-actions {
    gap: 16px;
    margin-top: 20px;
  }
  .hero-foot {
    margin-top: 20px;
    gap: 12px;
    font-size: 7px;
    letter-spacing: 0.2em;
  }
  .hero-foot .rule {
    width: 34px;
  }
  .bottom {
    left: 20px;
    right: 20px;
    bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    gap: 12px;
  }
  .scene-id {
    gap: 10px;
    min-width: 0;
  }
  .scene-id .num {
    font-size: 18px;
  }
  .scene-id .meta span {
    display: none;
  }
  .action {
    height: 42px;
    padding: 0 14px;
    border-radius: 21px;
    font-size: 8px;
    gap: 8px;
  }
  .action.icon-only {
    width: 42px;
    padding: 0;
  }
  .action .label {
    display: none;
  }
  .action.is-on .label {
    display: inline;
  }
  .show-ui {
    width: 40px;
    height: 40px;
    right: 18px;
    bottom: 18px;
  }
}

@media (max-width: 420px) {
  .top-meta {
    display: none;
  }
  .hero-copy {
    max-width: 290px;
  }
}

@media (max-height: 640px) and (orientation: landscape) {
  .hero {
    bottom: 68px;
  }
  h1 {
    font-size: 46px;
  }
  .hero-copy,
  .hero-foot,
  .hero-roles {
    display: none;
  }
  .hero-kicker {
    margin-bottom: 12px;
  }
  .topbar {
    padding-top: 18px;
  }
  .bottom {
    bottom: 16px;
  }
}
</style>

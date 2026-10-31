<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/game';
import { factionName } from '@/data/roles';
import BrandMark from '@/components/ui/BrandMark.vue';
import RoleIcon from '@/components/ui/RoleIcon.vue';
import { playCue } from '@/composables/useAmbientAudio';

const router = useRouter();
const store = useGameStore();

const flipped = ref(false);
const ready = ref(false);
let flipTimer = 0;
let readyTimer = 0;

const meta = computed(() => store.humanMeta);
const accent = computed(() => meta.value.color);
const teammates = computed(() =>
  store.teammates.map((player) => `${String(player.seat).padStart(2, '0')} ${player.character.name}`).join(' · '),
);

function flip() {
  if (flipped.value) return;
  flipped.value = true;
  store.roleRevealed = true;
  window.clearTimeout(readyTimer);
  readyTimer = window.setTimeout(() => {
    ready.value = true;
  }, 900);
}

function proceed() {
  if (!flipped.value) {
    flip();
    return;
  }
  if (!ready.value) return;
  playCue('night');
  store.startGame();
  router.push('/table');
}

onMounted(() => {
  flipTimer = window.setTimeout(flip, 760);
});

onBeforeUnmount(() => {
  window.clearTimeout(flipTimer);
  window.clearTimeout(readyTimer);
});
</script>

<template>
  <section class="view reveal" :style="{ '--role-accent': accent }">
    <header class="reveal-top">
      <div class="brand">
        <span class="brand-mark"><BrandMark :size="26" /></span>
        <span class="brand-cn">暮林夜话</span>
      </div>
      <p class="reveal-secure"><span class="lock"></span>仅你可见 · FOR YOUR EYES ONLY</p>
      <p class="reveal-round">ROUND <b>00</b></p>
    </header>

    <aside class="reveal-side reveal-side--left" aria-hidden="true">
      <span>THE NIGHT BEGINS</span>
      <span class="line"></span>
      <span>身份发放</span>
    </aside>
    <aside class="reveal-side reveal-side--right" aria-hidden="true">
      <span>SEAT {{ String(store.humanSeat).padStart(2, '0') }}</span>
      <span class="line"></span>
      <span>{{ store.human.character.name }}</span>
    </aside>

    <main class="reveal-stage">
      <div class="reveal-heading">
        <p class="eyebrow">DEALING THE NIGHT · 第 0 夜</p>
        <h1 class="serif">你的身份</h1>
        <p class="reveal-sub">这张牌只有你能看见。看完之后，把它收进袖口。</p>
      </div>

      <button
        class="id-card"
        :class="{ 'is-flipped': flipped }"
        type="button"
        :aria-label="flipped ? `你的身份是${meta.name}` : '翻开你的身份牌'"
        @click="flip"
      >
        <span class="id-card__inner">
          <span class="id-card__face id-card__face--back">
            <span class="id-back-frame"></span>
            <span class="id-back-mark"><BrandMark :size="52" /></span>
            <span class="id-back-title serif">暮 林 夜 话</span>
            <span class="id-back-sub">MULIN NIGHTFALL</span>
            <span class="id-back-seal">
              <span class="seal-ring"></span>
              <span class="seal-glyph">夜</span>
            </span>
            <span class="id-back-hint">轻触翻开</span>
          </span>

          <span class="id-card__face id-card__face--front">
            <span class="id-front-glow"></span>
            <span class="id-front-top">
              <span class="id-front-seat">SEAT {{ String(store.humanSeat).padStart(2, '0') }}</span>
              <span class="id-front-faction">{{ factionName(meta.faction) }}</span>
            </span>
            <span class="id-role-icon"><RoleIcon :role="meta.role" :size="86" /></span>
            <span class="id-role-name serif">{{ meta.name }}</span>
            <span class="id-role-en">{{ meta.en }}</span>
            <span class="id-role-line serif">「{{ meta.line }}」</span>
            <span class="id-role-divider"></span>
            <span class="id-role-ability">{{ meta.ability }}</span>
            <span v-if="store.isHumanWolf && teammates" class="id-role-teammates">同伴 · {{ teammates }}</span>
            <span v-else class="id-role-teammates">{{ meta.hint }}</span>
            <span class="id-front-brand">
              <BrandMark :size="18" />
              <span>MULIN NIGHTFALL</span>
            </span>
          </span>
        </span>
      </button>

      <p class="reveal-tip">
        <span class="dot"></span>
        {{ flipped ? '记住你的身份，但不要让别人看到这张牌。' : '牌面即将翻开 · 请确认没有人在你身后。' }}
      </p>

      <button class="btn btn--cta reveal-cta" type="button" :disabled="!ready" @click="proceed">
        <span class="dot"></span>
        <span>{{ ready ? '收好身份 · 入座' : '正在翻开…' }}</span>
        <span class="arrow">→</span>
      </button>
    </main>

    <footer class="reveal-foot">
      <span>NINE AT THE TABLE · ONE OF THEM IS NOT WHAT THEY SEEM</span>
      <span class="reveal-foot-line"></span>
      <span>暮林山舍 · 18:42</span>
    </footer>
  </section>
</template>

<style scoped>
.reveal {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 74px 22px 54px;
  pointer-events: none;
  background: radial-gradient(ellipse 46% 58% at 50% 52%, rgba(3, 6, 4, 0.12), rgba(3, 6, 4, 0.62) 76%, rgba(3, 6, 4, 0.82) 100%);
}

.reveal-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(18px, 2.6vw, 30px) clamp(20px, 3.4vw, 48px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 26px;
  height: 26px;
  color: var(--gold);
}

.brand-cn {
  font-family: var(--serif);
  font-size: 12px;
  letter-spacing: 0.28em;
  color: rgba(242, 234, 218, 0.82);
}

.reveal-secure {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(226, 211, 181, 0.45);
  font-size: 7px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.lock {
  position: relative;
  width: 7px;
  height: 6px;
  border: 1px solid rgba(226, 211, 181, 0.45);
  border-radius: 1px;
}

.lock::before {
  content: "";
  position: absolute;
  left: 1px;
  top: -4px;
  width: 3px;
  height: 4px;
  border: 1px solid rgba(226, 211, 181, 0.45);
  border-bottom: 0;
  border-radius: 3px 3px 0 0;
}

.reveal-round {
  color: rgba(226, 211, 181, 0.35);
  font-size: 7px;
  letter-spacing: 0.24em;
}

.reveal-round b {
  color: rgba(230, 199, 142, 0.75);
  font-family: var(--serif);
  font-size: 12px;
  font-weight: 400;
  margin-left: 5px;
}

.reveal-side {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  writing-mode: vertical-rl;
  color: rgba(228, 217, 195, 0.28);
  font-size: 7px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.reveal-side .line {
  width: 1px;
  height: 54px;
  background: linear-gradient(180deg, rgba(220, 200, 164, 0.3), transparent);
}

.reveal-side--left {
  left: clamp(24px, 4vw, 58px);
}

.reveal-side--right {
  right: clamp(24px, 4vw, 58px);
}

.reveal-stage {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  max-height: 100%;
}

.reveal-heading {
  text-align: center;
  margin-bottom: clamp(14px, 2vh, 22px);
  opacity: 0;
  animation: reveal-in 1s var(--ease-out) 0.15s forwards;
}

.reveal-heading h1 {
  margin-top: 10px;
  font-size: clamp(26px, 2.8vw, 36px);
  font-weight: 400;
  letter-spacing: 0.24em;
  color: #f2e9d8;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.5);
}

.reveal-sub {
  margin-top: 9px;
  color: rgba(231, 222, 203, 0.5);
  font-size: 9px;
  letter-spacing: 0.14em;
}

@keyframes reveal-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.id-card {
  position: relative;
  width: clamp(268px, 23vw, 336px);
  aspect-ratio: 0.69;
  padding: 0;
  border: 0;
  background: none;
  perspective: 1600px;
  pointer-events: auto;
  cursor: pointer;
  filter: drop-shadow(0 26px 40px rgba(0, 0, 0, 0.55));
  transition: transform 0.5s var(--ease-out), filter 0.5s var(--ease-out);
  opacity: 0;
  animation: card-in 1.1s var(--ease-out) 0.3s forwards;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.id-card:hover {
  filter: drop-shadow(0 30px 48px rgba(0, 0, 0, 0.62));
}

.id-card__inner {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 1.15s cubic-bezier(0.2, 0.75, 0.2, 1);
}

.id-card.is-flipped .id-card__inner {
  transform: rotateY(180deg);
}

.id-card__face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: hidden;
  border: 1px solid rgba(220, 194, 147, 0.38);
  border-radius: 4px;
}

.id-card__face--back {
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 36%, rgba(52, 48, 32, 0.5), transparent 62%),
    linear-gradient(160deg, #1a2119, #0a0f0b 70%);
}

.id-back-frame {
  position: absolute;
  inset: 9px;
  border: 1px solid rgba(220, 194, 147, 0.16);
  border-radius: 2px;
}

.id-back-frame::before,
.id-back-frame::after {
  content: "";
  position: absolute;
  left: 50%;
  width: 1px;
  height: 30px;
  background: linear-gradient(180deg, rgba(220, 194, 147, 0.34), transparent);
  transform: translateX(-50%);
}

.id-back-frame::before {
  top: -1px;
}

.id-back-frame::after {
  bottom: -1px;
  transform: translateX(-50%) rotate(180deg);
}

.id-back-mark {
  color: var(--gold);
  opacity: 0.82;
  margin-bottom: 18px;
}

.id-back-title {
  font-size: clamp(19px, 1.7vw, 23px);
  letter-spacing: 0.28em;
  color: rgba(240, 231, 213, 0.9);
  padding-left: 0.28em;
}

.id-back-sub {
  margin-top: 9px;
  font-size: 6.5px;
  letter-spacing: 0.4em;
  color: rgba(224, 203, 164, 0.42);
}

.id-back-seal {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 66px;
  height: 66px;
  margin-top: 32px;
}

.seal-ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(206, 171, 112, 0.28);
  border-radius: 50%;
}

.seal-ring::before {
  content: "";
  position: absolute;
  inset: 5px;
  border: 1px dashed rgba(206, 171, 112, 0.2);
  border-radius: 50%;
}

.seal-glyph {
  font-family: var(--serif);
  font-size: 20px;
  color: rgba(218, 186, 129, 0.72);
  letter-spacing: 0;
}

.id-back-hint {
  position: absolute;
  bottom: 27px;
  font-size: 7px;
  letter-spacing: 0.32em;
  color: rgba(225, 209, 178, 0.3);
}

.id-card__face--front {
  transform: rotateY(180deg);
  justify-content: flex-start;
  padding: 22px 22px 16px;
  background:
    radial-gradient(ellipse at 50% 18%, color-mix(in srgb, var(--role-accent) 22%, transparent), transparent 58%),
    linear-gradient(165deg, #161d16, #080c09 76%);
  text-align: center;
}

.id-front-glow {
  position: absolute;
  top: -70px;
  left: 50%;
  width: 220px;
  height: 220px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--role-accent) 36%, transparent), transparent 65%);
  opacity: 0.45;
  pointer-events: none;
}

.id-front-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  color: rgba(228, 213, 186, 0.42);
  font-size: 6.5px;
  letter-spacing: 0.2em;
}

.id-front-faction {
  color: color-mix(in srgb, var(--role-accent) 78%, #f3e8d4);
}

.id-role-icon {
  position: relative;
  z-index: 1;
  margin-top: clamp(18px, 3vh, 30px);
  color: var(--role-accent);
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--role-accent) 35%, transparent));
}

.id-role-name {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  font-size: clamp(25px, 2.3vw, 32px);
  font-weight: 400;
  letter-spacing: 0.22em;
  color: #f2e9d7;
}

.id-role-en {
  position: relative;
  z-index: 1;
  margin-top: 4px;
  font-size: 6.5px;
  letter-spacing: 0.42em;
  color: color-mix(in srgb, var(--role-accent) 72%, #d8c8a8);
}

.id-role-line {
  position: relative;
  z-index: 1;
  margin-top: 15px;
  font-size: 9px;
  letter-spacing: 0.07em;
  color: rgba(236, 225, 205, 0.5);
}

.id-role-divider {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 1px;
  margin: 13px 0 11px;
  background: linear-gradient(90deg, transparent, rgba(214, 184, 128, 0.45), transparent);
}

.id-role-ability {
  position: relative;
  z-index: 1;
  max-width: 94%;
  color: rgba(230, 220, 200, 0.58);
  font-size: 9px;
  line-height: 1.85;
  letter-spacing: 0.04em;
}

.id-role-teammates {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: 10px;
  color: color-mix(in srgb, var(--role-accent) 64%, #cabfa9);
  font-size: 8px;
  line-height: 1.7;
  letter-spacing: 0.08em;
}

.id-front-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 9px;
  border-top: 1px solid rgba(220, 200, 164, 0.1);
  color: rgba(220, 200, 164, 0.3);
  font-size: 5.5px;
  letter-spacing: 0.26em;
}

.reveal-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: clamp(14px, 2vh, 20px);
  color: rgba(230, 219, 198, 0.42);
  font-size: 8px;
  letter-spacing: 0.1em;
  opacity: 0;
  animation: reveal-in 1s var(--ease-out) 1.1s forwards;
}

.reveal-tip .dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--gold);
  opacity: 0.7;
}

.reveal-cta {
  margin-top: 15px;
  opacity: 0;
  animation: reveal-in 1s var(--ease-out) 1.2s forwards;
  pointer-events: auto;
}

.reveal-cta:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.reveal-foot {
  position: absolute;
  left: clamp(20px, 3.4vw, 48px);
  right: clamp(20px, 3.4vw, 48px);
  bottom: clamp(16px, 2.4vh, 26px);
  display: flex;
  align-items: center;
  gap: 14px;
  color: rgba(226, 214, 192, 0.24);
  font-size: 6.5px;
  letter-spacing: 0.2em;
}

.reveal-foot-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(220, 200, 164, 0.18), transparent);
}

@media (max-width: 700px) {
  .reveal {
    padding-top: 62px;
    padding-bottom: 40px;
    justify-content: flex-start;
    overflow-y: auto;
  }
  .reveal-heading {
    margin-top: 12px;
  }
  .reveal-heading h1 {
    font-size: 24px;
  }
  .reveal-sub {
    font-size: 8px;
    letter-spacing: 0.08em;
  }
  .reveal-side {
    display: none;
  }
  .reveal-secure {
    display: none;
  }
  .id-card {
    width: min(78vw, 300px);
  }
  .id-card__face--front {
    padding: 18px 18px 14px;
  }
  .id-role-icon :deep(svg) {
    width: 68px;
    height: 68px;
  }
  .id-role-ability {
    font-size: 8.5px;
    line-height: 1.8;
  }
  .reveal-tip {
    text-align: center;
    font-size: 7.5px;
  }
  .reveal-cta {
    width: min(78vw, 300px);
  }
  .reveal-foot {
    display: none;
  }
}

@media (max-height: 760px) and (min-width: 701px) {
  .reveal-heading {
    margin-bottom: 10px;
  }
  .reveal-heading h1 {
    font-size: 25px;
  }
  .id-card {
    width: min(260px, 20vw);
  }
  .id-role-icon {
    margin-top: 14px;
  }
  .id-role-ability {
    line-height: 1.7;
  }
  .reveal-tip {
    margin-top: 10px;
  }
  .reveal-cta {
    margin-top: 10px;
    height: 44px;
  }
}
</style>

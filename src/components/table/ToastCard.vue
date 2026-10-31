<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/game';

const store = useGameStore();
const toast = computed(() => store.toast);
</script>

<template>
  <Transition name="toast">
    <div v-if="toast" class="toast" :class="`tone-${toast.tone}`" role="status">
      <span class="toast-mark" aria-hidden="true"></span>
      <div>
        <b>{{ toast.title }}</b>
        <p>{{ toast.text }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 92px;
  right: clamp(20px, 3vw, 44px);
  z-index: var(--z-toast);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: min(318px, calc(100vw - 40px));
  padding: 14px 16px;
  border: 1px solid rgba(224, 210, 180, 0.16);
  border-left: 2px solid var(--gold);
  background: rgba(10, 16, 12, 0.9);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}

.toast-mark {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--gold-bright);
  box-shadow: 0 0 12px rgba(231, 201, 145, 0.7);
}

.toast b {
  display: block;
  color: rgba(242, 233, 215, 0.92);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.14em;
}

.toast p {
  margin-top: 5px;
  color: rgba(232, 222, 201, 0.56);
  font-size: 9.5px;
  line-height: 1.8;
  letter-spacing: 0.05em;
}

.tone-blood {
  border-left-color: var(--blood);
}
.tone-blood .toast-mark {
  background: #c17a70;
  box-shadow: 0 0 12px rgba(169, 85, 77, 0.8);
}

.tone-moss {
  border-left-color: #8fa88d;
}
.tone-moss .toast-mark {
  background: #a9c1a4;
  box-shadow: 0 0 12px rgba(143, 168, 141, 0.6);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.45s var(--ease-out), transform 0.5s var(--ease-out);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(14px);
}
</style>

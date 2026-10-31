<script setup lang="ts">
import type { Role } from '@/game/types';

withDefaults(defineProps<{ role: Role; size?: number }>(), { size: 32 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 48 48" fill="none" aria-hidden="true" class="role-icon">
    <template v-if="role === 'werewolf'">
      <path d="M31.5 12.2c-2.5-2.1-6-2.3-8.6-.7 1.9.9 3.1 2.6 3.4 4.6.4 2.7-1.2 5.1-3.9 6.4-2.9 1.4-4.7 4.3-4.3 7.2.4 3.4 3.3 5.7 6.7 5.7 4.8 0 8.6-4.2 8.6-9.2 0-1.4-.3-2.6-.8-3.8" />
      <path d="M14.8 20.6c-2.4 2.6-3.6 5.6-3.6 8.7M19.2 33.8c2.2 1.2 4.6 1.7 7.1 1.7" stroke-opacity=".55" />
      <path d="M27.5 20.4h.01M32.6 20.4h.01" stroke-width="3.4" stroke-linecap="round" />
    </template>
    <template v-else-if="role === 'villager'">
      <path d="M24 39V17" />
      <path d="M24 29c-4.6 0-7.6-2.6-8.2-6.6 4.7-.3 7.6 2.2 8.2 6.6ZM24 24.5c.6-4.7 3.7-7.4 8.4-7.1-.4 4.6-3.4 7.3-8.4 7.1Z" />
      <path d="M18.8 39h10.4M24 17c-1.6-2.6-1.6-5.1 0-7.5 1.6 2.4 1.6 4.9 0 7.5Z" />
      <path d="M24 33.5c-2.7 0-4.7-1.3-5.4-3.7 2.8-.4 4.7.9 5.4 3.7Z" stroke-opacity=".55" />
    </template>
    <template v-else-if="role === 'seer'">
      <path d="M9.5 24s5.3-8.2 14.5-8.2S38.5 24 38.5 24 33.2 32.2 24 32.2 9.5 24 9.5 24Z" />
      <circle cx="24" cy="24" r="4.6" />
      <circle cx="24" cy="24" r="8.8" stroke-dasharray="1.5 4.2" stroke-opacity=".6" />
      <path d="M24 5.5v3M24 39.5v3M5.5 24h3M39.5 24h3" stroke-opacity=".6" />
    </template>
    <template v-else-if="role === 'witch'">
      <path d="M20 10h8M22.5 10v6.2L15 29.4c-1.6 2.8.4 6.1 3.6 6.1h10.8c3.2 0 5.2-3.3 3.6-6.1l-7.5-13.2V10" />
      <path d="M17.4 28.5h13.2M24 31.2c-1.8 0-3-1.2-3-2.7M24 34.2v-3" stroke-opacity=".6" />
      <path d="M14 11.2c2.5-.9 5-.9 7.4 0M27 11.2c2.4-.9 4.8-.9 7.2 0" stroke-opacity=".4" />
    </template>
    <template v-else>
      <path d="M24 6.5 38 12v10.4c0 9.4-6 16.4-14 19.1-8-2.7-14-9.7-14-19.1V12L24 6.5Z" />
      <path d="M24 14.5 29 24h-10l5-9.5ZM24 24v8.5M20.8 32.5h6.4" stroke-opacity=".75" />
    </template>
  </svg>
</template>

<style scoped>
.role-icon {
  stroke: currentColor;
  stroke-width: 1.35;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>

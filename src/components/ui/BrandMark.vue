<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 44 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <circle cx="22" cy="22" r="20.4" stroke="currentColor" stroke-opacity=".38" stroke-width=".8" />
    <path d="M10.5 24.4 22 11.7l11.5 12.7" stroke="currentColor" stroke-width="1" stroke-linejoin="round" />
    <path d="M15.1 22.8v9.1h13.8v-9.1" stroke="currentColor" stroke-width=".85" stroke-opacity=".72" />
    <path d="M18.8 31.9v-5.3h6.4v5.3" stroke="currentColor" stroke-width=".7" stroke-opacity=".45" />
    <path d="M22 6.8v3.1M22 34.1v3.1" stroke="currentColor" stroke-width=".7" stroke-opacity=".38" />
  </svg>
</template>

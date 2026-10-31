<script setup lang="ts">
import { computed, useId } from 'vue';
import type { Character } from '@/data/characters';

const props = withDefaults(
  defineProps<{
    character: Character;
    size?: number;
    dimmed?: boolean;
  }>(),
  { size: 56, dimmed: false },
);

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
const palette = computed(() => props.character.palette);
const variant = computed(() => props.character.variant);
const accessory = computed(() => props.character.accessory);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    :class="['traveler', { 'is-dimmed': dimmed }]"
    role="img"
    :aria-label="`${character.name}，${character.title}`"
  >
    <defs>
      <radialGradient :id="`bg-${uid}`" cx="50%" cy="36%" r="72%">
        <stop offset="0%" stop-color="#33402f" />
        <stop offset="55%" stop-color="#1b241c" />
        <stop offset="100%" stop-color="#0c120e" />
      </radialGradient>
      <radialGradient :id="`face-${uid}`" cx="42%" cy="34%" r="72%">
        <stop offset="0%" :stop-color="palette.skin" stop-opacity="1" />
        <stop offset="78%" :stop-color="palette.skin" stop-opacity=".86" />
        <stop offset="100%" :stop-color="palette.skin" stop-opacity=".55" />
      </radialGradient>
      <linearGradient :id="`cloak-${uid}`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="palette.cloak" />
        <stop offset="100%" :stop-color="palette.cloakDeep" />
      </linearGradient>
      <radialGradient :id="`vignette-${uid}`" cx="50%" cy="45%" r="60%">
        <stop offset="55%" stop-color="#000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000" stop-opacity=".5" />
      </radialGradient>
      <clipPath :id="`clip-${uid}`">
        <circle cx="60" cy="60" r="57" />
      </clipPath>
    </defs>

    <g :clip-path="`url(#clip-${uid})`">
      <circle cx="60" cy="60" r="57" :fill="`url(#bg-${uid})`" />
      <path d="M4 104c14-10 26-9 38-4" stroke="#8fa38a" stroke-opacity=".12" fill="none" />
      <path d="M96 116c-4-12-2-23 6-30" stroke="#8fa38a" stroke-opacity=".08" fill="none" />

      <!-- shoulders and cloak -->
      <path
        d="M14 120c3-24 19-36 46-36s43 12 46 36Z"
        :fill="`url(#cloak-${uid})`"
      />
      <path d="M37 118c2-15 10-23 23-23s21 8 23 23" :fill="palette.cloakDeep" opacity=".85" />
      <path d="M48 96 60 108l12-12" stroke="#0d120d" stroke-opacity=".55" stroke-width="1.4" fill="none" />
      <path d="M55 93h10v10H55z" :fill="palette.skin" opacity=".75" />

      <!-- hair behind the head -->
      <ellipse
        v-if="variant === 'long' || variant === 'braid'"
        cx="60"
        cy="56"
        rx="27"
        ry="32"
        :fill="palette.hair"
      />
      <path
        v-if="variant === 'long'"
        d="M35 56c-2 18 2 30 8 38l6-4c-5-10-7-21-5-33ZM85 56c2 18-2 30-8 38l-6-4c5-10 7-21 5-33Z"
        :fill="palette.hair"
        opacity=".92"
      />

      <!-- hood -->
      <template v-if="variant === 'hood'">
        <path
          d="M31 100c-6-20-4-44 8-55 6-6 13-9 21-9s15 3 21 9c12 11 14 35 8 55l-10 4c5-19 3-35-5-45-4-5-8-7-14-7s-10 2-14 7c-8 10-10 26-5 45Z"
          :fill="palette.cloakDeep"
        />
        <path d="M34 96c-2-16 0-33 8-43" stroke="#0b100c" stroke-opacity=".5" stroke-width="1.2" fill="none" />
      </template>

      <!-- neck and face -->
      <path d="M51 78h18v16c0 4-4 6-9 6s-9-2-9-6Z" :fill="palette.skin" opacity=".8" />
      <ellipse cx="60" cy="56" rx="20" ry="24" :fill="`url(#face-${uid})`" />
      <ellipse cx="39.5" cy="59" rx="3" ry="5" :fill="palette.skin" opacity=".85" />
      <ellipse cx="80.5" cy="59" rx="3" ry="5" :fill="palette.skin" opacity=".85" />

      <!-- hair in front -->
      <template v-if="variant === 'crop' || variant === 'bun' || variant === 'hat'">
        <path
          d="M40 49c1-12 9-19 21-19 11 0 19 7 20 18-6-7-13-10-21-10-8 0-15 4-20 11Z"
          :fill="palette.hair"
        />
      </template>
      <template v-if="variant === 'braid'">
        <path
          d="M39 48c2-11 10-17 21-17s19 6 21 17c-6-6-13-8-21-8s-15 2-21 8Z"
          :fill="palette.hair"
        />
        <path d="M78 60c6 7 7 16 4 26" :stroke="palette.hair" stroke-width="7" stroke-linecap="round" fill="none" />
        <path d="M80 66c4 6 4 14 2 20" stroke="#0b0f0b" stroke-opacity=".28" stroke-width="1.2" fill="none" />
      </template>
      <template v-if="variant === 'long'">
        <path
          d="M39 50c1-12 9-19 21-19s20 7 21 19c-4-8-11-12-21-12s-17 4-21 12Z"
          :fill="palette.hair"
        />
        <path d="M39 48c-3 12-2 24 2 34M81 48c3 12 2 24-2 34" :stroke="palette.hair" stroke-width="5" stroke-linecap="round" fill="none" />
      </template>
      <template v-if="variant === 'bun'">
        <circle cx="60" cy="27" r="8" :fill="palette.hair" />
        <circle cx="60" cy="27" r="3.2" fill="#0b0f0b" opacity=".2" />
      </template>
      <template v-if="variant === 'hat'">
        <ellipse cx="60" cy="37" rx="27" ry="5.2" :fill="palette.cloakDeep" />
        <path d="M46 36c0-9 4-15 14-15s14 6 14 15Z" :fill="palette.cloakDeep" />
        <path d="M47 33h26" :stroke="palette.accent" stroke-width="1.6" stroke-opacity=".65" />
        <path d="M24 39c8-4 15-5 22-4M74 35c7-1 14 0 22 4" :stroke="palette.cloakDeep" stroke-width="1.6" fill="none" />
      </template>

      <!-- face details -->
      <path d="M48 51.5c2-1.5 5-1.5 7 0M65 51.5c2-1.5 5-1.5 7 0" stroke="#2a211a" stroke-width="1.15" stroke-linecap="round" fill="none" opacity=".7" />
      <ellipse cx="51.5" cy="56" rx="1.7" ry="2" fill="#241c16" />
      <ellipse cx="68.5" cy="56" rx="1.7" ry="2" fill="#241c16" />
      <circle cx="51.9" cy="55.4" r=".5" fill="#f4e6cf" opacity=".75" />
      <circle cx="68.9" cy="55.4" r=".5" fill="#f4e6cf" opacity=".75" />
      <path d="M60 56.5c-.6 2.5-.8 4.2.4 5.2" stroke="#6e4c38" stroke-width=".9" stroke-linecap="round" fill="none" opacity=".55" />
      <path d="M55 67.5c3 1.6 7 1.6 10 0" stroke="#5d3b2c" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".6" />
      <path d="M43 62c2 1.5 3.5 1.8 5 1.6M77 62c-2 1.5-3.5 1.8-5 1.6" stroke="#8f5d43" stroke-width=".8" fill="none" opacity=".28" />

      <!-- hood rim and collar -->
      <template v-if="variant === 'hood'">
        <path d="M40 38c5-7 12-11 20-11s15 4 20 11" stroke="#0b0f0b" stroke-opacity=".45" stroke-width="1.4" fill="none" />
        <path d="M39 78c7 4 14 6 21 6s14-2 21-6" stroke="#0b0f0b" stroke-opacity=".35" stroke-width="1.2" fill="none" />
      </template>
      <path d="M42 97c5-3 11-4 18-4s13 1 18 4" :stroke="palette.accent" stroke-opacity=".45" stroke-width="1.2" fill="none" />

      <!-- accessory seal -->
      <g transform="translate(89 92)">
        <circle r="13.6" fill="#0c120e" stroke="#e0c493" stroke-opacity=".45" stroke-width=".9" />
        <circle r="10.6" fill="none" stroke="#e0c493" stroke-opacity=".18" stroke-width=".7" />
        <g
          fill="none"
          stroke="#e2c795"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-opacity=".92"
        >
          <template v-if="accessory === 'compass'">
            <circle cx="0" cy="0" r="5.2" />
            <path d="M0-4.4 1.6 0 0 4.4-1.6 0Z" fill="#e2c795" fill-opacity=".22" />
            <path d="M0-6.8v-1.4M0 6.8v1.4M-6.8 0h-1.4M6.8 0h1.4" />
          </template>
          <template v-else-if="accessory === 'herb'">
            <path d="M0 6V-5" />
            <path d="M0 1c-3.4 0-5.4-1.9-5.8-4.8C-2.4-4.6 0-2.8 0 1ZM0-2.2c.4-3 2.5-4.9 5.7-4.7C5.3-3.8 3.2-2 0-2.2Z" />
            <path d="M-2.6 6h5.2" />
          </template>
          <template v-else-if="accessory === 'antler'">
            <path d="M-3 6c0-4 1-7 3-9M3 6c0-4-1-7-3-9" />
            <path d="M0-3c-1-3-3-4-5-4M0-3c1-3 3-4 5-4M0-1l-3-2M0-1l3-2" />
          </template>
          <template v-else-if="accessory === 'mask'">
            <path d="M-5-3c0-2 2-3 5-3s5 1 5 3c0 5-3 8-5 8S-5 2-5-3Z" />
            <path d="M-3-2h2M1-2h2M-2 2c1.4.8 2.6.8 4 0" />
          </template>
          <template v-else-if="accessory === 'pine'">
            <path d="M0-6 4.6-1H2l3.4 4h-4v3h-4V3h-4L1.4-1h-2.6Z" />
          </template>
          <template v-else-if="accessory === 'key'">
            <circle cx="0" cy="-3" r="3" />
            <path d="M0 0v6M0 6h3M0 3h2" />
          </template>
          <template v-else-if="accessory === 'quill'">
            <path d="M-3 6C-2-1 1-5 6-6c0 5-3 9-7 10" />
            <path d="M-3 6 2 1M0 3l-2-1M2 1l1-2" />
          </template>
          <template v-else-if="accessory === 'mushroom'">
            <path d="M-5-1c0-3.2 2.2-5 5-5s5 1.8 5 5Z" />
            <path d="M-1.6-1v5c0 1.2.7 2 1.6 2s1.6-.8 1.6-2V-1" />
            <path d="M-3-3.4h.01M2-3.4h.01" stroke-width="1.8" />
          </template>
          <template v-else>
            <path d="M-3.4-2h6.8v6h-6.8zM-2-2v-2h4v2M0 0v2" />
            <path d="M-3.4 1h6.8" />
          </template>
        </g>
      </g>

      <circle cx="60" cy="60" r="57" :fill="`url(#vignette-${uid})`" />
    </g>
    <circle cx="60" cy="60" r="57.5" fill="none" stroke="#e0c493" stroke-opacity=".3" stroke-width="1" />
    <circle cx="60" cy="60" r="56" fill="none" stroke="#050806" stroke-opacity=".6" stroke-width="1.4" />
  </svg>
</template>

<style scoped>
.traveler {
  display: block;
  border-radius: 50%;
  filter: saturate(0.92);
  transition: filter 0.5s var(--ease-out), opacity 0.5s var(--ease-out);
}
.traveler.is-dimmed {
  filter: grayscale(0.85) brightness(0.6);
}
</style>

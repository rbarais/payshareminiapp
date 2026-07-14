<template>
  <svg v-if="type === 'person'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path
      d="M4 18C4 15 7.13 12.5 11 12.5C14.87 12.5 18 15 18 18"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <circle cx="11" cy="8" r="3.5" :stroke="color" stroke-width="1.5" />
  </svg>
  <svg v-else-if="type === 'home'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path
      d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z"
      :stroke="color"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
  </svg>
  <svg v-else-if="type === 'car'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <circle cx="6.5" cy="15.5" r="2.5" :stroke="color" stroke-width="1.5" />
    <circle cx="15.5" cy="15.5" r="2.5" :stroke="color" stroke-width="1.5" />
    <path
      d="M2 15.5H4M9 15.5H13M18 15.5H20M4 15.5V9L7 5H15L18 9V15.5"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <svg v-else-if="type === 'list'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path d="M4 6H18M4 11H18M4 16H12" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
  </svg>
  <svg v-else-if="type === 'food'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path
      d="M8 2V9C8 10.1 8.9 11 10 11V20M14 2V20M12 2C12 2 16 5 16 8"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <svg v-else-if="type === 'sport'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="8.5" :stroke="color" stroke-width="1.5" />
    <path
      d="M5 6.5C7 8.5 9 10 11 10.5C13 11 15 12.5 17 14.5"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
  <svg v-else-if="type === 'shopping'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path d="M3 6H19L17 18H5L3 6Z" :stroke="color" stroke-width="1.5" stroke-linejoin="round" />
    <path
      d="M8 6C8 4.5 9.3 3 11 3C12.7 3 14 4.5 14 6"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
  <svg v-else-if="type === 'travel'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path
      d="M3 16L7.5 14.5L13 20H16L13 12.5L19.5 8C20.5 7.2 20.5 5.8 19.5 5C18.7 4.2 17.3 4.2 16.5 5L10 11.5L3 8.5V11L8.5 13L3 16Z"
      :stroke="color"
      stroke-width="1.3"
      stroke-linejoin="round"
    />
  </svg>
  <svg v-else-if="type === 'beach'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="10" r="3.5" :stroke="color" stroke-width="1.5" />
    <path
      d="M11 2V4M11 16V18M3 10H5M17 10H19M5.5 4.5L7 6M15 14L16.5 15.5M5.5 15.5L7 14M15 6L16.5 4.5"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
  <svg v-else-if="type === 'birthday'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <rect x="3" y="10" width="16" height="9" rx="1.5" :stroke="color" stroke-width="1.5" />
    <path d="M3 14H19M11 10V19" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
    <path
      d="M8 10C8 10 7 8 8 6.5C8.7 5.5 9.5 5.5 10 6.5C10.5 7.5 9.5 9.5 11 10C12.5 9.5 11.5 7.5 12 6.5C12.5 5.5 13.3 5.5 14 6.5C15 8 14 10 14 10"
      :stroke="color"
      stroke-width="1.3"
      stroke-linecap="round"
    />
  </svg>
  <svg v-else-if="type === 'work'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <rect x="3" y="8" width="16" height="11" rx="2" :stroke="color" stroke-width="1.5" />
    <path
      d="M8 8V6C8 4.9 8.9 4 10 4H12C13.1 4 14 4.9 14 6V8"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <path d="M3 13H19" :stroke="color" stroke-width="1.5" />
  </svg>
  <svg v-else :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path d="M5 10H15L13.5 19H6.5L5 10Z" :stroke="color" stroke-width="1.5" stroke-linejoin="round" />
    <path
      d="M15 12H17C18.1 12 19 12.9 19 14C19 15.1 18.1 16 17 16H15"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <path
      d="M8 7.5C8 7.5 8.5 5.5 9.5 5.5C10.5 5.5 11 7.5 12 7.5C13 7.5 13.5 5.5 14.5 5.5"
      :stroke="color"
      stroke-width="1.4"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup lang="ts">
import type { GroupIcon } from '../types';

// Renders one of the 12 group icons (repris du proto). Fallback = cafe.
// The background is handled by the container; here we only draw the glyph.
withDefaults(defineProps<{ type: GroupIcon; color: string; size?: number }>(), {
  size: 22,
});
</script>

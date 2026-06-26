<script setup lang="ts">
import type { GroupIcon } from '../types';

// Rend l'une des 4 icônes de groupe (person / home / car / list).
// Le fond est géré par le conteneur ; ici on ne trace que le glyphe.
withDefaults(defineProps<{ type: GroupIcon; color: string; size?: number }>(), {
  size: 22,
});
</script>

<template>
  <svg v-if="type === 'person'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path d="M4 18C4 15 7.13 12.5 11 12.5C14.87 12.5 18 15 18 18" :stroke="color" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="11" cy="8" r="3.5" :stroke="color" stroke-width="1.5"/>
  </svg>
  <svg v-else-if="type === 'home'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path d="M3 10L11 3L19 10V19H14V14H8V19H3V10Z" :stroke="color" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>
  <svg v-else-if="type === 'car'" :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <circle cx="6.5" cy="15.5" r="2.5" :stroke="color" stroke-width="1.5"/>
    <circle cx="15.5" cy="15.5" r="2.5" :stroke="color" stroke-width="1.5"/>
    <path d="M2 15.5H4M9 15.5H13M18 15.5H20M4 15.5V9L7 5H15L18 9V15.5" :stroke="color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <svg v-else :width="size" :height="size" viewBox="0 0 22 22" fill="none">
    <path d="M4 6H18M4 11H18M4 16H12" :stroke="color" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
</template>

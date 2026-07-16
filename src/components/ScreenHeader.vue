<template>
  <div class="screen-header">
    <button class="icon-btn" @click="$emit('back')">
      <CloseIcon v-if="close" />
      <ArrowLeftIcon v-else />
    </button>
    <div class="head-info">
      <div class="head-title">{{ title }}</div>
      <div v-if="subtitle" class="head-sub">{{ subtitle }}</div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import ArrowLeftIcon from '../assets/svg/arrowLeft.svg';
import CloseIcon from '../assets/svg/close.svg';

// Header d'écran : bouton retour (flèche, ou croix avec `close`), titre,
// sous-titre optionnel et slot pour une action à droite.
defineProps<{ title: string; subtitle?: string; close?: boolean }>();
defineEmits<{ back: [] }>();
</script>

<style scoped>
.screen-header {
  padding: 8px 18px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.head-info {
  flex: 1;
  min-width: 0;
}

.head-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--dark);
  letter-spacing: -0.3px;
}

.head-sub {
  font-size: 11px;
  color: var(--text);
  margin-top: 1px;
}
</style>

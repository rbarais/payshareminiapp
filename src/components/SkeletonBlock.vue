<template>
  <div class="skeleton-block" :style="{ width, height, borderRadius: radius }" />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string;
    height: string;
    radius?: string;
  }>(),
  { width: '100%', radius: '8px' },
);
</script>

<style scoped>
.skeleton-block {
  position: relative;
  overflow: hidden;
  background: var(--border-subtle);
  flex-shrink: 0;
}

.skeleton-block::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 15%,
    rgba(255, 255, 255, 0.65) 50%,
    transparent 85%
  );
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block::after {
    animation: none;
    content: none;
  }
}
</style>

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
  background: linear-gradient(
    90deg,
    var(--border-subtle) 25%,
    var(--border) 37%,
    var(--border-subtle) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block {
    animation: none;
    background: var(--border-subtle);
  }
}
</style>

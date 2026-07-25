<template>
  <span
    class="spinner"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="status"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 16 });
</script>

<style scoped>
.spinner {
  display: inline-block;
  flex-shrink: 0;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  opacity: 0.75;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2s;
  }
}
</style>

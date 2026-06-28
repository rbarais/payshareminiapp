<script setup lang="ts">
// Reusable bottom-sheet: dark overlay + animated sheet + handle.
// Clicking the overlay (outside the sheet) emits `close`.
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="sheet-overlay" @click="$emit('close')">
    <div class="sheet" @click.stop>
      <div class="sheet-handle" />
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  background: var(--bg-card);
  border-radius: 24px 24px 0 0;
  padding: 10px 20px 30px;
  animation: sheet-up 0.22s ease;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  margin: 0 auto 14px;
}
</style>
